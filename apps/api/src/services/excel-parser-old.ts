/**
 * Excel Parser Service
 * Parses salary workbooks and extracts employee salary data
 * 
 * Based on deep schema analysis:
 * - مرتبات sheet: Uses HYPERLINK formulas to pull totals from other sheets
 * - اضافات sheet: Contains detailed additions, totals in columns M, N, O
 * - خصومات sheet: Contains detailed deductions, total in column L
 */

import XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { normalizeEmployeeName, parseNumeric, getMonthName } from '../utils/normalize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Sheets directory - handle both dev and production paths
const getSheetsDir = () => {
  const cwd = process.cwd();
  // If running from apps/api, go up two levels
  if (cwd.endsWith('apps/api')) {
    return join(cwd, '..', '..', 'Sheets');
  }
  // If running from root
  return join(cwd, 'Sheets');
};

// Get password if exists
function getPassword(): string | null {
  const passFile = join(getSheetsDir(), 'pass.txt');
  if (existsSync(passFile)) {
    return readFileSync(passFile, 'utf-8').trim();
  }
  return null;
}

export interface ParsedSalaryRecord {
  employeeName: string;
  normalizedName: string;
  basicSalary: number;
  directAdditions: number;
  indirectAdditions: number;
  yearlyIncrease: number;
  bonuses: number;
  salaryDeductions: number;
  grossDeductions: number;
  gross: number;
  net: number;
  additionsBreakdown: Record<string, number>;
  deductionsBreakdown: Record<string, number>;
  paymentMethod?: string;
  accountNumber?: string;
  notes?: string;
}

export interface ParsedWorkbook {
  year: number;
  month: number;
  monthName?: string;
  records: ParsedSalaryRecord[];
  errors: string[];
}

/**
 * Find header row in sheet data
 * Looks for rows containing "الاسماء" or "Name"
 */
function findHeaderRow(jsonData: any[][]): number {
  console.log(`Finding header row in ${jsonData.length} rows...`);
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const row = jsonData[i] as any[];
    if (!row) continue;
    
    // Check all cells in this row
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      let cellStr = '';
      if (cell && typeof cell === 'object' && 'text' in cell) {
        cellStr = cell.text?.toString().toLowerCase() || '';
      } else {
        cellStr = cell?.toString().toLowerCase() || '';
      }
      if (cellStr.includes('الاسماء') || cellStr.includes('name')) {
        console.log(`  Found header row at index ${i}, cell[${j}]="${cellStr}"`);
        return i;
      }
    }
  }
  console.log(`  Header row not found, defaulting to index 1`);
  return 1; // Default to row 1
}

/**
 * Parse مرتبات (Salaries) sheet
 * Based on deep analysis: Column 2 is "-", data starts at column 3
 */
