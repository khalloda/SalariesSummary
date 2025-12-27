/**
 * Bonus Import Service
 * Handles importing annual bonus data from Excel workbooks
 */

import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';
import { normalizeEmployeeName } from '../utils/normalize.js';

const prisma = new PrismaClient();

export interface ParsedBonusRecord {
  employeeName: string;
  normalizedName: string;
  category?: string;
  year: number;
  netSalary: number;
  grossSalary: number;
  bonusAmount: number;
  bonusFirstHalf?: number;
  bonusSecondHalf?: number;
  previousYearBonus?: number;
  reflectedInMonths?: number;
  reflectedInPercent?: number;
  remainingFromPrevious?: number;
  yearComparison?: number;
  notes?: string;
}

export interface ParsedBonusWorkbook {
  year: number;
  records: ParsedBonusRecord[];
  errors: string[];
}

/**
 * Find header row in bonus sheet (typically row 2, index 1)
 */
function findHeaderRow(jsonData: any[][]): number {
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const row = jsonData[i];
    if (!row) continue;
    
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      let cellStr = '';
      if (cell && typeof cell === 'object' && 'text' in cell) {
        cellStr = cell.text?.toString().toLowerCase() || '';
      } else {
        cellStr = cell?.toString().toLowerCase() || '';
      }
      // Look for bonus-related headers
      if (cellStr.includes('الاسماء') || cellStr.includes('name') || 
          cellStr.includes('bonus') || cellStr.includes('علاوة')) {
        return i;
      }
    }
  }
  return 1; // Default to row 2 (index 1)
}

/**
 * Get cell value helper
 */
function getCellValue(row: any[], colIndex: number): any {
  if (!row || colIndex < 0 || colIndex >= row.length) return null;
  const cell = row[colIndex];
  if (cell && typeof cell === 'object' && 'text' in cell) {
    return cell.text;
  }
  return cell;
}

/**
 * Parse numeric value from cell
 */
