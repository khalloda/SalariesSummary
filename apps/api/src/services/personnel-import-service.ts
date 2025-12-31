/**
 * Personnel Import Service
 * Handles importing personnel data from SEPEmployees.xlsx - Personnel sheet
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

export interface PersonnelImportResult {
  success: boolean;
  recordsImported: number;
  recordsUpdated: number;
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
 * Import personnel data from SEPEmployees.xlsx
 */
export async function importPersonnel(filePath?: string): Promise<PersonnelImportResult> {
  const result: PersonnelImportResult = {
    success: true,
    recordsImported: 0,
    recordsUpdated: 0,
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
    console.log(`Importing Personnel sheet from: ${targetFile}`);
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

    if (!workbook.SheetNames.includes('Personnel')) {
      result.success = false;
      result.errors.push(`Sheet "Personnel" not found. Available sheets: ${workbook.SheetNames.join(', ')}`);
      return result;
    }

    const worksheet = workbook.Sheets['Personnel'];
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: null
    });

    if (rawData.length < 2) {
      result.success = false;
      result.errors.push('Sheet has insufficient data');
      return result;
    }

    // Headers are in row 0
    const headers = rawData[0] || [];
    
    // Map column indices
    const columnMap: Record<string, number> = {};
    headers.forEach((header, idx) => {
      if (header) {
        const headerStr = String(header).trim();
        columnMap[headerStr] = idx;
      }
    });

    console.log(`Found ${Object.keys(columnMap).length} columns`);
    console.log(`Processing ${rawData.length - 1} data rows...\n`);

    const getValue = (headerName: string, row: any[]): any => {
      const colIdx = columnMap[headerName];
      if (colIdx === undefined || colIdx < 0) return null;
      return row[colIdx] !== undefined ? row[colIdx] : null;
    };

    // Process data rows (starting from row 1)
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.every(cell => !cell || cell === '')) {
        continue;
      }

      try {
        const employeeCode = parseString(getValue('ID', row));
        const employeeName = parseString(getValue('Name', row));

        if (!employeeCode && !employeeName) {
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

        // Collect personnel data
        const personnelData = {
          criminalRecord: parseString(getValue('Criminal Record', row)),
          militaryCertificate: parseString(getValue('Military Certificate', row)),
          idCopy: parseString(getValue('ID Copy', row)),
          educationCertificate: parseString(getValue('Education Certificate', row)),
          birthCertificate: parseString(getValue('Birth Certificate', row)),
          recommendationLetter: parseString(getValue('Recommendation Letter', row)),
          personalPhotos: parseString(getValue('Personal Photos', row)),
          taxCard: parseString(getValue('Tax Card', row)),
          associationId: parseString(getValue('Association ID', row)),
          form6: parseString(getValue('Form 6', row)),
          laptopPcTablet: parseString(getValue('Laptop / PC / Tablet', row)) || parseString(getValue('Laptop / \nPC / Tablet', row)),
          workStub: parseString(getValue('كعب العمل', row)),
          insuranceStartDate: parseDate(getValue('تاريخ بداية التأمين', row)),
          status: parseString(getValue('Status', row))
        };

        if (employee) {
          // Update employee with personnel data
          await prisma.employee.update({
            where: { id: employee.id },
            data: {
              personnelData: JSON.stringify(personnelData),
              status: personnelData.status || employee.status
            }
          });
          result.recordsUpdated++;
          console.log(`  ✅ Updated: ${employee.name} (Personnel data)`);
        } else {
          result.errors.push(`Row ${i + 1}: Employee not found (${employeeCode || employeeName})`);
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

