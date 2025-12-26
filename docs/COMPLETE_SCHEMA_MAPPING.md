# Complete Excel Schema Mapping Reference

**Generated:** 2025-12-25  
**Purpose:** Comprehensive reference for parsing all Excel workbooks correctly

## Critical Finding: Column Structure Variations

### **Affected Sheet: مرتبات (Salaries Sheet Only)**

The column structure difference **ONLY affects the `مرتبات` sheet**. The other sheets (`اضافات` and `خصومات`) have consistent structures across all months.

### January - September Structure
- **Sheet:** `مرتبات` (Salaries)
- **Header Row:** Index 1 or 2
- **Column Mapping:**
  - Column 0: `م` (Sequence number)
  - Column 1: `الاسماء / Name` (Employee Name)
  - Column 2: `__EMPTY` or merged cell (Empty column - exists but is empty due to merged cells)
  - Column 3: `صافي الاتعاب والمرتبات / Salary` (Basic Salary)
  - Column 4: `إضافات غير مباشرة / In direct additions` (Indirect Additions)
  - Column 5: `إضافات مباشرة / Direct Additions` (Direct Additions)
  - Column 6: `زيادة سنوية / Yearly Increase`
  - Column 7: `علاوات / Bouns` (Bonuses)
  - Column 8: `خصومات / Deductions`
  - Column 9: `الإجمالي قبل الخصم GROSS` (Gross)
  - Column 10: `الصافى بعد الخصم أو الزيادة NET` (Net)
  - Column 11: `__EMPTY` (Empty)
  - Column 12: `طريقة الدفع` (Payment Method)
  - Column 13: `رقم الحساب` (Account Number)
  - Column 14: `ملحوظات` (Notes)

### October - December Structure (FIXED - Now Matches January-September)
- **Sheet:** `مرتبات` (Salaries)
- **Header Row:** Index 2
- **Column Mapping (After User Fix - Column 2 now contains "-"):**
  - Column 0: `م` (Sequence number)
  - Column 1: `الاسماء / Name` (Employee Name)
  - Column 2: `-` (Placeholder - now present, matches Jan-Sep structure) ✅
  - Column 3: `صافي الاتعاب والمرتبات / Salary` (Basic Salary)
  - Column 4: `إضافات غير مباشرة / In direct additions` (Indirect Additions)
  - Column 5: `إضافات مباشرة / Direct Additions` (Direct Additions)
  - Column 6: `زيادة سنوية / Yearly Increase`
  - Column 7: `علاوات / Bouns` (Bonuses)
  - Column 8: `خصومات / Deductions`
  - Column 9: `الإجمالي قبل الخصم GROSS` (Gross)
  - Column 10: `الصافى بعد الخصم أو الزيادة NET` (Net)
  - Column 12: `طريقة الدفع` (Payment Method)
  - Column 13: `رقم الحساب` (Account Number)
  - Column 14: `ملحوظات` (Notes)

**Status:** ✅ **FIXED** - All months (January through December) now have the same column structure. The parser no longer needs special handling for October-December files.

### Other Sheets (اضافات and خصومات)
- **Structure:** Consistent across ALL months (January through December)
- **No column shifts or missing columns**
- These sheets maintain the same column structure regardless of month

## Formula-Based Relationships

### Sheet: مرتبات (Salaries)

The `مرتبات` sheet uses **HYPERLINK formulas** to pull data from other sheets:

1. **Indirect Additions (Column E/4):**
   - Formula: `HYPERLINK(اضافات!N4)`
   - Source: `اضافات` sheet, Column N (Total Indirect Allowances)
   - Column N in اضافات = `SUM(I4:K4)` = Sum of columns I, J, K (Social Insurance, Taxes, Medical Insurance)

2. **Direct Additions (Column F/5):**
   - Formula: `HYPERLINK(اضافات!M4)`
   - Source: `اضافات` sheet, Column M (Total Direct Allowances)
   - Column M in اضافات = `SUM(C4:E4)+L4` = Phone + Transportation + Accommodation + Other Allowances

3. **Yearly Increase (Column G/6):**
   - Formula: `HYPERLINK(اضافات!F4)`
   - Source: `اضافات` sheet, Column F (Yearly Increase column)

4. **Bonuses (Column H/7):**
   - Formula: `HYPERLINK(اضافات!O4)`
   - Source: `اضافات` sheet, Column O (Total Bonuses)
   - Column O in اضافات = `SUM(G4:H4)` = Annual Bonus + Monthly Bonus

5. **Deductions (Column I/8):**
   - Formula: `HYPERLINK(خصومات!L4)`
   - Source: `خصومات` sheet, Column L (Total Deductions)
   - Column L in خصومات = `SUM(C4:K4)` = Sum of all deduction categories

### Calculation Formulas

**Gross (Column J/9):**
```
SUM(D4,VALUE(E4),VALUE(F4),VALUE(G4))
= Basic Salary + Indirect Additions + Direct Additions + Yearly Increase
```

**Net (Column K/10):**
```
VALUE(D4)+VALUE(G4)+VALUE(H4)-VALUE(I4)
= Basic Salary + Yearly Increase + Bonuses - Deductions
```

**Note:** The Net formula is different from what we might expect. It does NOT use Gross directly.

## Sheet: اضافات (Additions)

