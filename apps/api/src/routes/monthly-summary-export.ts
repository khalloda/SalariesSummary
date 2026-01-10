import { Router } from 'express';
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { canViewSalaryAmounts, type RoleName } from '../utils/auth.js';
import { logAudit } from '../utils/audit.js';
import { validateBody } from '../validation/middleware.js';
import { MonthlySummaryExportBodySchema } from '../validation/schemas/exports.js';

export const monthlySummaryExportRouter = Router();

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
 * POST /api/exports/monthly-summary/pdf
 * Export monthly summary report as PDF
 */
monthlySummaryExportRouter.post('/monthly-summary/pdf',
  validateBody(MonthlySummaryExportBodySchema),
  async (req, res) => {
  try {
    const { year, data } = req.body;

    const roles = (req.user?.roles ?? []) as RoleName[];
    const canSee = canViewSalaryAmounts(roles);
    if (!canSee) {
      return res.status(403).json({ error: 'Monthly summary exports are restricted for this role' });
    }
    
    const html = generateMonthlySummaryHTML(year, data);
    
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
    
    const filename = `Monthly_Summary_${year}.pdf`;
    await logAudit(req.user, 'EXPORT_MONTHLY_SUMMARY_PDF', 'report', undefined, { year });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(pdf);
  } catch (error: any) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: `Failed to generate PDF: ${error.message}` });
  }
});

/**
 * POST /api/exports/monthly-summary/xlsx
 * Export monthly summary report as XLSX
 */
monthlySummaryExportRouter.post('/monthly-summary/xlsx',
  validateBody(MonthlySummaryExportBodySchema),
  async (req, res) => {
  try {
    const { year, data } = req.body;

    const roles = (req.user?.roles ?? []) as RoleName[];
    const canSee = canViewSalaryAmounts(roles);
    if (!canSee) {
      return res.status(403).json({ error: 'Monthly summary exports are restricted for this role' });
    }
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Monthly Summary');
    
    worksheet.columns = [
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Employees', key: 'employees', width: 12 },
      { header: 'Basic Salary', key: 'basicSalary', width: 15 },
      { header: 'Gross', key: 'gross', width: 15 },
      { header: 'Net', key: 'net', width: 15 },
      { header: 'Additions', key: 'additions', width: 15 },
      { header: 'Deductions', key: 'deductions', width: 15 }
    ];
    
    data.monthlyData.forEach((month: any) => {
      worksheet.addRow({
        month: month.monthName,
        employees: month.employeeCount,
        basicSalary: month.basicSalary,
        gross: month.gross,
        net: month.net,
        additions: (month.directAdditions + month.indirectAdditions + month.bonuses),
        deductions: (month.salaryDeductions + month.grossDeductions)
      });
    });
    
    // Add totals row
    worksheet.addRow({
      month: 'TOTAL',
      employees: '-',
      basicSalary: data.totals.basicSalary,
      gross: data.totals.gross,
      net: data.totals.net,
      additions: (data.totals.directAdditions + data.totals.indirectAdditions + data.totals.bonuses),
      deductions: (data.totals.salaryDeductions + data.totals.grossDeductions)
    });
    
    // Format header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(worksheet.rowCount).font = { bold: true };
    
    // Format numbers
    worksheet.getColumn('basicSalary').numFmt = '#,##0';
    worksheet.getColumn('gross').numFmt = '#,##0';
    worksheet.getColumn('net').numFmt = '#,##0';
    worksheet.getColumn('additions').numFmt = '#,##0';
    worksheet.getColumn('deductions').numFmt = '#,##0';
    
    const filename = `Monthly_Summary_${year}.xlsx`;
    await logAudit(req.user, 'EXPORT_MONTHLY_SUMMARY_XLSX', 'report', undefined, { year });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('XLSX export error:', error);
    res.status(500).json({ error: `Failed to generate XLSX: ${error.message}` });
  }
});

function generateMonthlySummaryHTML(year: number, data: any): string {
  const logoBase64 = getLogoBase64();
  const { monthlyData, totals } = data;
  
  let content = `
    <div style="margin-bottom: 20px;">
      <h2 style="text-align: center; margin-bottom: 20px;">Monthly Summary Report - ${year}</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="border: 1px solid #000; padding: 8px; text-align: left;">Month</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: right;">Employees</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: right;">Basic Salary</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: right;">Gross</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: right;">Net</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: right;">Additions</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: right;">Deductions</th>
          </tr>
        </thead>
        <tbody>
          ${monthlyData.map((month: any) => `
            <tr>
              <td style="border: 1px solid #000; padding: 8px;">${month.monthName}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${month.employeeCount}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${month.basicSalary.toLocaleString()}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${month.gross.toLocaleString()}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">${month.net.toLocaleString()}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right; color: #059669;">${((month.directAdditions || 0) + (month.indirectAdditions || 0) + (month.bonuses || 0)).toLocaleString()}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right; color: #dc2626;">${((month.salaryDeductions || 0) + (month.grossDeductions || 0)).toLocaleString()}</td>
            </tr>
          `).join('')}
          <tr style="background-color: #f3f4f6; font-weight: bold;">
            <td style="border: 1px solid #000; padding: 8px;">TOTAL</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right;">-</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right;">${totals.basicSalary.toLocaleString()}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right;">${totals.gross.toLocaleString()}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right;">${totals.net.toLocaleString()}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right; color: #059669;">${((totals.directAdditions || 0) + (totals.indirectAdditions || 0) + (totals.bonuses || 0)).toLocaleString()}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right; color: #dc2626;">${((totals.salaryDeductions || 0) + (totals.grossDeductions || 0)).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  
  return `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monthly Summary Report - ${year}</title>
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

