# Salaries Summary - Analytics Web Application

A comprehensive web application for analyzing monthly salary workbooks, generating employee-level annual reports, and management reports (joiners/leavers, salary changes).

## Features

- 📊 **Excel Workbook Import**: Automatically imports 12 monthly salary workbooks
- 👥 **Employee Management**: Track employees across months with identity resolution and categorization
- 📈 **Annual Reports**: Detailed month-by-month and consolidated annual reports per employee
- 📋 **Management Reports**:
  - Joiners/Leavers report
  - Salary changes tracking (based on Basic Salary)
- 🌐 **Bilingual UI**: Arabic/English with RTL support
- 📤 **Multiple Export Formats**: PDF, CSV, and XLSX
- 🏷️ **Employee Categories**: Automatic categorization (Partners, Lawyers, Admins, Consultants)
- 🔍 **Advanced Filtering**: Filter employees by category and search by name

## Project Structure

```
SalariesSummary/
├── apps/
│   ├── api/          # Backend API (Express + Prisma + SQLite)
│   └── web/          # Frontend React SPA (Vite + TypeScript)
├── Sheets/           # Excel workbooks directory
├── docs/             # Documentation
├── scripts/          # Utility scripts
└── excel-reader-mcp/ # Excel Reader MCP server
```

## Prerequisites

- Node.js 18+ and pnpm (or npm)
- Excel workbooks in `./Sheets/` directory
- Password file at `./Sheets/pass.txt` (if workbooks are password-protected)

## Installation

1. **Install dependencies**:
```bash
pnpm install
```

2. **Set up the database**:
```bash
cd apps/api
pnpm prisma generate
pnpm prisma migrate dev
```

3. **Start development servers**:
```bash
# From root directory
pnpm dev
```

This will start:
- API server on http://localhost:3001
- Web app on http://localhost:3000

## Usage

### 1. Import Workbooks

1. Place your Excel workbooks in the `./Sheets/` directory with the naming convention:
   - `01 - Jan Salaries 2025.xlsx`
   - `02- Feb Salaries 2025.xlsx`
   - ... (up to 12 months)

2. Ensure `./Sheets/pass.txt` contains the password if workbooks are protected

3. Navigate to the Dashboard and click "Import Now"

4. The system will:
   - Parse all workbooks
   - Categorize employees automatically (Partners, Lawyers, Admins, Consultants)
   - Skip rows with "Spare" or "اجمالي" in column B
   - Store all data in the database

### 2. View Reports

- **Employees**: Browse all employees, filter by category, and view their annual reports
- **Joiners/Leavers**: See employees who joined or left during the year
- **Salary Changes**: Track salary changes across months (Basic Salary only)

### 3. Export Reports

Each report can be exported in:
- **PDF**: Formatted report with proper RTL support
- **CSV**: Tabular data for spreadsheet analysis
- **XLSX**: Excel workbook with multiple sheets

## Excel Workbook Structure

The application expects workbooks with the following sheets:

1. **مرتبات** (Salaries): Main salary sheet with employee data
   - Column B: Employee names
   - Column D: Basic Salary (صافي الاتعاب والمرتبات)
   - Column K: Net value (الصافى بعد الخصم أو الزيادة)
   - Total rows with "اجمالي" are used to determine category boundaries

2. **اضافات** (Additions): All additions/allowances categorized by type
   - Direct additions (affect salary): Phone, Transportation, Accommodation, Other Allowances
   - Indirect additions (affect gross only): Social Insurance, Taxes, Medical Insurance
   - Bonuses: Annual Bonus, Monthly Bonus
   - Yearly Increase

3. **خصومات** (Deductions): All deductions categorized by type
   - Gross deductions: Medical Insurance Deducted, Lawyers Taxes
   - Salary deductions: Bank Withdrawals, Loans, Phone, Unpaid Vacation, Late Arrivals, Time Sheet, Other

4. **Pay Clip (AR)** and **Pay Clip (EN)**: Ignored

