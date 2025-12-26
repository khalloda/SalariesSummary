#!/usr/bin/env node
/**
 * Test script to debug Excel parsing
 */

import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = join(__dirname, '..', 'Sheets', '01 - Jan Salaries 2025.xlsx');

console.log('Testing Excel file parsing...\n');
console.log('File:', filePath);

const data = readFileSync(filePath);
const workbook = XLSX.read(data, {
  type: 'buffer',
  cellDates: true,
  cellNF: false,
  cellText: false,
});

const sheet = workbook.Sheets['مرتبات'];
if (!sheet) {
  console.error('Sheet "مرتبات" not found!');
  process.exit(1);
}

// Get raw array data
const jsonData = XLSX.utils.sheet_to_json(sheet, {
  raw: false,
  defval: null,
  header: 1
});

console.log(`\nTotal rows: ${jsonData.length}\n`);

// Show first 10 rows
console.log('First 10 rows:');
for (let i = 0; i < Math.min(10, jsonData.length); i++) {
  const row = jsonData[i];
  console.log(`\nRow ${i}:`);
  row.forEach((cell, colIndex) => {
    if (cell !== null && cell !== undefined && cell !== '') {
      console.log(`  [${colIndex}]: "${cell}"`);
    }
  });
}

// Try to find header row
console.log('\n\nLooking for header row...');
for (let i = 0; i < Math.min(5, jsonData.length); i++) {
  const row = jsonData[i];
  const rowText = row.map(cell => cell?.toString().trim() || '').join(' ');
  if (rowText.includes('الاسماء') || rowText.includes('Name')) {
    console.log(`\nHeader row found at index ${i}:`);
    row.forEach((cell, colIndex) => {
      if (cell !== null && cell !== undefined) {
        console.log(`  Column ${colIndex}: "${cell}"`);
      }
    });
    break;
  }
}

// Try to find first data row
console.log('\n\nLooking for first data row...');
for (let i = 1; i < Math.min(10, jsonData.length); i++) {
  const row = jsonData[i];
  if (!row || row.length === 0) continue;
  
  // Check if this looks like a data row (has a name-like value)
  for (let col = 0; col < Math.min(3, row.length); col++) {
    const cell = row[col]?.toString().trim() || '';
    if (cell && cell.length > 5 && !cell.match(/^\d+$/) && 
        !['م', '#', 'شركاء', 'الاسماء', 'Name'].includes(cell)) {
      console.log(`\nFirst data row found at index ${i}:`);
      row.slice(0, 10).forEach((cell, colIndex) => {
        if (cell !== null && cell !== undefined) {
          console.log(`  Column ${colIndex}: "${cell}" (type: ${typeof cell})`);
        }
      });
      break;
    }
  }
}

