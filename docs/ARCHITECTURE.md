# Architecture Documentation

## Overview

The Salaries Summary application is a full-stack web application built with a modern tech stack, designed to process Excel salary workbooks and generate comprehensive reports.

## System Architecture

```
┌─────────────────┐
│   React SPA     │  (Port 3000)
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/REST
         │
┌────────▼────────┐
│  Express API    │  (Port 3001)
│   (Backend)     │
└────────┬────────┘
         │
┌────────▼────────┐
│   SQLite DB     │
│   (Prisma ORM)  │
└─────────────────┘
```

## Technology Stack

### Frontend

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **react-i18next**: Internationalization (Arabic/English)
- **React Router**: Client-side routing
- **Axios**: HTTP client

### Backend

- **Express.js**: Web framework
- **TypeScript**: Type safety
- **Prisma**: ORM for database access
- **SQLite**: Database (file-based)
- **SheetJS (xlsx)**: Excel file parsing
- **ExcelJS**: Excel file generation
- **Puppeteer**: PDF generation from HTML

## Project Structure

```
SalariesSummary/
├── apps/
│   ├── api/                    # Backend application
│   │   ├── src/
│   │   │   ├── index.ts       # Express server entry point
│   │   │   ├── routes/        # API route handlers
│   │   │   │   ├── employees.ts
│   │   │   │   ├── exports.ts
│   │   │   │   ├── import.ts
│   │   │   │   └── reports.ts
│   │   │   ├── services/       # Business logic
│   │   │   │   ├── excel-parser.ts    # Excel parsing logic
│   │   │   │   └── import-service.ts  # Import orchestration
│   │   │   ├── scripts/       # Utility scripts
│   │   │   │   └── merge-duplicate-employees.ts
│   │   │   └── utils/         # Utility functions
│   │   │       └── normalize.ts
│   │   └── prisma/            # Database schema and migrations
│   │       ├── schema.prisma
│   │       └── migrations/
│   └── web/                   # Frontend application
│       ├── src/
│       │   ├── pages/          # Page components
│       │   ├── components/    # Reusable components
│       │   ├── api/           # API client config
│       │   └── i18n.ts        # i18n configuration
│       └── vite.config.ts
├── Sheets/                     # Excel workbooks directory
├── docs/                       # Documentation
└── scripts/                    # Utility scripts
```

## Data Flow

### Import Process

1. **User triggers import** via Dashboard UI
2. **API receives request** at `POST /api/import`
3. **Import service**:
   - Scans `./Sheets/` directory for Excel files
   - Parses month/year from filenames
   - For each workbook:
     - Reads Excel file using SheetJS
     - Parses "مرتبات" sheet (main data)
     - Parses "اضافات" sheet (additions)
     - Parses "خصومات" sheet (deductions)
     - Categorizes employees
     - Normalizes employee names
     - Stores in database
4. **Database updates**:
   - Creates/updates Employee records
   - Creates/updates SalaryRecord records
   - Creates ImportLog entries

### Report Generation

1. **User requests report** (e.g., annual report)
2. **API queries database**:
   - Fetches employee data
   - Fetches salary records for specified year
   - Calculates totals and aggregates
3. **Response sent** to frontend
4. **Frontend renders** report in UI
5. **Export options**:
   - PDF: Server generates HTML, Puppeteer converts to PDF
   - CSV: Server generates CSV string
   - XLSX: Server uses ExcelJS to create workbook

## Database Schema

### Employee Model

```prisma
model Employee {
  id            String   @id @default(cuid())
  name          String
  normalizedName String @unique
  category      String?  // Partners/شركاء, Lawyers/محامين, etc.
  employeeCode  String?
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  salaries      SalaryRecord[]
}
```

### SalaryRecord Model

```prisma
model SalaryRecord {
  id                String   @id @default(cuid())
  employeeId        String
  year              Int
  month             Int
  monthName         String
  basicSalary       Float
  directAdditions   Float
  indirectAdditions Float
  yearlyIncrease    Float
  bonuses           Float
  salaryDeductions  Float
  grossDeductions   Float
  gross             Float
  net               Float
  additionsBreakdown String?  // JSON string
  deductionsBreakdown String? // JSON string
  paymentMethod     String?
  accountNumber     String?
  notes             String?
  sourceFile        String
  importedAt        DateTime @default(now())
}
```

## Key Design Decisions

### 1. Monorepo Structure

- Separate `apps/api` and `apps/web` for clear separation of concerns
- Shared scripts and utilities at root level
- Independent deployment capabilities

### 2. SQLite Database

- File-based, no server required
- Perfect for single-user or small team deployments
- Easy backup (just copy the file)
- Prisma provides type-safe access

### 3. Excel Parsing Strategy

- Two-pass parsing:
  1. First pass: Find category boundaries
  2. Second pass: Parse employees and assign categories
- Fixed column indices based on schema analysis
- Handles variations in Excel structure

### 4. Employee Identity Resolution

- Normalized names for matching
- Handles Arabic/English variations
- Removes common prefixes (أ/, د/, etc.) with Unicode-aware regex
- Normalizes whitespace (multiple spaces to single space)
- Stores original name for display
- Merge duplicates feature to consolidate duplicate employees

### 5. Internationalization

- react-i18next for translations
- Dynamic `dir` attribute for RTL/LTR
- Logo placement switches based on language

## Security Considerations

- No authentication currently (single-user application)
- File system access limited to `./Sheets/` directory
- SQLite database file should be protected
- CORS configured for specific origins

## Performance Considerations

- Excel parsing is synchronous (could be optimized with workers)
- Database queries use indexes on common fields
- Frontend uses React hooks for efficient re-renders
- Export generation happens server-side

## Scalability

Current design supports:
- ~1000 employees
- 12 months of data per year
- Multiple years of historical data

For larger scale:
- Consider PostgreSQL instead of SQLite
- Add pagination to employee list
- Implement caching for reports
- Use background jobs for import processing

## Error Handling

- Try-catch blocks around all async operations
- Detailed error logging to console
- User-friendly error messages in UI
- Import errors stored in ImportLog table
- Duplicate employee detection and merging

## Data Quality Features

### Employee Name Normalization

The system uses advanced normalization to prevent duplicate employees:

- Removes Arabic prefixes: `أ/`, `أ/ `, `أ.`, `د/`, `د/ `, `د.`
- Removes Latin prefixes: `A/`, `A.`, `D/`, `D.`
- Normalizes whitespace (multiple spaces/tabs to single space)
- Uses Unicode-aware regex for proper Arabic character handling

### Duplicate Detection and Merging

- Automatic detection of duplicate employees based on normalized names
- Merge script keeps oldest employee and moves all salary records
- Handles conflicts when salary records already exist
- Safe to run multiple times

## Testing Strategy

- Manual testing with sample workbooks
- Schema discovery scripts for validation
- TypeScript for compile-time error checking
- Prisma migrations for schema validation