### Column Mapping
- Column 0: `#` (Sequence - references مرتبات!A)
- Column 1: `شهر [Month] [Year]` (Month identifier - references مرتبات!B)
- Column 2: `بدلات تليفون / Phone Allowance` (Direct)
- Column 3: `بدلات انتقال / Transportation Allowance` (Direct)
- Column 4: `بدل سكن / Accommodation Allowance` (Direct)
- Column 5: `زيادة سنوية / Yearly Increase` (Direct)
- Column 6: `مكافئات سنوية / Annual Bonus` (Bonus)
- Column 7: `مكافئات شهرية / Monthly Bonus` (Bonus)
- Column 8: `قيمة التأمين الإجتماعي الممنوح / Given Social Insurance` (Indirect)
- Column 9: `ضرائب إداريين/محامين / Taxs` (Indirect)
- Column 10: `قيمة التأمين الصحي الممنوح \ Given Medical Insurance` (Indirect)
- Column 11: `بدلات اخري / Allowances` (Direct - Other Allowances)
- Column 12: `اجمالي إضافات مباشرة / Total Direct Allownces` = `SUM(C4:E4)+L4`
- Column 13: `اجمالي إضافات غير مباشرة / Total InDirect Allownces` = `SUM(I4:K4)`
- Column 14: `اجمالي علاوات / Total Bouns` = `SUM(G4:H4)`
- Column 15: `اجمالي الإضافات / Total Allowances` = `SUM(M4:O4)`

### Categorization
- **Direct Additions (Affect Salary Base):** Columns 2, 3, 4, 5, 11
- **Indirect Additions (Affect Gross Only):** Columns 8, 9, 10
- **Bonuses:** Columns 6, 7

## Sheet: خصومات (Deductions)

### Column Mapping
- Column 0: `#` (Sequence - references مرتبات!A)
- Column 1: `شهر [Month] [Year]` (Month identifier - references مرتبات!B)
- Column 2: `قيمة التأمين الصحي المخصوم / Deducted Medical Insurance` (Gross Deduction)
- Column 3: `ضرائب محامين / Laywers Taxs` (Gross Deduction)
- Column 4: `مسحوبات لبنوك أخرى / Other bank withdrawal` (Salary Deduction)
- Column 5: `مسحوبات/خصم من المرتب/الاتعاب / Loans or Deductions` (Salary Deduction)
- Column 6: `خصومات تليفون / Phone Deduction` (Salary Deduction)
- Column 7: `اجازات غير مدفوعة المرتب / Unpaid Vacation` (Salary Deduction)
- Column 8: `تأخيرات / Late` (Salary Deduction)
- Column 9: `خصومات تسجيل ساعات العمل / Time sheet` (Salary Deduction)
- Column 10: `خصومات اخري/ Other Deductions` (Salary Deduction)
- Column 11: `اجمالي الخصومات / Total Deductions` = `SUM(C4:K4)`

### Categorization
- **Salary Deductions (Deduct from Salary):** Columns 4, 5, 6, 7, 8, 9, 10
- **Gross Deductions (Deduct from Gross Only):** Columns 2, 3

## Parser Implementation Strategy

### 1. Header Detection
- Look for row containing both "الاسماء" and "صافي" or "GROSS"
- Check for column 2 being empty (indicates Oct-Dec structure)
- If column 2 is empty, use shifted indices

### 2. Column Index Detection (Dynamic)
```javascript
// Detect structure type
const hasEmptyColumn2 = headers[2] === '' || !headers[2];

// Base indices
const nameCol = 1; // Always column 1

// Adjust based on structure
const salaryCol = hasEmptyColumn2 ? 3 : 2; // Oct-Dec: 3, Jan-Sep: 2
const indirectCol = hasEmptyColumn2 ? 4 : 3;
const directCol = hasEmptyColumn2 ? 5 : 4;
const yearlyCol = hasEmptyColumn2 ? 6 : 5;
const bonusesCol = hasEmptyColumn2 ? 7 : 6;
const deductionsCol = hasEmptyColumn2 ? 8 : 7;
const grossCol = hasEmptyColumn2 ? 9 : 8;
const netCol = hasEmptyColumn2 ? 10 : 9;
```

### 3. Data Extraction Priority
1. **Primary Source:** Read from `مرتبات` sheet directly
2. **Secondary Source:** If formulas exist, read from referenced sheets
3. **Fallback:** Use calculated values from formulas

### 4. Cross-Sheet Validation
- Verify Indirect Additions match `اضافات!N` (Total Indirect)
- Verify Direct Additions match `اضافات!M` (Total Direct)
- Verify Deductions match `خصومات!L` (Total Deductions)

## Data Quality Notes

1. **"Spare" Rows:** Skip rows where name is "Spare" or "#" or numeric only
2. **"شركاء" Rows:** Header rows in additions/deductions sheets - skip
3. **Empty Columns:** Column 2 is intentionally empty in Oct-Dec (merged cells)
4. **Formula Values:** When reading, prefer formula calculated values over raw cell values

## Month-Specific Variations

| Month | Header Row | Column 2 Status | Notes |
|-------|-----------|-----------------|-------|
| Jan-Sep | 1 or 2 | Empty (merged) | Standard structure |
| Oct-Dec | 2 | Missing | All columns shift right by 1 |

## Recommended Parser Flow

1. **Detect Structure:**
   - Read header row
   - Check if column 2 is empty/missing
   - Determine column offsets

2. **Parse مرتبات Sheet:**
   - Extract employee names (column 1)
   - Extract basic salary (column 2 or 3 based on structure)
   - Extract calculated values (gross, net) from columns 8/9 or 9/10

3. **Parse اضافات Sheet:**
   - Match by employee name
   - Extract direct additions (column M = 12)
   - Extract indirect additions (column N = 13)
   - Extract bonuses (column O = 14)
   - Extract yearly increase (column F = 5)

4. **Parse خصومات Sheet:**
   - Match by employee name
   - Extract total deductions (column L = 11)
   - Extract breakdown by category

5. **Validate & Merge:**
   - Cross-validate totals between sheets
   - Merge all data into single record
   - Store in database

