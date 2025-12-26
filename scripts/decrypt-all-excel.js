#!/usr/bin/env node
/**
 * Decrypt all password-protected Excel files using Python script
 * This is a Node.js wrapper that calls the Python script
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sheetsDir = join(__dirname, '..', 'Sheets');
const passFile = join(sheetsDir, 'pass.txt');
const pythonScript = join(__dirname, 'decrypt-excel.py');

// Password-protected months (Oct, Nov, Dec)
const protectedMonths = [
  '10- Oct Salaries 2025.xlsx',
  '11- Nov Salaries 2025.xlsx',
  '12- Dec Salaries 2025.xlsx'
];

function decryptFile(fileName) {
  const inputPath = join(sheetsDir, fileName);
  const outputPath = join(sheetsDir, fileName.replace('.xlsx', '_decrypted.xlsx'));
  
  if (!existsSync(inputPath)) {
    console.log(`⚠ File not found: ${fileName}`);
    return false;
  }
  
  const password = readFileSync(passFile, 'utf-8').trim();
  
  try {
    console.log(`\nDecrypting: ${fileName}...`);
    execSync(`python "${pythonScript}" "${inputPath}" "${outputPath}" "${password}"`, {
      stdio: 'inherit',
      cwd: __dirname
    });
    console.log(`✓ Successfully decrypted: ${fileName}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to decrypt ${fileName}:`, error.message);
    return false;
  }
}

console.log('Decrypting password-protected Excel files...');
console.log('='.repeat(50));

let successCount = 0;
for (const fileName of protectedMonths) {
  if (decryptFile(fileName)) {
    successCount++;
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Decrypted ${successCount}/${protectedMonths.length} files`);
console.log('\nNote: You can now use the _decrypted.xlsx files for import.');
console.log('Or rename them to replace the original files.');

