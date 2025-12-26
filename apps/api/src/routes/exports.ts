import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import { Readable } from 'stream';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
export const exportsRouter = Router();

// Get logo as base64 for PDF embedding
function getLogoBase64(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    // Path from apps/api/src/routes/exports.ts to root/logo.png
    // exports.ts -> routes -> src -> api -> apps -> root (4 levels up)
    const logoPath = join(__dirname, '..', '..', '..', '..', 'logo.png');
    const logoBuffer = readFileSync(logoPath);
    return `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (error) {
    console.warn('Could not load logo for PDF:', error);
    return ''; // Return empty string if logo not found
  }
}

/**
 * GET /api/exports/employee/:id/annual?year=YYYY&format=csv|xlsx|pdf
 */
exportsRouter.get('/employee/:id/annual', async (req, res) => {
  try {
    const format = (req.query.format as string) || 'csv';
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const employeeId = req.params.id;
    
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const salaries = await prisma.salaryRecord.findMany({
      where: {
        employeeId: employee.id,
        year
      },
      orderBy: { month: 'asc' }
    });
    
    switch (format) {
      case 'csv':
        return exportCSV(res, employee, salaries, year);
      case 'xlsx':
        return exportXLSX(res, employee, salaries, year);
      case 'pdf':
        return exportPDF(res, employee, salaries, year);
      default:
        return res.status(400).json({ error: 'Invalid format' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

function exportCSV(res: any, employee: any, salaries: any[], year: number) {
  const headers = ['Month', 'Basic Salary', 'Direct Additions', 'Indirect Additions', 
    'Yearly Increase', 'Bonuses', 'Salary Deductions', 'Total Deduction', 'Gross', 'Net'];
  
  // Escape CSV values (handle commas, quotes, newlines)
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  const rows = salaries.map(s => [
    escapeCSV(s.monthName),
    escapeCSV(s.basicSalary),
    escapeCSV(s.directAdditions),
    escapeCSV(s.indirectAdditions),
    escapeCSV(s.yearlyIncrease),
    escapeCSV(s.bonuses),
    escapeCSV(s.salaryDeductions),
    escapeCSV(s.grossDeductions),
    escapeCSV(s.gross),
    escapeCSV(s.net)
  ]);
  
  // Calculate totals
  const totals = salaries.reduce((acc, s) => ({
    basicSalary: acc.basicSalary + (s.basicSalary || 0),
    directAdditions: acc.directAdditions + (s.directAdditions || 0),
    indirectAdditions: acc.indirectAdditions + (s.indirectAdditions || 0),
    yearlyIncrease: acc.yearlyIncrease + (s.yearlyIncrease || 0),
    bonuses: acc.bonuses + (s.bonuses || 0),
    salaryDeductions: acc.salaryDeductions + (s.salaryDeductions || 0),
    grossDeductions: acc.grossDeductions + (s.grossDeductions || 0),
    gross: acc.gross + (s.gross || 0),
    net: acc.net + (s.net || 0)
  }), {
    basicSalary: 0,
    directAdditions: 0,
    indirectAdditions: 0,
    yearlyIncrease: 0,
    bonuses: 0,
    salaryDeductions: 0,
    grossDeductions: 0,
    gross: 0,
    net: 0
  });
  
  // Add totals row
  const totalsRow = [
    'TOTAL',
    totals.basicSalary,
    totals.directAdditions,
    totals.indirectAdditions,
    totals.yearlyIncrease,
    totals.bonuses,
    totals.salaryDeductions,
    totals.grossDeductions,
    totals.gross,
    totals.net
  ].map(escapeCSV);
  
  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map(r => r.join(',')),
    totalsRow.join(',')
  ].join('\n');
  
  // Use UTF-8 BOM for Excel compatibility
  const bom = '\uFEFF';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(employee.name)}_${year}.csv"`);
  res.send(bom + csv);
}

