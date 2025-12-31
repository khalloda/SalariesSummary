# SEPEmployees.xlsx Additional Sheets Import Guide

This document explains how to import data from the Contracts, Personnel, and Resigned sheets in SEPEmployees.xlsx.

## Overview

The SEPEmployees.xlsx workbook contains multiple sheets:
- **AllOffice**: Master employee list (imported via `/api/import/employees`)
- **Contracts**: Contract renewal history
- **Personnel**: HR document checklist
- **Resigned**: Historical records of resigned employees

## Database Schema

### ContractRecord Model
Stores contract renewal history:
- `employeeId` - Link to Employee (optional, can be linked later)
- `employeeName` - Employee name (for matching)
- `employeeCode` - Employee code (for matching)
- `contractDate` - Contract/renewal date
- `contractDuration` - Contract duration (e.g., "Renewal for One Year")
- `comments` - Additional comments

### Employee Model Extensions
- `personnelData` - JSON string containing HR document checklist
- `resignationDate` - Date of resignation
- `resignationReason` - Reason for resignation

## API Endpoints

### Contracts Import

**POST** `/api/import/contracts`

Imports contract records from the Contracts sheet in server's Sheets directory.

**POST** `/api/import/contracts/upload`

Imports contract records from an uploaded SEPEmployees.xlsx file.

**Request:**
```bash
POST http://localhost:3001/api/import/contracts/upload
Content-Type: multipart/form-data

file: SEPEmployees.xlsx
```

**Response:**
```json
{
  "success": true,
  "recordsImported": 229,
  "recordsUpdated": 0,
  "recordsLinked": 180,
  "errors": []
}
```

**Behavior:**
- Creates ContractRecord entries for each contract/renewal
- Attempts to link contracts to employees by employee code or name
- Updates employee's `contractDuration` and `contractRenewalDate` with the latest contract
- Handles dates in various formats (employee codes, dates, etc.)

### Personnel Import

**POST** `/api/import/personnel`

Imports personnel data from the Personnel sheet in server's Sheets directory.

**POST** `/api/import/personnel/upload`

Imports personnel data from an uploaded SEPEmployees.xlsx file.

**Request:**
```bash
POST http://localhost:3001/api/import/personnel/upload
Content-Type: multipart/form-data

file: SEPEmployees.xlsx
```

**Response:**
```json
{
  "success": true,
  "recordsImported": 0,
  "recordsUpdated": 49,
  "errors": []
}
```

**Behavior:**
- Updates existing employees with personnel document checklist
- Stores data as JSON in `personnelData` field
- Matches employees by ID or name
- Includes fields:
  - Criminal Record
  - Military Certificate
  - ID Copy
  - Education Certificate
  - Birth Certificate
  - Recommendation Letter
  - Personal Photos
  - Tax Card
  - Association ID
  - Form 6
  - Laptop/PC/Tablet
  - كعب العمل (Work Stub)
  - تاريخ بداية التأمين (Insurance Start Date)
  - Status

### Resigned Import

**POST** `/api/import/resigned`

Imports resigned employee data from the Resigned sheet in server's Sheets directory.

**POST** `/api/import/resigned/upload`

Imports resigned employee data from an uploaded SEPEmployees.xlsx file.

**Request:**
```bash
POST http://localhost:3001/api/import/resigned/upload
Content-Type: multipart/form-data

file: SEPEmployees.xlsx
```

**Response:**
```json
{
  "success": true,
  "recordsUpdated": 45,
  "recordsNotFound": 12,
  "errors": []
}
```

**Behavior:**
- Updates employee status to "Resigned"
- Sets `resignationDate` if available
- Updates employee category if provided
- Matches employees by ID or name
- Reports employees not found in database

## Usage Examples

### Using cURL

**Import Contracts:**
```bash
curl -X POST http://localhost:3001/api/import/contracts
```

**Import Personnel:**
```bash
curl -X POST http://localhost:3001/api/import/personnel
```

**Import Resigned:**
```bash
curl -X POST http://localhost:3001/api/import/resigned
```

**Import from Uploaded File:**
```bash
curl -X POST http://localhost:3001/api/import/contracts/upload \
  -F "file=@/path/to/SEPEmployees.xlsx"
```

### Using JavaScript/Fetch

```javascript
// Import Contracts
const contractsResponse = await fetch('http://localhost:3001/api/import/contracts', {
  method: 'POST'
});
const contractsResult = await contractsResponse.json();
console.log(contractsResult);

// Import Personnel
const personnelResponse = await fetch('http://localhost:3001/api/import/personnel', {
  method: 'POST'
});
const personnelResult = await personnelResponse.json();
console.log(personnelResult);

// Import Resigned
const resignedResponse = await fetch('http://localhost:3001/api/import/resigned', {
  method: 'POST'
});
const resignedResult = await resignedResponse.json();
console.log(resignedResult);
```

## Import Order Recommendation

For best results, import in this order:

1. **AllOffice** - Import base employee data first
2. **Contracts** - Link contract history to employees
3. **Personnel** - Update employees with HR document checklist
4. **Resigned** - Update status for resigned employees

## Data Matching

All import services attempt to match employees using:
1. **Employee Code** - Primary matching method
2. **Normalized Name** - Secondary matching method

If no match is found:
- **Contracts**: Record is still created but not linked to an employee
- **Personnel**: Error is reported (employee must exist)
- **Resigned**: Record is reported as "not found"

## Error Handling

- Individual row errors don't stop the import process
- All errors are collected and returned in the response
- Detailed logging is provided in the console
- Unmatched records are reported separately

## Notes

- **Contracts**: Can handle dates in various formats and employee identifiers
- **Personnel**: Requires employees to exist in database (import AllOffice first)
- **Resigned**: Updates existing employees, doesn't create new ones
- All services support both server-side file and file upload methods
- Contract records are stored separately to maintain history
- Personnel data is stored as JSON for flexibility

---

**Last Updated**: 2024-12-31