function parseNumeric(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const str = String(value).replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse bonus sheet based on the workbook structure we analyzed
 * Expected structure:
 * - Row 2: Headers
 * - Row 3+: Data rows
 * - Columns: Name, Net 2024, Gross 2024, Net 2025, Gross 2025, Bonus 2023, Bonus 2024 1/2, Bonus 2024 2/2, etc.
 */
export async function parseBonusSheet(
  filePath: string,
  sheetName: string,
  year: number
): Promise<ParsedBonusWorkbook> {
  const result: ParsedBonusWorkbook = {
    year,
    records: [],
    errors: []
  };

  try {
    const data = await import('fs').then(fs => fs.readFileSync(filePath));
    const workbook = XLSX.read(data, {
      type: 'buffer',
      cellDates: true,
      cellFormulas: true
    });

    if (!workbook.SheetNames.includes(sheetName)) {
      result.errors.push(`Sheet "${sheetName}" not found in workbook`);
      return result;
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: null,
      header: 1
    }) as any[][];

    const headerRowIndex = findHeaderRow(jsonData);
    const headerRow = jsonData[headerRowIndex];
    
    // Find column indices by header names
    const findColumn = (patterns: string[]): number => {
      for (let i = 0; i < headerRow.length; i++) {
        const cell = getCellValue(headerRow, i);
        const cellStr = String(cell || '').toLowerCase();
        if (patterns.some(p => cellStr.includes(p.toLowerCase()))) {
          return i;
        }
      }
      return -1;
    };

    const nameCol = findColumn(['الاسماء', 'name', 'title']);
    
    // Dynamic column detection based on import year
    const previousYear = year - 1;
    const previousYearStr = previousYear.toString();
    const currentYearStr = year.toString();
    const previousYearShort = previousYearStr.slice(-2); // Last 2 digits
    const currentYearShort = currentYearStr.slice(-2);
    
    // Previous year columns (e.g., for year 2025, look for 2024)
    const netPrevYearCol = findColumn([
      `net ${previousYear}`, `صافي ${previousYear}`,
      `net salary ${previousYear}`, `net ${previousYearShort}`,
      `net ${previousYearStr}`, `صافي ${previousYearStr}`
    ]);
    const grossPrevYearCol = findColumn([
      `gross ${previousYear}`, `إجمالي ${previousYear}`,
      `gross salary ${previousYear}`, `gross ${previousYearShort}`,
      `gross ${previousYearStr}`, `إجمالي ${previousYearStr}`
    ]);
    
    // Current year columns (e.g., for year 2025, look for 2025)
    const netCurrentYearCol = findColumn([
      `net ${year}`, `صافي ${year}`,
      `net salary ${year}`, `net ${currentYearShort}`,
      `net ${currentYearStr}`, `صافي ${currentYearStr}`
    ]);
    const grossCurrentYearCol = findColumn([
      `gross ${year}`, `إجمالي ${year}`,
      `gross salary ${year}`, `gross ${currentYearShort}`,
      `gross ${currentYearStr}`, `إجمالي ${currentYearStr}`
    ]);
    
    // Current vs Year column (dynamic)
    const currentVsYearNetCol = findColumn([
      `current vs ${year} salary (net)`, `current vs ${year}`,
      `current vs ${year} net`, `صافي الحالي مقابل ${year}`,
      `current vs ${currentYearShort}`, `current vs ${currentYearStr}`,
      `صافي الحالي مقابل ${currentYearStr}`
    ]);
    const currentVsYearGrossCol = findColumn([
      `current vs ${year} salary (gross)`, `current vs ${year} gross`,
      `إجمالي الحالي مقابل ${year}`, `current vs ${currentYearShort} gross`,
      `current vs ${currentYearStr} gross`, `إجمالي الحالي مقابل ${currentYearStr}`
    ]);
    
    // Bonus columns - previous year and current year
    const bonusPrevYearCol = findColumn([
      `bonus ${previousYear}`, `علاوة ${previousYear}`,
      `bonus ${previousYearShort}`, `علاوة ${previousYearStr}`
    ]);
    const bonusCurrentYear_1_2Col = findColumn([
      `bonus ${year} 1/2`, `علاوة ${year} 1/2`, `bonus ${year} 1`,
      `bonus ${currentYearShort} 1/2`, `علاوة ${currentYearStr} 1/2`
    ]);
    const bonusCurrentYear_2_2Col = findColumn([
      `bonus ${year} 2/2`, `علاوة ${year} 2/2`, `bonus ${year} 2`,
      `bonus ${currentYearShort} 2/2`, `علاوة ${currentYearStr} 2/2`
    ]);
    const bonusCurrentYearTotalCol = findColumn([
      `bonus ${year} total`, `علاوة ${year} إجمالي`,
      `bonus ${currentYearShort} total`, `علاوة ${currentYearStr} إجمالي`
    ]);

    if (nameCol === -1) {
      result.errors.push('Could not find employee name column');
      return result;
    }

    // Parse data rows (skip header row)
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row) continue;

      const name = getCellValue(row, nameCol);
      if (!name || String(name).trim() === '' || String(name).toLowerCase().includes('total') || 
          String(name).toLowerCase().includes('مجموع') || String(name).toLowerCase().includes('grand')) {
        continue; // Skip empty rows and totals
      }

      const normalizedName = normalizeEmployeeName(String(name));
      if (!normalizedName) continue;

      // Determine category from row position or explicit category column
      let category: string | undefined;
      // Check if there's a category column
      const categoryCol = findColumn(['category', 'فئة']);
      if (categoryCol !== -1) {
        const catValue = getCellValue(row, categoryCol);
        if (catValue) category = String(catValue);
      }

      // Get salary values - capture previous year and current year (year-agnostic)
      const previousYearNet = netPrevYearCol !== -1 ? parseNumeric(getCellValue(row, netPrevYearCol)) : 0;
      const previousYearGross = grossPrevYearCol !== -1 ? parseNumeric(getCellValue(row, grossPrevYearCol)) : 0;
      const currentYearNet = netCurrentYearCol !== -1 ? parseNumeric(getCellValue(row, netCurrentYearCol)) : 0;
      const currentYearGross = grossCurrentYearCol !== -1 ? parseNumeric(getCellValue(row, grossCurrentYearCol)) : 0;
      
      // Get Annual Increase (Current vs Year) - this is the annual increase amount
      const annualIncreaseNet = currentVsYearNetCol !== -1 
        ? parseNumeric(getCellValue(row, currentVsYearNetCol))
        : (currentYearNet > 0 && previousYearNet > 0 ? currentYearNet - previousYearNet : 0);
      const annualIncreaseGross = currentVsYearGrossCol !== -1
        ? parseNumeric(getCellValue(row, currentVsYearGrossCol))
        : (currentYearGross > 0 && previousYearGross > 0 ? currentYearGross - previousYearGross : 0);
      
      // Legacy fields: use current year if available, otherwise previous year (for backward compatibility)
      const netSalary = currentYearNet > 0 ? currentYearNet : previousYearNet;
      const grossSalary = currentYearGross > 0 ? currentYearGross : previousYearGross;

      // Get bonus values (year-agnostic)
      const previousYearBonus = bonusPrevYearCol !== -1 ? parseNumeric(getCellValue(row, bonusPrevYearCol)) : undefined;
      const bonusCurrentYear_1_2 = bonusCurrentYear_1_2Col !== -1 ? parseNumeric(getCellValue(row, bonusCurrentYear_1_2Col)) : undefined;
      const bonusCurrentYear_2_2 = bonusCurrentYear_2_2Col !== -1 ? parseNumeric(getCellValue(row, bonusCurrentYear_2_2Col)) : undefined;
      const bonusCurrentYearTotal = bonusCurrentYearTotalCol !== -1 ? parseNumeric(getCellValue(row, bonusCurrentYearTotalCol)) : 
                                     (bonusCurrentYear_1_2 || 0) + (bonusCurrentYear_2_2 || 0);

      if (bonusCurrentYearTotal === 0 && !bonusCurrentYear_1_2 && !bonusCurrentYear_2_2) {
        continue; // Skip rows with no bonus data
      }

      // Calculate metrics
      const reflectedInMonths = netSalary > 0 ? bonusCurrentYearTotal / netSalary : undefined;
      const reflectedInPercent = netSalary > 0 ? (bonusCurrentYearTotal / netSalary) * 100 : undefined;
      const remainingFromPrevious = bonusCurrentYear_1_2 !== undefined && previousYearBonus !== undefined 
        ? bonusCurrentYear_1_2 - previousYearBonus 
        : undefined;
      const yearComparison = (bonusCurrentYear_1_2 || 0) + (bonusCurrentYear_2_2 || 0) - (previousYearBonus || 0);

      result.records.push({
        employeeName: String(name),
        normalizedName,
        category,
        year,
        // Unified annual increase data (year-agnostic)
        previousYearNet,
        previousYearGross,
        currentYearNet,
        currentYearGross,
        annualIncreaseNet,
        annualIncreaseGross,
        // Legacy fields
        netSalary,
        grossSalary,
        // Bonus data
        bonusAmount: bonusCurrentYearTotal,
        bonusFirstHalf: bonusCurrentYear_1_2,
        bonusSecondHalf: bonusCurrentYear_2_2,
        previousYearBonus,
        reflectedInMonths,
        reflectedInPercent,
        remainingFromPrevious,
        yearComparison
      });
    }

    console.log(`Parsed ${result.records.length} bonus records from sheet "${sheetName}"`);
  } catch (error: any) {
    result.errors.push(`Error parsing sheet: ${error.message}`);
    console.error('Error parsing bonus sheet:', error);
  }

  return result;
}