async function exportXLSX(res: any, employee: any, salaries: any[], year: number) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Annual Report');
    
    // Add headers with styling
    const headerRow = worksheet.addRow(['Month', 'Basic Salary', 'Direct Additions', 'Indirect Additions',
      'Yearly Increase', 'Bonuses', 'Salary Deductions', 'Total Deduction', 'Gross', 'Net']);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add data
    salaries.forEach(s => {
      worksheet.addRow([
        s.monthName,
        s.basicSalary,
        s.directAdditions,
        s.indirectAdditions,
        s.yearlyIncrease,
        s.bonuses,
        s.salaryDeductions,
        s.grossDeductions,
        s.gross,
        s.net
      ]);
    });
    
    // Calculate totals
    const totals = salaries.reduce((acc, s) => ({
      basicSalary: acc.basicSalary + (s.basicSalary || 0),
      directAdditions: acc.directAdditions + (s.directAdditions || 0),
      indirectAdditions: acc.indirectAdditions + (s.indirectAdditions || 0),
      yearlyIncrease: acc.yearlyIncrease + (s.yearlyIncrease || 0),
      bonuses: acc.bonuses + (s.bonuses || 0),
      salaryDeductions: acc.salaryDeductions + (s.salaryDeductions || 0),
      grossDeductions: acc.grossDeductions + (s.grossDeductions || 0),
      gross: acc.gross + (s.gross || 0),
      net: acc.net + (s.net || 0)
    }), {
      basicSalary: 0,
      directAdditions: 0,
      indirectAdditions: 0,
      yearlyIncrease: 0,
      bonuses: 0,
      salaryDeductions: 0,
      grossDeductions: 0,
      gross: 0,
      net: 0
    });
    
    // Add totals row with styling
    const totalsRow = worksheet.addRow([
      'TOTAL',
      totals.basicSalary,
      totals.directAdditions,
      totals.indirectAdditions,
      totals.yearlyIncrease,
      totals.bonuses,
      totals.salaryDeductions,
      totals.grossDeductions,
      totals.gross,
      totals.net
    ]);
    totalsRow.font = { bold: true };
    totalsRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' }
    };
    
    // Auto-fit columns
    worksheet.columns.forEach((column, index) => {
      column.width = index === 0 ? 15 : 18;
      if (index > 0) {
        column.numFmt = '#,##0.00';
      }
    });
    
    // Set filename (sanitize for filesystem)
    const safeName = employee.name.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '_').substring(0, 50);
    const filename = `${safeName}_${year}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('XLSX export error:', error);
    res.status(500).json({ error: `Failed to generate XLSX: ${error.message}` });
  }
}

async function exportPDF(res: any, employee: any, salaries: any[], year: number) {
  try {
    // Generate HTML
    const html = generateEmployeeReportHTML(employee, salaries, year);
    
    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // For server environments
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
    });
    await browser.close();
    
    // Set filename (sanitize for filesystem)
    const safeName = employee.name.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '_').substring(0, 50);
    const filename = `${safeName}_${year}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(pdf);
  } catch (error: any) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: `Failed to generate PDF: ${error.message}` });
  }
}

function generateEmployeeReportHTML(employee: any, salaries: any[], year: number): string {
  // Calculate totals
  const totals = salaries.reduce((acc, s) => ({
    basicSalary: acc.basicSalary + (s.basicSalary || 0),
    directAdditions: acc.directAdditions + (s.directAdditions || 0),
    indirectAdditions: acc.indirectAdditions + (s.indirectAdditions || 0),
    yearlyIncrease: acc.yearlyIncrease + (s.yearlyIncrease || 0),
    bonuses: acc.bonuses + (s.bonuses || 0),
    salaryDeductions: acc.salaryDeductions + (s.salaryDeductions || 0),
    grossDeductions: acc.grossDeductions + (s.grossDeductions || 0),
    gross: acc.gross + (s.gross || 0),
    net: acc.net + (s.net || 0)
  }), {
    basicSalary: 0,
    directAdditions: 0,
    indirectAdditions: 0,
    yearlyIncrease: 0,
    bonuses: 0,
    salaryDeductions: 0,
    grossDeductions: 0,
    gross: 0,
    net: 0
  });
  
  const logoBase64 = getLogoBase64();
  const logoImg = logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="height: 40px; margin-bottom: 10px;" />` : '';
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${employee.name} - ${year}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .header { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
    th { background-color: #f2f2f2; }
    .totals-row { background-color: #f0f0f0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    ${logoImg}
    <h1>${employee.name} - ${year}</h1>
  </div>
  <table>
    <thead>
      <tr>
        <th>الشهر</th>
        <th>الراتب الأساسي</th>
        <th>الإضافات المباشرة</th>
        <th>الإضافات غير المباشرة</th>
        <th>الزيادة السنوية</th>
        <th>العلاوات</th>
        <th>الخصومات</th>
        <th>الإجمالي</th>
        <th>الصافي</th>
      </tr>
    </thead>
    <tbody>
      ${salaries.map(s => `
        <tr>
          <td>${s.monthName}</td>
          <td>${s.basicSalary || 0}</td>
          <td>${s.directAdditions || 0}</td>
          <td>${s.indirectAdditions || 0}</td>
          <td>${s.yearlyIncrease || 0}</td>
          <td>${s.bonuses || 0}</td>
          <td>${(s.salaryDeductions || 0) + (s.grossDeductions || 0)}</td>
          <td>${s.gross || 0}</td>
          <td>${s.net || 0}</td>
        </tr>
      `).join('')}
      <tr class="totals-row">
        <td>المجموع</td>
        <td>${totals.basicSalary}</td>
        <td>${totals.directAdditions}</td>
        <td>${totals.indirectAdditions}</td>
        <td>${totals.yearlyIncrease}</td>
        <td>${totals.bonuses}</td>
        <td>${totals.salaryDeductions + totals.grossDeductions}</td>
        <td>${totals.gross}</td>
        <td>${totals.net}</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
  `;
}

