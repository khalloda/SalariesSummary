# `/api/reports/available-years` Endpoint Explanation

## What This Endpoint Does

The `/api/reports/available-years` endpoint is a **critical system component** that:

1. **Queries the database** to find all years that contain salary or bonus data
2. **Returns a list of available years** (e.g., `[2025, 2024, 2023]`)
3. **Powers year dropdowns** throughout the entire application

## Why It's Called Automatically

### When the Dashboard Loads
```typescript
// Dashboard.tsx, lines 24-43
useEffect(() => {
  // Fetch available years from database
  axios.get(`${API_BASE_URL}/reports/available-years`)
    .then(res => {
      const years = res.data.years || [];
      if (years.length > 0) {
        setAvailableYears(years);
        setYear(years[0]); // Set to most recent year
      }
    })
}, [lastImport]); // Also refreshes after import
```

**This happens:**
- ✅ **Immediately when you open the Dashboard** (component mount)
- ✅ **After every salary import** (to refresh the year list)
- ✅ **On 20+ other pages** that need year selection

## System Significance

### 1. **Year Dropdown Population**
The endpoint populates the year selector dropdown you see on the Dashboard:
```tsx
<select value={year} onChange={...}>
  {availableYears.map(y => (
    <option key={y} value={y}>{y}</option>
  ))}
</select>
```

### 2. **Used Across the Application**
Found in **20+ pages**:
- `Dashboard.tsx`
- `AnnualBonusReport.tsx`
- `EmployeeBonus.tsx`
- `Reports.tsx`
- `CategoryTotals.tsx`
- `JoinersLeavers.tsx`
- `SalaryChanges.tsx`
- And many more...

### 3. **Data-Driven Year Selection**
Instead of hardcoding years, the system dynamically discovers what years have data, ensuring:
- ✅ Only years with actual data are shown
- ✅ The most recent year is automatically selected
- ✅ The list updates after imports

## Why You See Errors in Terminal

The errors appear because:

1. **Dashboard loads** → Calls `/api/reports/available-years`
2. **API server not running** → Connection refused
3. **Vite proxy fails** → Shows `ECONNREFUSED` error

**This is a symptom, not the problem.** The real issue is the API server not starting.

## The Endpoint Implementation

```typescript
// apps/api/src/routes/reports.ts
reportsRouter.get('/available-years', async (req, res) => {
  try {
    // Get years from salary records
    const salaryYearsData = await prisma.salaryRecord.groupBy({
      by: ['year']
    });
    const salaryYears = salaryYearsData.map(r => r.year);
    
    // Get years from bonus records
    let bonusYears: number[] = [];
    try {
      const bonusYearsData = await prisma.annualBonus.groupBy({
        by: ['year']
      });
      bonusYears = bonusYearsData.map(r => r.year);
    } catch (e) {
      // AnnualBonus table might not exist, ignore
    }
    
    // Combine and deduplicate
    const allYears = new Set<number>();
    salaryYears.forEach(year => allYears.add(year));
    bonusYears.forEach(year => allYears.add(year));
    
    const yearList = Array.from(allYears).sort((a, b) => b - a);
    res.json({ years: yearList });
  } catch (error: any) {
    console.error('Error fetching available years:', error);
    res.status(500).json({ error: error.message });
  }
});
```

## Summary

**This endpoint is:**
- ✅ **Essential** - Powers year selection across the app
- ✅ **Automatically called** - Runs on Dashboard load
- ✅ **Data-driven** - Dynamically discovers available years
- ✅ **Frequently used** - Called by 20+ pages

**The errors you see are because the API server isn't starting, not because the endpoint is problematic.**

---

**To fix the errors:** Ensure the API server starts successfully when running `npm run dev`.

