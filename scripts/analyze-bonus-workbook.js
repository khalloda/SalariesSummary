#!/usr/bin/env node
/**
 * Analyze Bonus & Incentive Workbook
 * Analyzes the structure, formulas, and data patterns in the bonus workbook
 */

import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, '..', 'Sheets', 'B&I-With formuals Modified 28 Jan 2025.xlsx');
const sheetName = 'Final 2025';

console.log('=== Analyzing Bonus & Incentive Workbook ===\n');
console.log(`File: ${filePath}`);
console.log(`Sheet: ${sheetName}\n`);

try {
  const data = readFileSync(filePath);
  const workbook = XLSX.read(data, {
    type: 'buffer',
    cellDates: true,
    cellFormulas: true, // Critical: read formulas
    cellNF: false,
    cellText: false
  });

  if (!workbook.SheetNames.includes(sheetName)) {
    console.error(`Sheet "${sheetName}" not found. Available sheets:`, workbook.SheetNames);
    process.exit(1);
  }

  const worksheet = workbook.Sheets[sheetName];
  
  // Get raw data with formulas
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    raw: false,
    defval: null,
    header: 1 // Array format
  });

  // Analyze Row 2 (Headers) - index 1
  console.log('=== ROW 2: HEADERS ===');
  const headerRow = jsonData[1]; // Row 2 (0-indexed)
  console.log('Headers:', headerRow);
  console.log('\nHeader Analysis:');
  headerRow.forEach((cell, idx) => {
    if (cell) {
      console.log(`  Column ${idx + 1} (${XLSX.utils.encode_col(idx)}): "${cell}"`);
    }
  });

  // Analyze Row 23 (Data) - index 22
  console.log('\n\n=== ROW 23: DATA ROW ===');
  const dataRow = jsonData[22]; // Row 23 (0-indexed)
  console.log('Data:', dataRow);
  console.log('\nData Row Analysis:');
  headerRow.forEach((header, idx) => {
    if (header) {
      const cellAddress = XLSX.utils.encode_cell({ r: 22, c: idx });
      const cell = worksheet[cellAddress];
      const value = dataRow[idx];
      const formula = cell?.f || null;
      const cellType = cell?.t || 'unknown';
      
      console.log(`  ${header}:`);
      console.log(`    Value: ${value}`);
      console.log(`    Type: ${cellType}`);
      if (formula) {
        console.log(`    Formula: ${formula}`);
      }
      if (cell?.v !== undefined) {
        console.log(`    Calculated Value: ${cell.v}`);
      }
    }
  });

  // Analyze Rows 49-50
  console.log('\n\n=== ROWS 49-50 ===');
  for (let row = 48; row <= 49; row++) { // Rows 49-50 (0-indexed: 48-49)
    const rowData = jsonData[row];
    console.log(`\nRow ${row + 1}:`);
    if (rowData) {
      rowData.forEach((cell, idx) => {
        if (cell !== null && cell !== undefined && cell !== '') {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: idx });
          const cellObj = worksheet[cellAddress];
          const formula = cellObj?.f || null;
          const header = headerRow[idx] || `Column ${idx + 1}`;
          
          console.log(`  ${header}: ${cell}`);
          if (formula) {
            console.log(`    Formula: ${formula}`);
            console.log(`    Calculated: ${cellObj?.v}`);
          }
        }
      });
    }
  }

  // Analyze Rows 53-55
  console.log('\n\n=== ROWS 53-55 ===');
  for (let row = 52; row <= 54; row++) { // Rows 53-55 (0-indexed: 52-54)
    const rowData = jsonData[row];
    console.log(`\nRow ${row + 1}:`);
    if (rowData) {
      rowData.forEach((cell, idx) => {
        if (cell !== null && cell !== undefined && cell !== '') {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: idx });
          const cellObj = worksheet[cellAddress];
          const formula = cellObj?.f || null;
          const header = headerRow[idx] || `Column ${idx + 1}`;
          
          console.log(`  ${header}: ${cell}`);
          if (formula) {
            console.log(`    Formula: ${formula}`);
            console.log(`    Calculated: ${cellObj?.v}`);
          }
        }
      });
    }
  }

  // Analyze Rows 57-59
  console.log('\n\n=== ROWS 57-59 ===');
  for (let row = 56; row <= 58; row++) { // Rows 57-59 (0-indexed: 56-58)
    const rowData = jsonData[row];
    console.log(`\nRow ${row + 1}:`);
    if (rowData) {
      rowData.forEach((cell, idx) => {
        if (cell !== null && cell !== undefined && cell !== '') {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: idx });
          const cellObj = worksheet[cellAddress];
          const formula = cellObj?.f || null;
          const header = headerRow[idx] || `Column ${idx + 1}`;
          
          console.log(`  ${header}: ${cell}`);
          if (formula) {
            console.log(`    Formula: ${formula}`);
            console.log(`    Calculated: ${cellObj?.v}`);
          }
        }
      });
    }
  }

  // Find all formulas in the sheet
  console.log('\n\n=== ALL FORMULAS IN SHEET ===');
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const formulas = [];
  
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.f) {
        formulas.push({
          address: cellAddress,
          row: R + 1,
          col: C + 1,
          formula: cell.f,
          value: cell.v,
          header: headerRow[C] || `Column ${C + 1}`
        });
      }
    }
  }

  console.log(`\nTotal formulas found: ${formulas.length}`);
  console.log('\nFormula Summary:');
  formulas.forEach(f => {
    console.log(`  ${f.address} (Row ${f.row}, ${f.header}): ${f.formula} = ${f.value}`);
  });

  // Look for bonus-related formulas
  console.log('\n\n=== BONUS-RELATED FORMULAS ===');
  const bonusFormulas = formulas.filter(f => 
    f.formula.toLowerCase().includes('sum') || 
    f.formula.toLowerCase().includes('if') ||
    f.formula.toLowerCase().includes('bonus') ||
    f.header.toLowerCase().includes('bonus') ||
    f.header.toLowerCase().includes('incentive')
  );
  
  bonusFormulas.forEach(f => {
    console.log(`  ${f.address} (${f.header}): ${f.formula}`);
    console.log(`    Result: ${f.value}`);
  });

  // Analyze structure - look for patterns
  console.log('\n\n=== STRUCTURE ANALYSIS ===');
  console.log(`Total rows in sheet: ${jsonData.length}`);
  console.log(`Total columns: ${headerRow.filter(h => h).length}`);
  
  // Check for summary/total rows
  console.log('\nLooking for summary/total rows:');
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (row) {
      const rowText = row.join(' ').toLowerCase();
      if (rowText.includes('total') || rowText.includes('مجموع') || 
          rowText.includes('sum') || rowText.includes('summary')) {
        console.log(`  Row ${i + 1} might be a summary row`);
        row.forEach((cell, idx) => {
          if (cell) {
            const cellAddress = XLSX.utils.encode_cell({ r: i, c: idx });
            const cellObj = worksheet[cellAddress];
            if (cellObj?.f) {
              console.log(`    ${headerRow[idx]}: ${cellObj.f} = ${cellObj.v}`);
            }
          }
        });
      }
    }
  }

} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}

