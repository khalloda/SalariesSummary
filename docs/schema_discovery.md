# Excel Workbook Schema Discovery

## Overview
This document describes the structure of the monthly salary workbooks based on analysis of sample files (January, June, and December 2025).

## File Naming Convention
- Format: `NN - MonthName Salaries YYYY.xlsx` or `NN- MonthName Salaries YYYY.xlsx`
- Examples:
  - `01 - Jan Salaries 2025.xlsx`
  - `06- June Salaries 2025.xlsx`
  - `12- Dec Salaries 2025.xlsx`
- Month extraction: Parse `NN` (01-12) from filename prefix
- Year extraction: Parse `YYYY` from filename suffix

## Sheet Structure

All workbooks contain the following sheets (consistent across months):
1. **مرتبات** (Salaries) - Main salary sheet
2. **اضافات** (Additions) - All additions/allowances
3. **خصومات** (Deductions) - All deductions
4. **Pay Clip (AR)** - Ignored
5. **Pay Clip (EN)** - Ignored

## Sheet 1: مرتبات (Salaries)

### Structure
- **Header Row**: Row 1 (index 1, after title row)
- **Title Row**: Row 0 contains "كشف الاتعاب والمرتبات عن شهر [Month] [Year]"
- **Data Rows**: Start from row 2

### Column Mapping (Detected from January 2025)

| Column Index | Arabic Header | English Header | Type | Notes |
|-------------|---------------|----------------|------|-------|
| 0 | م | # | Number | Employee number/sequence |
| 1 | الاسماء / Name | Name | String | Employee name (primary identifier) |
| 2 | صافي الاتعاب والمرتبات / Salary | Basic Salary | Number | Base salary amount |
| 3 | إضافات غير مباشرة / In direct additions | Indirect Additions | Number | Additions that affect gross only |
| 4 | إضافات مباشرة / Direct Additions | Direct Additions | Number | Additions that affect salary |
| 5 | زيادة سنوية / Yearly Increase | Yearly Increase | Number | Annual increment |
| 6 | علاوات / Bouns | Bonuses | Number | Bonus amounts |
| 7 | خصومات / Deductions | Deductions | Number | Total deductions |
| 8 | الإجمالي قبل الخصم<br>GROSS | Gross | Number | Total before deductions |
| 9 | الصافى بعد الخصم<br>أو الزيادة<br>NET | Net | Number | Final amount after all calculations |
| 10 | (empty) | - | - | - |
| 11 | طريقة الدفع | Payment Method | String | Payment method |
| 12 | رقم الحساب | Account Number | String | Bank account number |
| 13 | ملحوظات | Notes | String | Additional notes |
| 14 | تحويل/شيك | Transfer/Check | String | Transfer or check indicator |

### Key Observations
- **Employee Identity**: Primary identifier is **Name** (الاسماء / Name column)
- **Basic Salary**: Column 2 (صافي الاتعاب والمرتبات)
- **Gross Calculation**: Column 8 (الإجمالي قبل الخصم / GROSS)
- **Net Calculation**: Column 9 (الصافى بعد الخصم / NET)
- **Additions Categories**:
  - Direct Additions (Column 4): Affect salary base
  - Indirect Additions (Column 3): Affect gross only
- **Deductions**: Column 7 contains total deductions (details in خصومات sheet)

### Calculation Logic (Inferred)
```
Gross = Basic Salary + Direct Additions + Indirect Additions + Yearly Increase + Bonuses
Net = Gross - Deductions
```

## Sheet 2: اضافات (Additions)

### Structure
- **Header Row**: Row 1
- **Title Row**: Row 0 contains "اضافات شهرية"
- **Data Rows**: Start from row 2

### Column Mapping

| Column Index | Arabic Header | English Header | Category | Impact |
|-------------|---------------|----------------|----------|--------|
| 0 | # | # | Identifier | Employee number |
| 1 | شهر [Month] [Year] | Month Year | String | Month identifier |
| 2 | بدلات تليفون / Phone Allowance | Phone Allowance | Number | **Direct** (Add to Salary) |
| 3 | بدلات انتقال / Transportation Allowance | Transportation Allowance | Number | **Direct** (Add to Salary) |
| 4 | بدل سكن / Accommodation Allowance | Accommodation Allowance | Number | **Direct** (Add to Salary) |
| 5 | زيادة سنوية / Yearly Increase | Yearly Increase | Number | **Direct** (Add to Salary) |
| 6 | مكافئات سنوية / Annual Bonus | Annual Bonus | Number | **Direct** (Add to Salary) |
| 7 | مكافئات شهرية / Monthly Bonus | Monthly Bonus | Number | **Direct** (Add to Salary) |
| 8 | قيمة التأمين الإجتماعي الممنوح / Given Social Insurance | Social Insurance (Given) | Number | **Indirect** (Add to Gross Only) |
| 9 | ضرائب إداريين/محامين / Taxs | Taxes | Number | **Indirect** (Add to Gross Only) |
| 10 | قيمة التأمين الصحي الممنوح \ Given Medical Insurance | Medical Insurance (Given) | Number | **Indirect** (Add to Gross Only) |
| 11 | بدلات اخري / Allowances | Other Allowances | Number | **Direct** (Add to Salary) |
| 12 | اجمالي إضافات مباشرة / Total Direct Allownces | Total Direct Allowances | Number | Sum of direct additions |
| 13 | اجمالي إضافات غير مباشرة / Total InDirect Allownces | Total Indirect Allowances | Number | Sum of indirect additions |
| 14 | اجمالي علاوات / Total Bouns | Total Bonuses | Number | Sum of bonuses |
| 15 | اجمالي الإضافات / Total Allowances | Total Allowances | Number | Grand total |
| 16 | ملحوظات | Notes | String | Additional notes |

