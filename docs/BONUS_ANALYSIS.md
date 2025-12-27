# Annual Bonus Analysis - Workbook Structure Analysis

## Executive Summary

The bonus workbook (`B&I-With formuals Modified 28 Jan 2025.xlsx`) contains a comprehensive annual bonus calculation system that tracks:
- **Individual employee bonuses** (2023 and 2024, split into two halves)
- **Category-level aggregations** (Partners, Lawyers, Admins, Consultants)
- **Office-wide totals** (with and without Consultants)
- **Year-over-year comparisons** and growth ratios

## Workbook Structure

### Row 2: Headers
Key columns identified:
- **Employee Info**: #, Title, Joining Date
- **Salary Data**: Net 2024, Gross 2024, Net 2025, Gross 2025
- **Calculations**: Manual Increase % (Net2025), Current vs 2025 Salary (Net/Gross)
- **Bonus Columns**:
  - `M`: Bonus 2023
  - `N`: Bonus 2024 1/2 (First half of year)
  - `R`: Bonus 2024 2/2 (Second half of year)
  - `U`: Bonus 2024 Total (N + R)
- **Reflected Metrics**:
  - `O/P`: 1-Reflected in Months basis / % basis (for Bonus 2024 1/2)
  - `S/T`: 2-Reflected in Months basis / % basis (for Bonus 2024 2/2)
  - `V/W`: Reflected in Months basis / % basis (for Bonus 2024 Total)
- **Comparisons**:
  - `Q`: Remaining from 2023 (N - M)
  - `X`: Final 2023 VS 2024 ((N+R) - M)

### Row 23: Sample Employee Data
Example employee record showing:
- Net 2024: 30,375
- Net 2025: 38,000
- Bonus 2023: 45,000
- Bonus 2024 1/2: 30,375 (1.00 Months, 100%)
- Bonus 2024 2/2: 30,375 (1.00 Months, 100%)
- Bonus 2024 Total: 60,750 (2.00 Months, 200%)
- Remaining from 2023: -14,625
- Final 2023 VS 2024: 15,750

### Key Formulas Identified

1. **Gross 2025 Calculation** (Column I):
   ```
   ((F-E)+H)+($H$1*(F-E))
   ```
   Where:
   - F = Gross 2024
   - E = Net 2024
   - H = Net 2025
   - $H$1 = Some multiplier factor

2. **Manual Increase %** (Column G):
   ```
   IFERROR((H-E)/E,"No Ratio")
   ```
   Calculates percentage increase from Net 2024 to Net 2025

3. **Bonus Reflected in Months** (Columns O, S, V):
   ```
   IF(N=0,"No Bonus",TEXT(N/E,"0.00")&" Months")
   ```
   Shows bonus as multiple of monthly salary

4. **Bonus Reflected in %** (Columns P, T, W):
   ```
   IF(N=0,"No Bonus",TEXT((N/E)*100,"0.00")&" %")
   ```
   Shows bonus as percentage of annual salary

5. **Remaining from 2023** (Column Q):
   ```
   N - M
   ```
   Difference between Bonus 2024 1/2 and Bonus 2023

6. **Final 2023 VS 2024** (Column X):
   ```
   (N+R) - M
   ```
   Total bonus change from 2023 to 2024

### Summary Rows

**Row 49: Grand Totals** (All categories)
- Aggregates all employee bonuses
- Uses SUM formulas across category subtotals (E6, E21, E42, E48)

**Row 50: Grand Totals without Consultant**
- Same structure but excludes Consultant category (E48)
- Provides comparison view

**Rows 53-55: Ratios (All)**
- Row 54: Values from Row 49
- Row 55: Growth ratios:
  - Net 2024 → Net 2025: 33.45%
  - Gross 2024 → Gross 2025: 28.52%

**Rows 57-59: Ratios (Without Consultant)**
- Row 58: Values from Row 50
- Row 59: Growth ratios:
  - Net 2024 → Net 2025: 35.07%
  - Gross 2024 → Gross 2025: 29.34%

## Category Structure

The workbook appears to be organized by categories:
- **Partners** (Rows 3-5, subtotal Row 6)
- **Lawyers** (Rows 7-20, subtotal Row 21)
- **Admins** (Rows 22-41, subtotal Row 42)
- **Consultants** (Rows 43-47, subtotal Row 48)

Each category has:
- Individual employee rows
- A subtotal row (SUM formulas)
- Bonus calculations per employee

## Recommendations for System Integration

### 1. Database Schema Extensions

Add new tables/models to track annual bonuses:

```prisma
model AnnualBonus {
  id                String   @id @default(cuid())
  employeeId       String
  employee         Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  
  year             Int      // 2023, 2024, etc.
  
  // Base salary reference
  netSalary        Float    // Net salary for the year (reference point)
  grossSalary      Float    // Gross salary for the year
  
  // Bonus amounts
  bonusAmount      Float    @default(0)  // Total bonus for the year
  bonusFirstHalf   Float?   // Bonus for first half (if split)
  bonusSecondHalf  Float?   // Bonus for second half (if split)
  previousYearBonus Float?  // Bonus from previous year (for comparison)
  
  // Calculated metrics
  reflectedInMonths Float?  // Bonus as multiple of monthly salary
  reflectedInPercent Float? // Bonus as percentage of annual salary
  remainingFromPrevious Float? // Difference from previous year
  
  // Metadata
  notes            String?
  sourceFile       String?
  importedAt       DateTime @default(now())
  
  @@unique([employeeId, year])
  @@index([year])
  @@index([employeeId])
}
```

