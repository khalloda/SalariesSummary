/**
 * Test script to diagnose Excel reading issues
 * Run with: node apps/api/src/test-excel-read.js
 */

import XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Sheets directory
const getSheetsDir = () => {
  const cwd = process.cwd();
  if (cwd.endsWith('apps/api')) {
    return join(cwd, '..', '..', 'Sheets');
  }
  return join(cwd, 'Sheets');
};

const SHEETS_DIR = getSheetsDir();

// Test reading one file
const testFile = join(SHEETS_DIR, '01 - Jan Salaries 2025.xlsx');

console.log('='.repeat(80));
console.log('Testing Excel file reading');
console.log('='.repeat(80));
console.log(`File: ${testFile}`);
console.log(`Sheets directory: ${SHEETS_DIR}`);

try {
  const data = readFileSync(testFile);
  console.log(`✅ File read successfully, size: ${data.length} bytes`);
  
  const workbook = XLSX.read(data, {
    type: 'buffer',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });
  
  console.log(`✅ Workbook parsed, sheets: ${workbook.SheetNames.join(', ')}`);
  
  // Test مرتبات sheet
  const salariesSheet = workbook.Sheets['مرتبات'];
  if (!salariesSheet) {
    console.error('❌ مرتبات sheet not found!');
    process.exit(1);
  }
  
  console.log(`✅ مرتبات sheet found`);
  console.log(`Sheet range: ${salariesSheet['!ref']}`);
  
  // Convert to JSON with header: 1 (array of arrays)
  const jsonData = XLSX.utils.sheet_to_json(salariesSheet, {
    raw: false,
    defval: null,
    header: 1
  });
  
  console.log(`✅ Converted to JSON, ${jsonData.length} rows`);
  
  // Show first 10 rows
  console.log('\n' + '='.repeat(80));
  console.log('First 10 rows:');
  console.log('='.repeat(80));
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    console.log(`\nRow ${i}:`);
    if (Array.isArray(row)) {
      for (let j = 0; j < Math.min(15, row.length); j++) {
        const cell = row[j];
        let cellValue = '';
        if (cell && typeof cell === 'object' && 'text' in cell) {
          cellValue = cell.text?.toString() || '';
        } else {
          cellValue = cell?.toString() || '';
        }
        if (cellValue) {
          console.log(`  [${j}]: "${cellValue.substring(0, 50)}"`);
        }
      }
    } else {
      console.log('  (not an array)');
    }
  }
  
  // Try to find header row
  console.log('\n' + '='.repeat(80));
  console.log('Looking for header row:');
  console.log('='.repeat(80));
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const row = jsonData[i];
    if (!Array.isArray(row)) continue;
    
    let foundName = false;
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      let cellStr = '';
      if (cell && typeof cell === 'object' && 'text' in cell) {
        cellStr = cell.text?.toString().toLowerCase() || '';
      } else {
        cellStr = cell?.toString().toLowerCase() || '';
      }
      if (cellStr.includes('الاسماء') || cellStr.includes('name')) {
        console.log(`✅ Found header at row ${i}, column ${j}: "${cellStr}"`);
        foundName = true;
        
        // Show this row
        console.log(`\nHeader row ${i} (first 15 columns):`);
        for (let k = 0; k < Math.min(15, row.length); k++) {
          const headerCell = row[k];
          let headerValue = '';
          if (headerCell && typeof headerCell === 'object' && 'text' in headerCell) {
            headerValue = headerCell.text?.toString().trim() || '';
          } else {
            headerValue = headerCell?.toString().trim() || '';
          }
          console.log(`  [${k}]: "${headerValue}"`);
        }
        break;
      }
    }
    if (foundName) break;
  }
  
  // Try to find employee names in data rows
  console.log('\n' + '='.repeat(80));
  console.log('Looking for employee names in data rows:');
  console.log('='.repeat(80));
  
  // Assume header is at row 2 (index 2) based on deep analysis
  const headerRowIndex = 2;
  const nameColIndex = 1; // Column 1 based on schema
  
  let employeeCount = 0;
  for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 20, jsonData.length); i++) {
    const row = jsonData[i];
    if (!Array.isArray(row) || row.length === 0) continue;
    
    if (nameColIndex < row.length) {
      const nameCell = row[nameColIndex];
      let name = '';
      if (nameCell && typeof nameCell === 'object' && 'text' in nameCell) {
        name = nameCell.text?.toString().trim() || '';
      } else {
        name = nameCell?.toString().trim() || '';
      }
      
      if (name && name !== 'شركاء' && name !== 'م' && name !== '#' && 
          name !== 'الاسماء / Name' && name !== 'Spare' && !name.match(/^\d+$/)) {
        employeeCount++;
        const salaryCell = row[3]; // Column 3 = Salary
        let salary = '';
        if (salaryCell && typeof salaryCell === 'object' && 'text' in salaryCell) {
          salary = salaryCell.text?.toString().trim() || '';
        } else {
          salary = salaryCell?.toString().trim() || '';
        }
        console.log(`  Employee ${employeeCount}: "${name}" - Salary: "${salary}"`);
      }
    }
  }
  
  console.log(`\n✅ Found ${employeeCount} employees in first 20 data rows`);
  
} catch (error) {
  console.error('❌ Error:', error);
  console.error(error.stack);
  process.exit(1);
}

