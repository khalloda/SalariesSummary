/**
 * Resigned Import Service
 * Handles importing resigned employee data from SEPEmployees.xlsx - Resigned sheet
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as XLSX from 'xlsx';
import { normalizeEmployeeName } from '../utils/normalize.js';

const prisma = new PrismaClient();

// Get Sheets directory
const getSheetsDir = () => {
  const cwd = process.cwd();
  if (cwd.endsWith('apps/api') || cwd.endsWith('apps\\api')) {
    return join(cwd, '..', '..', 'Sheets');
  }
  return join(cwd, 'Sheets');
};

export interface ResignedImportResult {
  success: boolean;
  recordsUpdated: number;
  recordsNotFound: number;
  errors: string[];
}

/**
 * Parse date from Excel cell value
 */
function parseDate(value: any): Date | null {
  if (!value) return null;
  
  if (value instanceof Date) {
    return value;
  }
  
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    
    const parts = value.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10) - 1;
      const day = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }
      
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(date.y, date.m - 1, date.d);
    }
  }
  
  return null;
}

/**
 * Parse string value
 */
function parseString(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' || trimmed === '-' || trimmed === 'N/A' ? null : trimmed;
  }
  return String(value).trim() || null;
}

/**
 * Import resigned employees from SEPEmployees.xlsx
 */
export async function importResigned(filePath?: string): Promise<ResignedImportResult> {
  const result: ResignedImportResult = {
    success: true,
    recordsUpdated: 0,
    recordsNotFound: 0,
    errors: []
  };

  try {
    await prisma.$connect();

    const sheetsDir = getSheetsDir();
    const targetFile = filePath || join(sheetsDir, 'SEPEmployees.xlsx');

    if (!existsSync(targetFile)) {
      result.success = false;
      result.errors.push(`File not found: ${targetFile}`);
      return result;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Importing Resigned sheet from: ${targetFile}`);
    console.log('='.repeat(60));

    const data = readFileSync(targetFile);
    const workbook = XLSX.read(data, {
      type: 'buffer',
      cellDates: true,
      cellFormulas: false,
      cellStyles: false,
      cellNF: false,
      cellText: false
    });

    if (!workbook.SheetNames.includes('Resigned')) {
      result.success = false;
      result.errors.push(`Sheet "Resigned" not found. Available sheets: ${workbook.SheetNames.join(', ')}`);
      return result;
    }

    const worksheet = workbook.Sheets['Resigned'];
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: null
    });

    if (rawData.length < 3) {
      result.success = false;
      result.errors.push('Sheet has insufficient data (less than 3 rows)');
      return result;
    }

    // Headers are in row 0 and row 1 (two-level headers)
    const mainHeaders = rawData[0] || [];
    const subHeaders = rawData[1] || [];

    // Map column indices
    const columnMap: Record<string, number> = {};
    mainHeaders.forEach((header, idx) => {
      if (header) {
        const headerStr = String(header).trim();
        columnMap[headerStr] = idx;
      }
    });

    console.log(`Found ${Object.keys(columnMap).length} main headers`);
    console.log(`Processing ${rawData.length - 2} data rows...\n`);

    const getValue = (headerName: string, row: any[]): any => {
      const colIdx = columnMap[headerName];
      if (colIdx === undefined || colIdx < 0) return null;
      return row[colIdx] !== undefined ? row[colIdx] : null;
    };

    // Process data rows (starting from row 2)
    for (let i = 2; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.every(cell => !cell || cell === '')) {
        continue;
      }

      try {
        // Try to get employee identifier from various columns
        const idValue = getValue('ID', row);
        const classification = parseString(getValue('Classification', row));
        const employeeName = parseString(getValue('Name', row));
        const employeeCode = idValue ? parseString(idValue) : null;

        if (!employeeName && !employeeCode) {
          continue;
        }

        // Find employee
        let employee = null;
        if (employeeCode) {
          employee = await prisma.employee.findFirst({
            where: { employeeCode }
          });
        }
        if (!employee && employeeName) {
          const normalizedName = normalizeEmployeeName(employeeName);
          employee = await prisma.employee.findUnique({
            where: { normalizedName }
          });
        }

        if (employee) {
          // Get resignation date (might be in Joining Date column or a date field)
          const joiningDate = parseDate(getValue('Joining Date', row));
          const resignationDate = joiningDate || new Date(); // Use joining date as resignation date if available

          // Update employee status to Resigned
          await prisma.employee.update({
            where: { id: employee.id },
            data: {
              status: 'Resigned',
              resignationDate,
              category: classification || employee.category
            }
          });
          result.recordsUpdated++;
          console.log(`  ✅ Updated: ${employee.name} (Status: Resigned)`);
        } else {
          result.recordsNotFound++;
          console.log(`  ⚠️  Not found: ${employeeName || employeeCode}`);
        }

      } catch (error: any) {
        const errorMsg = error.message || 'Unknown error';
        console.error(`  ❌ Error processing row ${i + 1}:`, errorMsg);
        result.errors.push(`Row ${i + 1}: ${errorMsg}`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Import Summary:`);
    console.log(`  Updated: ${result.recordsUpdated}`);
    console.log(`  Not Found: ${result.recordsNotFound}`);
    console.log(`  Errors: ${result.errors.length}`);
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    result.success = false;
    const errorMsg = error.message || 'Unknown error';
    console.error('Fatal import error:', errorMsg);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    result.errors.push(`Fatal error: ${errorMsg}`);
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError: any) {
      console.error('Error disconnecting from database:', disconnectError.message);
    }
  }

  return result;
}