### Categorization
- **Add to Salary (Direct)**:
  - Phone Allowance (Column 2)
  - Transportation Allowance (Column 3)
  - Accommodation Allowance (Column 4)
  - Yearly Increase (Column 5)
  - Annual Bonus (Column 6)
  - Monthly Bonus (Column 7)
  - Other Allowances (Column 11)

- **Add to Gross Only (Indirect)**:
  - Social Insurance Given (Column 8)
  - Taxes (Column 9)
  - Medical Insurance Given (Column 10)

## Sheet 3: خصومات (Deductions)

### Structure
- **Header Row**: Row 1
- **Title Row**: Row 0 contains "خصومات شهرية"
- **Data Rows**: Start from row 2

### Column Mapping

| Column Index | Arabic Header | English Header | Category | Impact |
|-------------|---------------|----------------|----------|--------|
| 0 | # | # | Identifier | Employee number |
| 1 | شهر [Month] [Year] | Month Year | String | Month identifier |
| 2 | قيمة التأمين الصحي المخصوم / Deducted Medical Insurance | Medical Insurance (Deducted) | Number | **Deduct from Gross Only** |
| 3 | ضرائب محامين / Laywers Taxs | Lawyers Taxes | Number | **Deduct from Gross Only** |
| 4 | مسحوبات لبنوك أخرى / Other bank withdrawal | Other Bank Withdrawal | Number | **Deduct from Salary** |
| 5 | مسحوبات/خصم من المرتب/الاتعاب / Loans or Deductions | Loans/Deductions from Salary | Number | **Deduct from Salary** |
| 6 | خصومات تليفون / Phone Deduction | Phone Deduction | Number | **Deduct from Salary** |
| 7 | اجازات غير مدفوعة المرتب / Unpaid Vacation | Unpaid Vacation | Number | **Deduct from Salary** |
| 8 | تأخيرات / Late | Late Arrivals | Number | **Deduct from Salary** |
| 9 | خصومات تسجيل ساعات العمل / Time sheet | Time Sheet Deductions | Number | **Deduct from Salary** |
| 10 | خصومات اخري/ Other Deductions | Other Deductions | Number | **Deduct from Salary** |
| 11 | اجمالي الخصومات / Total Deductions | Total Deductions | Number | Grand total |
| 12 | ملحوظات | Notes | String | Additional notes |

### Categorization
- **Deduct from Salary**:
  - Other Bank Withdrawal (Column 4)
  - Loans/Deductions from Salary (Column 5)
  - Phone Deduction (Column 6)
  - Unpaid Vacation (Column 7)
  - Late Arrivals (Column 8)
  - Time Sheet Deductions (Column 9)
  - Other Deductions (Column 10)

- **Deduct from Gross Only**:
  - Medical Insurance Deducted (Column 2)
  - Lawyers Taxes (Column 3)

## Data Quality Observations

### Consistency
- ✅ All three analyzed months (Jan, Jun) have the same sheet structure
- ✅ Column headers are consistent across months
- ⚠️ December file is password-protected (requires password from `pass.txt`)

### Data Types
- **Numbers**: Stored as strings in some cases (e.g., "1422", "0")
- **Dates**: Stored in various formats (e.g., "1/1/25", "2024-12-31T21:59:51.000Z")
- **Names**: Arabic text with potential diacritics and formatting variations

### Employee Identity Resolution
- **Primary Key**: Employee Name (الاسماء / Name)
- **Challenges**:
  - Name variations (spacing, diacritics, prefixes like "د/")
  - No explicit employee ID/code detected in analyzed samples
  - Potential duplicates if names are not normalized

### Recommendations for Normalization
1. **Name Normalization**:
   - Remove prefixes (د/, أ/, etc.)
   - Normalize whitespace
   - Remove diacritics for matching
   - Create canonical name mapping

2. **Numeric Normalization**:
   - Convert string numbers to numeric
   - Handle Arabic numerals if present
   - Remove commas from amounts

3. **Month/Year Extraction**:
   - Primary: Parse from filename
   - Fallback: Extract from sheet title rows
   - Validation: Cross-check with date columns

## Password Protection
- Some files (e.g., December 2025) are password-protected
- Password stored in: `./Sheets/pass.txt`
- Password value: `9876540`
- **Action Required**: Implement password handling in Excel reading logic

## Next Steps for Implementation

1. **Parser Implementation**:
   - Handle merged cells and complex header structure
   - Implement password-protected file support
   - Create column mapping based on header text matching

2. **Normalization**:
   - Employee name normalization and deduplication
   - Numeric value parsing and validation
   - Date/month extraction and validation

3. **Validation**:
   - Cross-validate totals between sheets
   - Verify gross/net calculations
   - Flag discrepancies for manual review

4. **Identity Resolution**:
   - Implement name-based matching with fuzzy matching
   - Create identity resolver UI for manual mapping
   - Persist identity mappings in database

