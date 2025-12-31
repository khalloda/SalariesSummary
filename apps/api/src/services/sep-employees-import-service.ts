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
    // Reject placeholder dates like January 1, 2000
    if (value.getFullYear() === 2000 && value.getMonth() === 0 && value.getDate() === 1) {
      return null;
    }
    return value;
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '-' || trimmed === 'N/A' || trimmed === '') {
      return null;
    }
    
    // Try parsing various date formats
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      // Reject placeholder dates like January 1, 2000
      if (parsed.getFullYear() === 2000 && parsed.getMonth() === 0 && parsed.getDate() === 1) {
        return null;
      }
      return parsed;
    }
    
    // Try MM/DD/YY format
    const parts = trimmed.split('/');
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
        // Reject placeholder dates like January 1, 2000
        if (date.getFullYear() === 2000 && date.getMonth() === 0 && date.getDate() === 1) {
          return null;
        }
        return date;
      }
    }
  }
  
  if (typeof value === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const parsedDate = new Date(date.y, date.m - 1, date.d);
      // Reject placeholder dates like January 1, 2000
      if (parsedDate.getFullYear() === 2000 && parsedDate.getMonth() === 0 && parsedDate.getDate() === 1) {
        return null;
      }
      return parsedDate;
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
    
    // Also create a map for sub-headers to help identify specific columns
    const subHeaderMap: Record<string, number> = {};
    subHeaders.forEach((subHeader, idx) => {
      if (!subHeader) return;
      const subHeaderStr = String(subHeader).trim();
      if (subHeaderStr) {
        subHeaderMap[subHeaderStr] = idx;
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

    // Helper function to get value from a column by sub-header name
    const getSubHeaderValue = (subHeaderName: string, row: any[]): any => {
      const colIdx = subHeaderMap[subHeaderName];
      if (colIdx === undefined || colIdx < 0 || colIdx >= row.length) return null;
      return row[colIdx] !== undefined ? row[colIdx] : null;
    };

    // Debug: Print column map
    console.log('Column mapping:');
    Object.entries(columnMap).forEach(([header, idx]) => {
      const subHeader = subHeaders[idx] ? ` (sub: ${subHeaders[idx]})` : '';
      console.log(`  ${header}: Column ${XLSX.utils.encode_col(idx)} (${idx})${subHeader}`);
    });
    console.log('');
    
    // Debug: Check ID column position
    if (columnMap['ID'] !== undefined) {
      const idCol = columnMap['ID'];
      console.log(`✅ ID column found at column ${XLSX.utils.encode_col(idCol)} (${idCol})`);
      // Show sample value from first data row
      if (rawData.length > 2) {
        const sampleValue = rawData[2][idCol];
        console.log(`   Sample ID value from row 3: "${sampleValue}"`);
      }
    } else {
      console.log(`⚠️  WARNING: ID column NOT found in headers!`);
      console.log(`   Available headers: ${Object.keys(columnMap).join(', ')}`);
    }
    console.log('');
    
    // Debug: Check NationalID column position
    if (columnMap['NationalID'] !== undefined) {
      const nationalIdCol = columnMap['NationalID'];
      console.log(`✅ NationalID main header found at column ${XLSX.utils.encode_col(nationalIdCol)} (${nationalIdCol})`);
    }
    
    // Debug: Check NationalID sub-headers
    if (subHeaderMap['Number'] !== undefined) {
      console.log(`✅ NationalID/Number sub-header found at column ${XLSX.utils.encode_col(subHeaderMap['Number'])} (${subHeaderMap['Number']})`);
    } else {
      console.log(`⚠️  NationalID/Number sub-header NOT found. Will try column M (index 12) directly.`);
    }
    
    if (subHeaderMap['Valid Till'] !== undefined) {
      console.log(`✅ NationalID/Valid Till sub-header found at column ${XLSX.utils.encode_col(subHeaderMap['Valid Till'])} (${subHeaderMap['Valid Till']})`);
    } else {
      console.log(`⚠️  NationalID/Valid Till sub-header NOT found. Will try column N (index 13) directly.`);
    }
    
    // Debug: Check Contract Type and Date of Renewal
    if (columnMap['Contract Type'] !== undefined) {
      const contractTypeCol = columnMap['Contract Type'];
      console.log(`✅ Contract Type main header found at column ${XLSX.utils.encode_col(contractTypeCol)} (${contractTypeCol})`);
    }
    
    if (subHeaderMap['Date of Renewal'] !== undefined) {
      console.log(`✅ Contract Type/Date of Renewal sub-header found at column ${XLSX.utils.encode_col(subHeaderMap['Date of Renewal'])} (${subHeaderMap['Date of Renewal']})`);
    } else {
      console.log(`⚠️  Contract Type/Date of Renewal sub-header NOT found. Will try column Y (index 24) directly.`);
    }
    console.log('');
    
    // Debug: Check Bar Association and Tax Card positions
    if (columnMap['Bar Association'] !== undefined && columnMap['Tax Card'] !== undefined) {
      const barCol = columnMap['Bar Association'];
      const taxCol = columnMap['Tax Card'];
      console.log(`Bar Association at column ${barCol}, Tax Card at column ${taxCol}, difference: ${taxCol - barCol}`);
    }
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
        // System ID No. comes from column A "ID" (employeeCode)
        // IMPORTANT: Always use column A (index 0) directly for employeeCode, regardless of header name
        // This ensures we get the System ID (like "2-21") and not the NationalID
        let employeeCode = parseString(row[0]); // Column A is always index 0
        
        // Also try to get from 'ID' header if it exists and column A is empty
        if (!employeeCode) {
          const idFromHeader = parseString(getColumnValue('ID', row));
          if (idFromHeader) {
            employeeCode = idFromHeader;
            console.log(`  ⚠️  Row ${i + 1}: Column A was empty, using 'ID' header value: "${employeeCode}"`);
          }
        }
        
        // Debug: Log first few rows to verify ID is being read correctly
        if (i <= 4) {
          const columnAValue = row[0];
          const idFromHeader = getColumnValue('ID', row);
          console.log(`  Row ${i + 1}: Column A (index 0) = "${columnAValue}", 'ID' header value = "${idFromHeader}", Final employeeCode = "${employeeCode}"`);
        }
        
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
        
        // Bar Association has sub-headers: Number, Valid Till, Degree
        // Find the Bar Association column, then use sub-headers to find the correct columns
        const barAssociationCol = columnMap['Bar Association'];
        let barAssociation: string | null = null;
        let barValidTill: Date | null = null;
        let barDegree: string | null = null;
        
        if (barAssociationCol !== undefined) {
          barAssociation = parseString(row[barAssociationCol]);
          
          // Find the "Degree" column by looking for sub-headers containing "Degree" or "درجة"
          // Search in a range around the Bar Association column (up to 5 columns)
          let degreeCol: number | null = null;
          let validTillCol: number | null = null;
          
          for (let offset = 1; offset <= 5; offset++) {
            const checkCol = barAssociationCol + offset;
            if (checkCol >= subHeaders.length) break;
            
            const subHeader = String(subHeaders[checkCol] || '').toLowerCase();
            if (subHeader.includes('degree') || subHeader.includes('درجة') || subHeader.includes('قيد')) {
              degreeCol = checkCol;
            }
            if (subHeader.includes('valid') || subHeader.includes('till') || subHeader.includes('تاريخ')) {
              validTillCol = checkCol;
            }
          }
          
          // Use found columns or fall back to offsets
          if (validTillCol !== null) {
            barValidTill = parseDate(row[validTillCol]);
          } else {
            barValidTill = parseDate(getAdjacentValue('Bar Association', 1, row));
          }
          
          if (degreeCol !== null) {
            barDegree = parseString(row[degreeCol]);
          } else {
            // Fall back to offset 2, but verify it's not the Tax Card column
            const taxCardCol = columnMap['Tax Card'];
            const fallbackCol = barAssociationCol + 2;
            if (taxCardCol !== undefined && fallbackCol === taxCardCol) {
              // This is the Tax Card column, not the Degree! Try offset 1 or 3
              if (barAssociationCol + 1 !== taxCardCol && barAssociationCol + 1 < row.length) {
                barDegree = parseString(row[barAssociationCol + 1]);
              } else if (barAssociationCol + 3 !== taxCardCol && barAssociationCol + 3 < row.length) {
                barDegree = parseString(row[barAssociationCol + 3]);
              }
            } else {
              barDegree = parseString(getAdjacentValue('Bar Association', 2, row));
            }
          }
        }
        
        // Tax Card is a separate column (not adjacent to Bar Association)
        const taxCard = parseString(getColumnValue('Tax Card', row));
        
        // NationalID has sub-headers: "Number" (column M, index 12) and "Valid Till" (column N, index 13)
        // Since "Number" appears under both NationalID and Bar Association, we need to find the correct one
        // by checking which sub-header is adjacent to the NationalID main header
        let nationalIdNumber: string | null = null;
        let nationalIdValidTill: Date | null = null;
        
        const nationalIdMainCol = columnMap['NationalID'];
        
        if (nationalIdMainCol !== undefined) {
          // NationalID main header found - check adjacent columns for sub-headers
          // Column M (index 12) should have "Number" sub-header
          // Column N (index 13) should have "Valid Till" sub-header
          
          // Check if sub-header at column M is "Number" (under NationalID)
          if (subHeaders[nationalIdMainCol] && String(subHeaders[nationalIdMainCol]).trim() === 'Number') {
            nationalIdNumber = parseString(row[nationalIdMainCol]);
          } else {
            // Try column M directly (index 12) - this is the known position
            nationalIdNumber = parseString(row[12]);
          }
          
          // Check if sub-header at column N is "Valid Till" (under NationalID)
          if (subHeaders[nationalIdMainCol + 1] && String(subHeaders[nationalIdMainCol + 1]).trim() === 'Valid Till') {
            nationalIdValidTill = parseDate(row[nationalIdMainCol + 1]);
          } else {
            // Try column N directly (index 13) - this is the known position
            nationalIdValidTill = parseDate(row[13]);
          }
        } else {
          // NationalID main header not found - use direct column indices as fallback
          // Column M (index 12) = NationalID/Number
          // Column N (index 13) = NationalID/Valid Till
          nationalIdNumber = parseString(row[12]);
          nationalIdValidTill = parseDate(row[13]);
        }
        
        // Debug: Log first few rows to verify NationalID is being read correctly
        if (i <= 4) {
          const usedColM = nationalIdMainCol !== undefined ? nationalIdMainCol : 12;
          const usedColN = nationalIdMainCol !== undefined ? nationalIdMainCol + 1 : 13;
          console.log(`  Row ${i + 1}: NationalID Number = "${nationalIdNumber}" (from column ${XLSX.utils.encode_col(usedColM)}/${usedColM}), Valid Till = "${nationalIdValidTill}" (from column ${XLSX.utils.encode_col(usedColN)}/${usedColN})`);
        }
        
        // Safety check: If employeeCode looks like a NationalID (very long number), warn
        if (employeeCode && employeeCode.length > 10 && /^\d+$/.test(employeeCode.replace(/[^\d]/g, ''))) {
          console.log(`  ⚠️  WARNING Row ${i + 1}: employeeCode "${employeeCode}" looks like a NationalID! Column A might be wrong.`);
        }

        // Contact Information
        const address = parseString(getColumnValue('Address', row));
        const addressRegion = parseString(getAdjacentValue('Address', 1, row));
        const addressGovernorate = parseString(getAdjacentValue('Address', 2, row));
        const extension = parseString(getColumnValue('Extenstion', row)); // Note: typo in original
        const mobileNumber = parseString(getColumnValue('Mobile Number', row));

        // Employment Details
        const contractType = parseString(getColumnValue('Contract Type', row));
        const contractDuration = parseString(getAdjacentValue('Contract Type', 1, row));
        
        // Contract Renewal Date: Use "Date of Renewal" sub-header under "Contract Type" (column Y, index 24)
        // Similar to NationalID, find the sub-header in the context of the main header
        let contractRenewalDate: Date | null = null;
        const contractTypeMainCol = columnMap['Contract Type'];
        
        if (contractTypeMainCol !== undefined) {
          // Contract Type main header found - check for "Date of Renewal" sub-header in adjacent columns
          // Look for the sub-header in a range around the Contract Type column (up to 5 columns)
          for (let offset = 0; offset <= 5; offset++) {
            const checkCol = contractTypeMainCol + offset;
            if (checkCol < subHeaders.length && subHeaders[checkCol]) {
              const subHeaderStr = String(subHeaders[checkCol]).trim();
              if (subHeaderStr === 'Date of Renewal') {
                contractRenewalDate = parseDate(row[checkCol]);
                if (i <= 4) {
                  console.log(`  Row ${i + 1}: Found "Date of Renewal" at column ${XLSX.utils.encode_col(checkCol)} (${checkCol}), value: "${contractRenewalDate ? contractRenewalDate.toISOString().split('T')[0] : 'null'}"`);
                }
                break;
              }
            }
          }
          
          // If not found via sub-header, try column Y directly (index 24)
          if (!contractRenewalDate && row[24]) {
            contractRenewalDate = parseDate(row[24]);
            if (i <= 4) {
              console.log(`  Row ${i + 1}: Using column Y (index 24) directly for Date of Renewal, value: "${contractRenewalDate ? contractRenewalDate.toISOString().split('T')[0] : 'null'}"`);
            }
          }
        } else {
          // Contract Type main header not found - use direct column index Y (24) as fallback
          contractRenewalDate = parseDate(row[24]);
        }
        
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

        // Store NationalID in dedicated fields (not in additionalData)
        // IMPORTANT: NationalID should NEVER overwrite employeeCode
        if (i <= 4) {
          if (nationalIdNumber) {
            console.log(`  Row ${i + 1}: Storing NationalID "${nationalIdNumber}" in nationalId field`);
          } else {
            console.log(`  Row ${i + 1}: No NationalID found (NationalID column may be empty or not found)`);
          }
        }
        
        const employeeData = {
          name: primaryName,
          normalizedName,
          category,
          employeeCode, // Column A "ID" - used for System ID No.
          nameArabic,
          jobTitle,
          department,
          dateOfBirth,
          joiningDate,
          graduationCertificate,
          graduationSection,
          graduationUniversity,
          graduationYear,
          socialInsurance,
          barAssociation,
          barAssociationValidTill: barValidTill,
          barAssociationDegree: barDegree,
          taxCard,
          nationalId: nationalIdNumber, // National ID Number from NationalID column
          nationalIdValidTill: nationalIdValidTill, // National ID Valid Till date
          address,
          addressRegion,
          addressGovernorate,
          extension,
          mobileNumber,
          contractType,
          contractDuration,
          // Don't overwrite contractRenewalDate from AllOffice if it's a placeholder date
          // The Contracts sheet import should handle the correct renewal date
          contractRenewalDate: contractRenewalDate && 
            new Date(contractRenewalDate).getFullYear() > 2001 ? contractRenewalDate : undefined,
          status,
          experienceInYears,
          experienceInMonths,
          experienceOutYears,
          experienceOutMonths
        };

        if (employee) {
          // Update existing employee
          const updated = await prisma.employee.update({
            where: { id: employee.id },
            data: employeeData
          });
          result.recordsUpdated++;
          
          console.log(`  ✅ Updated: ${primaryName}`);
          console.log(`     - employeeCode: "${updated.employeeCode || 'null'}" (from column A)`);
          console.log(`     - nationalId: "${updated.nationalId || 'null'}" (from NationalID column)`);
        } else {
          // Create new employee
          const created = await prisma.employee.create({
            data: employeeData
          });
          result.recordsImported++;
          
          console.log(`  ➕ Created: ${primaryName}`);
          console.log(`     - employeeCode: "${created.employeeCode || 'null'}" (from column A)`);
          console.log(`     - nationalId: "${created.nationalId || 'null'}" (from NationalID column)`);
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

