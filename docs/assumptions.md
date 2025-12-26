# Assumptions and Design Decisions

This document outlines assumptions made during implementation and design decisions.

## Excel Workbook Structure

### Assumptions
1. **File Naming**: Workbooks follow the pattern `NN - MonthName Salaries YYYY.xlsx` or `NN- MonthName Salaries YYYY.xlsx`
2. **Sheet Names**: All workbooks contain sheets named:
   - `مرتبات` (Salaries)
   - `اضافات` (Additions)
   - `خصومات` (Deductions)
   - `Pay Clip (AR)` and `Pay Clip (EN)` are ignored
3. **Header Row**: Headers are typically in row 1 (index 1), after a title row
4. **Employee Identity**: Primary identifier is employee name (الاسماء / Name column)

### Design Decisions
- **Name Normalization**: Employee names are normalized by:
  - Removing common prefixes (د/, أ/, etc.)
  - Normalizing whitespace
  - Creating a canonical form for matching
- **Numeric Parsing**: Handles both Arabic and Western numerals, removes commas
- **Month/Year Extraction**: Primary method is filename parsing, with fallback to sheet content

## Data Processing

### Assumptions
1. **Additions Categories**:
   - **Direct (Add to Salary)**: Phone, Transportation, Accommodation allowances, Yearly Increase, Bonuses, Other Allowances
   - **Indirect (Add to Gross Only)**: Social Insurance, Taxes, Medical Insurance (given)
2. **Deductions Categories**:
   - **Deduct from Salary**: Bank withdrawals, Loans, Phone deductions, Unpaid vacation, Late arrivals, Time sheet, Other deductions
   - **Deduct from Gross Only**: Medical Insurance (deducted), Lawyers Taxes

### Design Decisions
- **Calculation Logic**: 
  - Gross = Basic Salary + Direct Additions + Indirect Additions + Yearly Increase + Bonuses
  - Net = Gross - Salary Deductions - Gross Deductions
- **Validation**: Cross-validation against workbook totals is logged but doesn't block import
- **Missing Data**: Missing months are flagged but don't prevent report generation

## Employee Identity Resolution

### Assumptions
1. No explicit employee ID/code in analyzed workbooks
2. Employee names may have variations (spacing, diacritics, prefixes)
3. Potential for duplicate names exists

### Design Decisions
- **Primary Strategy**: Name-based matching with normalization
- **Future Enhancement**: Identity Resolver UI for manual mapping of potential duplicates
- **Persistence**: Identity mappings stored in database for stability across imports

## Password Protection

### Assumptions
1. Password is stored in `./Sheets/pass.txt`
2. Some workbooks may be password-protected (e.g., December 2025)

### Design Decisions
- **Current Implementation**: Basic password reading from file
- **Limitation**: Full password-protected file handling may require additional libraries (officecrypto-tool or similar)
- **Error Handling**: Clear error messages when password-protected files are encountered

## UI/UX

### Assumptions
1. Users are comfortable with bilingual interface (Arabic/English)
2. Logo exists at project root (`logo.png`)
3. RTL layout is required for Arabic

### Design Decisions
- **Logo Placement**: 
  - LTR: Top-left
  - RTL: Top-right (via flex-row-reverse)
- **Language Toggle**: Simple button to switch between languages
- **Responsive Design**: Basic responsive layout using Tailwind CSS

## Export Formats

### Assumptions
1. PDF exports need proper RTL support
2. CSV exports should be straightforward tabular data
3. XLSX exports should include multiple sheets for detailed reports

### Design Decisions
- **PDF**: Server-side HTML generation with Puppeteer, includes RTL CSS
- **CSV**: Simple comma-separated format
- **XLSX**: ExcelJS library with proper column widths and formatting

## Database Schema

### Assumptions
1. SQLite is sufficient for this use case
2. Employee data is relatively stable
3. Monthly salary records are the primary data point

### Design Decisions
- **Employee Table**: Stores normalized name for matching
- **SalaryRecord Table**: Stores monthly data with JSON fields for flexible breakdown storage
- **ImportLog Table**: Tracks import history for debugging
- **Unique Constraint**: Employee + Year + Month ensures no duplicates

## Error Handling

### Assumptions
1. Import errors should not stop the entire import process
2. Users need clear feedback on what went wrong

### Design Decisions
- **Partial Success**: Import continues even if individual records fail
- **Error Collection**: All errors are collected and returned in import result
- **Logging**: Import logs stored in database for audit trail

## Performance

### Assumptions
1. Typical dataset: ~100-200 employees, 12 months
2. Import is not a frequent operation
3. Reports are generated on-demand

### Design Decisions
- **Database**: SQLite is sufficient for this scale
- **No Caching**: Reports generated fresh each time (can be optimized later)
- **Chunking**: Excel parsing handles large files with chunking support

## Future Enhancements

### Potential Additions
1. **Identity Resolver UI**: Manual mapping of employee name variations
2. **Department Filtering**: If department data becomes available
3. **Advanced Filtering**: Filter reports by various criteria
4. **Dashboard Analytics**: Visual charts and graphs
5. **Bulk Operations**: Bulk export, bulk import
6. **User Authentication**: If multi-user access is needed
7. **Audit Trail**: Enhanced logging and change tracking

