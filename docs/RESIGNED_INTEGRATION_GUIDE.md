# Resigned Employees Integration Guide

## Overview

This guide explains how to integrate resigned employee data from the "Resigned" sheet in `SEPEmployees.xlsx` into your Employee database.

---

## How to Run the Import

### Option 1: Import from Server Directory (Recommended)

If `SEPEmployees.xlsx` is already in your `Sheets/` directory:

**API Endpoint:**
```
POST /api/import/resigned
```

**Example using curl:**
```bash
curl -X POST http://localhost:3001/api/import/resigned
```

**Example using JavaScript (fetch):**
```javascript
const response = await fetch('http://localhost:3001/api/import/resigned', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
const result = await response.json();
console.log(result);
```

### Option 2: Upload File

Upload the `SEPEmployees.xlsx` file:

**API Endpoint:**
```
POST /api/import/resigned/upload
Content-Type: multipart/form-data
```

**Example using JavaScript (FormData):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]); // fileInput is an <input type="file">

const response = await fetch('http://localhost:3001/api/import/resigned/upload', {
  method: 'POST',
  body: formData
});
const result = await response.json();
console.log(result);
```

### Response Format

```json
{
  "success": true,
  "recordsUpdated": 65,
  "recordsNotFound": 3,
  "errors": []
}
```

---

## Data Integration Mapping

### ✅ Fields That ARE Integrated (Updated in Employee Record)

| Excel Column | Employee Field | When Updated | Notes |
|--------------|----------------|--------------|-------|
| **Date of Resignation** | `resignationDate` | **Always** | **Required field** - Sets employee status to "Resigned" |
| **Classification** | `category` | Always | Updates employee category (Admin, Lawyer, etc.) |
| **Name** | `name` | Never | Used only for matching, not updated |
| **NationalID Number** | `nationalId` | Only if missing | Fills in missing National ID |
| **NationalID Valid till** | `nationalIdValidTill` | Only if missing | Fills in missing expiration date |
| **Job Title** | `jobTitle` | Only if missing | Fills in missing job title |
| **Department/Division** | `department` | Only if missing | Fills in missing department |
| **Date of Birth** | `dateOfBirth` | Only if missing | Fills in missing birth date |
| **Bar Association Number** | `barAssociation` | Only if missing | Fills in missing bar association number |
| **Bar Association Degree** | `barAssociationDegree` | Only if missing | Fills in missing bar association degree |
| **Joining Date** | `joiningDate` | Never | Used only for validation, not updated |

### ❌ Fields That Are NOT Integrated (Ignored)

| Excel Column | Reason |
|--------------|--------|
| **ID** (Column A) | This is Employee Code, but we match by National ID or Name instead |
| **Name** | Used for matching only, not updated (preserves existing name) |

---

## Integration Logic

### 1. Employee Matching

The import service matches employees using this priority:

1. **Primary Match: National ID** (Column 7: "NationalID Number")
   - Searches `Employee.nationalId` field
   - Most reliable unique identifier
   - Handles both number and string formats

2. **Fallback Match: Normalized Name** (Column 3: "Name")
   - Uses `normalizeEmployeeName()` utility
   - Searches `Employee.normalizedName` field
   - Handles Arabic/English name variations

### 2. Data Update Strategy

**Always Updated:**
- `status` → "Resigned"
- `resignationDate` → from "Date of Resignation" column
- `category` → from "Classification" column (if provided)

**Conditionally Updated (Only if Missing):**
- `jobTitle` → from "Job Title" column
- `department` → from "Department/Division" column
- `dateOfBirth` → from "Date of Birth" column
- `nationalId` → from "NationalID Number" column
- `nationalIdValidTill` → from "NationalID Valid till" column
- `barAssociation` → from "Bar Association Number" column
- `barAssociationDegree` → from "Bar Association Degree" column

**Never Updated:**
- `name` → Preserves existing employee name
- `joiningDate` → Used for validation only, not updated

### 3. Validation Rules

- ✅ **Resignation Date Required**: If missing, row is skipped with error
- ✅ **Date Validation**: Resignation date should be after joining date (logs warning if not)
- ✅ **Employee Must Exist**: If no match found, employee is logged as "not found" but import continues

---

## What Happens During Import

### Step-by-Step Process

1. **Read Excel File**
   - Opens `SEPEmployees.xlsx` from `Sheets/` directory or uploaded file
   - Reads "Resigned" sheet
   - Parses headers and data rows

2. **For Each Row:**
   - Extracts employee data (name, National ID, dates, etc.)
   - Attempts to find matching employee in database:
     - First tries National ID match
     - Falls back to name match if National ID not found
   - If employee found:
     - Updates `status` to "Resigned"
     - Sets `resignationDate`
     - Updates `category` if provided
     - Fills in missing fields (job title, department, etc.)
   - If employee not found:
     - Logs as "not found"
     - Continues with next row

3. **Returns Summary:**
   - Number of records updated
   - Number of records not found
   - List of errors (if any)

---

## Fields Not Needed from Resigned Sheet

### Column A: "ID" (Employee Code)
- **Status**: ❌ Not Used
- **Reason**: We match employees by National ID or Name, not by Employee Code
- **Note**: Employee Code may differ from National ID, so we don't use it for matching

### Why These Fields Are Ignored

1. **ID Column (Column A)**: 
   - This appears to be an internal employee code
   - Not reliable for matching (may be different from `employeeCode` in database)
   - We use National ID (Column 7) as the primary identifier instead

2. **Name Column (Column C)**:
   - Used **only for matching**, not for updating
   - Preserves existing employee name in database
   - Prevents overwriting names that may have been corrected or standardized

---

## Integration Best Practices

### 1. Import Order

Recommended import sequence:

1. **First**: Import Employees (`/api/import/employees`)
   - Creates/updates employee records with basic info
   - Ensures employees exist before marking them as resigned

2. **Second**: Import Contracts (`/api/import/contracts`)
   - Links contract records to employees

3. **Third**: Import Personnel (`/api/import/personnel`)
   - Adds personnel file information

4. **Last**: Import Resigned (`/api/import/resigned`)
   - Marks employees as resigned
   - Updates final status

### 2. Handling "Not Found" Employees

If employees appear in the Resigned sheet but aren't found in the database:

**Option A: Import Employees First**
- Run `/api/import/employees` to create employee records
- Then run `/api/import/resigned` to mark them as resigned

**Option B: Manual Review**
- Review the `recordsNotFound` count in the import result
- Manually create employee records if needed
- Re-run the resigned import

### 3. Re-running the Import

The import is **idempotent** - safe to run multiple times:
- If employee is already marked as "Resigned", it will update the resignation date if different
- Missing fields will be filled in on subsequent runs
- No duplicate records are created

---

## Example Integration Workflow

### Complete Import Sequence

```javascript
// 1. Import employees (creates/updates employee records)
const employeesResult = await fetch('/api/import/employees', { method: 'POST' });
console.log('Employees:', await employeesResult.json());

