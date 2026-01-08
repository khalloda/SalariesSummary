import { Router } from 'express';
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { shouldShowBonusHalves } from '../utils/config.js';
import { requireAuth, canViewSalaryAmounts, type RoleName } from '../utils/auth.js';
import { logAudit } from '../utils/audit.js';

export const annualBonusExportRouter = Router();

// Get logo as base64 for PDF embedding
function getLogoBase64(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const logoPath = join(__dirname, '..', '..', '..', '..', 'logo.png');
    const logoBuffer = readFileSync(logoPath);
    return `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (error) {
    console.warn('Could not load logo for PDF:', error);
    return '';
  }
}

/**
 * POST /api/exports/annual-bonus-report/pdf
 * Export annual bonus report as PDF
 */
annualBonusExportRouter.post('/annual-bonus-report/pdf', requireAuth, async (req, res) => {
  try {
    const { year, includeConsultants, viewMode, exportMode, showHalves: clientShowHalves, data } = req.body;
    // Use server config if client doesn't specify, otherwise use client value
    const showHalves = clientShowHalves !== undefined ? clientShowHalves : shouldShowBonusHalves();
    
    if (!data || !data.categoryTotals) {
      return res.status(400).json({ error: 'Invalid report data' });
    }

    const roles = (req.user?.roles ?? []) as RoleName[];
    const canSee = canViewSalaryAmounts(roles);
    if (!canSee) {
      return res.status(403).json({ error: 'Annual bonus exports are restricted for this role' });
    }
    
    // Generate HTML based on export mode
    const html = generateAnnualBonusReportHTML(year, includeConsultants, viewMode, exportMode, data, showHalves);
    
    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
    });
    await browser.close();
    
    const filename = `Annual_Bonus_Report_${year}_${exportMode}.pdf`;
    await logAudit(req.user, 'EXPORT_ANNUAL_BONUS_PDF', 'report', undefined, { year, exportMode });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(pdf);
  } catch (error: any) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: `Failed to generate PDF: ${error.message}` });
  }
});

/**
 * POST /api/exports/annual-bonus-report/xlsx
 * Export annual bonus report as XLSX
 */
annualBonusExportRouter.post('/annual-bonus-report/xlsx', requireAuth, async (req, res) => {
  try {
    const { year, includeConsultants, viewMode, exportMode, showHalves: clientShowHalves, data } = req.body;
    // Use server config if client doesn't specify, otherwise use client value
    const showHalves = clientShowHalves !== undefined ? clientShowHalves : shouldShowBonusHalves();
    
    if (!data || !data.categoryTotals) {
      return res.status(400).json({ error: 'Invalid report data' });
    }

    const roles = (req.user?.roles ?? []) as RoleName[];
    const canSee = canViewSalaryAmounts(roles);
    if (!canSee) {
      return res.status(403).json({ error: 'Annual bonus exports are restricted for this role' });
    }
    
    const workbook = new ExcelJS.Workbook();
    
    // Define category order
    const categoryOrder = [
      'Partners/شركاء',
      'Lawyers/محامين',
      'Admins/عاملين',
      'Consultants/مستشارين'
    ];
    
    // Sort categories
    const sortedCategories = Object.entries(data.categoryTotals).sort(([catA], [catB]) => {
      const indexA = categoryOrder.indexOf(catA);
      const indexB = categoryOrder.indexOf(catB);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return catA.localeCompare(catB);
    });
    
    if (exportMode === 'by-category' || exportMode === 'table-only') {
      // Create summary sheet
      const summarySheet = workbook.addWorksheet('Summary');
      const columns: any[] = [
        { header: 'Category', key: 'category', width: 25 },
        { header: 'Employees', key: 'employees', width: 12 },
        { header: 'Total Bonus', key: 'totalBonus', width: 15 }
      ];
      if (showHalves) {
        columns.push(
          { header: 'First Half', key: 'firstHalf', width: 15 },
          { header: 'Second Half', key: 'secondHalf', width: 15 }
        );
      }
      columns.push(
        { header: 'Average Bonus', key: 'averageBonus', width: 15 },
        { header: 'Previous Year', key: 'previousYear', width: 15 }
      );
      summarySheet.columns = columns;
      
      sortedCategories.forEach(([category, totals]: [string, any]) => {
        const row: any = {
          category,
          employees: totals.employeeCount,
          totalBonus: totals.totalBonus,
          averageBonus: Math.round(totals.averageBonus),
          previousYear: totals.totalPreviousYear
        };
        if (showHalves) {
          row.firstHalf = totals.totalFirstHalf;
          row.secondHalf = totals.totalSecondHalf;
        }
        summarySheet.addRow(row);
      });
      
      // Add grand total row
      const grandTotalRow: any = {
        category: 'GRAND TOTAL',
        employees: data.grandTotal.employeeCount,
        totalBonus: data.grandTotal.totalBonus,
        averageBonus: Math.round(data.grandTotal.averageBonus),
        previousYear: data.grandTotal.totalPreviousYear
      };
      if (showHalves) {
        grandTotalRow.firstHalf = data.grandTotal.totalFirstHalf;
        grandTotalRow.secondHalf = data.grandTotal.totalSecondHalf;
      }
      summarySheet.addRow(grandTotalRow);
      
      // Format header row
      summarySheet.getRow(1).font = { bold: true };
      summarySheet.getRow(summarySheet.rowCount).font = { bold: true };
      
      // Format numbers
      summarySheet.getColumn('totalBonus').numFmt = '#,##0';
      if (showHalves) {
        summarySheet.getColumn('firstHalf').numFmt = '#,##0';
        summarySheet.getColumn('secondHalf').numFmt = '#,##0';
      }
      summarySheet.getColumn('averageBonus').numFmt = '#,##0';
      summarySheet.getColumn('previousYear').numFmt = '#,##0';
      
      // If by-category mode, add individual category sheets
      if (exportMode === 'by-category') {
        sortedCategories.forEach(([category, totals]: [string, any]) => {
          const categorySheet = workbook.addWorksheet(category.split('/')[0].substring(0, 31)); // Excel sheet name limit
          const categoryColumns: any[] = [
            { header: 'Employee', key: 'employee', width: 30 },
            { header: 'Total Bonus', key: 'bonus', width: 15 }
          ];
          if (showHalves) {
            categoryColumns.push(
              { header: 'First Half', key: 'firstHalf', width: 15 },
              { header: 'Second Half', key: 'secondHalf', width: 15 }
            );
          }
          categoryColumns.push(
            { header: 'Reflected (Months)', key: 'months', width: 18 },
            { header: 'Reflected (%)', key: 'percent', width: 15 }
          );
          categorySheet.columns = categoryColumns;
          
          (totals.employees || []).forEach((emp: any) => {
            const empRow: any = {
              employee: emp.employee?.name || 'Unknown',
              bonus: emp.bonus || 0,
              months: emp.reflectedInMonths ? emp.reflectedInMonths.toFixed(2) : '-',
              percent: emp.reflectedInPercent ? `${emp.reflectedInPercent.toFixed(2)}%` : '-'
            };
            if (showHalves) {
              empRow.firstHalf = emp.bonusFirstHalf || 0;
              empRow.secondHalf = emp.bonusSecondHalf || 0;
            }
            categorySheet.addRow(empRow);
          });
          
          // Add category total row
          const totalRow: any = {
            employee: `Total - ${category}`,
            bonus: totals.totalBonus,
            months: '-',
            percent: '-'
          };
          if (showHalves) {
            totalRow.firstHalf = totals.totalFirstHalf;
            totalRow.secondHalf = totals.totalSecondHalf;
          }
          categorySheet.addRow(totalRow);
          
          // Format header and total rows
          categorySheet.getRow(1).font = { bold: true };
          categorySheet.getRow(categorySheet.rowCount).font = { bold: true };
          
          // Format numbers
          categorySheet.getColumn('bonus').numFmt = '#,##0';
          if (showHalves) {
            categorySheet.getColumn('firstHalf').numFmt = '#,##0';
            categorySheet.getColumn('secondHalf').numFmt = '#,##0';
          }
        });
      }
    }
    
    const filename = `Annual_Bonus_Report_${year}_${exportMode}.xlsx`;
    await logAudit(req.user, 'EXPORT_ANNUAL_BONUS_XLSX', 'report', undefined, { year, exportMode });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('XLSX export error:', error);
    res.status(500).json({ error: `Failed to generate XLSX: ${error.message}` });
  }
});

function generateAnnualBonusReportHTML(
  year: number,
  includeConsultants: boolean,
  viewMode: string,
  exportMode: string,
  data: any,
  showHalves: boolean = false
): string {
  const logoBase64 = getLogoBase64();
  const { grandTotal, categoryTotals, growthRatios, categoryChartData } = data;
  
  // Define category order
  const categoryOrder = [
    'Partners/شركاء',
    'Lawyers/محامين',
    'Admins/عاملين',
    'Consultants/مستشارين'
  ];
  
  // Sort categories
  const sortedCategories = Object.entries(categoryTotals).sort(([catA], [catB]) => {
    const indexA = categoryOrder.indexOf(catA);
    const indexB = categoryOrder.indexOf(catB);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return catA.localeCompare(catB);
  });
  
  let content = '';
  
  // Summary section (if not by-category mode)
  if (exportMode !== 'by-category') {
    content += `
      <div style="margin-bottom: 20px;">
        <h2 style="text-align: center; margin-bottom: 20px;">Annual Bonus Report - ${year}</h2>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
          <div style="border: 2px solid #10b981; padding: 15px; border-radius: 8px;">
            <h3 style="font-size: 14px; color: #065f46; margin-bottom: 10px;">Total Bonus</h3>
            <p style="font-size: 24px; font-weight: bold; color: #059669;">${grandTotal.totalBonus.toLocaleString()}</p>
          </div>
          <div style="border: 2px solid #3b82f6; padding: 15px; border-radius: 8px;">
            <h3 style="font-size: 14px; color: #1e40af; margin-bottom: 10px;">Total Employees</h3>
            <p style="font-size: 24px; font-weight: bold; color: #2563eb;">${grandTotal.employeeCount}</p>
          </div>
          <div style="border: 2px solid #a855f7; padding: 15px; border-radius: 8px;">
            <h3 style="font-size: 14px; color: #6b21a8; margin-bottom: 10px;">Average Bonus</h3>
            <p style="font-size: 24px; font-weight: bold; color: #9333ea;">${Math.round(grandTotal.averageBonus).toLocaleString()}</p>
          </div>
          <div style="border: 2px solid #f97316; padding: 15px; border-radius: 8px;">
            <h3 style="font-size: 14px; color: #9a3412; margin-bottom: 10px;">Growth Ratio</h3>
            <p style="font-size: 24px; font-weight: bold; color: ${growthRatios?.netSalary && growthRatios.netSalary >= 0 ? '#059669' : '#dc2626'};">
              ${growthRatios?.netSalary !== null && growthRatios.netSalary !== undefined
                ? `${growthRatios.netSalary >= 0 ? '+' : ''}${growthRatios.netSalary.toFixed(2)}%`
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    `;
  }
  
  // Charts section (if table-with-charts mode)
  if (exportMode === 'table-with-charts' && categoryChartData && categoryChartData.length > 0) {
    // Find max value for scaling
    const maxBonus = Math.max(...categoryChartData.map((item: any) => item.totalBonus || 0));
    
    content += `
      <div style="margin-bottom: 20px;">
        <h3 style="margin-bottom: 15px;">Bonus by Category - Chart</h3>
        <div style="margin-bottom: 20px;">
          ${categoryChartData.map((item: any, index: number) => {
            const percentage = maxBonus > 0 ? (item.totalBonus / maxBonus) * 100 : 0;
            const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
            const color = colors[index % colors.length];
            return `
              <div style="margin-bottom: 15px;">
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                  <span style="width: 150px; font-weight: bold;">${item.name}</span>
                  <span style="margin-left: 10px; font-weight: bold;">${item.totalBonus.toLocaleString()}</span>
                </div>
                <div style="width: 100%; height: 30px; background-color: #e5e7eb; border-radius: 4px; overflow: hidden; position: relative;">
                  <div style="width: ${percentage}%; height: 100%; background-color: ${color}; transition: width 0.3s;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Category</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Total Bonus</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Employees</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Average Bonus</th>
            </tr>
          </thead>
          <tbody>
            ${categoryChartData.map((item: any) => `
              <tr>
                <td style="border: 1px solid #000; padding: 8px;">${item.name}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">${item.totalBonus.toLocaleString()}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${item.employeeCount}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${Math.round(item.averageBonus || 0).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  // Table section - respect viewMode
  if (exportMode === 'table-only' || exportMode === 'table-with-charts') {
    if (viewMode === 'consolidated') {
      // Consolidated view - summary table
      content += `
        <div style="margin-bottom: 20px;">
          <h3 style="margin-bottom: 15px;">Category Breakdown</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Category</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Employees</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Total Bonus</th>
                ${showHalves ? `
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">First Half</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Second Half</th>
                ` : ''}
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Average Bonus</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Previous Year</th>
              </tr>
            </thead>
            <tbody>
              ${sortedCategories.map(([category, totals]: [string, any]) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 8px;">${category}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${totals.employeeCount}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">${totals.totalBonus.toLocaleString()}</td>
                  ${showHalves ? `
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${totals.totalFirstHalf.toLocaleString()}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${totals.totalSecondHalf.toLocaleString()}</td>
                  ` : ''}
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${Math.round(totals.averageBonus).toLocaleString()}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${totals.totalPreviousYear.toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td style="border: 1px solid #000; padding: 8px;">Total</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${grandTotal.employeeCount}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${grandTotal.totalBonus.toLocaleString()}</td>
                ${showHalves ? `
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${grandTotal.totalFirstHalf.toLocaleString()}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${grandTotal.totalSecondHalf.toLocaleString()}</td>
                ` : ''}
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${Math.round(grandTotal.averageBonus).toLocaleString()}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${grandTotal.totalPreviousYear.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } else {
      // Individual view - detailed by category
      sortedCategories.forEach(([category, totals]: [string, any]) => {
        content += `
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <h3 style="margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 5px;">
              ${category} (${totals.employeeCount} employees)
            </h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="border: 1px solid #000; padding: 8px; text-align: left;">Employee</th>
                  <th style="border: 1px solid #000; padding: 8px; text-align: right;">Total Bonus</th>
                  ${showHalves ? `
                  <th style="border: 1px solid #000; padding: 8px; text-align: right;">First Half</th>
                  <th style="border: 1px solid #000; padding: 8px; text-align: right;">Second Half</th>
                  ` : ''}
                  <th style="border: 1px solid #000; padding: 8px; text-align: right;">Reflected (Months)</th>
                  <th style="border: 1px solid #000; padding: 8px; text-align: right;">Reflected (%)</th>
                </tr>
              </thead>
              <tbody>
                ${(totals.employees || []).map((emp: any) => `
                  <tr>
                    <td style="border: 1px solid #000; padding: 8px;">${emp.employee?.name || 'Unknown'}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">${(emp.bonus || 0).toLocaleString()}</td>
                    ${showHalves ? `
                    <td style="border: 1px solid #000; padding: 8px; text-align: right;">${emp.bonusFirstHalf?.toLocaleString() || '-'}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: right;">${emp.bonusSecondHalf?.toLocaleString() || '-'}</td>
                    ` : ''}
                    <td style="border: 1px solid #000; padding: 8px; text-align: right;">${emp.reflectedInMonths?.toFixed(2) || '-'}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: right;">${emp.reflectedInPercent?.toFixed(2) || '-'}%</td>
                  </tr>
                `).join('')}
                <tr style="background-color: #dbeafe; font-weight: bold;">
                  <td style="border: 1px solid #000; padding: 8px;">Total - ${category}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${totals.totalBonus.toLocaleString()}</td>
                  ${showHalves ? `
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${totals.totalFirstHalf.toLocaleString()}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${totals.totalSecondHalf.toLocaleString()}</td>
                  ` : ''}
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">-</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      });
      
      // Grand totals for individual view
      content += `
        <div style="margin-top: 30px; border: 2px solid #374151; padding: 15px; background-color: #f3f4f6;">
          <h3 style="margin-bottom: 15px; font-size: 18px;">Grand Totals</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #e5e7eb;">
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Metric</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Total Bonus</th>
                ${showHalves ? `
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">First Half</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Second Half</th>
                ` : ''}
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Average Bonus</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Previous Year</th>
              </tr>
            </thead>
            <tbody>
              <tr style="font-weight: bold;">
                <td style="border: 1px solid #000; padding: 8px;">All Categories</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right; color: #059669;">${grandTotal.totalBonus.toLocaleString()}</td>
                ${showHalves ? `
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${grandTotal.totalFirstHalf.toLocaleString()}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${grandTotal.totalSecondHalf.toLocaleString()}</td>
                ` : ''}
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${Math.round(grandTotal.averageBonus).toLocaleString()}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${grandTotal.totalPreviousYear.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 8px;">Total Employees</td>
                <td colSpan="${showHalves ? 5 : 3}" style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">${grandTotal.employeeCount}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }
  }
  
  // By-category section
  if (exportMode === 'by-category') {
    sortedCategories.forEach(([category, totals]: [string, any]) => {
      content += `
        <div style="margin-bottom: 30px; page-break-inside: avoid;">
          <h3 style="margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 5px;">
            ${category} (${totals.employeeCount} employees)
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Employee</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Total Bonus</th>
                ${showHalves ? `
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">First Half</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Second Half</th>
                ` : ''}
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Reflected (Months)</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Reflected (%)</th>
              </tr>
            </thead>
            <tbody>
              ${(totals.employees || []).map((emp: any) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 8px;">${emp.employee?.name || 'Unknown'}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">${(emp.bonus || 0).toLocaleString()}</td>
                  ${showHalves ? `
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${emp.bonusFirstHalf?.toLocaleString() || '-'}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${emp.bonusSecondHalf?.toLocaleString() || '-'}</td>
                  ` : ''}
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${emp.reflectedInMonths?.toFixed(2) || '-'}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${emp.reflectedInPercent?.toFixed(2) || '-'}%</td>
                </tr>
              `).join('')}
              <tr style="background-color: #dbeafe; font-weight: bold;">
                <td style="border: 1px solid #000; padding: 8px;">Total - ${category}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${totals.totalBonus.toLocaleString()}</td>
                ${showHalves ? `
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${totals.totalFirstHalf.toLocaleString()}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${totals.totalSecondHalf.toLocaleString()}</td>
                ` : ''}
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">-</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    });
    
    // Grand totals
    content += `
      <div style="margin-top: 30px; border: 2px solid #374151; padding: 15px; background-color: #f3f4f6;">
        <h3 style="margin-bottom: 15px; font-size: 18px;">Grand Totals</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #e5e7eb;">
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Metric</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Total Bonus</th>
              ${showHalves ? `
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">First Half</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Second Half</th>
              ` : ''}
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Average Bonus</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Previous Year</th>
            </tr>
          </thead>
          <tbody>
            <tr style="font-weight: bold;">
              <td style="border: 1px solid #000; padding: 8px;">All Categories</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right; color: #059669;">${grandTotal.totalBonus.toLocaleString()}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${grandTotal.totalFirstHalf.toLocaleString()}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${grandTotal.totalSecondHalf.toLocaleString()}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${Math.round(grandTotal.averageBonus).toLocaleString()}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${grandTotal.totalPreviousYear.toLocaleString()}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 8px;">Total Employees</td>
                <td colSpan="${showHalves ? 5 : 3}" style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">${grandTotal.employeeCount}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }
  
  return `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Annual Bonus Report - ${year}</title>
  <style>
    @page {
      @bottom-center {
        content: "P " counter(page) " of " counter(pages);
        font-size: 10px;
        color: #666;
      }
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      color: #000;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #000;
      padding: 8px;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
    }
    .logo {
      max-width: 150px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo" />` : ''}
  ${content}
  <div style="margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px;">
    Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
  </div>
</body>
</html>
  `;
}