function parseSalariesSheet(worksheet: XLSX.WorkSheet): ParsedSalaryRecord[] {
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    raw: false,
    defval: null,
    header: 1
  }) as any[][];
  
  const headerRowIndex = findHeaderRow(jsonData);
  const headers = (jsonData[headerRowIndex] as any[])?.map((cell: any) => {
    if (cell && typeof cell === 'object' && 'text' in cell) return cell.text?.toString().trim() || '';
    return cell?.toString().trim() || '';
  }) || [];
  
  console.log('Headers found (first 15):', headers.map((h: string, i: number) => `[${i}]: "${h}"`).slice(0, 15));
  
  // Find column indices by header text
  const findColumn = (patterns: string[]): number => {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase().trim();
      if (!header) continue;
      
      for (const pattern of patterns) {
        const lowerPattern = pattern.toLowerCase();
        if (header === lowerPattern || 
            header.includes(lowerPattern) || 
            lowerPattern.includes(header)) {
          return i;
        }
      }
    }
    return -1;
  };
  
  // Find columns based on actual headers
  const nameCol = findColumn(['الاسماء', 'name', 'names']);
  const salaryCol = findColumn(['صافي', 'salary', 'صافي الاتعاب', 'basic salary']);
  const indirectAddCol = findColumn(['غير مباشرة', 'indirect', 'indirect additions', 'إضافات غير مباشرة']);
  const directAddCol = findColumn(['مباشرة', 'direct', 'direct additions', 'إضافات مباشرة']);
  const yearlyIncCol = findColumn(['زيادة سنوية', 'yearly increase', 'yearly', 'زيادة']);
  const bonusesCol = findColumn(['علاوات', 'bouns', 'bonus', 'bonuses']);
  const deductionsCol = findColumn(['خصومات', 'deductions', 'deduction']);
  const grossCol = findColumn(['الإجمالي', 'gross', 'إجمالي', 'total']);
  const netCol = findColumn(['الصافى', 'net', 'صافي', 'الصافي']);
  const paymentMethodCol = findColumn(['طريقة الدفع', 'payment method', 'payment', 'دفع']);
  const accountCol = findColumn(['رقم الحساب', 'account', 'account number', 'حساب']);
  const notesCol = findColumn(['ملحوظات', 'notes', 'note', 'ملاحظات']);
  
  // Base column indices (after user fix - column 2 is "-")
  // Column mapping: 0=#, 1=Name, 2="-", 3=Basic Salary, 4=Indirect, 5=Direct, 6=Yearly, 7=Bonuses, 8=Deductions, 9=Gross, 10=Net
  const baseIndices = {
    name: 1,
    salary: 3,
    indirect: 4,
    direct: 5,
    yearly: 6,
    bonuses: 7,
    deductions: 8,
    gross: 9,
    net: 10,
    payment: 12,
    account: 13,
    notes: 14
  };
  
  // Use detected columns if found, otherwise use base indices
  const finalNameCol = nameCol >= 0 ? nameCol : baseIndices.name;
  const finalSalaryCol = salaryCol >= 0 ? salaryCol : baseIndices.salary;
  const finalIndirectCol = indirectAddCol >= 0 ? indirectAddCol : baseIndices.indirect;
  const finalDirectCol = directAddCol >= 0 ? directAddCol : baseIndices.direct;
  const finalYearlyCol = yearlyIncCol >= 0 ? yearlyIncCol : baseIndices.yearly;
  const finalBonusesCol = bonusesCol >= 0 ? bonusesCol : baseIndices.bonuses;
  const finalDeductionsCol = deductionsCol >= 0 ? deductionsCol : baseIndices.deductions;
  const finalGrossCol = grossCol >= 0 ? grossCol : baseIndices.gross;
  const finalNetCol = netCol >= 0 ? netCol : baseIndices.net;
  const finalPaymentCol = paymentMethodCol >= 0 ? paymentMethodCol : baseIndices.payment;
  const finalAccountCol = accountCol >= 0 ? accountCol : baseIndices.account;
  const finalNotesCol = notesCol >= 0 ? notesCol : baseIndices.notes;
  
  console.log(`Column indices: name=${finalNameCol}, salary=${finalSalaryCol}, indirect=${finalIndirectCol}, direct=${finalDirectCol}, gross=${finalGrossCol}, net=${finalNetCol}`);
  
  const records: ParsedSalaryRecord[] = [];
  
  // Helper to get cell value
  const getCellValue = (row: any[] | undefined, colIndex: number): any => {
    if (!row) return null;
    if (colIndex < 0 || colIndex >= row.length) return null;
    const cell = row[colIndex];
    if (cell && typeof cell === 'object' && 'text' in cell) {
      return cell.text;
    }
    return cell;
  };
  
  // Parse data rows (skip header row)
  console.log(`Parsing salaries sheet: headerRowIndex=${headerRowIndex}, totalRows=${jsonData.length}`);
  console.log(`Name column index: ${finalNameCol}`);
  
  // Debug: Show first few data rows
  if (jsonData.length > headerRowIndex + 1) {
    console.log(`Sample data row ${headerRowIndex + 1} (first 5 cells):`, 
      (jsonData[headerRowIndex + 1] as any[])?.slice(0, 5));
    console.log(`Sample data row ${headerRowIndex + 2} (first 5 cells):`, 
      (jsonData[headerRowIndex + 2] as any[])?.slice(0, 5));
  }
  
  let skippedCount = 0;
  let processedCount = 0;
  
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) {
      skippedCount++;
      continue;
    }
    
    // Get name from column
    let name = '';
    if (finalNameCol < row.length) {
      const nameCell = getCellValue(row, finalNameCol);
      name = nameCell?.toString().trim() || '';
    }
    
    // Debug first few rows
    if (i <= headerRowIndex + 5) {
      console.log(`  Row ${i}: nameCol=${finalNameCol}, name="${name}", row.length=${row.length}`);
    }
    
    // Skip if no name or if it's a header/placeholder
    // Also skip "اجمالي الشركاء" (partners total) and similar summary rows
    if (!name || 
        name === 'شركاء' || 
        name === 'م' || 
        name === '#' || 
        name === 'الاسماء / Name' || 
        name === 'Spare' || 
        name.includes('اجمالي') || // Skip total rows
        name.match(/^\d+$/)) {
      skippedCount++;
      if (i <= headerRowIndex + 5) {
        console.log(`    -> Skipped (name="${name}")`);
      }
      continue;
    }
    
    processedCount++;
    
    // Extract values from مرتبات sheet
    // Note: These are HYPERLINK formulas that pull totals from other sheets
    const record: ParsedSalaryRecord = {
      employeeName: name,
      normalizedName: normalizeEmployeeName(name),
      basicSalary: parseNumeric(getCellValue(row, finalSalaryCol)),
      directAdditions: parseNumeric(getCellValue(row, finalDirectCol)), // From اضافات!M (Total Direct)
      indirectAdditions: parseNumeric(getCellValue(row, finalIndirectCol)), // From اضافات!N (Total Indirect)
      yearlyIncrease: parseNumeric(getCellValue(row, finalYearlyCol)), // From اضافات!F
      bonuses: parseNumeric(getCellValue(row, finalBonusesCol)), // From اضافات!O (Total Bonuses)
      salaryDeductions: parseNumeric(getCellValue(row, finalDeductionsCol)), // From خصومات!L (Total Deductions)
      grossDeductions: 0, // Will be filled from deductions sheet
      gross: parseNumeric(getCellValue(row, finalGrossCol)),
      net: parseNumeric(getCellValue(row, finalNetCol)),
      additionsBreakdown: {},
      deductionsBreakdown: {},
      paymentMethod: getCellValue(row, finalPaymentCol)?.toString().trim(),
      accountNumber: getCellValue(row, finalAccountCol)?.toString().trim(),
      notes: getCellValue(row, finalNotesCol)?.toString().trim()
    };
    
    records.push(record);
    if (records.length <= 5) {
      console.log(`  Record ${records.length}: "${name}" - Basic: ${record.basicSalary}, Gross: ${record.gross}, Net: ${record.net}`);
    }
  }
  
  console.log(`Parsing complete: ${records.length} records found, ${processedCount} rows processed, ${skippedCount} rows skipped`);
  
  return records;
}