/**
 * GET /api/exports/salary-changes?year=YYYY&format=pdf
 * Export salary changes report as PDF
 */
exportsRouter.get('/salary-changes', async (req, res) => {
  try {
    const format = (req.query.format as string) || 'pdf';
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    
    if (format !== 'pdf') {
      return res.status(400).json({ error: 'Only PDF format is supported for salary changes report' });
    }
    
    // Get salary changes data
    const employees = await prisma.employee.findMany({
      include: {
        salaries: {
          where: { year },
          orderBy: { month: 'asc' }
        }
      }
    });
    
    const changes: any[] = [];
    
    for (const employee of employees) {
      const salaries = employee.salaries;
      if (salaries.length < 2) continue;
      
      for (let i = 1; i < salaries.length; i++) {
        const prev = salaries[i - 1];
        const curr = salaries[i];
        
        if (prev.basicSalary !== curr.basicSalary) {
          changes.push({
            employee: {
              name: employee.name,
              category: employee.category
            },
            month: curr.month,
            monthName: curr.monthName,
            previousBasicSalary: prev.basicSalary,
            newBasicSalary: curr.basicSalary,
            change: curr.basicSalary - prev.basicSalary
          });
        }
      }
    }
    
    // Calculate totals
    const totals = changes.reduce((acc, c) => ({
      previousBasicSalary: acc.previousBasicSalary + (c.previousBasicSalary || 0),
      newBasicSalary: acc.newBasicSalary + (c.newBasicSalary || 0),
      change: acc.change + (c.change || 0)
    }), {
      previousBasicSalary: 0,
      newBasicSalary: 0,
      change: 0
    });
    
    return exportSalaryChangesPDF(res, changes, totals, year);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function exportSalaryChangesPDF(res: any, changes: any[], totals: any, year: number) {
  try {
    const html = generateSalaryChangesHTML(changes, totals, year);
    
    const browser = await puppeteer.launch({ 
      headless: true,
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
    
    const filename = `Salary_Changes_${year}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(pdf);
  } catch (error: any) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: `Failed to generate PDF: ${error.message}` });
  }
}

function generateSalaryChangesHTML(changes: any[], totals: any, year: number): string {
  const logoBase64 = getLogoBase64();
  const logoImg = logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="height: 40px; margin-bottom: 10px;" />` : '';
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>Salary Changes Report - ${year}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .header { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
    th { background-color: #f2f2f2; font-weight: bold; }
    .totals-row { background-color: #f0f0f0; font-weight: bold; }
    .positive { color: #059669; }
    .negative { color: #dc2626; }
  </style>
</head>
<body>
  <div class="header">
    ${logoImg}
    <h1>تقرير تغييرات الرواتب - ${year}</h1>
    <h1 style="margin-right: 20px;">Salary Changes Report - ${year}</h1>
  </div>
  <p style="margin-bottom: 10px;"><strong>Total Changes:</strong> ${changes.length}</p>
  <table>
    <thead>
      <tr>
        <th>الاسم / Name</th>
        <th>الشهر / Month</th>
        <th>الراتب السابق / Previous Basic Salary</th>
        <th>الراتب الجديد / New Basic Salary</th>
        <th>التغيير / Change</th>
      </tr>
    </thead>
    <tbody>
      ${changes.map(c => `
        <tr>
          <td>${c.employee?.name || 'N/A'}</td>
          <td>${c.monthName || 'N/A'}</td>
          <td>${(c.previousBasicSalary || 0).toLocaleString()}</td>
          <td>${(c.newBasicSalary || 0).toLocaleString()}</td>
          <td class="${c.change > 0 ? 'positive' : c.change < 0 ? 'negative' : ''}">
            ${c.change > 0 ? '+' : ''}${(c.change || 0).toLocaleString()}
          </td>
        </tr>
      `).join('')}
      <tr class="totals-row">
        <td colspan="2"><strong>المجموع / GRAND TOTAL</strong></td>
        <td><strong>${(totals.previousBasicSalary || 0).toLocaleString()}</strong></td>
        <td><strong>${(totals.newBasicSalary || 0).toLocaleString()}</strong></td>
        <td class="${totals.change > 0 ? 'positive' : totals.change < 0 ? 'negative' : ''}">
          <strong>${totals.change > 0 ? '+' : ''}${(totals.change || 0).toLocaleString()}</strong>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>
  `;
}

