# Personnel Import Guide

## Overview

The Personnel import process reads the **Personnel** sheet from `SEPEmployees.xlsx` and imports HR document checklist and asset tracking data into the database. This data is stored in the `PersonnelRecord` model, which is linked to each employee.

## How It Works

### 1. **Import Endpoints**

There are two ways to import personnel data:

#### Option A: Server-Side File (Recommended)
- **Endpoint:** `POST /api/import/personnel`
- **Method:** Reads `SEPEmployees.xlsx` from the server's `Sheets/` directory
- **Usage:** No file upload needed, file must already be in the `Sheets/` folder

#### Option B: File Upload
- **Endpoint:** `POST /api/import/personnel/upload`
- **Method:** Uploads `SEPEmployees.xlsx` file from your computer
- **Usage:** Use a form with file input, sends file to server

### 2. **Import Process Flow**

```
1. Read SEPEmployees.xlsx file
   ↓
2. Locate "Personnel" sheet
   ↓
3. Parse headers (row 0)
   ↓
4. For each data row (starting from row 1):
   a. Extract Employee ID/Code (Column A)
   b. Extract Employee Name (Column B)
   c. Parse all document statuses (Columns C-K)
   d. Parse asset information (Column M)
   e. Parse insurance date (Column O)
   f. Parse status (Column P)
   ↓
5. Match employee in database:
   - First try: Match by Employee Code (e.g., "2-21")
   - Fallback: Match by normalized name
   ↓
6. Create or update PersonnelRecord:
   - If record exists: Update all fields
   - If new: Create new PersonnelRecord linked to employee
   ↓
7. Update Employee.status if provided in Personnel sheet
```

### 3. **Data Parsing**

The import service uses specialized parsing functions for different data types:

#### Status Indicators (X, √)
- **Fields:** Criminal Record, ID Copy, Recommendation Letter, Personal Photos, Tax Card, Association ID
- **Parsing:** 
  - `'√'` or `'✓'` → `'Present'` (stored as `true` for boolean fields)
  - `'X'` or `'✗'` → `'Missing'` (stored as `false` for boolean fields)

#### Document Status (Copy, Original, N/A, X)
- **Fields:** Military Certificate, Education Certificate, Birth Certificate
- **Parsing:**
  - `"Copy"` → `'Copy'`
  - `"Original"` → `'Original'`
  - `"N/A"` or `"NA"` → `'N/A'`
  - `'X'` → `'Missing'`

#### Asset Type
- **Field:** Laptop / PC / Tablet (Column M)
- **Parsing:**
  - Contains "Laptop" → `'Laptop'`
  - `"PC"` or contains "Desktop" → `'PC'`
  - Contains "Tablet" → `'Tablet'`
  - `"N/A"` or `"None"` → `'None'`

#### Insurance Start Date
- **Field:** تاريخ بداية التأمين (Column O)
- **Parsing:**
  - `"N/A"` → `null`
  - Date formats supported:
    - `"1-Jan-21"` (DD-Mon-YY format)
    - Standard date strings
    - Excel serial dates

### 4. **Employee Matching**

The import matches employees using a two-step process:

1. **Primary Match (Employee Code):**
   ```typescript
   employee = await prisma.employee.findFirst({
     where: { employeeCode: "2-21" }
   });
   ```

2. **Fallback Match (Normalized Name):**
   ```typescript
   if (!employee) {
     const normalizedName = normalizeEmployeeName("Dr. Hani Salah...");
     employee = await prisma.employee.findUnique({
       where: { normalizedName }
     });
   }
   ```

**Important:** If no match is found, the row is skipped and an error is logged.

### 5. **Data Storage**

All personnel data is stored in the `PersonnelRecord` model:

```prisma
model PersonnelRecord {
  id                    String    @id @default(cuid())
  employeeId            String   @unique
  employee              Employee @relation(...)
  
  // Document Status Fields
  criminalRecord        String?  // 'Present', 'Missing'
  militaryCertificate   String?  // 'Copy', 'Original', 'N/A', 'Missing'
  idCopy                Boolean? @default(true)
  educationCertificate  String?  // 'Copy', 'Original', 'Missing'
  birthCertificate      String?  // 'Copy', 'Original', 'Missing'
  recommendationLetter  Boolean? // true = Present, false = Missing
  personalPhotos        Boolean? // true = Present, false = Missing
  taxCard               Boolean? // true = Present, false = Missing
  associationId         Boolean? // true = Present, false = Missing
  form6                 String?  @default("N/A")
  
  // Asset Fields
  laptopPcTablet        String?  // 'Laptop', 'PC', 'Tablet', 'None'
  
  // Other Fields
  workStub              String?  @default("N/A")
  insuranceStartDate    DateTime?
  
  // Metadata
  importedAt            DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  sourceFile            String?
}
```

### 6. **Import Result**

The import returns a result object:

```typescript
{
  success: boolean;
  recordsImported: number;  // Always 0 (uses upsert)
  recordsUpdated: number;    // Number of records created/updated
  errors: string[];          // Array of error messages
}
```

**Note:** `recordsImported` is always 0 because the service uses `upsert` (update or create), so all operations are counted as "updated".

## How to Use

### Via API (Direct)