/**
 * Parse اضافات (Additions) sheet and merge into records
 * Based on deep analysis:
 * - Column M (12): Total Direct = SUM(C4:E4)+L4
 * - Column N (13): Total Indirect = SUM(I4:K4)
 * - Column O (14): Total Bonuses = SUM(G4:H4)
 * - Column F (5): Yearly Increase
 */
function parseAdditionsSheet(
  worksheet: XLSX.WorkSheet,
  records: Map<string, ParsedSalaryRecord>
): void {
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    raw: false,
    defval: null,
    header: 1
  }) as any[][];
  
  const headerRowIndex = findHeaderRow(jsonData);
  const headers = (jsonData[headerRowIndex] as any[])?.map((cell: any) => {
    if (cell && typeof cell === 'object' && 'text' in cell) return cell.text?.toString().trim() || '';
    return cell?.toString().trim() || '';
  }) || [];
  
  console.log(`Parsing additions sheet: headerRowIndex=${headerRowIndex}, totalRows=${jsonData.length}`);
  
  // Find name column (usually column 1)
  const nameCol = headers.findIndex(h => h.includes('الاسماء') || h.includes('Name') || h.includes('شهر'));
  if (nameCol < 0) {
    console.warn('Could not find name column in additions sheet');
    return;
  }
  
  // Map columns based on deep analysis
  // Column 0: #, Column 1: Month/Name, Column 2: Phone, Column 3: Transportation, Column 4: Accommodation
  // Column 5: Yearly Increase, Column 6: Annual Bonus, Column 7: Monthly Bonus
  // Column 8: Social Insurance, Column 9: Taxes, Column 10: Medical Insurance
  // Column 11: Other Allowances, Column 12: Total Direct (M), Column 13: Total Indirect (N), Column 14: Total Bonuses (O)
  
  const findColumn = (patterns: string[]): number => {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase().trim();
      if (!header) continue;
      for (const pattern of patterns) {
        if (header.includes(pattern.toLowerCase())) {
          return i;
        }
      }
    }
    return -1;
  };
  
  // Direct additions (affect salary base)
  const phoneCol = findColumn(['تليفون', 'phone']);
  const transportCol = findColumn(['انتقال', 'transportation']);
  const accommodationCol = findColumn(['سكن', 'accommodation']);
  const yearlyIncCol = findColumn(['زيادة سنوية', 'yearly increase']);
  const otherAllowancesCol = findColumn(['بدلات اخري', 'other allowances', 'allowances']);
  
  // Bonuses
  const annualBonusCol = findColumn(['مكافئات سنوية', 'annual bonus']);
  const monthlyBonusCol = findColumn(['مكافئات شهرية', 'monthly bonus']);
  
  // Indirect additions (affect gross only)
  const socialInsuranceCol = findColumn(['التأمين الإجتماعي', 'social insurance']);
  const taxesCol = findColumn(['ضرائب', 'taxs', 'tax']);
  const medicalInsuranceCol = findColumn(['التأمين الصحي', 'medical insurance']);
  
  // Totals (for verification)
  const totalDirectCol = findColumn(['اجمالي إضافات مباشرة', 'total direct']);
  const totalIndirectCol = findColumn(['اجمالي إضافات غير مباشرة', 'total indirect']);
  const totalBonusesCol = findColumn(['اجمالي علاوات', 'total bouns', 'total bonus']);
  
  // Fallback to known column indices if not found
  const getCol = (found: number, fallback: number) => found >= 0 ? found : fallback;
  
  const phoneColFinal = getCol(phoneCol, 2);
  const transportColFinal = getCol(transportCol, 3);
  const accommodationColFinal = getCol(accommodationCol, 4);
  const yearlyIncColFinal = getCol(yearlyIncCol, 5);
  const annualBonusColFinal = getCol(annualBonusCol, 6);
  const monthlyBonusColFinal = getCol(monthlyBonusCol, 7);
  const socialInsuranceColFinal = getCol(socialInsuranceCol, 8);
  const taxesColFinal = getCol(taxesCol, 9);
  const medicalInsuranceColFinal = getCol(medicalInsuranceCol, 10);
  const otherAllowancesColFinal = getCol(otherAllowancesCol, 11);
  
  const getCellValue = (row: any[], colIndex: number): any => {
    if (colIndex < 0 || colIndex >= row.length) return null;
    const cell = row[colIndex];
    if (cell && typeof cell === 'object' && 'text' in cell) {
      return cell.text;
    }
    return cell;
  };
  
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;
    
    // Get name from column 1 (month/name column)
    const nameCell = getCellValue(row, nameCol);
    const name = nameCell?.toString().trim() || '';
    
    if (!name || name === 'شركاء' || name === '#' || name === 'Spare') continue;
    
    const normalizedName = normalizeEmployeeName(name);
    const record = records.get(normalizedName);
    if (!record) {
      console.warn(`  Additions: Record not found for "${name}" (normalized: "${normalizedName}")`);
      continue;
    }
    
    // Extract detailed additions
    const phoneAllowance = parseNumeric(getCellValue(row, phoneColFinal));
    const transportAllowance = parseNumeric(getCellValue(row, transportColFinal));
    const accommodationAllowance = parseNumeric(getCellValue(row, accommodationColFinal));
    const yearlyIncrease = parseNumeric(getCellValue(row, yearlyIncColFinal));
    const annualBonus = parseNumeric(getCellValue(row, annualBonusColFinal));
    const monthlyBonus = parseNumeric(getCellValue(row, monthlyBonusColFinal));
    const socialInsurance = parseNumeric(getCellValue(row, socialInsuranceColFinal));
    const taxes = parseNumeric(getCellValue(row, taxesColFinal));
    const medicalInsurance = parseNumeric(getCellValue(row, medicalInsuranceColFinal));
    const otherAllowances = parseNumeric(getCellValue(row, otherAllowancesColFinal));
    
    // Store in breakdown
    if (phoneAllowance > 0) record.additionsBreakdown['phoneAllowance'] = phoneAllowance;
    if (transportAllowance > 0) record.additionsBreakdown['transportationAllowance'] = transportAllowance;
    if (accommodationAllowance > 0) record.additionsBreakdown['accommodationAllowance'] = accommodationAllowance;
    if (yearlyIncrease > 0) record.additionsBreakdown['yearlyIncrease'] = yearlyIncrease;
    if (annualBonus > 0) record.additionsBreakdown['annualBonus'] = annualBonus;
    if (monthlyBonus > 0) record.additionsBreakdown['monthlyBonus'] = monthlyBonus;
    if (socialInsurance > 0) record.additionsBreakdown['socialInsurance'] = socialInsurance;
    if (taxes > 0) record.additionsBreakdown['taxes'] = taxes;
    if (medicalInsurance > 0) record.additionsBreakdown['medicalInsurance'] = medicalInsurance;
    if (otherAllowances > 0) record.additionsBreakdown['otherAllowances'] = otherAllowances;
    
    // Update totals from additions sheet (these should match what's in مرتبات)
    // Total Direct = Phone + Transport + Accommodation + Other Allowances
    const calculatedDirect = phoneAllowance + transportAllowance + accommodationAllowance + otherAllowances;
    // Total Indirect = Social Insurance + Taxes + Medical Insurance
    const calculatedIndirect = socialInsurance + taxes + medicalInsurance;
    // Total Bonuses = Annual Bonus + Monthly Bonus
    const calculatedBonuses = annualBonus + monthlyBonus;
    
    // Update record with calculated values (these come from the source sheet)
    record.directAdditions = calculatedDirect;
    record.indirectAdditions = calculatedIndirect;
    record.bonuses = calculatedBonuses;
    record.yearlyIncrease = yearlyIncrease;
    
    // Recalculate Gross and Net based on formulas from deep analysis
    // GROSS = Basic Salary + Indirect Additions + Direct Additions + Yearly Increase
    record.gross = record.basicSalary + record.indirectAdditions + record.directAdditions + record.yearlyIncrease;
    
    // NET = Basic Salary + Yearly Increase + Bonuses - Deductions
    // (Note: Deductions will be updated from deductions sheet)
    record.net = record.basicSalary + record.yearlyIncrease + record.bonuses - record.salaryDeductions;
  }
}

