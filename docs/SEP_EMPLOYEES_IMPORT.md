# SEP Employees Import Guide

This document explains how to import employee data from `SEPEmployees.xlsx` into the SalariesSummary database.

## Overview

The `SEPEmployees.xlsx` file contains comprehensive employee information in the "AllOffice" sheet. This import functionality allows you to import all employee data fields into the database, which can then be displayed and manipulated in the frontend.

## Database Schema

The `Employee` model has been extended to include all fields from SEPEmployees.xlsx:

### Basic Information
- `name` - Employee name (English)
- `nameArabic` - الاسم بالعربية (Arabic name)
- `employeeCode` - Employee ID
- `category` - Category (Partner, Lawyer, Admin)
- `jobTitle` - Job Title
- `department` - Department

### Dates
- `dateOfBirth` - Date of Birth
- `joiningDate` - Joining Date

### Education
- `graduationCertificate` - Certificate type (Ph.D., Masters, Bachelor, etc.)
- `graduationSection` - Section (International Business Law, Private Law, etc.)
- `graduationUniversity` - University / School
- `graduationYear` - Graduation Year

### Identification Numbers
- `socialInsurance` - Social Insurance Number
- `barAssociation` - Bar Association Number
- `barAssociationValidTill` - Bar Association Valid Till date
- `barAssociationDegree` - درجة القيد (Bar Association Degree)
- `taxCard` - Tax Card Number

### Contact Information
- `address` - Address Details
- `addressRegion` - Region / City
- `addressGovernorate` - Governorate
- `extension` - Extension
- `mobileNumber` - Mobile Number

### Employment Details
- `contractType` - Contract Type
- `contractDuration` - Contract Duration
- `contractRenewalDate` - Date of Renewal
- `status` - Status (Active, Resigned)

### Experience
- `experienceInYears` - Experience In - Years
- `experienceInMonths` - Experience In - Months
- `experienceOutYears` - Experience Out - Years
- `experienceOutMonths` - Experience Out - Months

## API Endpoints

### 1. Import from Server Directory

**POST** `/api/import/employees`

Imports employees from `SEPEmployees.xlsx` in the server's `Sheets` directory.

**Request:**
```bash
POST http://localhost:3001/api/import/employees
```

**Response:**
```json
{
  "success": true,
  "recordsImported": 25,
  "recordsUpdated": 25,
  "errors": []
}
```

### 2. Import from Uploaded File

**POST** `/api/import/employees/upload`

Imports employees from an uploaded `SEPEmployees.xlsx` file.

**Request:**
```bash
POST http://localhost:3001/api/import/employees/upload
Content-Type: multipart/form-data

file: SEPEmployees.xlsx
```

**Response:**
```json
{
  "success": true,
  "recordsImported": 25,
  "recordsUpdated": 25,
  "errors": []
}
```

## Import Behavior

### Employee Matching

The import service matches employees using:
1. **Normalized Name** - Primary matching method (normalized English or Arabic name)
2. **Employee Code** - Secondary matching method (if normalized name doesn't match)

### Update vs Create

- **Update**: If an employee with the same normalized name or employee code exists, their record is updated with the new data
- **Create**: If no matching employee is found, a new employee record is created

### Data Validation

- Empty values (`null`, `undefined`, empty strings, `-`, `N/A`) are stored as `null` in the database
- Dates are parsed from various formats (Excel serial dates, MM/DD/YY, ISO strings)
- Numeric values are parsed and validated
- Text values are trimmed and cleaned

## Usage Examples

### Using cURL

**Import from server directory:**
```bash
curl -X POST http://localhost:3001/api/import/employees
```

**Import from uploaded file:**
```bash
curl -X POST http://localhost:3001/api/import/employees/upload \
  -F "file=@/path/to/SEPEmployees.xlsx"
```

### Using JavaScript/Fetch

```javascript
// Import from server directory
const response = await fetch('http://localhost:3001/api/import/employees', {
  method: 'POST'
});
const result = await response.json();
console.log(result);

// Import from uploaded file
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:3001/api/import/employees/upload', {
  method: 'POST',
  body: formData
});
const result = await response.json();
console.log(result);
```

## Error Handling

The import service handles errors gracefully:

- **File Not Found**: Returns error if file doesn't exist
- **Sheet Not Found**: Returns error if "AllOffice" sheet is missing
- **Row-Level Errors**: Individual row errors are collected and returned without stopping the import
- **Database Errors**: Database connection and query errors are caught and reported

## Import Logging

The import service provides detailed console logging:

```
============================================================
Importing SEPEmployees.xlsx from: D:\...\Sheets\SEPEmployees.xlsx
============================================================
Found 20 main headers
Processing 50 data rows...

Column mapping:
  ID: Column A (0)
  Category: Column B (1)
  Name in English: Column C (2)
  ...

  ✅ Created: Dr. Hani Salah Mohamed Sarie Eldin (1-1)
  ✅ Updated: Ms. Amira Mohamed Ali Sherif (1-2)
  ...

============================================================
Import Summary:
  Created: 25
  Updated: 25
  Errors: 0
============================================================
```

## Next Steps

After importing employees:

1. **View Employees**: Use the `/api/employees` endpoint to retrieve employee data
2. **Frontend Display**: Create or update frontend components to display employee information
3. **Filtering & Search**: Implement filtering by category, department, status, etc.
4. **Reports**: Use employee data in reports and analytics

## Notes

- The import service preserves existing employee records and updates them with new data
- All fields are optional - missing data is stored as `null`
- The service handles the two-level header structure in the Excel file (main headers + sub-headers)
- Date parsing supports multiple formats for maximum compatibility
- The service is idempotent - running it multiple times will update existing records rather than creating duplicates

---

**Last Updated**: 2024-12-31

