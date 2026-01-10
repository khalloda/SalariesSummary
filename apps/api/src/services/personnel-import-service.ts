/**
 * Personnel Import Service
 * Handles importing personnel data from SEPEmployees.xlsx - Personnel sheet
 */

import { prisma } from '../db/prisma.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as XLSX from 'xlsx';
import { normalizeEmployeeName, areNamesSimilar } from '../utils/normalize.js';
import { comparePersonnelRecords, type PersonnelData, type ComparisonResult } from '../utils/personnel-comparison.js';

// Get Sheets directory
const getSheetsDir = () => {
  const cwd = process.cwd();
  if (cwd.endsWith('apps/api') || cwd.endsWith('apps\\api')) {
    return join(cwd, '..', '..', 'Sheets');
  }
  return join(cwd, 'Sheets');
};

export interface PersonnelConflictRecord {
  employeeId: string;
  employeeName: string;
  existingRecord: any;
  incomingRecord: any;
  comparison: ComparisonResult;
}

export interface PersonnelImportResult {
  success: boolean;
  recordsImported: number;
  recordsUpdated: number;
  recordsSkipped: number; // 100% identical records
  recordsWithConflicts: number; // Records needing review
  errors: string[];
  conflicts?: PersonnelConflictRecord[]; // Records that need user review
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
 * Parse status indicator (X, √)
 */
function parseStatusIndicator(value: any): 'Present' | 'Missing' | null {
  if (!value) return null;
  const str = String(value).trim();
  if (str === '√' || str === '✓' || str.toLowerCase() === 'yes' || str.toLowerCase() === 'present') {
    return 'Present';
  }
  if (str === 'X' || str === '✗' || str.toLowerCase() === 'no' || str.toLowerCase() === 'missing') {
    return 'Missing';
  }
  return null;
}

/**
 * Parse document status (Copy, Original, N/A, X)
 */
function parseDocumentStatus(value: any): 'Copy' | 'Original' | 'N/A' | 'Missing' | null {
  if (!value) return null;
  const str = String(value).trim().toUpperCase();
  if (str === 'COPY') return 'Copy';
  if (str === 'ORIGINAL') return 'Original';
  if (str === 'N/A' || str === 'NA' || str === 'NOT APPLICABLE') return 'N/A';
  if (str === 'X' || str === '✗') return 'Missing';
  return null;
}

/**
 * Parse asset type
 */
function parseAssetType(value: any): 'Laptop' | 'PC' | 'Tablet' | 'None' | null {
  if (!value) return null;
  const str = String(value).trim().toUpperCase();
  if (str.includes('LAPTOP')) return 'Laptop';
  if (str === 'PC' || str.includes('DESKTOP')) return 'PC';
  if (str.includes('TABLET')) return 'Tablet';
  if (str === 'N/A' || str === 'NONE') return 'None';
  return null;
}

/**
 * Parse insurance start date
 */
function parseInsuranceDate(value: any): Date | null {
  if (!value) return null;
  const str = String(value).trim().toUpperCase();
  if (str === 'N/A' || str === 'NA' || str === 'NOT APPLICABLE') return null;
  
  // Try parsing as date
  if (value instanceof Date) return value;
  
  // Try "DD-Mon-YY" format (e.g., "1-Jan-21")
  const dateMatch = String(value).match(/(\d+)-(\w+)-(\d+)/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const monthName = dateMatch[2];
    const year = parseInt(dateMatch[3]);
    const yearFull = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
    
    const monthMap: Record<string, number> = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    const month = monthMap[monthName.toLowerCase()];
    if (month !== undefined) {
      return new Date(yearFull, month, day);
    }
  }
  
  // Try standard date parsing
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) return parsed;
  
  // Try Excel serial date
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(date.y, date.m - 1, date.d);
    }
  }
  
  return null;
}

/**
 * Import personnel data from SEPEmployees.xlsx
 */
