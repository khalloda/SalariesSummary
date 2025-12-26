#!/usr/bin/env node
/**
 * Schema Discovery Script
 * Analyzes sample Excel workbooks to understand their structure
 */

import * as XLSX from 'xlsx';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sheetsDir = join(__dirname, '..', 'Sheets');
const passFile = join(__dirname, '..', 'Sheets', 'pass.txt');

// Sample months to analyze
const sampleMonths = [
  '01 - Jan Salaries 2025.xlsx',
  '06- June Salaries 2025.xlsx',
  '12- Dec Salaries 2025.xlsx'
];

// Read password if available
let password = null;
if (existsSync(passFile)) {
  password = readFileSync(passFile, 'utf-8').trim();
}

// Function to find actual header row (usually row 2, after title row)
function findHeaderRow(jsonData) {
  // Try row 1 (index 1) first, as it's typically the header row
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const row = jsonData[i];
    if (!row) continue;
    
    // Check if this row looks like headers (contains Arabic text like "الاسماء" or "م")
    const rowText = row.map(cell => cell?.toString().trim() || '').join(' ');
    if (rowText.includes('الاسماء') || rowText.includes('Name') || 
        rowText.includes('صافي') || rowText.includes('Salary') ||
        (i === 1 && row.some(cell => cell && cell.toString().trim()))) {
      return i;
    }
  }
  return 0; // Fallback to first row
}

function analyzeWorkbook(filePath, fileName) {
  console.log(`\n=== Analyzing: ${fileName} ===\n`);
  
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return null;
  }

  try {
    const data = readFileSync(filePath);
    const options = {
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false,
    };
    
    // Add password if available (though xlsx library may not support it directly)
    // We'll handle password-protected files separately if needed
    const workbook = XLSX.read(data, options);

    const analysis = {
      fileName,
      sheetNames: workbook.SheetNames,
      sheets: {}
    };

    // Analyze each sheet
    for (const sheetName of workbook.SheetNames) {
      // Skip Pay Clip sheets
      if (sheetName.includes('Pay Clip')) {
        console.log(`Skipping sheet: ${sheetName}`);
        continue;
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: null,
        header: 1 // Get raw array format to see headers
      });

      // Get headers using improved detection
      const headerRowIndex = findHeaderRow(jsonData);
      const headers = jsonData[headerRowIndex]?.map(cell => cell?.toString().trim() || '') || [];

      // Get data rows (skip header row and title row)
      const dataRows = jsonData.slice(headerRowIndex + 1).filter(row => 
        row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
      );

      // Convert to object format for easier analysis (using header row)
      const objectData = XLSX.utils.sheet_to_json(worksheet, {
        raw: true,
        defval: null,
        range: headerRowIndex, // Start from header row
      });

      analysis.sheets[sheetName] = {
        headerRowIndex,
        headers,
        totalRows: dataRows.length,
        sampleRows: objectData.slice(0, 5), // First 5 data rows
        columnCount: headers.filter(h => h).length
      };

      console.log(`\nSheet: ${sheetName}`);
      console.log(`Headers (${headers.length}):`, headers.slice(0, 10).join(', '), headers.length > 10 ? '...' : '');
      console.log(`Total data rows: ${dataRows.length}`);
    }

    return analysis;
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error.message);
    if (error.message.includes('password')) {
      console.error(`  → File is password-protected. Password from pass.txt: ${password ? 'available' : 'not found'}`);
    }
    return null;
  }
}

// Main execution
console.log('Excel Workbook Schema Discovery');
console.log('================================\n');
if (password) {
  console.log(`Password file found: ${password.substring(0, 3)}***\n`);
}

const results = {};

for (const fileName of sampleMonths) {
  const filePath = join(sheetsDir, fileName);
  const analysis = analyzeWorkbook(filePath, fileName);
  if (analysis) {
    results[fileName] = analysis;
  }
}

// Generate summary
console.log('\n\n=== SCHEMA SUMMARY ===\n');

const allSheetNames = new Set();
Object.values(results).forEach(analysis => {
  analysis.sheetNames.forEach(name => {
    if (!name.includes('Pay Clip')) {
      allSheetNames.add(name);
    }
  });
});

console.log('All detected sheets:', Array.from(allSheetNames));
console.log('\nSheet consistency check:');
allSheetNames.forEach(sheetName => {
  const presentIn = sampleMonths.filter(month => {
    const analysis = results[month];
    return analysis && analysis.sheetNames.includes(sheetName);
  });
  console.log(`  ${sheetName}: present in ${presentIn.length}/${sampleMonths.length} months`);
});

// Save results to JSON for further analysis
import { writeFileSync } from 'fs';
const outputPath = join(__dirname, '..', 'docs', 'schema-discovery-raw.json');
writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`\nRaw analysis saved to: ${outputPath}`);