/**
 * Import bonus records into database
 */
export async function importBonusRecords(
  records: ParsedBonusRecord[],
  sourceFile: string
): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const result = {
    success: true,
    imported: 0,
    errors: [] as string[]
  };

  try {
    for (const record of records) {
      try {
        // Find or create employee
        let employee = await prisma.employee.findUnique({
          where: { normalizedName: record.normalizedName }
        });

        if (!employee) {
          // Create new employee
          employee = await prisma.employee.create({
            data: {
              name: record.employeeName,
              normalizedName: record.normalizedName,
              category: record.category
            }
          });
        }

        // Check if bonus record already exists for this year
        const existingBonus = await prisma.annualBonus.findUnique({
          where: {
            employeeId_year: {
              employeeId: employee.id,
              year: record.year
            }
          }
        });

        if (existingBonus) {
          // Update existing record
          await prisma.annualBonus.update({
            where: { id: existingBonus.id },
            data: {
              // Unified annual increase data (year-agnostic)
              previousYearNet: record.previousYearNet ?? 0,
              previousYearGross: record.previousYearGross ?? 0,
              currentYearNet: record.currentYearNet ?? 0,
              currentYearGross: record.currentYearGross ?? 0,
              annualIncreaseNet: record.annualIncreaseNet ?? 0,
              annualIncreaseGross: record.annualIncreaseGross ?? 0,
              // Legacy fields
              netSalary: record.netSalary,
              grossSalary: record.grossSalary,
              // Bonus data
              bonusAmount: record.bonusAmount,
              bonusFirstHalf: record.bonusFirstHalf ?? null,
              bonusSecondHalf: record.bonusSecondHalf ?? null,
              previousYearBonus: record.previousYearBonus ?? null,
              reflectedInMonths: record.reflectedInMonths ?? null,
              reflectedInPercent: record.reflectedInPercent ?? null,
              remainingFromPrevious: record.remainingFromPrevious ?? null,
              yearComparison: record.yearComparison ?? null,
              notes: record.notes ?? null,
              sourceFile
            }
          });
        } else {
          // Create new record
          await prisma.annualBonus.create({
            data: {
              employeeId: employee.id,
              year: record.year,
              // Unified annual increase data (year-agnostic)
              previousYearNet: record.previousYearNet ?? 0,
              previousYearGross: record.previousYearGross ?? 0,
              currentYearNet: record.currentYearNet ?? 0,
              currentYearGross: record.currentYearGross ?? 0,
              annualIncreaseNet: record.annualIncreaseNet ?? 0,
              annualIncreaseGross: record.annualIncreaseGross ?? 0,
              // Legacy fields
              netSalary: record.netSalary,
              grossSalary: record.grossSalary,
              bonusAmount: record.bonusAmount,
              bonusFirstHalf: record.bonusFirstHalf ?? null,
              bonusSecondHalf: record.bonusSecondHalf ?? null,
              previousYearBonus: record.previousYearBonus ?? null,
              reflectedInMonths: record.reflectedInMonths ?? null,
              reflectedInPercent: record.reflectedInPercent ?? null,
              remainingFromPrevious: record.remainingFromPrevious ?? null,
              yearComparison: record.yearComparison ?? null,
              notes: record.notes ?? null,
              sourceFile
            }
          });
        }

        result.imported++;
      } catch (error: any) {
        result.errors.push(`Error importing record for ${record.employeeName}: ${error.message}`);
        console.error(`Error importing bonus record:`, error);
      }
    }
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Database error: ${error.message}`);
  }

  return result;
}