/**
 * Parse خصومات (Deductions) sheet and merge into records
 * Based on deep analysis:
 * - Column L (11): Total Deductions = SUM(C4:K4)
 * - Columns C-K: Various deduction categories
 */
function parseDeductionsSheet(
  worksheet: XLSX.WorkSheet,
  records: Map<string, ParsedSalaryRecord>
): void {
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    raw: false,
    defval: null,
    header: 1
  }) as any[][];
  
  const headerRowIndex = findHeaderRow(jsonData);
  const headers = (jsonData[headerRowIndex] as any[])?.map((cell: any) => {
    if (cell && typeof cell === 'object' && 'text' in cell) return cell.text?.toString().trim() || '';
    return cell?.toString().trim() || '';
  }) || [];
  
  console.log(`Parsing deductions sheet: headerRowIndex=${headerRowIndex}, totalRows=${jsonData.length}`);
  
  // Find name column (usually column 1)
  const nameCol = headers.findIndex(h => h.includes('الاسماء') || h.includes('Name') || h.includes('شهر'));
  if (nameCol < 0) {
    console.warn('Could not find name column in deductions sheet');
    return;
  }
  
  const findColumn = (patterns: string[]): number => {
    for (let i = 0; i < headers.length; i++) {
      const header = (headers[i] as string).toLowerCase().trim();
      if (!header) continue;
      for (const pattern of patterns) {
        if (header.includes(pattern.toLowerCase())) {
          return i;
        }
      }
    }
    return -1;
  };
  
  // Gross-only deductions (affect gross calculation)
  const medicalInsuranceDeductedCol = findColumn(['التأمين الصحي المخصوم', 'deducted medical insurance']);
  const lawyersTaxesCol = findColumn(['ضرائب محامين', 'laywers taxs', 'lawyers tax']);
  
  // Salary deductions (deduct from salary/net)
  const otherBankWithdrawalCol = findColumn(['مسحوبات لبنوك', 'other bank']);
  const loansDeductionsCol = findColumn(['مسحوبات/خصم', 'loans or deductions']);
  const phoneDeductionCol = findColumn(['خصومات تليفون', 'phone deduction']);
  const unpaidVacationCol = findColumn(['اجازات غير مدفوعة', 'unpaid vacation']);
  const lateArrivalsCol = findColumn(['تأخيرات', 'late']);
  const timeSheetDeductionsCol = findColumn(['تسجيل ساعات', 'time sheet']);
  const otherDeductionsCol = findColumn(['خصومات اخري', 'other deductions']);
  
  // Total column (for verification)
  const totalDeductionsCol = findColumn(['اجمالي الخصومات', 'total deductions']);
  
  // Fallback to known column indices
  const getCol = (found: number, fallback: number) => found >= 0 ? found : fallback;
  
  const medicalInsuranceDeductedColFinal = getCol(medicalInsuranceDeductedCol, 2);
  const lawyersTaxesColFinal = getCol(lawyersTaxesCol, 3);
  const otherBankWithdrawalColFinal = getCol(otherBankWithdrawalCol, 4);
  const loansDeductionsColFinal = getCol(loansDeductionsCol, 5);
  const phoneDeductionColFinal = getCol(phoneDeductionCol, 6);
  const unpaidVacationColFinal = getCol(unpaidVacationCol, 7);
  const lateArrivalsColFinal = getCol(lateArrivalsCol, 8);
  const timeSheetDeductionsColFinal = getCol(timeSheetDeductionsCol, 9);
  const otherDeductionsColFinal = getCol(otherDeductionsCol, 10);
  
  const getCellValue = (row: any[], colIndex: number): any => {
    if (colIndex < 0 || colIndex >= row.length) return null;
    const cell = row[colIndex];
    if (cell && typeof cell === 'object' && 'text' in cell) {
      return cell.text;
    }
    return cell;
  };
  
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;
    
    // Get name from column 1
    const nameCell = getCellValue(row, nameCol);
    const name = nameCell?.toString().trim() || '';
    
    if (!name || name === 'شركاء' || name === '#' || name === 'Spare') continue;
    
    const normalizedName = normalizeEmployeeName(name);
    const record = records.get(normalizedName);
    if (!record) {
      console.warn(`  Deductions: Record not found for "${name}" (normalized: "${normalizedName}")`);
      continue;
    }
    
    // Extract deductions
    const medicalInsuranceDeducted = parseNumeric(getCellValue(row, medicalInsuranceDeductedColFinal));
    const lawyersTaxes = parseNumeric(getCellValue(row, lawyersTaxesColFinal));
    const otherBankWithdrawal = parseNumeric(getCellValue(row, otherBankWithdrawalColFinal));
    const loansDeductions = parseNumeric(getCellValue(row, loansDeductionsColFinal));
    const phoneDeduction = parseNumeric(getCellValue(row, phoneDeductionColFinal));
    const unpaidVacation = parseNumeric(getCellValue(row, unpaidVacationColFinal));
    const lateArrivals = parseNumeric(getCellValue(row, lateArrivalsColFinal));
    const timeSheetDeductions = parseNumeric(getCellValue(row, timeSheetDeductionsColFinal));
    const otherDeductions = parseNumeric(getCellValue(row, otherDeductionsColFinal));
    
    // Store in breakdown
    if (medicalInsuranceDeducted > 0) record.deductionsBreakdown['medicalInsuranceDeducted'] = medicalInsuranceDeducted;
    if (lawyersTaxes > 0) record.deductionsBreakdown['lawyersTaxes'] = lawyersTaxes;
    if (otherBankWithdrawal > 0) record.deductionsBreakdown['otherBankWithdrawal'] = otherBankWithdrawal;
    if (loansDeductions > 0) record.deductionsBreakdown['loansDeductions'] = loansDeductions;
    if (phoneDeduction > 0) record.deductionsBreakdown['phoneDeduction'] = phoneDeduction;
    if (unpaidVacation > 0) record.deductionsBreakdown['unpaidVacation'] = unpaidVacation;
    if (lateArrivals > 0) record.deductionsBreakdown['lateArrivals'] = lateArrivals;
    if (timeSheetDeductions > 0) record.deductionsBreakdown['timeSheetDeductions'] = timeSheetDeductions;
    if (otherDeductions > 0) record.deductionsBreakdown['otherDeductions'] = otherDeductions;
    
    // Calculate totals
    // Gross deductions (affect gross calculation)
    record.grossDeductions = medicalInsuranceDeducted + lawyersTaxes;
    
    // Salary deductions (affect net calculation)
    record.salaryDeductions = otherBankWithdrawal + loansDeductions + phoneDeduction + 
                               unpaidVacation + lateArrivals + timeSheetDeductions + otherDeductions;
    
    // Recalculate Net based on formula: NET = Basic Salary + Yearly Increase + Bonuses - Deductions
    record.net = record.basicSalary + record.yearlyIncrease + record.bonuses - record.salaryDeductions;
    
    // Adjust Gross if there are gross deductions
    // Note: The formula in Excel is: GROSS = Basic Salary + Indirect + Direct + Yearly Increase
    // Gross deductions are typically already accounted for in the gross calculation
    // But we can verify: if gross deductions exist, they might need to be subtracted
    // However, based on the Excel formulas, gross deductions don't affect the GROSS column
    // They only affect the final NET calculation indirectly
  }
}

