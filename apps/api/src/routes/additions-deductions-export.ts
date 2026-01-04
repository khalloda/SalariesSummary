import { Router } from 'express';
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export const additionsDeductionsExportRouter = Router();

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
 * POST /api/exports/additions-deductions/pdf
 * Export additions and deductions breakdown report as PDF
 */
additionsDeductionsExportRouter.post('/additions-deductions/pdf', async (req, res) => {
  try {
    const { year, detailView, data } = req.body;
    
    if (!data || !data.additions || !data.deductions) {
      return res.status(400).json({ error: 'Invalid report data' });
    }
    
    const html = generateAdditionsDeductionsHTML(year, detailView, data);
    
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
    
    const filename = `Additions_Deductions_${year}_${detailView}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(pdf);
  } catch (error: any) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: `Failed to generate PDF: ${error.message}` });
  }
});

/**
 * POST /api/exports/additions-deductions/xlsx
 * Export additions and deductions breakdown report as XLSX
 */
additionsDeductionsExportRouter.post('/additions-deductions/xlsx', async (req, res) => {
  try {
    const { year, detailView, data } = req.body;
    
    if (!data || !data.additions || !data.deductions) {
      return res.status(400).json({ error: 'Invalid report data' });
    }
    
    const workbook = new ExcelJS.Workbook();
    
    // Additions sheet
    const additionsSheet = workbook.addWorksheet('Additions');
    additionsSheet.columns = [
      { header: 'Category', key: 'category', width: 30 },
      { header: 'Amount', key: 'amount', width: 18 },
      { header: 'Percentage', key: 'percentage', width: 15 }
    ];
    
    // Frontend sends the correct data in 'breakdown' field based on detailView
    const additionsData = data.additions.breakdown || [];
    
    if (additionsData.length === 0) {
      return res.status(400).json({ error: 'No additions data to export' });
    }
    
    additionsData.forEach((item: any) => {
      const percentage = ((item.amount / data.additions.total) * 100).toFixed(2);
      additionsSheet.addRow({
        category: item.category,
        amount: item.amount,
        percentage: `${percentage}%`
      });
    });
    
    additionsSheet.addRow({
      category: 'TOTAL',
      amount: data.additions.total,
      percentage: '100.00%'
    });
    
    additionsSheet.getRow(1).font = { bold: true };
    additionsSheet.getRow(additionsSheet.rowCount).font = { bold: true };
    additionsSheet.getColumn('amount').numFmt = '#,##0';
    
    // Deductions sheet
    const deductionsSheet = workbook.addWorksheet('Deductions');
    deductionsSheet.columns = [
      { header: 'Category', key: 'category', width: 30 },
      { header: 'Amount', key: 'amount', width: 18 },
      { header: 'Percentage', key: 'percentage', width: 15 }
    ];
    
    // Frontend sends the correct data in 'breakdown' field based on detailView
    const deductionsData = data.deductions.breakdown || [];
    
    if (deductionsData.length === 0) {
      return res.status(400).json({ error: 'No deductions data to export' });
    }
    
    deductionsData.forEach((item: any) => {
      const percentage = ((item.amount / data.deductions.total) * 100).toFixed(2);
      deductionsSheet.addRow({
        category: item.category,
        amount: item.amount,
        percentage: `${percentage}%`
      });
    });
    
    deductionsSheet.addRow({
      category: 'TOTAL',
      amount: data.deductions.total,
      percentage: '100.00%'
    });
    
    deductionsSheet.getRow(1).font = { bold: true };
    deductionsSheet.getRow(deductionsSheet.rowCount).font = { bold: true };
    deductionsSheet.getColumn('amount').numFmt = '#,##0';
    
    const filename = `Additions_Deductions_${year}_${detailView}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('XLSX export error:', error);
    res.status(500).json({ error: `Failed to generate XLSX: ${error.message}` });
  }
});

function generateAdditionsDeductionsHTML(year: number, detailView: string, data: any): string {
  const logoBase64 = getLogoBase64();
  const { additions, deductions } = data;
  
  // Frontend sends the correct data in 'breakdown' field based on detailView
  const additionsData = additions.breakdown || [];
  const deductionsData = deductions.breakdown || [];
  
  let content = `
    <div style="margin-bottom: 20px;">
      <h2 style="text-align: center; margin-bottom: 20px;">Additions & Deductions Breakdown - ${year}</h2>
      <p style="text-align: center; color: #6b7280; margin-bottom: 20px;">View: ${detailView === 'consolidated' ? 'Consolidated' : 'Details'}</p>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
        <div style="border: 2px solid #10b981; padding: 15px; border-radius: 8px;">
          <h3 style="font-size: 14px; color: #065f46; margin-bottom: 10px;">Total Additions</h3>
          <p style="font-size: 24px; font-weight: bold; color: #059669;">${additions.total.toLocaleString()}</p>
        </div>
        <div style="border: 2px solid #dc2626; padding: 15px; border-radius: 8px;">
          <h3 style="font-size: 14px; color: #991b1b; margin-bottom: 10px;">Total Deductions</h3>
          <p style="font-size: 24px; font-weight: bold; color: #dc2626;">${deductions.total.toLocaleString()}</p>
        </div>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3 style="margin-bottom: 15px; color: #059669;">Additions Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Category</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Amount</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${additionsData.map((item: any) => {
              const percentage = ((item.amount / additions.total) * 100).toFixed(2);
              return `
                <tr>
                  <td style="border: 1px solid #000; padding: 8px;">${item.category}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${item.amount.toLocaleString()}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${percentage}%</td>
                </tr>
              `;
            }).join('')}
            <tr style="background-color: #f3f4f6; font-weight: bold;">
              <td style="border: 1px solid #000; padding: 8px;">TOTAL</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${additions.total.toLocaleString()}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">100.00%</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3 style="margin-bottom: 15px; color: #dc2626;">Deductions Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Category</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Amount</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${deductionsData.map((item: any) => {
              const percentage = ((item.amount / deductions.total) * 100).toFixed(2);
              return `
                <tr>
                  <td style="border: 1px solid #000; padding: 8px;">${item.category}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${item.amount.toLocaleString()}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${percentage}%</td>
                </tr>
              `;
            }).join('')}
            <tr style="background-color: #f3f4f6; font-weight: bold;">
              <td style="border: 1px solid #000; padding: 8px;">TOTAL</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${deductions.total.toLocaleString()}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">100.00%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  return `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Additions & Deductions Breakdown - ${year}</title>
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

