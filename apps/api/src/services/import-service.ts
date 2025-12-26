/**
 * Import Service
 * Handles importing Excel workbooks into the database
 */

import { PrismaClient } from '@prisma/client';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { parseWorkbook } from './excel-parser.js';
import { parseMonthYearFromFilename, getMonthName } from '../utils/normalize.js';

const prisma = new PrismaClient();

// Get Sheets directory - handle both dev and production paths
const getSheetsDir = () => {
  const cwd = process.cwd();
  // If running from apps/api, go up two levels
  if (cwd.endsWith('apps/api') || cwd.endsWith('apps\\api')) {
    return join(cwd, '..', '..', 'Sheets');
  }
  // Otherwise assume root
  return join(cwd, 'Sheets');
};

const SHEETS_DIR = getSheetsDir();

// Log the sheets directory for debugging
console.log('Sheets directory:', SHEETS_DIR);

export interface ImportResult {
  success: boolean;
  filesProcessed: number;
  recordsImported: number;
  errors: string[];
}

/**
 * Import all workbooks from the Sheets directory
 */
export async function importAllWorkbooks(): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    filesProcessed: 0,
    recordsImported: 0,
    errors: []
  };
  
  // Ensure Prisma client is connected
  try {
    await prisma.$connect();
  } catch (connectError: any) {
    result.success = false;
    result.errors.push(`Database connection error: ${connectError.message}`);
    return result;
  }
  
  try {
    // Check if Sheets directory exists
    const fs = await import('fs');
    if (!fs.existsSync(SHEETS_DIR)) {
      throw new Error(`Sheets directory not found: ${SHEETS_DIR}`);
    }
    
    // Get all Excel files
    const files = await readdir(SHEETS_DIR);
    const excelFiles = files.filter(f => f.endsWith('.xlsx') && !f.includes('~$'));
    
    if (excelFiles.length === 0) {
      result.errors.push(`No Excel files found in ${SHEETS_DIR}`);
      return result;
    }
    
    console.log(`Found ${excelFiles.length} Excel files to import`);
    
    for (const fileName of excelFiles) {
      try {
        const filePath = join(SHEETS_DIR, fileName);
        
        // Parse month/year from filename
        const monthYear = parseMonthYearFromFilename(fileName);
        if (!monthYear) {
          console.warn(`⚠ Could not parse month/year from filename: ${fileName}`);
          result.errors.push(`Could not parse month/year from filename: ${fileName}`);
          continue;
        }
        
        console.log(`  Parsed: ${fileName} -> Month: ${monthYear.month}, Year: ${monthYear.year}`);
        
        // Parse workbook
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Processing ${fileName} (${monthYear.year}-${monthYear.month})...`);
        console.log(`File path: ${filePath}`);
        const parsed = await parseWorkbook(filePath, monthYear.year, monthYear.month);
        console.log(`  ✅ Parsed ${parsed.records.length} records from workbook`);
        if (parsed.errors.length > 0) {
          console.log(`  ⚠️  Errors: ${parsed.errors.join(', ')}`);
        }
        if (parsed.records.length === 0) {
          console.log(`  ⚠️  WARNING: No records found! This might indicate a parsing issue.`);
        }
        
        // Import records
        let imported = 0;
        for (const record of parsed.records) {
          try {
            // Find or create employee
            let employee = await prisma.employee.findUnique({
              where: { normalizedName: record.normalizedName }
            });
            
            if (!employee) {
              employee = await prisma.employee.create({
                data: {
                  name: record.employeeName,
                  normalizedName: record.normalizedName,
                  category: record.category
                }
              });
            } else if (record.category && employee.category !== record.category) {
              // Update category if it changed (in case employee moved between categories)
              employee = await prisma.employee.update({
                where: { id: employee.id },
                data: { category: record.category }
              });
            }
            
            // Create or update salary record
            // Note: Prisma doesn't support composite unique constraints in where clause for upsert
            // So we'll use findFirst and then create/update
            const existingRecord = await prisma.salaryRecord.findFirst({
              where: {
                employeeId: employee.id,
                year: parsed.year,
                month: parsed.month
              }
            });
            
            if (existingRecord) {
              await prisma.salaryRecord.update({
                where: { id: existingRecord.id },
                data: {
                  basicSalary: record.basicSalary,
                  directAdditions: record.directAdditions,
                  indirectAdditions: record.indirectAdditions,
                  yearlyIncrease: record.yearlyIncrease,
                  bonuses: record.bonuses,
                  salaryDeductions: record.salaryDeductions,
                  grossDeductions: record.grossDeductions,
                  gross: record.gross,
                  net: record.net,
                  additionsBreakdown: JSON.stringify(record.additionsBreakdown),
                  deductionsBreakdown: JSON.stringify(record.deductionsBreakdown),
                  paymentMethod: record.paymentMethod,
                  accountNumber: record.accountNumber,
                  notes: record.notes,
                  sourceFile: fileName
                }
              });
            } else {
              await prisma.salaryRecord.create({
                data: {
                  employeeId: employee.id,
                  year: parsed.year,
                  month: parsed.month,
                  monthName: parsed.monthName || getMonthName(parsed.month),
                  basicSalary: record.basicSalary,
                  directAdditions: record.directAdditions,
                  indirectAdditions: record.indirectAdditions,
                  yearlyIncrease: record.yearlyIncrease,
                  bonuses: record.bonuses,
                  salaryDeductions: record.salaryDeductions,
                  grossDeductions: record.grossDeductions,
                  gross: record.gross,
                  net: record.net,
                  additionsBreakdown: JSON.stringify(record.additionsBreakdown),
                  deductionsBreakdown: JSON.stringify(record.deductionsBreakdown),
                  paymentMethod: record.paymentMethod,
                  accountNumber: record.accountNumber,
                  notes: record.notes,
                  sourceFile: fileName
                }
              });
            }
            
            imported++;
          } catch (error: any) {
            const errorMsg = error.message || 'Unknown error';
            console.error(`Error importing record for ${record.employeeName}:`, errorMsg);
            if (error.code === 'P2002') {
              result.errors.push(`Duplicate record for ${record.employeeName} (${parsed.year}-${parsed.month}): ${errorMsg}`);
            } else {
              result.errors.push(`Error importing record for ${record.employeeName}: ${errorMsg}`);
            }
          }
        }
        
        // Log import (wrap in try-catch to avoid failing the whole import if logging fails)
        try {
          await prisma.importLog.create({
            data: {
              fileName,
              year: parsed.year,
              month: parsed.month,
              status: (parsed.errors.length > 0 || result.errors.length > 0) ? 'partial' : 'success',
              recordsImported: imported,
              errors: (parsed.errors.length > 0 || result.errors.length > 0) 
                ? JSON.stringify({ errors: [...parsed.errors, ...result.errors] }) 
                : null
            }
          });
        } catch (logError: any) {
          console.error('Error creating import log:', logError.message);
          // Don't fail the import if logging fails
        }
        
        result.filesProcessed++;
        result.recordsImported += imported;
        
        if (parsed.errors.length > 0) {
          result.errors.push(...parsed.errors.map(e => `${fileName}: ${e}`));
        }
        
      } catch (error: any) {
        result.success = false;
        const errorMsg = error.message || 'Unknown error';
        console.error(`Error processing ${fileName}:`, errorMsg);
        if (error.stack) {
          console.error('Stack trace:', error.stack);
        }
        result.errors.push(`Error processing ${fileName}: ${errorMsg}`);
      }
    }
    
  } catch (error: any) {
    result.success = false;
    const errorMsg = error.message || 'Unknown error';
    console.error('Fatal import error:', errorMsg);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    result.errors.push(`Fatal error: ${errorMsg}`);
  } finally {
    // Always disconnect Prisma client to release database locks
    try {
      await prisma.$disconnect();
      console.log('Database connection closed');
    } catch (disconnectError: any) {
      console.error('Error disconnecting from database:', disconnectError.message);
    }
  }
  
  console.log(`\nImport summary: ${result.filesProcessed} files, ${result.recordsImported} records, ${result.errors.length} errors`);
  return result;
}