/**
 * Parse a single Excel workbook
 */
export async function parseWorkbook(
  filePath: string,
  year: number,
  month: number
): Promise<ParsedWorkbook> {
  const errors: string[] = [];
  
  try {
    const data = readFileSync(filePath);
    const password = getPassword();
    
    let workbook: XLSX.WorkBook;
    
    try {
      workbook = XLSX.read(data, {
        type: 'buffer',
        cellDates: true,
        cellNF: false,
        cellText: false,
      });
    } catch (error: any) {
      errors.push(`Error reading workbook: ${error.message}`);
      return { year, month, records: [], errors };
    }
    
    console.log(`\n=== Parsing workbook: ${filePath} ===`);
    console.log(`Sheets found: ${workbook.SheetNames.join(', ')}`);
    
    // Parse مرتبات sheet first
    const salariesSheet = workbook.Sheets['مرتبات'];
    if (!salariesSheet) {
      errors.push('مرتبات sheet not found');
      return { year, month, records: [], errors };
    }
    
    const records = parseSalariesSheet(salariesSheet);
    console.log(`Parsed ${records.length} records from مرتبات sheet`);
    
    // Create a map for quick lookup
    const recordsMap = new Map<string, ParsedSalaryRecord>();
    for (const record of records) {
      recordsMap.set(record.normalizedName, record);
    }
    
    // Parse اضافات sheet and merge
    const additionsSheet = workbook.Sheets['اضافات'];
    if (additionsSheet) {
      console.log('Parsing اضافات sheet...');
      parseAdditionsSheet(additionsSheet, recordsMap);
    } else {
      console.warn('اضافات sheet not found');
      errors.push('اضافات sheet not found');
    }
    
    // Parse خصومات sheet and merge
    const deductionsSheet = workbook.Sheets['خصومات'];
    if (deductionsSheet) {
      console.log('Parsing خصومات sheet...');
      parseDeductionsSheet(deductionsSheet, recordsMap);
    } else {
      console.warn('خصومات sheet not found');
      errors.push('خصومات sheet not found');
    }
    
    // Convert map back to array
    const finalRecords = Array.from(recordsMap.values());
    
    console.log(`\n=== Final result: ${finalRecords.length} records ===`);
    if (finalRecords.length > 0) {
      const sample = finalRecords[0];
      console.log(`Sample record: "${sample.employeeName}" - Basic: ${sample.basicSalary}, Gross: ${sample.gross}, Net: ${sample.net}`);
    }
    
    return {
      year,
      month,
      monthName: getMonthName(month),
      records: finalRecords,
      errors
    };
    
  } catch (error: any) {
    errors.push(`Error parsing workbook: ${error.message}`);
    console.error('Parse error:', error);
    return { year, month, records: [], errors };
  }
}
