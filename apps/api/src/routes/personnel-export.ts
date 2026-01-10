import { Router } from 'express';
import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logAudit } from '../utils/audit.js';
import { validateBody } from '../validation/middleware.js';
import {
  DocumentComplianceExportBodySchema,
  AssetInventoryExportBodySchema,
  PersonnelDashboardExportBodySchema,
  EmployeeTenureExportBodySchema,
} from '../validation/schemas/exports.js';

export const personnelExportRouter = Router();

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
 * POST /api/exports/document-compliance/pdf
 * Export Document Compliance Report as PDF
 */
personnelExportRouter.post('/document-compliance/pdf',
  validateBody(DocumentComplianceExportBodySchema),
  async (req, res) => {
  try {
    const { data, categoryFilter, minComplianceFilter } = req.body;
    
    const html = generateDocumentComplianceReportHTML(data, categoryFilter, minComplianceFilter);
    
    const browser = await puppeteer.launch({ 
      headless: "new",
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
    
    const filename = `Document_Compliance_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(pdf);
  } catch (error: any) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: `Failed to generate PDF: ${error.message}` });
  }
});

/**
 * POST /api/exports/asset-inventory/pdf
 * Export Asset Inventory Report as PDF
 */
personnelExportRouter.post('/asset-inventory/pdf',
  validateBody(AssetInventoryExportBodySchema),
  async (req, res) => {
  try {
    const { data, categoryFilter, assetFilter } = req.body;
    
    const html = generateAssetInventoryReportHTML(data, categoryFilter, assetFilter);
    
    const browser = await puppeteer.launch({ 
      headless: "new",
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
    
    const filename = `Asset_Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(pdf);
  } catch (error: any) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: `Failed to generate PDF: ${error.message}` });
  }
});

/**
 * POST /api/exports/personnel-dashboard/pdf
 * Export Personnel Status Dashboard as PDF
 */
