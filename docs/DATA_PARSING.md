# Data Parsing Logic

## Overview

The Excel parsing logic extracts employee salary data from three sheets: مرتبات (Salaries), اضافات (Additions), and خصومات (Deductions).

## Sheet Structure

### مرتبات Sheet (Main Salary Sheet)

**Column Mapping:**
- Column A (0): Sequence number (م)
- Column B (1): Employee Name (الاسماء / Name)
- Column C (2): Placeholder ("-")
- Column D (3): Basic Salary (صافي الاتعاب والمرتبات / Salary)
- Column E (4): Indirect Additions (إضافات غير مباشرة)
- Column F (5): Direct Additions (إضافات مباشرة)
- Column G (6): Yearly Increase (زيادة سنوية)
- Column H (7): Bonuses (علاوات)
- Column I (8): Deductions (خصومات)
- Column J (9): GROSS (الإجمالي قبل الخصم)
- Column K (10): NET (الصافى بعد الخصم أو الزيادة) - **Read directly, not calculated**
- Column L (11): Empty
- Column M (12): Payment Method (طريقة الدفع)
- Column N (13): Account Number (رقم الحساب)
- Column O (14): Notes (ملحوظات)

**Header Row Detection:**
- Looks for row containing "الاسماء" or "Name"
- Defaults to row index 2 if not found

**Row Filtering:**
- Skips rows with "اجمالي" in column B
- Skips rows with "Spare" (case-insensitive) in column B
- Skips empty rows, headers, placeholders

### اضافات Sheet (Additions)

**Column Mapping:**
- Column A (0): Sequence number
- Column B (1): Month/Name
- Column C (2): Phone Allowance (Direct)
- Column D (3): Transportation (Direct)
- Column E (4): Accommodation (Direct)
- Column F (5): Yearly Increase (Direct)
- Column G (6): Annual Bonus
- Column H (7): Monthly Bonus
- Column I (8): Social Insurance (Indirect)
- Column J (9): Taxes (Indirect)
- Column K (10): Medical Insurance (Indirect)
- Column L (11): Other Allowances (Direct)

**Calculations:**
- Total Direct = Phone + Transportation + Accommodation + Other Allowances
- Total Indirect = Social Insurance + Taxes + Medical Insurance
- Total Bonuses = Annual Bonus + Monthly Bonus

**Gross Calculation:**
```
Gross = Basic Salary + Indirect Additions + Direct Additions + Yearly Increase
```

### خصومات Sheet (Deductions)

**Column Mapping:**
- Column A (0): Sequence number
- Column B (1): Month/Name
- Column C (2): Medical Insurance Deducted (Gross)
- Column D (3): Lawyers Taxes (Gross)
- Column E (4): Other Bank Withdrawal (Salary)
- Column F (5): Loans/Deductions (Salary)
- Column G (6): Phone Deduction (Salary)
- Column H (7): Unpaid Vacation (Salary)
- Column I (8): Late (Salary)
- Column J (9): Time Sheet (Salary)
- Column K (10): Other Deductions (Salary)

**Calculations:**
- Gross Deductions = Medical Insurance Deducted + Lawyers Taxes
- Salary Deductions = Other Bank + Loans + Phone + Unpaid Vacation + Late + Time Sheet + Other

**Net Calculation:**
```
Net = Basic Salary + Yearly Increase + Bonuses - Salary Deductions
```

**Note:** Net value is read directly from column K in the "مرتبات" sheet, not calculated.

## Parsing Process

### Step 1: Read Workbook

```typescript
const workbook = XLSX.read(data, {
  type: 'buffer',
  cellDates: true,
  cellNF: false,
  cellText: false,
});
```

### Step 2: Parse مرتبات Sheet

1. Convert sheet to JSON array format
2. Find header row
3. First pass: Find category boundaries
4. Second pass: Parse employees and assign categories
5. Extract all values from fixed column indices

### Step 3: Parse اضافات Sheet

1. Find header row
2. For each employee:
   - Extract detailed additions
   - Store in `additionsBreakdown`
   - Recalculate totals
   - Update Gross

### Step 4: Parse خصومات Sheet

1. Find header row
2. For each employee:
   - Extract detailed deductions
   - Store in `deductionsBreakdown`
   - Calculate totals
   - Note: Net is NOT recalculated (read from مرتبات)

### Step 5: Final Processing

- Merge all data into final records
- Normalize employee names
- Store in database

## Data Normalization

### Employee Name Normalization

```typescript
function normalizeEmployeeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}
```

### Numeric Parsing

```typescript
function parseNumeric(value: any): number {
  if (value === null || value === undefined) return 0;
  const str = value.toString().trim();
  if (!str || str === '-') return 0;
  const num = parseFloat(str.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}
```

## Month/Year Extraction

From filename: `NN - MonthName Salaries YYYY.xlsx`

```typescript
function parseMonthYearFromFilename(filename: string): { month: number; year: number } {
  // Extract month from prefix (01-12)
  // Extract year from suffix (2025)
  // Fallback to current date if not found
}
```

## Error Handling

- Missing sheets: Logs error, continues with available data
- Missing columns: Uses fallback indices
- Invalid data: Parses as 0 or empty string
- All errors stored in `ImportLog` table

## Performance Considerations

- Parsing is synchronous (could be optimized)
- Large workbooks may take time
- Database writes are batched per workbook
- Memory usage scales with workbook size

## Validation

- Validates month (1-12)
- Validates year (reasonable range)
- Validates numeric values
- Validates employee names (non-empty)

