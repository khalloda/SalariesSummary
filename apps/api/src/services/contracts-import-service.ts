/**
 * Contracts Import Service
 * Handles importing contract data from SEPEmployees.xlsx - Contracts sheet
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

export interface ContractsImportResult {
  success: boolean;
  recordsImported: number;
  recordsUpdated: number;
  recordsLinked: number;
  errors: string[];
}

/**
 * Parse date from Excel cell value
 * Handles formats: Date object, ISO string, MM/DD/YYYY, DD-Mon-YY, Excel date codes
 */
function parseDate(value: any): Date | null {
  if (!value) return null;
  
  if (value instanceof Date) {
    return value;
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    
    // Try standard Date parsing first
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      // Check if it's a reasonable date (not 1900 or 2000 placeholder)
      const year = parsed.getFullYear();
      if (year >= 2000 && year <= 2100) {
        return parsed;
      }
    }
    
    // Handle DD-Mon-YY format (e.g., "20-Jan-26", "21-Jul-22")
    const ddmonyyMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
    if (ddmonyyMatch) {
      const day = parseInt(ddmonyyMatch[1], 10);
      const monthStr = ddmonyyMatch[2].toLowerCase();
      let year = parseInt(ddmonyyMatch[3], 10);
      
      const monthMap: Record<string, number> = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
      
      const month = monthMap[monthStr];
      if (month !== undefined) {
        // Assume years 00-50 are 2000-2050, 51-99 are 1951-1999
        year += year < 50 ? 2000 : 1900;
        
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    // Handle MM/DD/YYYY format
    const parts = trimmed.split('/');
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
      const parsedDate = new Date(date.y, date.m - 1, date.d);
      // Check if it's a reasonable date (not 1900 or 2000 placeholder)
      if (parsedDate.getFullYear() >= 2000 && parsedDate.getFullYear() <= 2100) {
        return parsedDate;
      }
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
    return trimmed === '' || trimmed === '-' || trimmed === 'N/A' || trimmed === 'Resigned' ? null : trimmed;
  }
  return String(value).trim() || null;
}

/**
 * Import contracts from SEPEmployees.xlsx
 */
export async function importContracts(filePath?: string): Promise<ContractsImportResult> {
  const result: ContractsImportResult = {
    success: true,
    recordsImported: 0,
    recordsUpdated: 0,
    recordsLinked: 0,
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
    console.log(`Importing Contracts sheet from: ${targetFile}`);
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

    if (!workbook.SheetNames.includes('Contracts')) {
      result.success = false;
      result.errors.push(`Sheet "Contracts" not found. Available sheets: ${workbook.SheetNames.join(', ')}`);
      return result;
    }

    const worksheet = workbook.Sheets['Contracts'];
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
    const nameColIdx = headers.findIndex((h: any) => h && String(h).trim().toLowerCase() === 'name');
    const contractDurationColIdx = headers.findIndex((h: any) => h && String(h).trim().toLowerCase().includes('contract duration'));
    const commentsColIdx = headers.findIndex((h: any) => h && String(h).trim().toLowerCase() === 'comments');

    console.log(`Found columns: Name=${nameColIdx}, Contract Duration=${contractDurationColIdx}, Comments=${commentsColIdx}`);
    console.log(`Processing ${rawData.length - 1} data rows...\n`);

    // Process data rows (starting from row 1)
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.every(cell => !cell || cell === '')) {
        continue;
      }

      try {
        const nameValue = nameColIdx >= 0 ? row[nameColIdx] : null;
        const contractDuration = contractDurationColIdx >= 0 ? parseString(row[contractDurationColIdx]) : null;
        const comments = commentsColIdx >= 0 ? parseString(row[commentsColIdx]) : null;

        // Skip if no contract duration
        if (!contractDuration) {
          continue;
        }

        // Parse contract date and employee identifier
        // The Name column can contain: employee code, employee name, or date
        // Column B might also contain dates
        let contractDate: Date | null = null;
        let employeeName: string | null = null;
        let employeeCode: string | null = null;

        // Check column B for date (sometimes the date is in column B)
        const columnB = row[1];
        const dateFromB = parseDate(columnB);
        if (dateFromB) {
          contractDate = dateFromB;
        }

        if (nameValue) {
          const nameStr = String(nameValue).trim();
          
          // Try to parse as date first
          const dateFromName = parseDate(nameValue);
          if (dateFromName) {
            contractDate = dateFromName;
          } else {
            // If not a date, treat as employee identifier
            // Check if it looks like an employee code (e.g., "3-1", "2-4")
            if (/^\d+-\d+/.test(nameStr)) {
              employeeCode = nameStr;
            } else if (nameStr !== 'From' && nameStr !== 'Resigned') {
              employeeName = nameStr;
            }
          }
        }

        // Also check comments for dates
        if (!contractDate && comments) {
          const dateFromComments = parseDate(comments);
          if (dateFromComments) {
            contractDate = dateFromComments;
          }
        }

        // Try to find employee
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

        // Create contract record
        const contractData = {
          employeeId: employee?.id || null,
          employeeName,
          employeeCode,
          contractDate,
          contractDuration,
          comments,
          sourceFile: 'SEPEmployees.xlsx'
        };

        await prisma.contractRecord.create({
          data: contractData
        });

        if (employee) {
          result.recordsLinked++;
        }

        result.recordsImported++;
        if (i <= 5) {
          console.log(`  ✅ Row ${i + 1}: Imported ${contractDuration} ${contractDate ? `(Date: ${contractDate.toISOString().split('T')[0]})` : '(No date)'} ${employee ? `(Linked to ${employee.name})` : '(No employee match)'}`);
        }

      } catch (error: any) {
        const errorMsg = error.message || 'Unknown error';
        console.error(`  ❌ Error processing row ${i + 1}:`, errorMsg);
        result.errors.push(`Row ${i + 1}: ${errorMsg}`);
      }
    }

    // After all contracts are imported, update employees with their latest contract renewal date
    console.log('\nUpdating employees with latest contract renewal dates...');
    const allEmployees = await prisma.employee.findMany({
      where: {
        contractRecords: {
          some: {
            contractDate: { not: null }
          }
        }
      },
      include: {
        contractRecords: {
          where: {
            contractDate: { not: null }
          },
          orderBy: { contractDate: 'desc' },
          take: 1
        }
      }
    });

    for (const employee of allEmployees) {
      if (employee.contractRecords.length > 0) {
        const latestContract = employee.contractRecords[0];
        await prisma.employee.update({
          where: { id: employee.id },
          data: {
            contractDuration: latestContract.contractDuration,
            contractRenewalDate: latestContract.contractDate
          }
        });
        result.recordsUpdated++;
        if (result.recordsUpdated <= 5) {
          console.log(`  ✅ Updated ${employee.name}: Renewal Date = ${latestContract.contractDate?.toISOString().split('T')[0] || 'N/A'}`);
        }
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Import Summary:`);
    console.log(`  Created: ${result.recordsImported}`);
    console.log(`  Linked to Employees: ${result.recordsLinked}`);
    console.log(`  Updated Employees: ${result.recordsUpdated}`);
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