personnelExportRouter.post('/personnel-dashboard/pdf',
  validateBody(PersonnelDashboardExportBodySchema),
  async (req, res) => {
  try {
    const { data } = req.body;
    
    const html = generatePersonnelDashboardHTML(data);
    
    const browser = await puppeteer.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      landscape: true, // Dashboard is wide, use landscape
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
    });
    await browser.close();
    
    const filename = `Personnel_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(pdf);
  } catch (error: any) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: `Failed to generate PDF: ${error.message}` });
  }
});

function generateDocumentComplianceReportHTML(data: any, categoryFilter: string, minComplianceFilter: string): string {
  const logoBase64 = getLogoBase64();
  const logoImg = logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="height: 40px;" />` : '';
  const now = new Date();
  const printDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const printTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  const getComplianceColor = (percentage: number) => {
    if (percentage < 70) return 'background-color: #fee2e2; color: #991b1b;';
    if (percentage < 90) return 'background-color: #fef3c7; color: #92400e;';
    return 'background-color: #d1fae5; color: #065f46;';
  };
  
  const getComplianceBadge = (percentage: number) => {
    if (percentage < 70) return 'Critical';
    if (percentage < 90) return 'Warning';
    return 'Good';
  };
  
  // Sort employees by category, then by employee code
  const getCategoryPriority = (category: string | undefined): number => {
    if (!category) return 999;
    const lowerCaseCategory = category.toLowerCase();
    if (lowerCaseCategory.includes('partner')) return 1;
    if (lowerCaseCategory.includes('lawyer')) return 2;
    if (lowerCaseCategory.includes('admin')) return 3;
    if (lowerCaseCategory.includes('consultant')) return 4;
    return 999;
  };
  
  const compareEmployeeCodes = (codeA: string | undefined, codeB: string | undefined): number => {
    if (!codeA && !codeB) return 0;
    if (!codeA) return 1;
    if (!codeB) return -1;

    const partsA = codeA.split('-').map(Number);
    const partsB = codeB.split('-').map(Number);

    for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
      if (partsA[i] !== partsB[i]) {
        return partsA[i] - partsB[i];
      }
    }
    return partsA.length - partsB.length;
  };
  
  // Sort employees for display
  const sortedEmployees = [...data.employees].sort((a: any, b: any) => {
    // First sort by category priority
    const priorityA = getCategoryPriority(a.category);
    const priorityB = getCategoryPriority(b.category);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    // Then sort by employee code numerically
    return compareEmployeeCodes(a.employeeCode, b.employeeCode);
  });
  
  return `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="UTF-8">
  <title>Document Compliance Report</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
      @bottom-center {
        content: "P " counter(page) " of " counter(pages);
        font-size: 10px;
        color: #666;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
      color: #333;
      line-height: 1.6;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e5e7eb;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .header-right {
      text-align: right;
      font-size: 12px;
      color: #666;
    }
    .header-right .date {
      font-weight: bold;
      margin-bottom: 2px;
    }
    h1 {
      font-size: 24px;
      color: #1f2937;
      margin: 0;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }
    .summary-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .summary-card .label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 5px;
    }
    .summary-card .value {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
    }
    .summary-card .value.blue { color: #2563eb; }
    .summary-card .value.red { color: #dc2626; }
    .summary-card .value.green { color: #16a34a; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 11px;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
      color: #374151;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .compliance-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }
    .missing-docs {
      font-size: 10px;
      color: #dc2626;
    }
    .complete {
      color: #16a34a;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${logoImg}
      <h1>Document Compliance Report</h1>
    </div>
    <div class="header-right">
      <div class="date">${printDate}</div>
      <div class="time">${printTime}</div>
    </div>
  </div>
  
  <div class="summary">
    <div class="summary-card">
      <div class="label">Total Employees</div>
      <div class="value">${data.summary.totalEmployees}</div>
    </div>
    <div class="summary-card">
      <div class="label">Average Compliance</div>
      <div class="value blue">${data.summary.averageCompliance.toFixed(1)}%</div>
    </div>
    <div class="summary-card">
      <div class="label">Critical (&lt;70%)</div>
      <div class="value red">${data.summary.complianceLevels.critical}</div>
    </div>
    <div class="summary-card">
      <div class="label">Good (≥90%)</div>
      <div class="value green">${data.summary.complianceLevels.good}</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Employee Code</th>
        <th>Name</th>
        <th>Category</th>
        <th>Department</th>
        <th>Compliance</th>
        <th>Documents</th>
        <th>Missing</th>
      </tr>
    </thead>
    <tbody>
      ${sortedEmployees.map((emp: any) => `
        <tr>
          <td>${emp.employeeCode || ''}</td>
          <td>${emp.employeeName || ''}</td>
          <td>${emp.category || ''}</td>
          <td>${emp.department || 'N/A'}</td>
          <td>
            <span class="compliance-badge" style="${getComplianceColor(emp.compliancePercentage)}">
              ${emp.compliancePercentage.toFixed(1)}% (${getComplianceBadge(emp.compliancePercentage)})
            </span>
          </td>
          <td>${emp.completedDocuments} / ${emp.totalApplicableDocuments}</td>
          <td>
            ${emp.missingDocuments.length > 0 ? `
              <div class="missing-docs">${emp.missingDocuments.length} missing</div>
              <div style="font-size: 9px; color: #9ca3af;">
                ${emp.missingDocuments.slice(0, 2).join(', ')}
                ${emp.missingDocuments.length > 2 ? ` +${emp.missingDocuments.length - 2} more` : ''}
              </div>
            ` : '<span class="complete">Complete</span>'}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `;
}

function generateAssetInventoryReportHTML(data: any, categoryFilter: string, assetFilter: string): string {
  const logoBase64 = getLogoBase64();
  const logoImg = logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="height: 40px;" />` : '';
  const now = new Date();
  const printDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const printTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  const getAssetColor = (assetType: string) => {
    switch (assetType) {
      case 'Laptop': return 'background-color: #dbeafe; color: #1e40af;';
      case 'PC': return 'background-color: #e9d5ff; color: #6b21a8;';
      case 'Tablet': return 'background-color: #fce7f3; color: #9f1239;';
      default: return 'background-color: #f3f4f6; color: #4b5563;';
    }
  };
  
  const filteredEmployees = assetFilter === 'all'
    ? data.employees
    : data.employees.filter((emp: any) => {
        const asset = emp.assetType || 'None';
        if (assetFilter === 'none') return asset === 'None' || !asset;
        return asset === assetFilter;
      });
  
  return `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="UTF-8">
  <title>Asset Inventory Report</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
      @bottom-center {
        content: "P " counter(page) " of " counter(pages);
        font-size: 10px;
        color: #666;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
      color: #333;
      line-height: 1.6;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e5e7eb;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .header-right {
      text-align: right;
      font-size: 12px;
      color: #666;
    }
    .header-right .date {
      font-weight: bold;
      margin-bottom: 2px;
    }
    h1 {
      font-size: 24px;
      color: #1f2937;
      margin: 0;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }
    .summary-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .summary-card .label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 5px;
    }
    .summary-card .value {
      font-size: 24px;
      font-weight: bold;
    }
    .summary-card .value.blue { color: #2563eb; }
    .summary-card .value.purple { color: #9333ea; }
    .summary-card .value.pink { color: #db2777; }
    .category-breakdown {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .category-breakdown h3 {
      font-size: 16px;
      margin-bottom: 10px;
      color: #374151;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 11px;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
      color: #374151;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .asset-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }
    .status-active {
      background-color: #d1fae5;
      color: #065f46;
    }
    .status-resigned {
      background-color: #fee2e2;
      color: #991b1b;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${logoImg}
      <h1>Asset Inventory Report</h1>
    </div>
    <div class="header-right">
      <div class="date">${printDate}</div>
      <div class="time">${printTime}</div>
    </div>
  </div>
  
  <div class="summary">
    <div class="summary-card">
      <div class="label">Total Employees</div>
      <div class="value">${data.summary.total}</div>
    </div>
    <div class="summary-card">
      <div class="label">Laptops</div>
      <div class="value blue">${data.summary.laptops}</div>
    </div>
    <div class="summary-card">
      <div class="label">PCs</div>
      <div class="value purple">${data.summary.pcs}</div>
    </div>
    <div class="summary-card">
      <div class="label">Tablets</div>
      <div class="value pink">${data.summary.tablets}</div>
    </div>
  </div>
  
  ${Object.keys(data.summary.byCategory).length > 0 ? `
    <div class="category-breakdown">
      <h3>Asset Distribution by Category</h3>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Laptops</th>
            <th>PCs</th>
            <th>Tablets</th>
            <th>None</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(data.summary.byCategory).map(([category, counts]: [string, any]) => `
            <tr>
              <td><strong>${category}</strong></td>
              <td>${counts.laptops}</td>
              <td>${counts.pcs}</td>
              <td>${counts.tablets}</td>
              <td>${counts.none}</td>
              <td><strong>${counts.laptops + counts.pcs + counts.tablets + counts.none}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : ''}
  
  <table>
    <thead>
      <tr>
        <th>Employee Code</th>
        <th>Name</th>
        <th>Category</th>
        <th>Department</th>
        <th>Asset Type</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${filteredEmployees.map((emp: any) => `
        <tr>
          <td>${emp.employeeCode}</td>
          <td>${emp.employeeName}</td>
          <td>${emp.category}</td>
          <td>${emp.department || 'N/A'}</td>
          <td>
            <span class="asset-badge" style="${getAssetColor(emp.assetType || 'None')}">
              ${emp.assetType || 'None'}
            </span>
          </td>
          <td>
            <span class="status-badge ${emp.status === 'Active' ? 'status-active' : 'status-resigned'}">
              ${emp.status}
            </span>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `;
}

function generatePersonnelDashboardHTML(data: any): string {
  const logoBase64 = getLogoBase64();
  const logoImg = logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="height: 40px;" />` : '';
  const now = new Date();
  const printDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const printTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  // Prepare data for charts (simplified for PDF)
  const complianceByCategoryData = Object.entries(data.complianceByCategory).map(([category, stats]: [string, any]) => ({
    category,
    compliance: Math.round(stats.avgCompliance * 100) / 100,
    employees: stats.total
  }));
  
  const assetDistributionData = [
    { name: 'Laptops', value: data.assetDistribution.laptops },
    { name: 'PCs', value: data.assetDistribution.pcs },
    { name: 'Tablets', value: data.assetDistribution.tablets },
    { name: 'None', value: data.assetDistribution.none }
  ].filter(item => item.value > 0);
  
  const complianceLevelsData = [
    { name: 'Critical (<70%)', value: data.complianceLevels.critical, color: '#ef4444' },
    { name: 'Warning (70-90%)', value: data.complianceLevels.warning, color: '#f59e0b' },
    { name: 'Good (≥90%)', value: data.complianceLevels.good, color: '#10b981' }
  ].filter(item => item.value > 0);
  
  return `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="UTF-8">
  <title>Personnel Status Dashboard</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 15mm;
      @bottom-center {
        content: "P " counter(page) " of " counter(pages);
        font-size: 10px;
        color: #666;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
      color: #333;
      line-height: 1.6;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e5e7eb;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .header-right {
      text-align: right;
      font-size: 12px;
      color: #666;
    }
    .header-right .date {
      font-weight: bold;
      margin-bottom: 2px;
    }
    h1 {
      font-size: 24px;
      color: #1f2937;
      margin: 0;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }
    .metric-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .metric-card .label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 5px;
    }
    .metric-card .value {
      font-size: 24px;
      font-weight: bold;
    }
    .metric-card .value.blue { color: #2563eb; }
    .metric-card .value.red { color: #dc2626; }
    .metric-card .value.green { color: #16a34a; }
    .metric-card .value.yellow { color: #ca8a04; }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section h3 {
      font-size: 16px;
      margin-bottom: 15px;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 5px;
    }
    .two-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
      color: #374151;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .compliance-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }
    .badge-good {
      background-color: #d1fae5;
      color: #065f46;
    }
    .badge-warning {
      background-color: #fef3c7;
      color: #92400e;
    }
    .badge-critical {
      background-color: #fee2e2;
      color: #991b1b;
    }
    .missing-doc-item {
      background: #fee2e2;
      padding: 8px;
      margin: 5px 0;
      border-radius: 4px;
      font-size: 11px;
    }
    .missing-doc-item .doc-name {
      font-weight: bold;
      color: #991b1b;
    }
    .missing-doc-item .doc-count {
      color: #6b7280;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${logoImg}
      <h1>Personnel Status Dashboard</h1>
    </div>
    <div class="header-right">
      <div class="date">${printDate}</div>
      <div class="time">${printTime}</div>
    </div>
  </div>
  
  <div class="metrics">
    <div class="metric-card">
      <div class="label">Total Employees</div>
      <div class="value">${data.totalEmployees}</div>
    </div>
    <div class="metric-card">
      <div class="label">Overall Compliance</div>
      <div class="value ${data.overallCompliance >= 90 ? 'green' : data.overallCompliance >= 70 ? 'yellow' : 'red'}">
        ${data.overallCompliance.toFixed(1)}%
      </div>
    </div>
    <div class="metric-card">
      <div class="label">Critical Compliance</div>
      <div class="value red">${data.complianceLevels.critical}</div>
      <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">Employees &lt;70%</div>
    </div>
    <div class="metric-card">
      <div class="label">Good Compliance</div>
      <div class="value green">${data.complianceLevels.good}</div>
      <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">Employees ≥90%</div>
    </div>
  </div>
  
  <div class="section">
    <h3>Compliance by Category</h3>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Total Employees</th>
          <th>Average Compliance</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(data.complianceByCategory).map(([category, stats]: [string, any]) => {
          const compliance = Math.round(stats.avgCompliance * 100) / 100;
          const badgeClass = compliance >= 90 ? 'badge-good' : compliance >= 70 ? 'badge-warning' : 'badge-critical';
          const statusText = compliance >= 90 ? 'Good' : compliance >= 70 ? 'Warning' : 'Critical';
          return `
            <tr>
              <td><strong>${category}</strong></td>
              <td>${stats.total}</td>
              <td><strong>${compliance}%</strong></td>
              <td><span class="compliance-badge ${badgeClass}">${statusText}</span></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="section two-column">
    <div>
      <h3>Asset Distribution</h3>
      <table>
        <thead>
          <tr>
            <th>Asset Type</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          ${assetDistributionData.map(item => `
            <tr>
              <td>${item.name}</td>
              <td><strong>${item.value}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div>
      <h3>Compliance Levels</h3>
      <table>
        <thead>
          <tr>
            <th>Level</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          ${complianceLevelsData.map(item => `
            <tr>
              <td>${item.name}</td>
              <td><strong>${item.value}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  
  ${data.mostCommonMissing && data.mostCommonMissing.length > 0 ? `
    <div class="section">
      <h3>Most Common Missing Documents</h3>
      ${data.mostCommonMissing.map((item: any) => `
        <div class="missing-doc-item">
          <div class="doc-name">${item.document}</div>
          <div class="doc-count">${item.count} employees missing this document</div>
        </div>
      `).join('')}
    </div>
  ` : ''}
</body>
</html>
  `;
}

/**
 * POST /api/exports/employee-tenure/pdf
 * Export Employee Tenure Report as PDF
 */
personnelExportRouter.post('/employee-tenure/pdf',
  validateBody(EmployeeTenureExportBodySchema),
  async (req, res) => {
  try {
    const { year, summary, tenureRanges, categoryAverages, employees } = req.body;
    
    const html = generateEmployeeTenureReportHTML({ year, summary, tenureRanges, categoryAverages, employees });
    
    const browser = await puppeteer.launch({ 
      headless: "new",
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
    
    const filename = `Employee_Tenure_Report_${year}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(pdf);
  } catch (error: any) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: `Failed to generate PDF: ${error.message}` });
  }
});