export async function importPersonnel(filePath?: string): Promise<PersonnelImportResult> {
  const result: PersonnelImportResult = {
    success: true,
    recordsImported: 0,
    recordsUpdated: 0,
    recordsSkipped: 0,
    recordsWithConflicts: 0,
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
        // Also map variations of the header
        if (headerStr.includes('Laptop') || headerStr.includes('PC') || headerStr.includes('Tablet')) {
          columnMap['Laptop / PC / Tablet'] = idx;
          columnMap['Laptop / \nPC / Tablet'] = idx;
        }
      }
    });

    console.log(`Found ${Object.keys(columnMap).length} columns`);
    console.log(`Processing ${rawData.length - 1} data rows...\n`);

    // Cache all employees for fuzzy matching (load once)
    let allEmployeesCache: Array<{ id: string; name: string; normalizedName: string; employeeCode: string | null }> | null = null;
    const getAllEmployees = async () => {
      if (!allEmployeesCache) {
        allEmployeesCache = await prisma.employee.findMany({
          select: {
            id: true,
            name: true,
            normalizedName: true,
            employeeCode: true
          }
        });
        console.log(`  📋 Loaded ${allEmployeesCache.length} employees for matching\n`);
      }
      return allEmployeesCache;
    };

    const getValue = (headerName: string, row: any[]): any => {
      // Try exact match first
      let colIdx = columnMap[headerName];
      
      // If not found, try variations
      if (colIdx === undefined && headerName === 'Laptop / PC / Tablet') {
        colIdx = columnMap['Laptop / \nPC / Tablet'] || 
                 columnMap['Laptop / PC / Tablet'] ||
                 Object.keys(columnMap).find(key => 
                   key.includes('Laptop') || key.includes('PC') || key.includes('Tablet')
                 ) ? columnMap[Object.keys(columnMap).find(key => 
                   key.includes('Laptop') || key.includes('PC') || key.includes('Tablet')
                 )!] : undefined;
      }
      
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

        // Find employee with improved matching
        let employee = null;
        
        // Step 1: Try exact match by Employee Code
        if (employeeCode) {
          employee = await prisma.employee.findFirst({
            where: { employeeCode }
          });
        }
        
        // Step 2: Try exact normalized name match
        if (!employee && employeeName) {
          const normalizedName = normalizeEmployeeName(employeeName);
          employee = await prisma.employee.findUnique({
            where: { normalizedName }
          });
        }
        
        // Step 3: Try fuzzy/similarity matching if exact match failed
        if (!employee && employeeName) {
          const allEmployees = await getAllEmployees();
          
          // Try to find similar name
          for (const emp of allEmployees) {
            if (areNamesSimilar(employeeName, emp.name)) {
              console.log(`  🔍 Fuzzy match: "${employeeName}" matched with "${emp.name}" (${emp.employeeCode || emp.id})`);
              employee = await prisma.employee.findUnique({
                where: { id: emp.id }
              });
              break;
            }
          }
        }
        
        // Step 4: Try case-insensitive partial matching as last resort
        if (!employee && employeeName) {
          const normalizedSearchName = normalizeEmployeeName(employeeName);
          // Try to find by first 3 words (handles abbreviated names)
          const searchWords = normalizedSearchName.split(/\s+/).slice(0, 3);
          if (searchWords.length >= 2) {
            const searchPattern = searchWords.join(' ');
            const allEmployees = await getAllEmployees();
            
            for (const emp of allEmployees) {
              const empNormalized = normalizeEmployeeName(emp.name);
              if (empNormalized.includes(searchPattern) || searchPattern.includes(empNormalized)) {
                console.log(`  🔍 Partial match: "${employeeName}" partially matched with "${emp.name}"`);
                employee = await prisma.employee.findUnique({
                  where: { id: emp.id }
                });
                break;
              }
            }
          }
        }

        // Parse personnel data
        const criminalRecord = parseStatusIndicator(getValue('Criminal Record', row));
        const militaryCert = parseDocumentStatus(getValue('Military Certificate', row));
        const idCopyValue = parseStatusIndicator(getValue('ID Copy', row));
        const educationCert = parseDocumentStatus(getValue('Education Certificate', row));
        const birthCert = parseDocumentStatus(getValue('Birth Certificate', row));
        const recommendationLetterValue = parseStatusIndicator(getValue('Recommendation Letter', row));
        const personalPhotosValue = parseStatusIndicator(getValue('Personal Photos', row));
        
        // For Tax Card and Association ID, check if value is "N/A" first
        const taxCardRaw = getValue('Tax Card', row);
        const taxCardValue = taxCardRaw && String(taxCardRaw).trim().toUpperCase() === 'N/A' 
          ? null 
          : parseStatusIndicator(taxCardRaw);
        
        const associationIdRaw = getValue('Association ID', row);
        const associationIdValue = associationIdRaw && String(associationIdRaw).trim().toUpperCase() === 'N/A'
          ? null
          : parseStatusIndicator(associationIdRaw);
        const form6Value = parseString(getValue('Form 6', row)) || 'N/A';
        // Try multiple variations for Laptop/PC/Tablet column
        const laptopPcTabletRaw = getValue('Laptop / PC / Tablet', row);
        const laptopPcTabletValue = parseAssetType(laptopPcTabletRaw);
        // Parse Work Stub - "X" means Missing, empty/null means N/A
        const workStubRaw = getValue('كعب العمل', row);
        let workStubValue: string | null = null;
        if (workStubRaw) {
          const workStubStr = String(workStubRaw).trim();
          if (workStubStr === 'X' || workStubStr === '✗') {
            workStubValue = 'Missing';
          } else if (workStubStr === '' || workStubStr === '-' || workStubStr.toUpperCase() === 'N/A') {
            workStubValue = 'N/A';
          } else {
            workStubValue = workStubStr;
          }
        } else {
          workStubValue = 'N/A';
        }
        const insuranceStartDateValue = parseInsuranceDate(getValue('تاريخ بداية التأمين', row));
        const statusValue = parseString(getValue('Status', row));

        if (employee) {
          // Check for existing personnel record
          const existingPersonnel = await prisma.personnelRecord.findUnique({
            where: { employeeId: employee.id }
          });

          const incomingPersonnelData: PersonnelData = {
            employeeId: employee.id,
            criminalRecord,
            militaryCertificate: militaryCert,
            idCopy: idCopyValue === 'Present',
            educationCertificate: educationCert,
            birthCertificate: birthCert,
            recommendationLetter: recommendationLetterValue === 'Present',
            personalPhotos: personalPhotosValue === 'Present',
            taxCard: taxCardValue === null ? null : (taxCardValue === 'Present'),
            associationId: associationIdValue === null ? null : (associationIdValue === 'Present'),
            form6: form6Value,
            laptopPcTablet: laptopPcTabletValue,
            workStub: workStubValue,
            insuranceStartDate: insuranceStartDateValue
          };

          if (existingPersonnel) {
            // Compare existing personnel record with incoming data
            const existingData: PersonnelData = {
              employeeId: existingPersonnel.employeeId,
              criminalRecord: existingPersonnel.criminalRecord,
              militaryCertificate: existingPersonnel.militaryCertificate,
              idCopy: existingPersonnel.idCopy,
              educationCertificate: existingPersonnel.educationCertificate,
              birthCertificate: existingPersonnel.birthCertificate,
              recommendationLetter: existingPersonnel.recommendationLetter,
              personalPhotos: existingPersonnel.personalPhotos,
              taxCard: existingPersonnel.taxCard,
              associationId: existingPersonnel.associationId,
              form6: existingPersonnel.form6,
              laptopPcTablet: existingPersonnel.laptopPcTablet,
              workStub: existingPersonnel.workStub,
              insuranceStartDate: existingPersonnel.insuranceStartDate
            };

            const comparison = comparePersonnelRecords(existingData, incomingPersonnelData);

            if (comparison.isIdentical) {
              // 100% identical - skip this record
              result.recordsSkipped++;
              console.log(`  ⏭️  Skipped identical personnel record for ${employee.name}`);
            } else {
              // Different - add to conflicts for user review
              if (!result.conflicts) {
                result.conflicts = [];
              }
              result.conflicts.push({
                employeeId: employee.id,
                employeeName: employee.name,
                existingRecord: existingPersonnel,
                incomingRecord: {
                  ...incomingPersonnelData,
                  sourceFile: 'SEPEmployees.xlsx - Personnel',
                  status: statusValue
                },
                comparison
              });
              result.recordsWithConflicts++;
              console.log(`  ⚠️  Conflict detected for ${employee.name}: ${comparison.similarity}% similar`);
            }
          } else {
            // New personnel record - import it
            await prisma.personnelRecord.create({
              data: {
                ...incomingPersonnelData,
                sourceFile: 'SEPEmployees.xlsx - Personnel'
              }
            });
            result.recordsImported++;

            // Update employee status if provided
            if (statusValue) {
              await prisma.employee.update({
                where: { id: employee.id },
                data: { status: statusValue }
              });
            }

            console.log(`  ✅ Created: ${employee.name} (Personnel data)`);
          }
        } else {
          // Try to find potential matches for better error reporting
          let potentialMatches: string[] = [];
          if (employeeName) {
            const allEmployees = await getAllEmployees();
            const normalizedSearchName = normalizeEmployeeName(employeeName);
            const searchWords = normalizedSearchName.split(/\s+/).slice(0, 2); // First 2 words
            
            if (searchWords.length >= 1) {
              for (const emp of allEmployees) {
                const empNormalized = normalizeEmployeeName(emp.name);
                // Check if first word matches
                if (searchWords[0] && empNormalized.includes(searchWords[0])) {
                  potentialMatches.push(emp.name);
                  if (potentialMatches.length >= 3) break; // Limit to 3 suggestions
                }
              }
            }
          }
          
          const errorMsg = `Row ${i + 1}: Employee not found (${employeeCode || employeeName})${potentialMatches.length > 0 ? ` - Potential matches: ${potentialMatches.join(', ')}` : ''}`;
          result.errors.push(errorMsg);
          console.log(`  ⚠️  ${errorMsg}`);
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

