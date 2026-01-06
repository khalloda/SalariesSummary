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

export interface CandidateEmployee {
  rowIndex: number;
  name: string;
  nationalId?: string | null;
  classification?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  dateOfBirth?: Date | null;
  nationalIdValidTill?: Date | null;
  barAssociation?: string | null;
  barAssociationDegree?: string | null;
  joiningDate?: Date | null;
  resignationDate: Date;
}

export interface ResignedConflict {
  rowIndex: number;
  incomingData: {
    name: string;
    nationalId?: string | null;
    classification?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    resignationDate: Date;
    dateOfBirth?: Date | null;
    nationalIdValidTill?: Date | null;
    barAssociation?: string | null;
    barAssociationDegree?: string | null;
    joiningDate?: Date | null;
  };
  matchingEmployees: Array<{
    id: string;
    name: string;
    nationalId?: string | null;
    employeeCode?: string | null;
    category?: string | null;
    status?: string | null;
    resignationDate?: Date | null;
  }>;
  matchMethod: 'nationalId' | 'name';
}

export interface ResignedImportResult {
  success: boolean;
  recordsUpdated: number;
  recordsNotFound: number;
  errors: string[];
  candidates?: CandidateEmployee[]; // Employees not found that could be created
  conflicts?: ResignedConflict[]; // Multiple matches requiring user selection
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
 * Parse National ID, handling scientific notation from Excel
 */
function parseNationalId(value: any): string | null {
  if (value === null || value === undefined) return null;
  
  // If it's already a string, check if it's in scientific notation
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '-' || trimmed === 'N/A') return null;
    