/**
 * POST /api/exports/employee-tenure/xlsx
 * Export Employee Tenure Report as XLSX
 */
personnelExportRouter.post('/employee-tenure/xlsx',
  validateBody(EmployeeTenureExportBodySchema),
  async (req, res) => {
  try {
    const { year, summary, tenureRanges, categoryAverages, employees } = req.body;
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employee Tenure');
    
    // Add headers
    worksheet.addRow(['System ID', 'Employee Name', 'Category', 'Department', 'Status', 'Start Date', 'Last Record', 'Total Months', 'Tenure (Y, M, D)', 'Years', 'Months', 'Days', 'Tenure Range']);
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' }
    };
    
    // Add data rows
    employees.forEach((emp: any) => {
      worksheet.addRow([
        emp.employeeCode || '',
        emp.employeeName || '',
        emp.category || '',
        emp.department || '',
        emp.status || 'Active',
        `${emp.startDate.monthName} ${emp.startDate.year}`,
        `${emp.endDate.monthName} ${emp.endDate.year}`,
        emp.monthsOfService || 0,
        emp.tenureYears !== undefined ? `Y${emp.tenureYears}, M${emp.tenureMonths}, D${emp.tenureDays}` : '',
        emp.tenureYears || 0,
        emp.tenureMonths || 0,
        emp.tenureDays || 0,
        emp.tenureRange || ''
      ]);
    });
    
    // Auto-fit columns
    worksheet.columns.forEach((column, index) => {
      column.width = index === 1 ? 30 : index === 2 ? 15 : 12;
    });
    
    const filename = `Employee_Tenure_Report_${year}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('XLSX export error:', error);
    res.status(500).json({ error: `Failed to generate XLSX: ${error.message}` });
  }
});

/**
 * POST /api/exports/employee-tenure/csv
 * Export Employee Tenure Report as CSV
 */
personnelExportRouter.post('/employee-tenure/csv',
  validateBody(EmployeeTenureExportBodySchema),
  async (req, res) => {
  try {
    const { year, summary, tenureRanges, categoryAverages, employees } = req.body;
    
    const headers = ['System ID', 'Employee Name', 'Category', 'Department', 'Status', 'Start Date', 'Last Record', 'Total Months', 'Tenure (Y, M, D)', 'Years', 'Months', 'Days', 'Tenure Range'];
    const csvRows = [headers.join(',')];
    
    employees.forEach((emp: any) => {
      const row = [
        `"${(emp.employeeCode || '').replace(/"/g, '""')}"`,
        `"${(emp.employeeName || '').replace(/"/g, '""')}"`,
        `"${(emp.category || '').replace(/"/g, '""')}"`,
        `"${(emp.department || '').replace(/"/g, '""')}"`,
        `"${(emp.status || 'Active').replace(/"/g, '""')}"`,
        `"${emp.startDate.monthName} ${emp.startDate.year}"`,
        `"${emp.endDate.monthName} ${emp.endDate.year}"`,
        emp.monthsOfService || 0,
        emp.tenureYears !== undefined ? `"Y${emp.tenureYears}, M${emp.tenureMonths}, D${emp.tenureDays}"` : '',
        emp.tenureYears || 0,
        emp.tenureMonths || 0,
        emp.tenureDays || 0,
        `"${(emp.tenureRange || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const filename = `Employee_Tenure_Report_${year}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(csvContent);
  } catch (error: any) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: `Failed to generate CSV: ${error.message}` });
  }
});

