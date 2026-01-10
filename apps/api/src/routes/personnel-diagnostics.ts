/**
 * Personnel Diagnostics API Routes
 * Tools for diagnosing and comparing Personnel sheet with AllOffice sheet
 */

import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as XLSX from 'xlsx';
import { normalizeEmployeeName, areNamesSimilar } from '../utils/normalize.js';
import { requireRole } from '../utils/auth.js';
export const personnelDiagnosticsRouter = Router();

// Get Sheets directory
const getSheetsDir = () => {
  const cwd = process.cwd();
  if (cwd.endsWith('apps/api') || cwd.endsWith('apps\\api')) {
    return join(cwd, '..', '..', 'Sheets');
  }
  return join(cwd, 'Sheets');
};

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
 * GET /api/personnel-diagnostics/compare-sheets
 * Compare Personnel sheet with AllOffice sheet and database
 * Query params: filePath (optional, uses server Sheets directory if not provided)
 */
personnelDiagnosticsRouter.get('/compare-sheets', requireRole('HR_PERSONNEL', 'OFFICE_MANAGER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { filePath } = req.query;
    const sheetsDir = getSheetsDir();
    const targetFile = filePath ? String(filePath) : join(sheetsDir, 'SEPEmployees.xlsx');

    if (!existsSync(targetFile)) {
      return res.status(404).json({ 
        error: `File not found: ${targetFile}`,
        suggestion: 'Please ensure SEPEmployees.xlsx is in the Sheets directory or provide a valid file path'
      });
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Comparing Personnel and AllOffice sheets from: ${targetFile}`);
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

    // Check if sheets exist
    if (!workbook.SheetNames.includes('Personnel')) {
      return res.status(404).json({ 
        error: 'Sheet "Personnel" not found',
        availableSheets: workbook.SheetNames
      });
    }

    if (!workbook.SheetNames.includes('AllOffice')) {
      return res.status(404).json({ 
        error: 'Sheet "AllOffice" not found',
        availableSheets: workbook.SheetNames
      });
    }

    // Parse Personnel sheet
    const personnelWorksheet = workbook.Sheets['Personnel'];
    const personnelRawData = XLSX.utils.sheet_to_json(personnelWorksheet, {
      header: 1,
      raw: false,
      defval: null
    });

    // Parse AllOffice sheet
    const allOfficeWorksheet = workbook.Sheets['AllOffice'];
    const allOfficeRawData = XLSX.utils.sheet_to_json(allOfficeWorksheet, {
      header: 1,
      raw: false,
      defval: null
    });

    // Get headers
    const personnelHeaders = personnelRawData[0] || [];
    const allOfficeHeaders = allOfficeRawData[0] || [];

    // Map column indices
    const personnelColumnMap: Record<string, number> = {};
    personnelHeaders.forEach((header, idx) => {
      if (header) {
        const headerStr = String(header).trim();
        personnelColumnMap[headerStr] = idx;
      }
    });

    const allOfficeColumnMap: Record<string, number> = {};
    allOfficeHeaders.forEach((header, idx) => {
      if (header) {
        const headerStr = String(header).trim();
        allOfficeColumnMap[headerStr] = idx;
      }
    });

    // Helper to get value from row
    const getPersonnelValue = (headerName: string, row: any[]): any => {
      const colIdx = personnelColumnMap[headerName];
      if (colIdx === undefined || colIdx < 0) return null;
      return row[colIdx] !== undefined ? row[colIdx] : null;
    };

    const getAllOfficeValue = (headerName: string, row: any[]): any => {
      const colIdx = allOfficeColumnMap[headerName];
      if (colIdx === undefined || colIdx < 0) return null;
      return row[colIdx] !== undefined ? row[colIdx] : null;
    };

    // Extract employees from Personnel sheet
    const personnelEmployees: Array<{ row: number; code: string | null; name: string | null; normalizedName: string }> = [];
    for (let i = 1; i < personnelRawData.length; i++) {
      const row = personnelRawData[i];
      if (!row || row.every(cell => !cell || cell === '')) continue;

      const code = parseString(getPersonnelValue('ID', row));
      const name = parseString(getPersonnelValue('Name', row));
      
      if (code || name) {
        personnelEmployees.push({
          row: i + 1,
          code,
          name,
          normalizedName: name ? normalizeEmployeeName(name) : ''
        });
      }
    }

    // Extract employees from AllOffice sheet
    // Use same logic as sep-employees-import-service.ts:
    // - employeeCode comes from column A (index 0) directly
    // - name comes from "Name in English" or "Name" header
    const allOfficeEmployees: Array<{ row: number; code: string | null; name: string | null; normalizedName: string }> = [];
    
    for (let i = 1; i < allOfficeRawData.length; i++) {
      const row = allOfficeRawData[i];
      if (!row || row.every(cell => !cell || cell === '')) continue;

      // System ID comes from column A (index 0) directly
      let code = parseString(row[0]);
      
      // Also try 'ID' header if column A is empty
      if (!code) {
        code = parseString(getAllOfficeValue('ID', row));
      }
      
      // Name from "Name in English" or "Name"
      const nameEnglish = parseString(getAllOfficeValue('Name in English', row));
      const nameArabic = parseString(getAllOfficeValue('Name', row));
      const name = nameEnglish || nameArabic;
      
      if (code || name) {
        allOfficeEmployees.push({
          row: i + 1,
          code,
          name,
          normalizedName: name ? normalizeEmployeeName(name) : ''
        });
      }
    }

    // Get all employees from database
    const dbEmployees = await prisma.employee.findMany({
      select: {
        id: true,
        name: true,
        normalizedName: true,
        employeeCode: true
      }
    });

    // Find employees in Personnel but not in AllOffice
    const missingFromAllOffice: Array<{
      row: number;
      code: string | null;
      name: string | null;
      potentialMatches: Array<{ name: string; code: string | null; similarity: string }>;
    }> = [];

    for (const personnelEmp of personnelEmployees) {
      // Check if exists in AllOffice
      let foundInAllOffice = false;
      
      // Try exact code match
      if (personnelEmp.code) {
        foundInAllOffice = allOfficeEmployees.some(emp => emp.code === personnelEmp.code);
      }
      
      // Try normalized name match
      if (!foundInAllOffice && personnelEmp.normalizedName) {
        foundInAllOffice = allOfficeEmployees.some(emp => 
          emp.normalizedName === personnelEmp.normalizedName
        );
      }
      
      // Try fuzzy match
      if (!foundInAllOffice && personnelEmp.name) {
        foundInAllOffice = allOfficeEmployees.some(emp => 
          emp.name && areNamesSimilar(personnelEmp.name!, emp.name)
        );
      }

      if (!foundInAllOffice) {
        // Find potential matches in AllOffice
        const potentialMatches: Array<{ name: string; code: string | null; similarity: string }> = [];
        
        if (personnelEmp.name) {
          for (const allOfficeEmp of allOfficeEmployees) {
            if (allOfficeEmp.name) {
              if (areNamesSimilar(personnelEmp.name, allOfficeEmp.name)) {
                potentialMatches.push({
                  name: allOfficeEmp.name,
                  code: allOfficeEmp.code,
                  similarity: 'High (fuzzy match)'
                });
              } else if (personnelEmp.normalizedName && allOfficeEmp.normalizedName) {
                // Check if first 2 words match
                const personnelWords = personnelEmp.normalizedName.split(/\s+/).slice(0, 2);
                const allOfficeWords = allOfficeEmp.normalizedName.split(/\s+/).slice(0, 2);
                if (personnelWords.length >= 1 && allOfficeWords.length >= 1 && 
                    personnelWords[0] === allOfficeWords[0]) {
                  potentialMatches.push({
                    name: allOfficeEmp.name,
                    code: allOfficeEmp.code,
                    similarity: 'Medium (first name match)'
                  });
                }
              }
            }
          }
        }

        missingFromAllOffice.push({
          row: personnelEmp.row,
          code: personnelEmp.code,
          name: personnelEmp.name,
          potentialMatches: potentialMatches.slice(0, 3) // Limit to 3 suggestions
        });
      }
    }

    // Find employees in Personnel but not in Database
    const missingFromDatabase: Array<{
      row: number;
      code: string | null;
      name: string | null;
      potentialMatches: Array<{ name: string; code: string | null; id: string; similarity: string }>;
    }> = [];

    for (const personnelEmp of personnelEmployees) {
      // Check if exists in Database
      let foundInDb = false;
      
      // Try exact code match
      if (personnelEmp.code) {
        foundInDb = dbEmployees.some(emp => emp.employeeCode === personnelEmp.code);
      }
      
      // Try normalized name match
      if (!foundInDb && personnelEmp.normalizedName) {
        foundInDb = dbEmployees.some(emp => 
          emp.normalizedName === personnelEmp.normalizedName
        );
      }
      
      // Try fuzzy match
      if (!foundInDb && personnelEmp.name) {
        foundInDb = dbEmployees.some(emp => 
          emp.name && areNamesSimilar(personnelEmp.name!, emp.name)
        );
      }

      if (!foundInDb) {
        // Find potential matches in Database
        const potentialMatches: Array<{ name: string; code: string | null; id: string; similarity: string }> = [];
        
        if (personnelEmp.name) {
          for (const dbEmp of dbEmployees) {
            if (areNamesSimilar(personnelEmp.name, dbEmp.name)) {
              potentialMatches.push({
                name: dbEmp.name,
                code: dbEmp.employeeCode,
                id: dbEmp.id,
                similarity: 'High (fuzzy match)'
              });
            } else if (personnelEmp.normalizedName && dbEmp.normalizedName) {
              // Check if first 2 words match
              const personnelWords = personnelEmp.normalizedName.split(/\s+/).slice(0, 2);
              const dbWords = dbEmp.normalizedName.split(/\s+/).slice(0, 2);
              if (personnelWords.length >= 1 && dbWords.length >= 1 && 
                  personnelWords[0] === dbWords[0]) {
                potentialMatches.push({
                  name: dbEmp.name,
                  code: dbEmp.employeeCode,
                  id: dbEmp.id,
                  similarity: 'Medium (first name match)'
                });
              }
            }
          }
        }

        missingFromDatabase.push({
          row: personnelEmp.row,
          code: personnelEmp.code,
          name: personnelEmp.name,
          potentialMatches: potentialMatches.slice(0, 3) // Limit to 3 suggestions
        });
      }
    }

    // Statistics
    const stats = {
      personnelSheetTotal: personnelEmployees.length,
      allOfficeSheetTotal: allOfficeEmployees.length,
      databaseTotal: dbEmployees.length,
      missingFromAllOffice: missingFromAllOffice.length,
      missingFromDatabase: missingFromDatabase.length,
      inPersonnelAndAllOffice: personnelEmployees.length - missingFromAllOffice.length,
      inPersonnelAndDatabase: personnelEmployees.length - missingFromDatabase.length
    };

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Diagnostic Summary:`);
    console.log(`  Personnel Sheet: ${stats.personnelSheetTotal} employees`);
    console.log(`  AllOffice Sheet: ${stats.allOfficeSheetTotal} employees`);
    console.log(`  Database: ${stats.databaseTotal} employees`);
    console.log(`  Missing from AllOffice: ${stats.missingFromAllOffice}`);
    console.log(`  Missing from Database: ${stats.missingFromDatabase}`);
    console.log('='.repeat(60) + '\n');

    res.json({
      success: true,
      file: targetFile,
      stats,
      missingFromAllOffice,
      missingFromDatabase,
      summary: {
        message: `Found ${missingFromAllOffice.length} employees in Personnel sheet that are not in AllOffice sheet, and ${missingFromDatabase.length} employees in Personnel sheet that are not in the database.`,
        recommendations: [
          missingFromAllOffice.length > 0 
            ? `Review the ${missingFromAllOffice.length} employees missing from AllOffice sheet. They may need to be added to AllOffice or their names may need correction.`
            : null,
          missingFromDatabase.length > 0
            ? `Import the AllOffice sheet first to create employee records, then re-import Personnel sheet. ${missingFromDatabase.length} employees from Personnel are not yet in the database.`
            : null
        ].filter(Boolean)
      }
    });
  } catch (error: any) {
    console.error('Error in personnel diagnostics:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/personnel-diagnostics/unmatched
 * Get list of employees in Personnel sheet that don't match any database employees
 * (Similar to compare-sheets but focuses on database matching)
 */
personnelDiagnosticsRouter.get('/unmatched', requireRole('HR_PERSONNEL', 'OFFICE_MANAGER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { filePath } = req.query;
    const sheetsDir = getSheetsDir();
    const targetFile = filePath ? String(filePath) : join(sheetsDir, 'SEPEmployees.xlsx');

    if (!existsSync(targetFile)) {
      return res.status(404).json({ 
        error: `File not found: ${targetFile}`
      });
    }

    // Read Personnel sheet
    const data = readFileSync(targetFile);
    const workbook = XLSX.read(data, {
      type: 'buffer',
      cellDates: true,
      cellFormulas: false
    });

    if (!workbook.SheetNames.includes('Personnel')) {
      return res.status(404).json({ error: 'Sheet "Personnel" not found' });
    }

    const worksheet = workbook.Sheets['Personnel'];
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: null
    });

    const headers = rawData[0] || [];
    const columnMap: Record<string, number> = {};
    headers.forEach((header, idx) => {
      if (header) {
        columnMap[String(header).trim()] = idx;
      }
    });

    const getValue = (headerName: string, row: any[]): any => {
      const colIdx = columnMap[headerName];
      return colIdx !== undefined && colIdx >= 0 ? row[colIdx] : null;
    };

    // Get all database employees
    const dbEmployees = await prisma.employee.findMany({
      select: {
        id: true,
        name: true,
        normalizedName: true,
        employeeCode: true
      }
    });

    // Process Personnel rows
    const unmatched: Array<{
      row: number;
      code: string | null;
      name: string | null;
      potentialMatches: Array<{ id: string; name: string; code: string | null; matchType: string }>;
    }> = [];

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.every(cell => !cell || cell === '')) continue;

      const code = parseString(getValue('ID', row));
      const name = parseString(getValue('Name', row));

      if (!code && !name) continue;

      // Try to match
      let matched = false;
      const potentialMatches: Array<{ id: string; name: string; code: string | null; matchType: string }> = [];

      // Try exact code match
      if (code) {
        const match = dbEmployees.find(emp => emp.employeeCode === code);
        if (match) {
          matched = true;
        }
      }

      // Try normalized name match
      if (!matched && name) {
        const normalizedName = normalizeEmployeeName(name);
        const match = dbEmployees.find(emp => emp.normalizedName === normalizedName);
        if (match) {
          matched = true;
        }
      }

      // Try fuzzy match
      if (!matched && name) {
        for (const dbEmp of dbEmployees) {
          if (areNamesSimilar(name, dbEmp.name)) {
            potentialMatches.push({
              id: dbEmp.id,
              name: dbEmp.name,
              code: dbEmp.employeeCode,
              matchType: 'Fuzzy match'
            });
            matched = true;
            break;
          }
        }
      }

      // Find potential matches even if not matched
      if (!matched && name) {
        const normalizedName = normalizeEmployeeName(name);
        const nameWords = normalizedName.split(/\s+/);
        
        for (const dbEmp of dbEmployees) {
          const dbNormalized = normalizeEmployeeName(dbEmp.name);
          const dbWords = dbNormalized.split(/\s+/);
          
          // Check first name match
          if (nameWords.length > 0 && dbWords.length > 0 && nameWords[0] === dbWords[0]) {
            potentialMatches.push({
              id: dbEmp.id,
              name: dbEmp.name,
              code: dbEmp.employeeCode,
              matchType: 'First name match'
            });
          }
        }
      }

      if (!matched) {
        unmatched.push({
          row: i + 1,
          code,
          name,
          potentialMatches: potentialMatches.slice(0, 3)
        });
      }
    }

    res.json({
      success: true,
      totalPersonnelRows: rawData.length - 1,
      unmatchedCount: unmatched.length,
      unmatched,
      summary: `Found ${unmatched.length} employees in Personnel sheet that could not be matched to database employees.`
    });
  } catch (error: any) {
    console.error('Error in unmatched diagnostics:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

