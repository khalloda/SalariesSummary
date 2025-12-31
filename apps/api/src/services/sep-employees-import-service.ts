/**
 * SEP Employees Import Service
 * Handles importing employee data from SEPEmployees.xlsx - AllOffice sheet
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

export interface SEPEmployeeImportResult {
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
    // Try parsing various date formats
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    
    // Try MM/DD/YY format
    const parts = value.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10) - 1; // Month is 0-indexed
      const day = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      
      // Handle 2-digit years
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
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(date.y, date.m - 1, date.d);
    }
  }
  
  return null;
}

/**
 * Parse integer from value
 */
function parseIntValue(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Math.floor(value);
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d-]/g, '');
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? null : parsed;
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
 * Import employees from SEPEmployees.xlsx
 */
export async function importSEPEmployees(filePath?: string): Promise<SEPEmployeeImportResult> {
  const result: SEPEmployeeImportResult = {
    success: true,
    recordsImported: 0,
    recordsUpdated: 0,
    errors: []
  };

  try {
    await prisma.$connect();

    // Determine file path
    const sheetsDir = getSheetsDir();
    const targetFile = filePath || join(sheetsDir, 'SEPEmployees.xlsx');

    if (!existsSync(targetFile)) {
      result.success = false;
      result.errors.push(`File not found: ${targetFile}`);
      return result;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Importing SEPEmployees.xlsx from: ${targetFile}`);
    console.log('='.repeat(60));

    // Read workbook
    const data = readFileSync(targetFile);
    const workbook = XLSX.read(data, {
      type: 'buffer',
      cellDates: true,
      cellFormulas: false,
      cellStyles: false,
      cellNF: false,
      cellText: false
    });

    // Get AllOffice sheet
    if (!workbook.SheetNames.includes('AllOffice')) {
      result.success = false;
      result.errors.push(`Sheet "AllOffice" not found. Available sheets: ${workbook.SheetNames.join(', ')}`);
      return result;
    }

    const worksheet = workbook.Sheets['AllOffice'];
    
    // Get raw data
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

    // Headers are in row 0 (index 0) and row 1 (index 1)
    const mainHeaders = rawData[0] || [];
    const subHeaders = rawData[1] || [];

    // Map column indices to field names based on main headers
    const columnMap: Record<string, number> = {};
    
    // Find column indices for main headers
    mainHeaders.forEach((header, idx) => {
      if (!header) return;
      const headerStr = String(header).trim();
      if (headerStr) {
        columnMap[headerStr] = idx;
      }
    });

    // Helper function to get value from a column by header name
    const getColumnValue = (headerName: string, row: any[]): any => {
      const colIdx = columnMap[headerName];
      if (colIdx === undefined || colIdx < 0 || colIdx >= row.length) return null;
      return row[colIdx] !== undefined ? row[colIdx] : null;
    };

    // Helper function to get value from adjacent column
    const getAdjacentValue = (headerName: string, offset: number, row: any[]): any => {
      const colIdx = columnMap[headerName];
      if (colIdx === undefined || colIdx < 0) return null;
      const targetIdx = colIdx + offset;
      if (targetIdx < 0 || targetIdx >= row.length) return null;
      return row[targetIdx] !== undefined ? row[targetIdx] : null;
    };

    // Debug: Print column map
    console.log('Column mapping:');
    Object.entries(columnMap).forEach(([header, idx]) => {
      console.log(`  ${header}: Column ${XLSX.utils.encode_col(idx)} (${idx})`);
    });
    console.log('');

    console.log(`Found ${Object.keys(columnMap).length} main headers`);
    console.log(`Processing ${rawData.length - 2} data rows...\n`);

    // Process data rows (starting from row 2, index 2)
    for (let i = 2; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.every(cell => !cell || cell === '')) {
        continue; // Skip empty rows
      }

      try {
        // Basic Info
        const employeeCode = parseString(getColumnValue('ID', row));
        const category = parseString(getColumnValue('Category', row));
        const nameEnglish = parseString(getColumnValue('Name in English', row));
        const nameArabic = parseString(getColumnValue('الاسم بالعربية', row));
        const jobTitle = parseString(getColumnValue('Job Title', row));
        const department = parseString(getColumnValue('Department', row));

        // Skip if no name or employee code
        if (!nameEnglish && !nameArabic && !employeeCode) {
          console.log(`  ⚠️  Row ${i + 1}: Skipping row with no name or ID`);
          continue;
        }

        // Use English name as primary, fallback to Arabic, then employee code
        const primaryName = nameEnglish || nameArabic || employeeCode || 'Unknown';
        const normalizedName = normalizeEmployeeName(primaryName);

        // Dates
        const dateOfBirth = parseDate(getColumnValue('Date of Birth', row));
        const joiningDate = parseDate(getColumnValue('Joining Date', row));

        // Education - Graduation has sub-headers in adjacent columns
        const graduationCertificate = parseString(getColumnValue('Graduation', row));
        const graduationSection = parseString(getAdjacentValue('Graduation', 1, row));
        const graduationUniversity = parseString(getAdjacentValue('Graduation', 2, row));
        const graduationYear = parseIntValue(getAdjacentValue('Graduation', 3, row));

        // Identification Numbers
        const socialInsurance = parseString(getColumnValue('Social Insurance', row));
        const barAssociation = parseString(getColumnValue('Bar Association', row));
        const barValidTill = parseDate(getAdjacentValue('Bar Association', 1, row));
        const barDegree = parseString(getAdjacentValue('Bar Association', 2, row));
        const taxCard = parseString(getColumnValue('Tax Card', row));

        // Contact Information
        const address = parseString(getColumnValue('Address', row));
        const addressRegion = parseString(getAdjacentValue('Address', 1, row));
        const addressGovernorate = parseString(getAdjacentValue('Address', 2, row));
        const extension = parseString(getColumnValue('Extenstion', row)); // Note: typo in original
        const mobileNumber = parseString(getColumnValue('Mobile Number', row));

        // Employment Details
        const contractType = parseString(getColumnValue('Contract Type', row));
        const contractDuration = parseString(getAdjacentValue('Contract Type', 1, row));
        const contractRenewalDate = parseDate(getAdjacentValue('Contract Type', 2, row));
        const status = parseString(getColumnValue('Status', row));

        // Experience - Experience In has Years and Months in adjacent columns
        const experienceInYears = parseIntValue(getColumnValue('Experience In', row));
        const experienceInMonths = parseIntValue(getAdjacentValue('Experience In', 1, row));
        
        // Experience Out has Years and Months in adjacent columns
        const experienceOutYears = parseIntValue(getColumnValue('Experience Out', row));
        const experienceOutMonths = parseIntValue(getAdjacentValue('Experience Out', 1, row));

        // Find or create employee
        let employee = await prisma.employee.findUnique({
          where: { normalizedName }
        });

        // Also try to find by employee code if available
        if (!employee && employeeCode) {
          employee = await prisma.employee.findFirst({
            where: { employeeCode }
          });
        }

        const employeeData = {
          name: primaryName,
          normalizedName,
          category,
          employeeCode,
          nameArabic,
          jobTitle,
          department,
          dateOfBirth,
          joiningDate,
          graduationCertificate: graduationCertificate || section,
          graduationSection: section,
          graduationUniversity: university,
          graduationYear: year,
          socialInsurance,
          barAssociation,
          barAssociationValidTill: barValidTill,
          barAssociationDegree: barDegree,
          taxCard,
          address,
          addressRegion,
          addressGovernorate,
          extension,
          mobileNumber,
          contractType,
          contractDuration,
          contractRenewalDate,
          status,
          experienceInYears,
          experienceInMonths,
          experienceOutYears,
          experienceOutMonths
        };

        if (employee) {
          // Update existing employee
          await prisma.employee.update({
            where: { id: employee.id },
            data: employeeData
          });
          result.recordsUpdated++;
          console.log(`  ✅ Updated: ${primaryName} (${employeeCode || 'No ID'})`);
        } else {
          // Create new employee
          await prisma.employee.create({
            data: employeeData
          });
          result.recordsImported++;
          console.log(`  ➕ Created: ${primaryName} (${employeeCode || 'No ID'})`);
        }

      } catch (error: any) {
        const errorMsg = error.message || 'Unknown error';
        console.error(`  ❌ Error processing row ${i + 1}:`, errorMsg);
        result.errors.push(`Row ${i + 1}: ${errorMsg}`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Import Summary:`);
    console.log(`  Created: ${result.recordsImported}`);
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

