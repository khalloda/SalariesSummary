# Resigned Import with Candidate Selection - Implementation Summary

## Overview

The resigned import feature has been enhanced to automatically detect employees in the "Resigned" sheet that don't exist in the system and allow you to selectively create them.

---

## What Was Implemented

### 1. Backend Changes

#### Updated `apps/api/src/services/resigned-import-service.ts`:
- ✅ Added `CandidateEmployee` interface
- ✅ Updated `ResignedImportResult` to include `candidates` array
- ✅ Modified import logic to collect candidate employees (those not found) instead of just counting them
- ✅ Each candidate includes all available data from the Resigned sheet

#### New API Endpoint `apps/api/src/routes/import.ts`:
- ✅ `POST /api/import/resigned/create-candidates`
- ✅ Accepts array of candidate employees to create
- ✅ Creates new employee records with "Resigned" status
- ✅ Handles cases where employee was created between import and creation (updates instead)

### 2. Frontend Changes

#### New Component `apps/web/src/components/CandidateSelectionModal.tsx`:
- ✅ Modal dialog showing all candidate employees
- ✅ Checkbox selection for each candidate
- ✅ "Select All" / "Deselect All" functionality
- ✅ Table view with employee details (Name, National ID, Classification, Job Title, Department, Resignation Date)
- ✅ "Create Selected" button to create chosen employees
- ✅ Bilingual support (English/Arabic)

#### Updated `apps/web/src/pages/Dashboard.tsx`:
- ✅ Added resigned import section with file upload option
- ✅ Integrated candidate selection modal
- ✅ Shows import report with candidates count
- ✅ Handles candidate creation completion

#### Updated `apps/web/src/i18n.ts`:
- ✅ Added all necessary translation keys for resigned import
- ✅ English and Arabic translations

---

## How It Works

### Step 1: Import Resigned Employees

1. Go to Dashboard
2. Scroll to "Import Resigned Employees" section
3. Choose to upload file or use server directory
4. Click "Import Resigned"

### Step 2: Review Candidates (If Any)

If employees are found in the Resigned sheet but don't exist in the system:

1. **Modal automatically opens** showing all candidates
2. **Review each candidate**:
   - Name
   - National ID
   - Classification
   - Job Title
   - Department
   - Resignation Date
3. **Select which to create**:
   - Use checkboxes for individual selection
   - Or use "Select All" / "Deselect All"
4. **Click "Create Selected"** to create chosen employees

### Step 3: Completion

- Selected employees are created with "Resigned" status
- Import report is updated with new counts
- Success message shows how many were created

---

## API Endpoints

### 1. Import Resigned (Returns Candidates)
```
POST /api/import/resigned
POST /api/import/resigned/upload
```

**Response:**
```json
{
  "success": true,
  "recordsUpdated": 65,
  "recordsNotFound": 3,
  "errors": [],
  "candidates": [
    {
      "rowIndex": 5,
      "name": "John Doe",
      "nationalId": "12345678901234",
      "classification": "Lawyer",
      "jobTitle": "Associate",
      "department": "Legal",
      "dateOfBirth": "1990-01-15T00:00:00.000Z",
      "resignationDate": "2023-12-31T00:00:00.000Z",
      ...
    }
  ]
}
```

### 2. Create Selected Candidates
```
POST /api/import/resigned/create-candidates
```

**Request Body:**
```json
{
  "candidates": [
    {
      "rowIndex": 5,
      "name": "John Doe",
      "nationalId": "12345678901234",
      ...
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "created": 2,
  "skipped": 1,
  "errors": []
}
```

---

## User Experience Flow

```
1. User clicks "Import Resigned"
   ↓
2. Import runs and finds employees
   ↓
3. If candidates found:
   → Modal opens automatically
   → User reviews candidates
   → User selects which to create
   → User clicks "Create Selected"
   → Selected employees created
   → Success message shown
   ↓
4. If no candidates:
   → Success message shown directly
   → Import report available
```

---

## Features

### ✅ Automatic Detection
- Detects employees in Resigned sheet not in system
- Collects all available data for each candidate

### ✅ User Control
- You choose which candidates to create
- You can skip candidates you don't want
- Select all or individual selection

### ✅ Complete Data
- All available fields from Resigned sheet are preserved
- Employees created with full information
- Status automatically set to "Resigned"

### ✅ Error Handling
- Validates required fields (name, resignation date)
- Handles duplicate creation attempts
- Shows clear error messages

### ✅ Bilingual Support
- All UI text in English and Arabic
- Consistent with rest of application

---

## What Happens to Each Candidate

### If You Select to Create:
- ✅ New employee record created
- ✅ Status set to "Resigned"
- ✅ All available data populated
- ✅ Resignation date set

### If You Skip:
- ✅ No record created
- ✅ Counted in "recordsNotFound"
- ✅ Can be imported again later if needed

---

## Example Scenario

**Resigned Sheet Contains:**
- 70 employees total
- 65 exist in system → Updated to "Resigned"
- 5 don't exist → Shown as candidates

**You Select:**
- 3 candidates to create
- 2 candidates to skip

**Result:**
- 3 new employees created with "Resigned" status
- 2 remain as "not found" (can be handled later)
- Total: 68 employees now marked as resigned

---

## Technical Details

### Candidate Data Structure
```typescript
interface CandidateEmployee {
  rowIndex: number;              // Excel row number
  name: string;                   // Required
  nationalId?: string | null;
  classification?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  dateOfBirth?: Date | null;
  nationalIdValidTill?: Date | null;
  barAssociation?: string | null;
  barAssociationDegree?: string | null;
  joiningDate?: Date | null;
  resignationDate: Date;          // Required
}
```

### Matching Logic
1. **Primary**: National ID match
2. **Fallback**: Normalized name match
3. **If no match**: Added to candidates array

### Creation Logic
1. Validates name and resignation date
2. Checks if employee was created between import and creation (updates if exists)
3. Creates new employee with all provided data
4. Sets status to "Resigned"

---

## Benefits

1. **No Data Loss**: All employees from Resigned sheet are accounted for
2. **User Control**: You decide which to create
3. **Complete Records**: Full employee data preserved
4. **Flexible**: Can skip and handle later if needed
5. **Safe**: Validates data before creation
6. **Transparent**: Clear feedback on what's happening

---

## Testing Checklist

- [ ] Import with no candidates (all employees exist)
- [ ] Import with candidates (some employees don't exist)
- [ ] Select all candidates and create
- [ ] Select some candidates and create
- [ ] Skip all candidates
- [ ] Create candidates, then re-import (should update instead of create)
- [ ] Test with missing required fields (name or resignation date)
- [ ] Test file upload vs server directory
- [ ] Test bilingual UI (English/Arabic)

---

## Future Enhancements (Optional)

1. **Bulk Actions**: Select by classification, department, etc.
2. **Preview**: Show what data will be created before confirming
3. **Search/Filter**: Filter candidates in modal
4. **Export Candidates**: Export candidates list for review
5. **Auto-Create Rules**: Rules for automatically creating certain candidates

---

## Summary

The implementation provides a complete solution for handling employees in the Resigned sheet that don't exist in the system. You're notified of all candidates, can review their details, and selectively choose which ones to create, giving you full control over the process while ensuring no data is lost.

