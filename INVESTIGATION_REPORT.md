# System Breakdown Investigation Report
**Date:** December 27, 2025  
**Issue:** System failing with 500 errors after Annual Bonus Report implementation

## Executive Summary

The system broke due to **two critical issues** introduced during the Annual Bonus Report implementation:

1. **SQLite Incompatibility**: The `available-years` endpoint used `distinct` with `findMany`, which doesn't work reliably with SQLite
2. **Missing Endpoint**: The `/api/reports/annual-bonus` endpoint was never added to the API, causing 404/500 errors

## Root Cause Analysis

### Issue #1: SQLite `distinct` Query Failure

**Location:** `apps/api/src/routes/reports.ts` - `/available-years` endpoint

**Problem:**
```typescript
// BROKEN CODE (doesn't work with SQLite)
const years = await prisma.salaryRecord.findMany({
  select: { year: true },
  distinct: ['year'],  // ❌ This fails with SQLite
  orderBy: { year: 'desc' }
});
```

**Why it broke:**
- Prisma's `distinct` with `findMany` is not fully supported in SQLite
- The query would fail silently or return incorrect results
- This caused 500 errors when the dashboard tried to load available years
- The error cascaded, preventing the API server from starting properly

**Fix Applied:**
```typescript
// FIXED CODE (SQLite compatible)
const salaryYearsData = await prisma.salaryRecord.groupBy({
  by: ['year']  // ✅ Works with SQLite
});
const salaryYears = salaryYearsData.map(r => r.year);
```

### Issue #2: Missing Annual Bonus Endpoint

**Location:** `apps/api/src/routes/reports.ts` - Missing `/annual-bonus` endpoint

**Problem:**
- Frontend (`AnnualBonusReport.tsx`) calls: `GET /api/reports/annual-bonus?year=2025`
- This endpoint **does not exist** in the restored `reports.ts` file
- Result: 404 errors, causing the page to show "No data found"

**Evidence:**
```typescript
// Frontend code (AnnualBonusReport.tsx:39)
axios.get(`${API_BASE_URL}/reports/annual-bonus?year=${year}&includeConsultants=${includeConsultants}`)
```

**Status:** Endpoint needs to be added

## Timeline of Changes

### After "Annual Bonus Report" Request:

1. **Database Schema Changes:**
   - Added `AnnualBonus` model
   - Created migrations for year-agnostic annual increase fields
   - ✅ These changes are correct and should remain

2. **Code Changes:**
   - Modified `bonus-import-service.ts` for dynamic year detection
   - Updated `employees.ts` to use bonus data for annual increases
   - ❌ **Missing:** `/api/reports/annual-bonus` endpoint was never added
   - ❌ **Broken:** `available-years` endpoint used incompatible `distinct` query

3. **Frontend Changes:**
   - Created `AnnualBonusReport.tsx` component
   - ✅ Component is correct, but calls non-existent endpoint

## What Broke the System

### Primary Cause: SQLite Query Incompatibility

The `distinct` query in `available-years` was the **primary breaking point**:

1. Dashboard loads → calls `/api/reports/available-years`
2. Query fails → returns 500 error
3. Frontend can't get years → shows errors
4. User tries to import → calls `/api/import/salaries`
5. If that endpoint also uses broken queries → cascading failures

### Secondary Cause: Missing Endpoint

The missing `/annual-bonus` endpoint caused:
- 404 errors when accessing Annual Bonus Report page
- "No data found" messages
- User confusion about why the feature doesn't work

## Fixes Applied

### ✅ Fix #1: SQLite-Compatible `available-years` Endpoint

**File:** `apps/api/src/routes/reports.ts`

**Change:**
- Replaced `findMany` with `distinct` → `groupBy` approach
- Added support for both `SalaryRecord` and `AnnualBonus` tables
- Added error handling for missing `AnnualBonus` table (backward compatibility)

**Status:** ✅ **FIXED**

### ⚠️ Fix #2: Add Missing `/annual-bonus` Endpoint

**File:** `apps/api/src/routes/reports.ts`

**Required Implementation:**
```typescript
reportsRouter.get('/annual-bonus', async (req, res) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const includeConsultants = req.query.includeConsultants === 'true';
    
    // Fetch AnnualBonus records for the year
    // Calculate totals, category breakdowns, growth ratios
    // Return structured data matching frontend expectations
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

**Status:** ⚠️ **NEEDS TO BE ADDED**

## Recommendations

### Immediate Actions:

1. ✅ **DONE:** Fix `available-years` endpoint (SQLite compatibility)
2. ⚠️ **TODO:** Add `/annual-bonus` endpoint implementation
3. ✅ **DONE:** Regenerate Prisma client
4. ⚠️ **TODO:** Test all endpoints after fixes

### Long-term Improvements:

1. **Add Integration Tests:**
   - Test all Prisma queries with SQLite
   - Verify endpoint existence matches frontend calls
   - Test error handling

2. **Code Review Process:**
   - Verify SQLite compatibility for all Prisma queries
   - Ensure frontend/backend API contracts match
   - Test with empty database (edge cases)

3. **Error Logging:**
   - Add structured logging for API errors
   - Log missing endpoint calls (404s)
   - Monitor query failures

## Files Modified

### Fixed:
- ✅ `apps/api/src/routes/reports.ts` - Fixed `available-years` endpoint

### Needs Work:
- ⚠️ `apps/api/src/routes/reports.ts` - Add `/annual-bonus` endpoint

### Unchanged (Correct):
- ✅ `apps/api/prisma/schema.prisma` - Schema is correct
- ✅ `apps/api/src/services/bonus-import-service.ts` - Service is correct
- ✅ `apps/web/src/pages/AnnualBonusReport.tsx` - Frontend is correct

## Conclusion

**What Broke the System:**
1. **Primary:** SQLite-incompatible `distinct` query in `available-years` endpoint
2. **Secondary:** Missing `/annual-bonus` endpoint that frontend expects

**Root Cause:**
- Lack of SQLite-specific testing for Prisma queries
- Incomplete implementation (endpoint not added)
- No validation that frontend API calls match backend endpoints

**Current Status:**
- ✅ `available-years` endpoint fixed
- ⚠️ `/annual-bonus` endpoint still needs to be implemented
- System should be partially functional after first fix

**Next Steps:**
1. Implement the `/annual-bonus` endpoint
2. Test the complete flow
3. Verify all endpoints work with SQLite

