import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
export const employeeCardExportRouter = Router();

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
 * POST /api/exports/employee-card/pdf
 * Export employee card as PDF
 */
employeeCardExportRouter.post('/employee-card/pdf', async (req, res) => {
  try {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }
    
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        salaries: {
          orderBy: [
            { year: 'desc' },
            { month: 'desc' }
          ],
          take: 12 // Last 12 months
        },
        personnelRecord: true
      }
    });
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Generate HTML
    const html = generateEmployeeCardHTML(employee);
    
    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
    });
    await browser.close();
    
    const safeName = (employee.name || 'Employee').replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '_').substring(0, 50);
    const filename = `Employee_Card_${safeName}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(pdf);
  } catch (error: any) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: `Failed to generate PDF: ${error.message}` });
  }
});

/**
 * POST /api/exports/employee-card/xlsx
 * Export employee card as XLSX
 */
employeeCardExportRouter.post('/employee-card/xlsx', async (req, res) => {
  try {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }
    
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        salaries: {
          orderBy: [
            { year: 'desc' },
            { month: 'desc' }
          ],
          take: 12 // Last 12 months
        },
        personnelRecord: true
      }
    });
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employee Card');
    
    // Header row with logo placeholder
    worksheet.mergeCells('A1:B1');
    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;
    headerRow.getCell(1).value = 'Employee Card';
    headerRow.getCell(1).font = { size: 16, bold: true };
    headerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    
    // Helper function to format large numbers
    const formatLargeNumberXLSX = (value: string | number | null | undefined) => {
      // Format ID numbers without commas
      if (!value && value !== 0) return 'N/A';
      
      // Convert to number if it's a string
      let num: number;
      if (typeof value === 'number') {
        num = value;
      } else {
        // Remove any existing commas from string
        const cleanStr = String(value).replace(/,/g, '');
        num = parseFloat(cleanStr);
        if (isNaN(num)) {
          // If it's not a valid number, return the original string without commas
          return cleanStr;
        }
      }
      
      // Always format without commas (useGrouping: false)
      return num.toLocaleString('en-US', { maximumFractionDigits: 0, useGrouping: false });
    };
    
    // Helper function to calculate work duration
    const calculateWorkDurationXLSX = (joiningDate: Date | string | null) => {
      if (!joiningDate) return 'N/A';
      const start = new Date(joiningDate);
      const end = new Date();
      if (isNaN(start.getTime())) return 'N/A';
      
      let years = end.getFullYear() - start.getFullYear();
      let months = end.getMonth() - start.getMonth();
      let days = end.getDate() - start.getDate();
      
      if (days < 0) {
        months--;
        const lastMonth = new Date(end.getFullYear(), end.getMonth(), 0);
        days += lastMonth.getDate();
      }
      
      if (months < 0) {
        years--;
        months += 12;
      }
      
      const parts: string[] = [];
      if (years > 0) parts.push(`${years} Year${years !== 1 ? 's' : ''}`);
      if (months > 0) parts.push(`${months} Month${months !== 1 ? 's' : ''}`);
      if (days > 0) parts.push(`${days} Day${days !== 1 ? 's' : ''}`);
      
      return parts.length > 0 ? parts.join(', ') : 'Less than 1 day';
    };
    
    // Top box: System ID and Category
    worksheet.mergeCells('A2:B2');
    const topBoxRow = worksheet.getRow(2);
    topBoxRow.height = 25;
    topBoxRow.getCell(1).value = `System ID: ${employee.employeeCode || 'N/A'} | Category: ${employee.category || 'N/A'}`;
    topBoxRow.getCell(1).font = { size: 12, bold: true };
    topBoxRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE3F2FD' }
    };
    topBoxRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Section headers
    let currentRow = 4;
    
    // Basic Info
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    const basicInfoHeader = worksheet.getRow(currentRow);
    basicInfoHeader.getCell(1).value = 'Basic Info';
    basicInfoHeader.getCell(1).font = { size: 12, bold: true };
    basicInfoHeader.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' }
    };
    currentRow++;
    
    const basicInfoData = [
      ['Name', employee.name || 'N/A'],
      ['Name (Arabic)', employee.nameArabic || 'N/A'],
      ['Joining Date', employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : 'N/A'],
      ['Job Title', employee.jobTitle || 'N/A'],
      ['Department', employee.department || 'N/A'],
      ['Date of Birth', employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : 'N/A'],
      ['Mobile Number', employee.mobileNumber || 'N/A']
    ];
    
    basicInfoData.forEach(([label, value]) => {
      worksheet.getRow(currentRow).getCell(1).value = label;
      worksheet.getRow(currentRow).getCell(1).font = { bold: true };
      worksheet.getRow(currentRow).getCell(2).value = value;
      currentRow++;
    });
    
    currentRow++; // Spacing
    
    // Education
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    const educationHeader = worksheet.getRow(currentRow);
    educationHeader.getCell(1).value = 'Education';
    educationHeader.getCell(1).font = { size: 12, bold: true };
    educationHeader.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' }
    };
    currentRow++;
    
    const educationData = [
      ['Certificate', employee.graduationCertificate || 'N/A'],
      ['Section', employee.graduationSection || 'N/A'],
      ['University', employee.graduationUniversity || 'N/A'],
      ['Graduation Year', employee.graduationYear || 'N/A']
    ];
    
    educationData.forEach(([label, value]) => {
      worksheet.getRow(currentRow).getCell(1).value = label;
      worksheet.getRow(currentRow).getCell(1).font = { bold: true };
      worksheet.getRow(currentRow).getCell(2).value = value;
      currentRow++;
    });
    
    currentRow++; // Spacing
    
    // IDs
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    const idsHeader = worksheet.getRow(currentRow);
    idsHeader.getCell(1).value = 'IDs';
    idsHeader.getCell(1).font = { size: 12, bold: true };
    idsHeader.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' }
    };
    currentRow++;
    
    const idsData = [
      ['National ID', formatLargeNumberXLSX(employee.nationalId)],
      ['National ID Valid Till', formatDateOrNotSpecified(employee.nationalIdValidTill)],
      ['Bar Association No.', formatLargeNumberXLSX(employee.barAssociation)],
      ['درجة القيد', employee.barAssociationDegree || 'N/A'],
      ['Tax Card No.', employee.taxCard || 'N/A'],
      ['Social Insurance', formatLargeNumberXLSX(employee.socialInsurance)]
    ];
    
    idsData.forEach(([label, value]) => {
      worksheet.getRow(currentRow).getCell(1).value = label;
      worksheet.getRow(currentRow).getCell(1).font = { bold: true };
      worksheet.getRow(currentRow).getCell(2).value = value;
      currentRow++;
    });
    
    currentRow++; // Spacing
    
    // Address
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    const addressHeader = worksheet.getRow(currentRow);
    addressHeader.getCell(1).value = 'Address';
    addressHeader.getCell(1).font = { size: 12, bold: true };
    addressHeader.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' }
    };
    currentRow++;
    
    const addressData = [
      ['Address Details', employee.address || 'N/A'],
      ['Region / City', employee.addressRegion || 'N/A'],
      ['Governorate', employee.addressGovernorate || 'N/A']
    ];
    
    addressData.forEach(([label, value]) => {
      worksheet.getRow(currentRow).getCell(1).value = label;
      worksheet.getRow(currentRow).getCell(1).font = { bold: true };
      worksheet.getRow(currentRow).getCell(2).value = value;
      currentRow++;
    });
    
    currentRow++; // Spacing
    
    // Contract
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    const contractHeader = worksheet.getRow(currentRow);
    contractHeader.getCell(1).value = 'Contract';
    contractHeader.getCell(1).font = { size: 12, bold: true };
    contractHeader.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' }
    };
    currentRow++;
    
    const contractData = [
      ['Contract Type', employee.contractType || 'N/A'],
      ['Work Duration', calculateWorkDurationXLSX(employee.joiningDate)],
      ['Next Renewal Date', employee.contractRenewalDate ? new Date(employee.contractRenewalDate).toLocaleDateString() : 'Not Specified']
    ];
    
    contractData.forEach(([label, value]) => {
      worksheet.getRow(currentRow).getCell(1).value = label;
      worksheet.getRow(currentRow).getCell(1).font = { bold: true };
      worksheet.getRow(currentRow).getCell(2).value = value;
      currentRow++;
    });
    
    currentRow++; // Spacing
    
    // Salary - Last Salary Details
    if (employee.salaries && employee.salaries.length > 0) {
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      const salaryHeader = worksheet.getRow(currentRow);
      salaryHeader.getCell(1).value = 'Last Salary Details';
      salaryHeader.getCell(1).font = { size: 12, bold: true };
      salaryHeader.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F5F5' }
      };
      currentRow++;
      
      // Salary table headers
      const salaryHeaders = ['Month', 'Year', 'Basic Salary', 'Gross', 'Net'];
      salaryHeaders.forEach((header, idx) => {
        worksheet.getRow(currentRow).getCell(idx + 1).value = header;
        worksheet.getRow(currentRow).getCell(idx + 1).font = { bold: true };
        worksheet.getRow(currentRow).getCell(idx + 1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      });
      currentRow++;
      
      // Salary data
      employee.salaries.forEach(salary => {
        worksheet.getRow(currentRow).getCell(1).value = salary.monthName || `${salary.month}/${salary.year}`;
        worksheet.getRow(currentRow).getCell(2).value = salary.year;
        worksheet.getRow(currentRow).getCell(3).value = salary.basicSalary || 0;
        worksheet.getRow(currentRow).getCell(4).value = salary.gross || 0;
        worksheet.getRow(currentRow).getCell(5).value = salary.net || 0;
        
        // Format numbers
        worksheet.getRow(currentRow).getCell(3).numFmt = '#,##0.00';
        worksheet.getRow(currentRow).getCell(4).numFmt = '#,##0.00';
        worksheet.getRow(currentRow).getCell(5).numFmt = '#,##0.00';
        
        currentRow++;
      });
    }
    
    currentRow++; // Spacing
    
    // Personnel
    if (employee.personnelRecord) {
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      const personnelHeader = worksheet.getRow(currentRow);
      personnelHeader.getCell(1).value = 'Personnel';
      personnelHeader.getCell(1).font = { size: 12, bold: true };
      personnelHeader.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F5F5' }
      };
      currentRow++;
      
      const personnelData = [
        ['Criminal Record', employee.personnelRecord.criminalRecord || 'N/A'],
        ['Military Certificate', employee.personnelRecord.militaryCertificate || 'N/A'],
        ['ID Copy', employee.personnelRecord.idCopy ? 'Present' : 'Missing'],
        ['Education Certificate', employee.personnelRecord.educationCertificate || 'N/A'],
        ['Birth Certificate', employee.personnelRecord.birthCertificate || 'N/A'],
        ['Recommendation Letter', employee.personnelRecord.recommendationLetter ? 'Present' : 'Missing'],
        ['Personal Photos', employee.personnelRecord.personalPhotos ? 'Present' : 'Missing'],
        ['Tax Card', employee.personnelRecord.taxCard ? 'Present' : 'Missing'],
        ['Association ID', employee.personnelRecord.associationId ? 'Present' : 'Missing'],
        ['Form 6', employee.personnelRecord.form6 || 'N/A'],
        ['Asset (Laptop/PC/Tablet)', employee.personnelRecord.laptopPcTablet ? (
          (() => {
            try {
              const assets = JSON.parse(employee.personnelRecord.laptopPcTablet);
              return Array.isArray(assets) ? assets.join(', ') : employee.personnelRecord.laptopPcTablet;
            } catch {
              return employee.personnelRecord.laptopPcTablet;
            }
          })()
        ) : 'None'],
        ['Work Stub', employee.personnelRecord.workStub || 'N/A'],
        ['Insurance Start Date', formatDateOrNotSpecified(employee.personnelRecord.insuranceStartDate)]
      ];
      
      personnelData.forEach(([label, value]) => {
        worksheet.getRow(currentRow).getCell(1).value = label;
        worksheet.getRow(currentRow).getCell(1).font = { bold: true };
        worksheet.getRow(currentRow).getCell(2).value = value;
        currentRow++;
      });
    }
    
    // Set column widths
    worksheet.getColumn(1).width = 25;
    worksheet.getColumn(2).width = 40;
    if (employee.salaries && employee.salaries.length > 0) {
      worksheet.getColumn(3).width = 15;
      worksheet.getColumn(4).width = 15;
      worksheet.getColumn(5).width = 15;
    }
    
    const safeName = (employee.name || 'Employee').replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '_').substring(0, 50);
    const filename = `Employee_Card_${safeName}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('XLSX export error:', error);
    res.status(500).json({ error: `Failed to generate XLSX: ${error.message}` });
  }
});

