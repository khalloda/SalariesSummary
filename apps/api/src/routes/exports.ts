import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import { Readable } from 'stream';

const prisma = new PrismaClient();
export const exportsRouter = Router();

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
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${employee.name} - ${year}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
    th { background-color: #f2f2f2; }
    .totals-row { background-color: #f0f0f0; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${employee.name} - ${year}</h1>
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