### 2. API Endpoints

#### Individual Employee Bonus Report
```
GET /api/employees/:id/bonus?year=YYYY
```
Returns:
- Bonus details for the year
- Comparison with previous year
- Reflected metrics (months, percentage)
- Historical bonus trend

#### Category Bonus Report
```
GET /api/reports/bonus-by-category?year=YYYY
```
Returns:
- Total bonuses per category
- Average bonus per category
- Category distribution
- Growth from previous year

#### Office-Wide Bonus Summary
```
GET /api/reports/bonus-summary?year=YYYY&includeConsultants=true
```
Returns:
- Grand totals (with/without Consultants)
- Growth ratios
- Distribution metrics
- Year-over-year comparison

#### Bonus Comparison Report
```
GET /api/reports/bonus-comparison?year1=YYYY&year2=YYYY
```
Returns:
- Side-by-side comparison
- Change metrics
- Growth percentages

### 3. Frontend Pages

#### Individual Employee Bonus Page
- **Path**: `/employees/:id/bonus`
- **Features**:
  - Current year bonus breakdown
  - Historical bonus chart (multi-year)
  - Reflected metrics visualization
  - Comparison with previous year
  - Export to PDF/Excel

#### Annual Bonus Report Page
- **Path**: `/reports/annual-bonus`
- **Features**:
  - Year selector
  - Category breakdown table
  - Office-wide totals (with/without Consultants toggle)
  - Growth ratios visualization
  - Top bonus recipients
  - Distribution charts (pie/bar)
  - Export functionality

#### Bonus Comparison Page
- **Path**: `/reports/bonus-comparison`
- **Features**:
  - Multi-year selection
  - Side-by-side comparison
  - Change metrics
  - Category-level comparison
  - Individual employee comparison (optional)

### 4. Data Import Strategy

#### Option A: Manual Entry Interface
- Create a dedicated import page for annual bonuses
- Allow bulk entry via CSV/Excel upload
- Validate against employee records
- Calculate reflected metrics automatically

#### Option B: Parse from Bonus Workbook
- Extend Excel parser to read the bonus workbook
- Map columns to database fields
- Handle category grouping
- Import summary rows as metadata

#### Recommended: Hybrid Approach
- Support both manual entry and file import
- Provide template Excel file matching workbook structure
- Auto-calculate reflected metrics
- Validate totals against category subtotals

### 5. Calculation Logic

Implement the following formulas in the backend:

```typescript
// Reflected in Months
function calculateReflectedInMonths(bonus: number, netSalary: number): number | null {
  if (netSalary === 0) return null;
  return bonus / netSalary;
}

// Reflected in Percentage
function calculateReflectedInPercent(bonus: number, netSalary: number): number | null {
  if (netSalary === 0) return null;
  return (bonus / netSalary) * 100;
}

// Remaining from Previous Year
function calculateRemainingFromPrevious(
  currentBonus: number, 
  previousBonus: number
): number {
  return currentBonus - previousBonus;
}

// Final Year Comparison
function calculateYearComparison(
  currentTotal: number,
  previousTotal: number
): number {
  return currentTotal - previousTotal;
}

// Growth Ratio
function calculateGrowthRatio(
  current: number,
  previous: number
): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
```

### 6. Reporting Features

#### Consolidated View
- Office-wide totals
- Category subtotals
- Growth ratios
- Distribution percentages

#### Individual View
- Per-employee bonus details
- Historical trends
- Category comparison
- Ranking/percentiles

#### Export Formats
- **PDF**: Formatted report with charts
- **Excel**: Multi-sheet workbook matching original structure
- **CSV**: Tabular data for analysis

### 7. UI/UX Considerations

1. **Bilingual Support**: All bonus-related labels in English/Arabic
2. **RTL Support**: Proper layout for Arabic text
3. **Visualizations**:
   - Bar charts for category comparison
   - Line charts for year-over-year trends
   - Pie charts for distribution
   - Heatmaps for bonus ranges
4. **Interactive Filters**:
   - Year selector
   - Category filter
   - Include/Exclude Consultants toggle
   - Employee search

### 8. Data Validation

- Ensure bonus amounts are non-negative
- Validate totals match category subtotals
- Check reflected metrics are within reasonable ranges
- Verify year-over-year consistency
- Flag anomalies (e.g., negative "Remaining from Previous")

## Implementation Priority

### Phase 1: Core Functionality
1. Database schema extension
2. Basic API endpoints (individual, category, office-wide)
3. Simple frontend page for viewing bonuses

### Phase 2: Advanced Features
1. Bonus comparison reports
2. Historical trend analysis
3. Export functionality

### Phase 3: Enhanced Analytics
1. Predictive analytics
2. Bonus distribution analysis
3. Performance correlation

## Notes

- The workbook uses a split bonus structure (1/2 and 2/2), which should be preserved
- The "Reflected in Months" metric is particularly useful for understanding bonus magnitude
- The exclusion of Consultants in some calculations suggests they may have different bonus structures
- The formula `$H$1` appears to be a multiplier used in Gross 2025 calculation - this should be identified and documented