```bash
# Using server-side file
curl -X POST http://localhost:3001/api/import/personnel

# Using file upload
curl -X POST http://localhost:3001/api/import/personnel/upload \
  -F "file=@/path/to/SEPEmployees.xlsx"
```

### Via Frontend (Dashboard)

Currently, there is **no UI button** for Personnel import in the Dashboard. You can:

1. **Add it manually** (similar to Contracts Import section)
2. **Use the API directly** via browser console or Postman
3. **Add it to the Dashboard** (we can implement this)

### Prerequisites

1. **Employee data must exist first:**
   - Import the **AllOffice** sheet first (`POST /api/import/employees`)
   - This creates the employee records that Personnel data will link to

2. **File location:**
   - For server-side import: Place `SEPEmployees.xlsx` in the `Sheets/` directory
   - For file upload: Select the file from your computer

3. **Sheet name:**
   - The file must contain a sheet named **"Personnel"** (case-sensitive)

## Column Mapping

| Excel Column | Header | Database Field | Type |
|--------------|--------|---------------|------|
| A | ID | employeeCode (for matching) | String |
| B | Name | employee.name (for matching) | String |
| C | Criminal Record | criminalRecord | String ('Present'/'Missing') |
| D | Military Certificate | militaryCertificate | String ('Copy'/'Original'/'N/A'/'Missing') |
| E | ID Copy | idCopy | Boolean |
| F | Education Certificate | educationCertificate | String ('Copy'/'Original'/'Missing') |
| G | Birth Certificate | birthCertificate | String ('Copy'/'Original'/'Missing') |
| H | Recommendation Letter | recommendationLetter | Boolean |
| I | Personal Photos | personalPhotos | Boolean |
| J | Tax Card | taxCard | Boolean |
| K | Association ID | associationId | Boolean |
| L | Form 6 | form6 | String (default: 'N/A') |
| M | Laptop / PC / Tablet | laptopPcTablet | String ('Laptop'/'PC'/'Tablet'/'None') |
| N | كعب العمل | workStub | String (default: 'N/A') |
| O | تاريخ بداية التأمين | insuranceStartDate | DateTime (nullable) |
| P | Status | employee.status | String ('Active'/'Resigned') |

## Error Handling

### Common Errors

1. **"Employee not found"**
   - **Cause:** Employee ID/Code or Name doesn't match any existing employee
   - **Solution:** Import AllOffice sheet first to create employee records

2. **"Sheet 'Personnel' not found"**
   - **Cause:** The Excel file doesn't have a sheet named "Personnel"
   - **Solution:** Check the sheet name in Excel (must be exactly "Personnel")

3. **"File not found"**
   - **Cause:** For server-side import, file is not in `Sheets/` directory
   - **Solution:** Place `SEPEmployees.xlsx` in the `Sheets/` folder

4. **Parsing errors**
   - **Cause:** Unexpected data format in cells
   - **Solution:** Check the Excel file for invalid data, the import will log which row failed

### Error Logging

All errors are logged with:
- Row number (Excel row, 1-indexed)
- Employee identifier (Code or Name)
- Error message

Example error:
```
Row 5: Employee not found (2-15)
Row 8: Invalid date format in insuranceStartDate
```

## Best Practices

1. **Import Order:**
   ```
   1. Import AllOffice sheet (creates employees)
   2. Import Personnel sheet (links to employees)
   3. Import Contracts sheet (optional)
   4. Import Resigned sheet (optional)
   ```

2. **Re-importing:**
   - Safe to re-import: Uses `upsert`, so existing records are updated
   - No duplicate records: `employeeId` is unique in `PersonnelRecord`

3. **Data Validation:**
   - Check import errors after each import
   - Verify employee matching by checking the import report
   - Review compliance percentages in the Personnel tab

4. **File Updates:**
   - When updating the Personnel sheet, re-import to sync changes
   - The import will update existing records automatically

## Viewing Imported Data

After import, you can view personnel data:

1. **Employee Detail Page:**
   - Navigate to any employee
   - Click the **"Personnel"** tab
   - View document checklist, assets, and compliance summary

2. **API Endpoints:**
   - `GET /api/personnel/:employeeId` - Get personnel record for specific employee
   - `GET /api/personnel/compliance/report` - Document compliance report
   - `GET /api/personnel/assets/report` - Asset inventory report
   - `GET /api/personnel/dashboard` - Overall personnel status dashboard

## Troubleshooting

### No data showing in Personnel tab

1. **Check if import was successful:**
   - Review import response for `recordsUpdated` count
   - Check for errors in the response

2. **Verify employee matching:**
   - Check that Employee Codes match between AllOffice and Personnel sheets
   - Verify employee names are similar (normalization handles minor differences)

3. **Check database:**
   ```sql
   SELECT * FROM PersonnelRecord WHERE employeeId = 'employee-id';
   ```

### Data not updating

1. **Check import response:**
   - Look for `recordsUpdated` count
   - If 0, no records were updated (check matching)

2. **Verify file:**
   - Ensure you're importing the correct file
   - Check that the Personnel sheet has data

3. **Clear and re-import:**
   - Delete PersonnelRecord entries if needed
   - Re-import the file

## Next Steps

To add Personnel import to the Dashboard UI:

1. Add a "Personnel Import" section (similar to Contracts Import)
2. Add file upload option
3. Add import button
4. Display import report

Would you like me to add the Personnel import UI to the Dashboard?