// 2. Import contracts
const contractsResult = await fetch('/api/import/contracts', { method: 'POST' });
console.log('Contracts:', await contractsResult.json());

// 3. Import personnel data
const personnelResult = await fetch('/api/import/personnel', { method: 'POST' });
console.log('Personnel:', await personnelResult.json());

// 4. Import resigned employees (marks them as resigned)
const resignedResult = await fetch('/api/import/resigned', { method: 'POST' });
const resigned = await resignedResult.json();
console.log(`Updated: ${resigned.recordsUpdated}, Not Found: ${resigned.recordsNotFound}`);
```

---

## Troubleshooting

### Issue: "No employees found matching"

**Cause**: Employee doesn't exist in database or matching failed

**Solution**:
1. Check if employee exists: Search by name or National ID in Employees page
2. Verify National ID format matches (spaces, leading zeros)
3. Check name normalization (Arabic/English variations)
4. Import employees first if they don't exist

### Issue: "Resignation date before joining date"

**Cause**: Data error in Excel file

**Solution**:
- Review the Excel file for incorrect dates
- The import will continue but log a warning
- Manually correct the dates if needed

### Issue: "Missing resignation date"

**Cause**: Empty cell in "Date of Resignation" column

**Solution**:
- Fill in the missing dates in Excel
- Re-run the import

---

## Database Schema Reference

### Employee Fields Updated

```typescript
{
  status: 'Resigned',                    // Always updated
  resignationDate: Date,                  // Always updated (from Column 12)
  category: string,                       // Updated if provided (from Column 2)
  jobTitle?: string,                      // Updated if missing (from Column 4)
  department?: string,                     // Updated if missing (from Column 5)
  dateOfBirth?: Date,                     // Updated if missing (from Column 6)
  nationalId?: string,                    // Updated if missing (from Column 7)
  nationalIdValidTill?: Date,             // Updated if missing (from Column 8)
  barAssociation?: string,                // Updated if missing (from Column 9)
  barAssociationDegree?: string           // Updated if missing (from Column 10)
}
```

---

## Summary

### ✅ What IS Integrated:
- Resignation status and date (always)
- Category/Classification (always)
- Missing employee data fields (conditionally)

### ❌ What is NOT Integrated:
- ID/Employee Code column (not used for matching)
- Name (used for matching only, not updated)

### Key Points:
1. Import employees first to ensure they exist
2. Import resigned last to mark final status
3. Safe to re-run (idempotent)
4. Missing fields are filled in automatically
5. Existing data is preserved (only missing fields are updated)

---

## Next Steps

After importing resigned employees:

1. **Verify Results**: Check the import response for `recordsUpdated` and `recordsNotFound`
2. **Review Not Found**: Investigate employees that weren't found
3. **Check Employee Status**: Verify employees are marked as "Resigned" in the Employees page
4. **Filter Reports**: Use status filter to view only Active employees in reports