    // Check if it's in scientific notation (e.g., "2.74091E+13" or "2.74091e+13")
    if (trimmed.match(/^[\d.]+[eE][+-]\d+$/)) {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) {
        // Convert to full number string without scientific notation
        // Use toFixed(0) to remove decimals, then convert to string
        return num.toFixed(0);
      }
    }
    return trimmed;
  }
  
  // If it's a number, convert to string without scientific notation
  if (typeof value === 'number') {
    // For very large numbers, use toFixed(0) to avoid scientific notation
    if (value >= 1e12) {
      return value.toFixed(0);
    }
    return value.toString();
  }
  
  // For other types, convert to string first
  const str = String(value).trim();
  if (str === '' || str === '-' || str === 'N/A') return null;
  
  // Check if the string representation is in scientific notation
  if (str.match(/^[\d.]+[eE][+-]\d+$/)) {
    const num = parseFloat(str);
    if (!isNaN(num)) {
      return num.toFixed(0);
    }
  }
  
  return str;
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
    errors: [],
    candidates: [],
    conflicts: []
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
      cellFormula: false,
      cellStyles: false,
      cellNF: false,
      cellText: true  // Enable to get text representation of cells
    });

    if (!workbook.SheetNames.includes('Resigned')) {
      result.success = false;
      result.errors.push(`Sheet "Resigned" not found. Available sheets: ${workbook.SheetNames.join(', ')}`);
      return result;
    }

    const worksheet = workbook.Sheets['Resigned'];
    // Store worksheet reference for direct cell access
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,  // This will use formatted text when available
      defval: null
    }) as any[][];

    if (rawData.length < 2) {
      result.success = false;
      result.errors.push('Sheet has insufficient data (less than 2 rows)');
      return result;
    }

    // Headers are in row 0 (single-level headers after subheader row was removed)
    const mainHeaders = rawData[0] || [];

    // Map column indices
    const columnMap: Record<string, number> = {};
    mainHeaders.forEach((header, idx) => {
      if (header) {
        const headerStr = String(header).trim();
        columnMap[headerStr] = idx;
      }
    });

    console.log(`Found ${Object.keys(columnMap).length} headers`);
    console.log(`Processing ${rawData.length - 1} data rows...\n`);

    const getValue = (headerName: string, row: any[], rowIndex?: number): any => {
      const colIdx = columnMap[headerName];
      if (colIdx === undefined || colIdx < 0) return null;
      
      // For NationalID Number, try to get the raw cell value as text to preserve precision
      if (headerName === 'NationalID Number' && rowIndex !== undefined) {
        // rowIndex is 0-based from rawData array (rawData[0] = headers, rawData[1] = first data row)
        // Excel rows are 1-based, so Excel row = rowIndex + 1 (since row 1 is headers in Excel)
        const excelRowIndex = rowIndex + 1;
        const cellAddress = XLSX.utils.encode_cell({ r: excelRowIndex, c: colIdx });
        const cell = worksheet[cellAddress];
        if (cell) {
          // If cell has 'w' property (formatted text/display value), use it - this preserves the exact text
          if (cell.w) {
            return cell.w;
          }
          // If cell has 't' property indicating it's text type, use 'v' (value)
          if (cell.t === 's' && cell.v !== undefined) {
            return String(cell.v);
          }
          // If it's a number, we need to be careful about precision
          if (cell.t === 'n' && cell.v !== undefined) {
            const cellValue = cell.v;
            // For very large numbers, try to preserve as much precision as possible
            // But note: if Excel already lost precision, we can't recover it
            if (cellValue >= 1e12) {
              // Convert to string without scientific notation
              return cellValue.toFixed(0);
            }
            return cellValue;
          }
        }
      }
      
      return row[colIdx] !== undefined ? row[colIdx] : null;
    };


    // Process data rows (starting from row 1, since row 0 is headers)
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.every(cell => !cell || cell === '')) {
        continue;
      }

      try {
        // Extract data from row
        // Pass row index (i) to getValue for NationalID to access raw cell data
        const nationalIdValue = getValue('NationalID Number', row, i);
        const classification = parseString(getValue('Classification', row));
        const employeeName = parseString(getValue('Name', row));
        const jobTitle = parseString(getValue('Job Title', row));
        const department = parseString(getValue('Department/Division', row));
        const dateOfBirth = parseDate(getValue('Date of Birth', row));
        const joiningDate = parseDate(getValue('Joining Date', row));
        const resignationDate = parseDate(getValue('Date of Resignation', row)); // FIXED: Use correct column
        const nationalIdValidTill = parseDate(getValue('NationalID Valid till', row));
        const barAssociation = parseString(getValue('Bar Association Number', row));
        const barAssociationDegree = parseString(getValue('Bar Association Degree (درجة القيد)', row));

        if (!employeeName && !nationalIdValue) {
          continue;
        }

        // Parse National ID (handles scientific notation)
        const nationalIdStr = parseNationalId(nationalIdValue);

        // Find employee - Check for multiple matches (conflicts)
        let employees: any[] = [];
        let matchMethod: 'nationalId' | 'name' | '' = '';
        
        if (nationalIdStr) {
          if (nationalIdStr !== 'N/A' && nationalIdStr !== '') {
            employees = await prisma.employee.findMany({
              where: { nationalId: nationalIdStr }
            });
            if (employees.length > 0) {
              matchMethod = 'nationalId';
            }
          }
        }
        
        if (employees.length === 0 && employeeName) {
          const normalizedName = normalizeEmployeeName(employeeName);
          const foundEmployee = await prisma.employee.findUnique({
            where: { normalizedName }
          });
          if (foundEmployee) {
            employees = [foundEmployee];
            matchMethod = 'name';
          }
        }

        // Handle conflicts (multiple matches)
        if (employees.length > 1) {
          if (!resignationDate) {
            result.errors.push(`Row ${i + 1}: Missing resignation date for conflict resolution: ${employeeName}`);
            continue;
          }

          result.conflicts!.push({
            rowIndex: i + 1,
            incomingData: {
              name: employeeName || '',
              nationalId: nationalIdStr || null,
              classification: classification || null,
              jobTitle: jobTitle || null,
              department: department || null,
              resignationDate: resignationDate,
              dateOfBirth: dateOfBirth || null,
              nationalIdValidTill: nationalIdValidTill || null,
              barAssociation: barAssociation || null,
              barAssociationDegree: barAssociationDegree || null,
              joiningDate: joiningDate || null,
            },
            matchingEmployees: employees.map(emp => ({
              id: emp.id,
              name: emp.name,
              nationalId: emp.nationalId,
              employeeCode: emp.employeeCode,
              category: emp.category,
              status: emp.status,
              resignationDate: emp.resignationDate,
            })),
            matchMethod: matchMethod as 'nationalId' | 'name'
          });
          console.log(`  ⚠️  Conflict: ${employees.length} employees match for ${employeeName || nationalIdValue}`);
          continue; // Skip processing, will be handled in conflict resolution
        }

        // Single match - proceed as before
        const employee = employees.length === 1 ? employees[0] : null;
        const matchMethodDisplay = matchMethod === 'nationalId' ? 'National ID' : matchMethod === 'name' ? 'Name' : '';

        if (employee) {
          // Validate resignation date
          if (!resignationDate) {
            result.errors.push(`Row ${i + 1}: Missing resignation date for ${employeeName}`);
            continue;
          }

          // Validate resignation date is after joining date (if both exist)
          if (joiningDate && resignationDate < joiningDate) {
            result.errors.push(`Row ${i + 1}: Resignation date (${resignationDate.toISOString()}) is before joining date (${joiningDate.toISOString()}) for ${employeeName}`);
            // Continue anyway, but log the warning
          }

          // Prepare update data
          const updateData: any = {
            status: 'Resigned',
            resignationDate,
          };

          // Update category if provided
          if (classification) {
            updateData.category = classification;
          }

          // Update other fields if missing in employee record
          if (!employee.jobTitle && jobTitle) {
            updateData.jobTitle = jobTitle;
          }
          if (!employee.department && department) {
            updateData.department = department;
          }
          if (!employee.dateOfBirth && dateOfBirth) {
            updateData.dateOfBirth = dateOfBirth;
          }
          if (!employee.nationalId && nationalIdStr) {
            updateData.nationalId = nationalIdStr;
          }
          if (!employee.nationalIdValidTill && nationalIdValidTill) {
            updateData.nationalIdValidTill = nationalIdValidTill;
          }
          if (!employee.barAssociation && barAssociation && barAssociation !== 'N/A') {
            updateData.barAssociation = barAssociation;
          }
          if (!employee.barAssociationDegree && barAssociationDegree && barAssociationDegree !== 'N/A') {
            updateData.barAssociationDegree = barAssociationDegree;
          }

          // Update employee status to Resigned
          await prisma.employee.update({
            where: { id: employee.id },
            data: updateData
          });

          // Create resignation record (Phase 3)
          await prisma.resignationRecord.create({
            data: {
              employeeId: employee.id,
              resignationDate,
              jobTitle: jobTitle || employee.jobTitle || null,
              department: department || employee.department || null,
              category: classification || employee.category || null,
              reason: null, // Not available in sheet
              importedFrom: targetFile,
              notes: `Imported from Resigned sheet, row ${i + 1}`
            }
          });

          result.recordsUpdated++;
          const matchInfo = matchMethodDisplay ? ` [Matched by: ${matchMethodDisplay}]` : '';
          console.log(`  ✅ Updated: ${employee.name} (Status: Resigned, Date: ${resignationDate.toISOString().split('T')[0]}${matchInfo})`);
        } else {
          // Employee not found - collect as candidate for creation
          if (employeeName && resignationDate) {
            result.candidates!.push({
              rowIndex: i + 1,
              name: employeeName,
              nationalId: nationalIdStr || null,
              classification: classification || null,
              jobTitle: jobTitle || null,
              department: department || null,
              dateOfBirth: dateOfBirth || null,
              nationalIdValidTill: nationalIdValidTill || null,
              barAssociation: barAssociation && barAssociation !== 'N/A' ? barAssociation : null,
              barAssociationDegree: barAssociationDegree && barAssociationDegree !== 'N/A' 
                ? barAssociationDegree 
                : null,
              joiningDate: joiningDate || null,
              resignationDate: resignationDate
            });
            result.recordsNotFound++;
            console.log(`  ⚠️  Candidate for creation: ${employeeName || nationalIdValue}`);
          } else {
            result.recordsNotFound++;
            result.errors.push(`Row ${i + 1}: Missing required fields (name or resignation date) for candidate`);
            console.log(`  ⚠️  Not found (invalid): ${employeeName || nationalIdValue}`);
          }
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
    console.log(`  Candidates for Creation: ${result.candidates?.length || 0}`);
    console.log(`  Conflicts (Multiple Matches): ${result.conflicts?.length || 0}`);
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

