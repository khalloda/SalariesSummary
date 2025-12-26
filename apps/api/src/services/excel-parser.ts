/**
 * Excel Parser Service - Simplified Version
 * Based on working test script logic
 */

import XLSX from 'xlsx';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { normalizeEmployeeName, parseNumeric, getMonthName } from '../utils/normalize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Sheets directory
const getSheetsDir = () => {
  const cwd = process.cwd();
  if (cwd.endsWith('apps/api')) {
    return join(cwd, '..', '..', 'Sheets');
  }
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
  category?: string; // Partners, Lawyers, Admins, Consultants
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
 * Find header row - looks for "الاسماء" or "name"
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
      if (cellStr.includes('الاسماء') || cellStr.includes('name')) {
        return i;
      }
    }
  }
  return 2; // Default based on test results
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
 * Parse مرتبات sheet - simplified based on working test
 */
function parseSalariesSheet(worksheet: XLSX.WorkSheet): ParsedSalaryRecord[] {
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    raw: false,
    defval: null,
    header: 1
  }) as any[][];
  
  const headerRowIndex = findHeaderRow(jsonData);
  console.log(`Header row found at index: ${headerRowIndex}`);
  
  const records: ParsedSalaryRecord[] = [];
  
  // Column indices based on test results:
  // Column 0: م (sequence)
  // Column 1: الاسماء / Name
  // Column 2: empty or "-"
  // Column 3: صافي الاتعاب والمرتبات / Salary
  // Column 4: إضافات غير مباشرة (Indirect)
  // Column 5: إضافات مباشرة (Direct)
  // Column 6: زيادة سنوية (Yearly Increase)
  // Column 7: علاوات (Bonuses)
  // Column 8: خصومات (Deductions)
  // Column 9: GROSS
  // Column 10: NET
  // Column 12: طريقة الدفع (Payment Method)
  // Column 13: رقم الحساب (Account)
  // Column 14: ملحوظات (Notes)
  
  const NAME_COL = 1;
  const SALARY_COL = 3;
  const INDIRECT_COL = 4;
  const DIRECT_COL = 5;
  const YEARLY_COL = 6;
  const BONUSES_COL = 7;
  const DEDUCTIONS_COL = 8;
  const GROSS_COL = 9;
  const NET_COL = 10;
  const PAYMENT_COL = 12;
  const ACCOUNT_COL = 13;
  const NOTES_COL = 14;
  
  console.log(`Parsing ${jsonData.length} rows, starting from row ${headerRowIndex + 1}`);
  
  // First pass: Find category boundaries
  const categoryBoundaries = {
    partnersEnd: -1,    // "اجمالي الشركاء"
    lawyersEnd: -1,     // "اجمالي المحامين"
    adminsEnd: -1,      // "اجمالي العاملين"
    consultantsEnd: -1  // "اجمالي المستشارين"
  };
  
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;
    
    const nameCell = getCellValue(row, NAME_COL);
    const name = nameCell?.toString().trim() || '';
    
    if (name.includes('اجمالي الشركاء')) {
      categoryBoundaries.partnersEnd = i;
    } else if (name.includes('اجمالي المحامين')) {
      categoryBoundaries.lawyersEnd = i;
    } else if (name.includes('اجمالي العاملين')) {
      categoryBoundaries.adminsEnd = i;
    } else if (name.includes('اجمالي المستشارين')) {
      categoryBoundaries.consultantsEnd = i;
    }
  }
  
  console.log(`Category boundaries: Partners end at ${categoryBoundaries.partnersEnd}, Lawyers end at ${categoryBoundaries.lawyersEnd}, Admins end at ${categoryBoundaries.adminsEnd}, Consultants end at ${categoryBoundaries.consultantsEnd}`);
  
  // Second pass: Parse employees and assign categories
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;
    
    // Get name from column B (index 1)
    const nameCell = getCellValue(row, NAME_COL);
    const name = nameCell?.toString().trim() || '';
    
    // Skip rows with "اجمالي" or "Spare" (case-insensitive) in column B
    const nameLower = name.toLowerCase();
    if (!name || 
        name === 'شركاء' || 
        name === 'م' || 
        name === '#' || 
        name === 'الاسماء / Name' || 
        nameLower.includes('spare') || // Skip all "Spare" variations (Manager Spare, Senior Spare, etc.)
        name.includes('اجمالي') || // Skip all total rows
        name.match(/^\d+$/)) {
      continue;
    }
    
    // Determine category based on position
    // Partners: from row 3 (headerRowIndex + 1) to "اجمالي الشركاء"
    // Lawyers: from after "اجمالي الشركاء" to "اجمالي المحامين"
    // Admins: from after "اجمالي المحامين" to "اجمالي العاملين"
    // Consultants: from after "اجمالي العاملين" to "اجمالي المستشارين"
    let category: string | undefined;
    
    if (categoryBoundaries.partnersEnd > 0 && i < categoryBoundaries.partnersEnd) {
      category = 'Partners/شركاء';
    } else if (categoryBoundaries.lawyersEnd > 0) {
      const lawyersStart = categoryBoundaries.partnersEnd > 0 ? categoryBoundaries.partnersEnd + 1 : headerRowIndex + 1;
      if (i >= lawyersStart && i < categoryBoundaries.lawyersEnd) {
        category = 'Lawyers/محامين';
      }
    }
    
    if (!category && categoryBoundaries.adminsEnd > 0) {
      const adminsStart = categoryBoundaries.lawyersEnd > 0 ? categoryBoundaries.lawyersEnd + 1 : 
                          (categoryBoundaries.partnersEnd > 0 ? categoryBoundaries.partnersEnd + 1 : headerRowIndex + 1);
      if (i >= adminsStart && i < categoryBoundaries.adminsEnd) {
        category = 'Admins/عاملين';
      }
    }
    
    if (!category && categoryBoundaries.consultantsEnd > 0) {
      const consultantsStart = categoryBoundaries.adminsEnd > 0 ? categoryBoundaries.adminsEnd + 1 :
                                (categoryBoundaries.lawyersEnd > 0 ? categoryBoundaries.lawyersEnd + 1 :
                                 (categoryBoundaries.partnersEnd > 0 ? categoryBoundaries.partnersEnd + 1 : headerRowIndex + 1));
      if (i >= consultantsStart && i < categoryBoundaries.consultantsEnd) {
        category = 'Consultants/مستشارين';
      }
    }
    
    // Extract all values
    const record: ParsedSalaryRecord = {
      employeeName: name,
      normalizedName: normalizeEmployeeName(name),
      category: category,
      basicSalary: parseNumeric(getCellValue(row, SALARY_COL)),
      directAdditions: parseNumeric(getCellValue(row, DIRECT_COL)),
      indirectAdditions: parseNumeric(getCellValue(row, INDIRECT_COL)),
      yearlyIncrease: parseNumeric(getCellValue(row, YEARLY_COL)),
      bonuses: parseNumeric(getCellValue(row, BONUSES_COL)),
      salaryDeductions: parseNumeric(getCellValue(row, DEDUCTIONS_COL)),
      grossDeductions: 0,
      gross: parseNumeric(getCellValue(row, GROSS_COL)),
      net: parseNumeric(getCellValue(row, NET_COL)),
      additionsBreakdown: {},
      deductionsBreakdown: {},
      paymentMethod: getCellValue(row, PAYMENT_COL)?.toString().trim(),
      accountNumber: getCellValue(row, ACCOUNT_COL)?.toString().trim(),
      notes: getCellValue(row, NOTES_COL)?.toString().trim()
    };
    
    records.push(record);
    
    if (records.length <= 5) {
      console.log(`  Record ${records.length}: "${name}" - Basic: ${record.basicSalary}, Gross: ${record.gross}, Net: ${record.net}`);
    }
  }
  
  console.log(`✅ Parsed ${records.length} records from مرتبات sheet`);
  return records;
}