See `docs/COMPLETE_SCHEMA_MAPPING.md` for detailed schema documentation.

## Employee Categorization

Employees are automatically categorized based on their position in the workbook:

- **Partners/شركاء**: Between row 3 and "اجمالي الشركاء"
- **Lawyers/محامين**: Between "اجمالي الشركاء" and "اجمالي المحامين"
- **Admins/عاملين**: Between "اجمالي المحامين" and "اجمالي العاملين"
- **Consultants/مستشارين**: Between "اجمالي العاملين" and "اجمالي المستشارين"

Rows with "Spare" or "اجمالي" in column B are automatically skipped.

## Architecture

### Backend (API)

- **Framework**: Express.js
- **Database**: SQLite with Prisma ORM
- **Excel Parsing**: SheetJS (xlsx)
- **PDF Generation**: Puppeteer
- **Excel Export**: ExcelJS

### Frontend (Web)

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **i18n**: react-i18next
- **Routing**: React Router

### Data Pipeline

1. **Ingestion**: Read XLSX files from `./Sheets/`
2. **Normalization**: 
   - Normalize employee names
   - Parse numeric values
   - Extract month/year from filenames
   - Categorize employees
3. **Computation**: Calculate totals and aggregates
4. **Storage**: Persist to SQLite database

## API Endpoints

- `POST /api/import` - Import all workbooks
- `DELETE /api/import/clear` - Clear all imported data
- `GET /api/health` - Health check
- `GET /api/employees` - List all employees (with category)
- `GET /api/employees/:id` - Get employee details
- `GET /api/employees/:id/annual?year=YYYY` - Get annual report
- `GET /api/reports/joiners-leavers?year=YYYY` - Joiners/leavers report
- `GET /api/reports/salary-changes?year=YYYY` - Salary changes report
- `GET /api/exports/employee/:id/annual?year=YYYY&format=pdf|csv|xlsx` - Export report

## Development

### Running Individual Services

```bash
# API only
cd apps/api
pnpm dev

# Web only
cd apps/web
pnpm dev
```

### Database Management

```bash
cd apps/api

# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Open Prisma Studio
pnpm prisma studio
```

### Schema Discovery

To analyze Excel workbook structure:

```bash
pnpm schema-discovery
pnpm deep-analysis
```

This generates detailed workbook analysis in `docs/`.

## Troubleshooting

### Password-Protected Files

If you encounter password-protected file errors:
1. Ensure `./Sheets/pass.txt` contains the correct password
2. Remove passwords from Excel files manually if possible
3. See `docs/PASSWORD_PROTECTED_FILES.md` for details

### Import Errors

- Check that workbooks follow the expected naming convention
- Verify all required sheets (مرتبات, اضافات, خصومات) exist
- Check console logs for specific error messages
- Ensure "Spare" rows are not being imported (they should be skipped)

### RTL/Arabic Display Issues

- Ensure fonts supporting Arabic are installed
- Check browser console for font loading errors
- Verify `dir="rtl"` is set on HTML element when Arabic is selected

## Documentation

- [Architecture Documentation](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Employee Categorization](docs/EMPLOYEE_CATEGORIZATION.md)
- [Data Parsing Logic](docs/DATA_PARSING.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [User Guide](docs/USER_GUIDE.md)
- [XAMPP Setup](docs/XAMPP_SETUP.md)
- [Complete Schema Mapping](docs/COMPLETE_SCHEMA_MAPPING.md)

## Contributing

1. Follow the existing code structure
2. Add TypeScript types for all new code
3. Update documentation for new features
4. Test with sample workbooks before submitting

## License

MIT

## Notes

- Employee identity is resolved by name normalization. If duplicate names exist, manual resolution may be needed.
- The application handles Arabic text and RTL layout throughout.
- Logo placement automatically switches based on language direction (LTR/RTL).
- Net values are read directly from column K in the "مرتبات" sheet, not calculated.
- "Gross Deductions" is displayed as "Total Deduction" in exports.