function generateEmployeeTenureReportHTML(data: any): string {
  const logoBase64 = getLogoBase64();
  const logoImg = logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="height: 40px;" />` : '';
  const now = new Date();
  const printDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const printTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  // Helper functions for sorting
  const getCategoryPriority = (cat: string): number => {
    const lower = cat.toLowerCase();
    if (lower.includes('partner')) return 1;
    if (lower.includes('lawyer')) return 2;
    if (lower.includes('admin')) return 3;
    if (lower.includes('consultant')) return 4;
    return 999;
  };
  
  const compareEmployeeCodes = (codeA: string, codeB: string): number => {
    if (!codeA && !codeB) return 0;
    if (!codeA) return 1;
    if (!codeB) return -1;
    
    const partsA = codeA.split('-').map(p => parseInt(p) || 0);
    const partsB = codeB.split('-').map(p => parseInt(p) || 0);
    
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const a = partsA[i] || 0;
      const b = partsB[i] || 0;
      if (a !== b) return a - b;
    }
    return 0;
  };
  
  // Sort employees by category, then by employee code
  const sortedEmployees = [...data.employees].sort((a: any, b: any) => {
    const categoryComparison = getCategoryPriority(a.category || '') - getCategoryPriority(b.category || '');
    if (categoryComparison !== 0) return categoryComparison;
    return compareEmployeeCodes(a.employeeCode || '', b.employeeCode || '');
  });
  
  // Group by category
  const employeesByCategory: Record<string, any[]> = {};
  sortedEmployees.forEach((emp: any) => {
    const category = emp.category || 'Uncategorized';
    if (!employeesByCategory[category]) {
      employeesByCategory[category] = [];
    }
    employeesByCategory[category].push(emp);
  });
  
  const escapeHtml = (text: string) => {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };
  
  return `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="UTF-8">
  <title>Employee Tenure Report - ${data.year}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
      @bottom-center {
        content: "P " counter(page) " of " counter(pages);
        font-size: 10px;
        color: #666;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
      color: #333;
      line-height: 1.6;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e5e7eb;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .header-right {
      text-align: right;
      font-size: 12px;
      color: #666;
    }
    .header-right .date {
      font-weight: bold;
      margin-bottom: 2px;
    }
    h1 {
      font-size: 24px;
      color: #1f2937;
      margin: 0;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }
    .summary-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .summary-card .label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 5px;
    }
    .summary-card .value {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
    }
    .summary-card .value.blue { color: #2563eb; }
    .summary-card .value.green { color: #16a34a; }
    .summary-card .value.purple { color: #9333ea; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 10px;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 6px;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
      color: #374151;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .category-header {
      background-color: #e5e7eb !important;
      font-weight: bold;
      font-size: 11px;
    }
    .tenure-range {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: bold;
      background-color: #dbeafe;
      color: #1e40af;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${logoImg}
      <h1>Employee Tenure Report - ${data.year}</h1>
    </div>
    <div class="header-right">
      <div class="date">${printDate}</div>
      <div class="time">${printTime}</div>
    </div>
  </div>
  
  <div class="summary">
    <div class="summary-card">
      <div class="label">Total Employees</div>
      <div class="value">${data.summary.totalEmployees}</div>
    </div>
    <div class="summary-card">
      <div class="label">Average Tenure</div>
      <div class="value green">${data.summary.averageTenure} years</div>
    </div>
    <div class="summary-card">
      <div class="label">Tenure Ranges</div>
      <div class="value purple">${Object.keys(data.tenureRanges).length}</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>System ID</th>
        <th>Employee</th>
        <th>Category</th>
        <th>Start Date</th>
        <th>Last Record</th>
        <th>Months</th>
        <th>Years</th>
        <th>Range</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(employeesByCategory).map(([category, categoryEmployees]) => `
        <tr class="category-header">
          <td colspan="8">${escapeHtml(category)} (${categoryEmployees.length})</td>
        </tr>
        ${categoryEmployees.map((emp: any) => `
          <tr>
            <td>${escapeHtml(emp.employeeCode || '')}</td>
            <td>${escapeHtml(emp.employeeName || '')}</td>
            <td>${escapeHtml(emp.category || '')}</td>
            <td>${emp.startDate.monthName} ${emp.startDate.year}</td>
            <td>${emp.endDate.monthName} ${emp.endDate.year}</td>
            <td>${emp.monthsOfService || 0}</td>
            <td>${emp.tenureYears !== undefined ? `Y${emp.tenureYears}, M${emp.tenureMonths}, D${emp.tenureDays}` : ''}</td>
            <td><span class="tenure-range">${escapeHtml(emp.tenureRange || '')}</span></td>
          </tr>
        `).join('')}
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `;
}