/**
 * Parse اضافات sheet
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
  console.log(`Parsing اضافات sheet, header at ${headerRowIndex}`);
  
  // Column mapping from deep analysis:
  // Column 0: #
  // Column 1: Month/Name
  // Column 2: Phone Allowance (Direct)
  // Column 3: Transportation (Direct)
  // Column 4: Accommodation (Direct)
  // Column 5: Yearly Increase (Direct)
  // Column 6: Annual Bonus
  // Column 7: Monthly Bonus
  // Column 8: Social Insurance (Indirect)
  // Column 9: Taxes (Indirect)
  // Column 10: Medical Insurance (Indirect)
  // Column 11: Other Allowances (Direct)
  // Column 12: Total Direct (M)
  // Column 13: Total Indirect (N)
  // Column 14: Total Bonuses (O)
  
  const NAME_COL = 1;
  const PHONE_COL = 2;
  const TRANSPORT_COL = 3;
  const ACCOMMODATION_COL = 4;
  const YEARLY_INC_COL = 5;
  const ANNUAL_BONUS_COL = 6;
  const MONTHLY_BONUS_COL = 7;
  const SOCIAL_INS_COL = 8;
  const TAXES_COL = 9;
  const MEDICAL_INS_COL = 10;
  const OTHER_ALLOW_COL = 11;
  
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;
    
    const nameCell = getCellValue(row, NAME_COL);
    const name = nameCell?.toString().trim() || '';
    const nameLower = name.toLowerCase();
    
    if (!name || name === 'شركاء' || name === '#' || nameLower.includes('spare') || name.includes('اجمالي')) {
      continue;
    }
    
    const normalizedName = normalizeEmployeeName(name);
    const record = records.get(normalizedName);
    if (!record) {
      console.warn(`  Additions: Record not found for "${name}"`);
      continue;
    }
    
    // Extract detailed additions
    const phoneAllowance = parseNumeric(getCellValue(row, PHONE_COL));
    const transportAllowance = parseNumeric(getCellValue(row, TRANSPORT_COL));
    const accommodationAllowance = parseNumeric(getCellValue(row, ACCOMMODATION_COL));
    const yearlyIncrease = parseNumeric(getCellValue(row, YEARLY_INC_COL));
    const annualBonus = parseNumeric(getCellValue(row, ANNUAL_BONUS_COL));
    const monthlyBonus = parseNumeric(getCellValue(row, MONTHLY_BONUS_COL));
    const socialInsurance = parseNumeric(getCellValue(row, SOCIAL_INS_COL));
    const taxes = parseNumeric(getCellValue(row, TAXES_COL));
    const medicalInsurance = parseNumeric(getCellValue(row, MEDICAL_INS_COL));
    const otherAllowances = parseNumeric(getCellValue(row, OTHER_ALLOW_COL));
    
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
    
    // Recalculate totals from source data
    record.directAdditions = phoneAllowance + transportAllowance + accommodationAllowance + otherAllowances;
    record.indirectAdditions = socialInsurance + taxes + medicalInsurance;
    record.bonuses = annualBonus + monthlyBonus;
    record.yearlyIncrease = yearlyIncrease;
    
    // Recalculate Gross: Basic Salary + Indirect + Direct + Yearly Increase
    record.gross = record.basicSalary + record.indirectAdditions + record.directAdditions + record.yearlyIncrease;
  }
  
  console.log(`✅ Updated ${records.size} records with additions data`);
}

/**
 * Parse خصومات sheet
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
  console.log(`Parsing خصومات sheet, header at ${headerRowIndex}`);
  
  // Column mapping from deep analysis:
  // Column 0: #
  // Column 1: Month/Name
  // Column 2: Medical Insurance Deducted (Gross)
  // Column 3: Lawyers Taxes (Gross)
  // Column 4: Other Bank Withdrawal (Salary)
  // Column 5: Loans/Deductions (Salary)
  // Column 6: Phone Deduction (Salary)
  // Column 7: Unpaid Vacation (Salary)
  // Column 8: Late (Salary)
  // Column 9: Time Sheet (Salary)
  // Column 10: Other Deductions (Salary)
  // Column 11: Total Deductions (L)
  
  const NAME_COL = 1;
  const MEDICAL_INS_DED_COL = 2;
  const LAWYERS_TAXES_COL = 3;
  const OTHER_BANK_COL = 4;
  const LOANS_COL = 5;
  const PHONE_DED_COL = 6;
  const UNPAID_VACATION_COL = 7;
  const LATE_COL = 8;
  const TIMESHEET_COL = 9;
  const OTHER_DED_COL = 10;
  
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;
    
    const nameCell = getCellValue(row, NAME_COL);
    const name = nameCell?.toString().trim() || '';
    const nameLower = name.toLowerCase();
    
    if (!name || name === 'شركاء' || name === '#' || nameLower.includes('spare') || name.includes('اجمالي')) {
      continue;
    }
    
    const normalizedName = normalizeEmployeeName(name);
    const record = records.get(normalizedName);
    if (!record) {
      console.warn(`  Deductions: Record not found for "${name}"`);
      continue;
    }
    
    // Extract deductions
    const medicalInsDeducted = parseNumeric(getCellValue(row, MEDICAL_INS_DED_COL));
    const lawyersTaxes = parseNumeric(getCellValue(row, LAWYERS_TAXES_COL));
    const otherBank = parseNumeric(getCellValue(row, OTHER_BANK_COL));
    const loans = parseNumeric(getCellValue(row, LOANS_COL));
    const phoneDed = parseNumeric(getCellValue(row, PHONE_DED_COL));
    const unpaidVacation = parseNumeric(getCellValue(row, UNPAID_VACATION_COL));
    const late = parseNumeric(getCellValue(row, LATE_COL));
    const timesheet = parseNumeric(getCellValue(row, TIMESHEET_COL));
    const otherDed = parseNumeric(getCellValue(row, OTHER_DED_COL));
    
    // Store in breakdown
    if (medicalInsDeducted > 0) record.deductionsBreakdown['medicalInsuranceDeducted'] = medicalInsDeducted;
    if (lawyersTaxes > 0) record.deductionsBreakdown['lawyersTaxes'] = lawyersTaxes;
    if (otherBank > 0) record.deductionsBreakdown['otherBankWithdrawal'] = otherBank;
    if (loans > 0) record.deductionsBreakdown['loansDeductions'] = loans;
    if (phoneDed > 0) record.deductionsBreakdown['phoneDeduction'] = phoneDed;
    if (unpaidVacation > 0) record.deductionsBreakdown['unpaidVacation'] = unpaidVacation;
    if (late > 0) record.deductionsBreakdown['lateArrivals'] = late;
    if (timesheet > 0) record.deductionsBreakdown['timeSheetDeductions'] = timesheet;
    if (otherDed > 0) record.deductionsBreakdown['otherDeductions'] = otherDed;
    
    // Calculate totals
    record.grossDeductions = medicalInsDeducted + lawyersTaxes;
    record.salaryDeductions = otherBank + loans + phoneDed + unpaidVacation + late + timesheet + otherDed;
    
    // Note: Net value is read directly from column K in مرتبات sheet, not calculated
  }
  
  console.log(`✅ Updated ${records.size} records with deductions data`);
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
    
    const workbook = XLSX.read(data, {
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false,
    });
    
    console.log(`\n=== Parsing workbook: ${filePath} ===`);
    console.log(`Sheets found: ${workbook.SheetNames.join(', ')}`);
    
    // Parse مرتبات sheet first
    const salariesSheet = workbook.Sheets['مرتبات'];
    if (!salariesSheet) {
      errors.push('مرتبات sheet not found');
      return { year, month, monthName: getMonthName(month), records: [], errors };
    }
    
    const records = parseSalariesSheet(salariesSheet);
    
    // Create a map for quick lookup
    const recordsMap = new Map<string, ParsedSalaryRecord>();
    for (const record of records) {
      recordsMap.set(record.normalizedName, record);
    }
    
    // Parse اضافات sheet and merge
    const additionsSheet = workbook.Sheets['اضافات'];
    if (additionsSheet) {
      parseAdditionsSheet(additionsSheet, recordsMap);
    } else {
      console.warn('اضافات sheet not found');
      errors.push('اضافات sheet not found');
    }
    
    // Parse خصومات sheet and merge
    const deductionsSheet = workbook.Sheets['خصومات'];
    if (deductionsSheet) {
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
      console.log(`Sample: "${sample.employeeName}" - Basic: ${sample.basicSalary}, Gross: ${sample.gross}, Net: ${sample.net}`);
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
    return { year, month, monthName: getMonthName(month), records: [], errors };
  }
}