function generateEmployeeCardHTML(employee: any): string {
  const logoBase64 = getLogoBase64();
  const logoImg = logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="height: 40px;" />` : '';
  
  // Get current date and time
  const now = new Date();
  const printDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const printTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  
  const formatDateOrNotSpecified = (date: Date | string | null) => {
    if (!date) return 'Not Specified';
    const parsedDate = new Date(date);
    // Reject placeholder dates like January 1, 2000
    if (parsedDate.getFullYear() === 2000 && parsedDate.getMonth() === 0 && parsedDate.getDate() === 1) {
      return 'Not Specified';
    }
    if (isNaN(parsedDate.getTime())) return 'Not Specified';
    return parsedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '0.00';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const formatLargeNumber = (value: string | number | null | undefined) => {
    // Format ID numbers without commas
    if (!value && value !== 0) return 'N/A';
    
    // Convert to number if it's a string
    let num: number;
    if (typeof value === 'number') {
      num = value;
    } else {
      // Remove any existing commas from string
      const cleanStr = String(value).replace(/,/g, '');
      num = parseFloat(cleanStr);
      if (isNaN(num)) {
        // If it's not a valid number, return the original string without commas
        return cleanStr;
      }
    }
    
    // Always format without commas (useGrouping: false)
    return num.toLocaleString('en-US', { maximumFractionDigits: 0, useGrouping: false });
  };
  
  const calculateWorkDuration = (joiningDate: Date | string | null) => {
    if (!joiningDate) return 'N/A';
    
    const start = new Date(joiningDate);
    const end = new Date();
    
    if (isNaN(start.getTime())) return 'N/A';
    
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();
    
    if (days < 0) {
      months--;
      const lastMonth = new Date(end.getFullYear(), end.getMonth(), 0);
      days += lastMonth.getDate();
    }
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    const parts: string[] = [];
    if (years > 0) parts.push(`${years} Year${years !== 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} Month${months !== 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} Day${days !== 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : 'Less than 1 day';
  };
  
  return `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="UTF-8">
  <title>Employee Card - ${employee.name || 'Employee'}</title>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 15mm;
      }
      body { margin: 0; }
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
    }
    
    .card-container {
      background: white;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      position: relative;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      background: white;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 20px;
    }
    
    .header-logo {
      flex-shrink: 0;
    }
    
    .header-title {
      flex: 1;
      text-align: center;
    }
    
    .header-title h1 {
      font-size: 24px;
      color: #2c3e50;
      margin: 0;
      font-weight: bold;
    }
    
    .header-date {
      flex-shrink: 0;
      text-align: right;
      font-size: 12px;
      color: #666;
    }
    
    .header-date .date {
      font-weight: bold;
      margin-bottom: 2px;
    }
    
    .header-date .time {
      font-size: 11px;
    }
    
    .top-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 25px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .top-box-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .top-box .info-item {
      display: flex;
      flex-direction: column;
    }
    
    .top-box .label {
      font-size: 11px;
      opacity: 0.9;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .top-box .value {
      font-size: 16px;
      font-weight: bold;
    }
    
    .top-box-name {
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.3);
      padding-top: 15px;
      margin-top: 15px;
    }
    
    .top-box-name .name {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .top-box-name .name-arabic {
      font-size: 20px;
      opacity: 0.95;
    }
    
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    .info-table td {
      padding: 12px 15px;
      border: 1px solid #e0e0e0;
      vertical-align: top;
    }
    
    .info-table .section-label {
      background: #f8f9fa;
      font-weight: bold;
      font-size: 13px;
      color: #495057;
      width: 200px;
      border-right: 2px solid #667eea;
    }
    
    .info-table .section-content {
      background: white;
    }
    
    .info-table .field-row {
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .info-table .field-row:last-child {
      border-bottom: none;
    }
    
    .info-table .field-label {
      font-weight: 600;
      color: #666;
      display: inline-block;
      width: 140px;
      font-size: 12px;
    }
    
    .info-table .field-value {
      color: #333;
      font-size: 13px;
    }
    
    .salary-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    .salary-table th,
    .salary-table td {
      padding: 10px;
      text-align: left;
      border: 1px solid #e0e0e0;
    }
    
    .salary-table th {
      background: #667eea;
      color: white;
      font-weight: bold;
      font-size: 12px;
    }
    
    .salary-table tr:nth-child(even) {
      background: #f8f9fa;
    }
    
    .salary-table td {
      font-size: 12px;
    }
    
    .no-data {
      color: #999;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="card-container">
    <div class="header">
      <div class="header-logo">
        ${logoImg}
      </div>
      <div class="header-title">
        <h1>Employee Card</h1>
      </div>
      <div class="header-date">
        <div class="date">${printDate}</div>
        <div class="time">${printTime}</div>
      </div>
    </div>
    
    <div class="top-box">
      <div class="top-box-row">
        <div class="info-item">
          <span class="label">System ID No.</span>
          <span class="value">${employee.employeeCode || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="label">Category</span>
          <span class="value">${employee.category || 'N/A'}</span>
        </div>
      </div>
      <div class="top-box-name">
        <div class="name">${employee.name || 'N/A'}</div>
        ${employee.nameArabic ? `<div class="name-arabic">${employee.nameArabic}</div>` : ''}
      </div>
    </div>
    
    <table class="info-table">
      <tr>
        <td class="section-label">Basic Info</td>
        <td class="section-content">
          <div class="field-row">
            <span class="field-label">Name:</span>
            <span class="field-value">${employee.name || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Name (Arabic):</span>
            <span class="field-value">${employee.nameArabic || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Joining Date:</span>
            <span class="field-value">${formatDate(employee.joiningDate)}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Job Title:</span>
            <span class="field-value">${employee.jobTitle || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Department:</span>
            <span class="field-value">${employee.department || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Date of Birth:</span>
            <span class="field-value">${formatDate(employee.dateOfBirth)}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Mobile Number:</span>
            <span class="field-value">${employee.mobileNumber || 'N/A'}</span>
          </div>
        </td>
      </tr>
      
      <tr>
        <td class="section-label">Education</td>
        <td class="section-content">
          <div class="field-row">
            <span class="field-label">Certificate:</span>
            <span class="field-value">${employee.graduationCertificate || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Section:</span>
            <span class="field-value">${employee.graduationSection || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">University:</span>
            <span class="field-value">${employee.graduationUniversity || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Graduation Year:</span>
            <span class="field-value">${employee.graduationYear || 'N/A'}</span>
          </div>
        </td>
      </tr>
      
      <tr>
        <td class="section-label">IDs</td>
        <td class="section-content">
          <div class="field-row">
            <span class="field-label">National ID:</span>
            <span class="field-value">${formatLargeNumber(employee.nationalId)}</span>
          </div>
          <div class="field-row">
            <span class="field-label">National ID Valid Till:</span>
            <span class="field-value">${formatDateOrNotSpecified(employee.nationalIdValidTill)}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Bar Association No.:</span>
            <span class="field-value">${formatLargeNumber(employee.barAssociation)}</span>
          </div>
          <div class="field-row">
            <span class="field-label">درجة القيد:</span>
            <span class="field-value">${employee.barAssociationDegree || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Tax Card No.:</span>
            <span class="field-value">${employee.taxCard || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Social Insurance:</span>
            <span class="field-value">${formatLargeNumber(employee.socialInsurance)}</span>
          </div>
        </td>
      </tr>
      
      <tr>
        <td class="section-label">Address</td>
        <td class="section-content">
          <div class="field-row">
            <span class="field-label">Address Details:</span>
            <span class="field-value">${employee.address || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Region / City:</span>
            <span class="field-value">${employee.addressRegion || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Governorate:</span>
            <span class="field-value">${employee.addressGovernorate || 'N/A'}</span>
          </div>
        </td>
      </tr>
      
      <tr>
        <td class="section-label">Contract</td>
        <td class="section-content">
          <div class="field-row">
            <span class="field-label">Contract Type:</span>
            <span class="field-value">${employee.contractType || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Work Duration:</span>
            <span class="field-value">${calculateWorkDuration(employee.joiningDate)}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Next Renewal Date:</span>
            <span class="field-value">${formatDateOrNotSpecified(employee.contractRenewalDate)}</span>
          </div>
        </td>
      </tr>
      
      <tr>
        <td class="section-label">Salary</td>
        <td class="section-content">
          ${employee.salaries && employee.salaries.length > 0 ? `
            <table class="salary-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Year</th>
                  <th>Basic Salary</th>
                  <th>Gross</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                ${employee.salaries.map(salary => `
                  <tr>
                    <td>${salary.monthName || `${salary.month}/${salary.year}`}</td>
                    <td>${salary.year}</td>
                    <td>${formatCurrency(salary.basicSalary)}</td>
                    <td>${formatCurrency(salary.gross)}</td>
                    <td>${formatCurrency(salary.net)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<span class="no-data">No salary records available</span>'}
        </td>
      </tr>
      
      ${employee.personnelRecord ? `
      <tr>
        <td class="section-label">Personnel</td>
        <td class="section-content">
          <div class="field-row">
            <span class="field-label">Criminal Record:</span>
            <span class="field-value">${employee.personnelRecord.criminalRecord || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Military Certificate:</span>
            <span class="field-value">${employee.personnelRecord.militaryCertificate || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">ID Copy:</span>
            <span class="field-value">${employee.personnelRecord.idCopy ? 'Present' : 'Missing'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Education Certificate:</span>
            <span class="field-value">${employee.personnelRecord.educationCertificate || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Birth Certificate:</span>
            <span class="field-value">${employee.personnelRecord.birthCertificate || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Recommendation Letter:</span>
            <span class="field-value">${employee.personnelRecord.recommendationLetter ? 'Present' : 'Missing'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Personal Photos:</span>
            <span class="field-value">${employee.personnelRecord.personalPhotos ? 'Present' : 'Missing'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Tax Card:</span>
            <span class="field-value">${employee.personnelRecord.taxCard ? 'Present' : 'Missing'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Association ID:</span>
            <span class="field-value">${employee.personnelRecord.associationId ? 'Present' : 'Missing'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Form 6:</span>
            <span class="field-value">${employee.personnelRecord.form6 || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Asset (Laptop/PC/Tablet):</span>
            <span class="field-value">${
              employee.personnelRecord.laptopPcTablet ? (
                (() => {
                  try {
                    const assets = JSON.parse(employee.personnelRecord.laptopPcTablet);
                    return Array.isArray(assets) ? assets.join(', ') : employee.personnelRecord.laptopPcTablet;
                  } catch {
                    return employee.personnelRecord.laptopPcTablet;
                  }
                })()
              ) : 'None'
            }</span>
          </div>
          <div class="field-row">
            <span class="field-label">Work Stub:</span>
            <span class="field-value">${employee.personnelRecord.workStub || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Insurance Start Date:</span>
            <span class="field-value">${formatDateOrNotSpecified(employee.personnelRecord.insuranceStartDate)}</span>
          </div>
        </td>
      </tr>
      ` : ''}
    </table>
  </div>
</body>
</html>
  `;
}

