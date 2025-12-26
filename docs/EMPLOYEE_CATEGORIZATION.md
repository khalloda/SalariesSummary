# Employee Categorization

## Overview

The application automatically categorizes employees based on their position in the Excel workbook. This categorization is determined by total rows that separate different employee groups.

## Category Detection Logic

The parser performs a two-pass analysis:

### First Pass: Find Category Boundaries

The parser scans the "مرتبات" sheet to find rows containing:
- `اجمالي الشركاء` (Total Partners)
- `اجمالي المحامين` (Total Lawyers)
- `اجمالي العاملين` (Total Admins)
- `اجمالي المستشارين` (Total Consultants)

These rows mark the boundaries between employee categories.

### Second Pass: Assign Categories

Based on the boundaries found, employees are categorized as:

1. **Partners/شركاء**
   - Position: Between row 3 (header row + 1) and the row containing "اجمالي الشركاء"
   - Example: All employees before the first total row

2. **Lawyers/محامين**
   - Position: Between the row after "اجمالي الشركاء" and the row containing "اجمالي المحامين"
   - Example: Employees between partners and lawyers totals

3. **Admins/عاملين**
   - Position: Between the row after "اجمالي المحامين" and the row containing "اجمالي العاملين"
   - Example: Employees between lawyers and admins totals

4. **Consultants/مستشارين**
   - Position: Between the row after "اجمالي العاملين" and the row containing "اجمالي المستشارين"
   - Example: Employees between admins and consultants totals

## Implementation

```typescript
// First pass: Find boundaries
const categoryBoundaries = {
  partnersEnd: -1,    // "اجمالي الشركاء"
  lawyersEnd: -1,     // "اجمالي المحامين"
  adminsEnd: -1,      // "اجمالي العاملين"
  consultantsEnd: -1  // "اجمالي المستشارين"
};

// Second pass: Assign category
if (categoryBoundaries.partnersEnd > 0 && i < categoryBoundaries.partnersEnd) {
  category = 'Partners/شركاء';
} else if (categoryBoundaries.lawyersEnd > 0 && 
           i >= lawyersStart && i < categoryBoundaries.lawyersEnd) {
  category = 'Lawyers/محامين';
}
// ... etc
```

## Row Filtering

The parser automatically skips:
- Rows with "اجمالي" (total) in column B
- Rows with "Spare" (case-insensitive) in column B
- Empty rows
- Header rows
- Placeholder rows

## Database Storage

Categories are stored in the `Employee` model:

```prisma
model Employee {
  category String?  // Partners/شركاء, Lawyers/محامين, Admins/عاملين, Consultants/مستشارين
}
```

## UI Display

- **Employees Page**: Shows category column with filter dropdown
- **Filter Options**: 
  - All Categories
  - Partners/شركاء
  - Lawyers/محامين
  - Admins/عاملين
  - Consultants/مستشارين

## Edge Cases

1. **Missing Total Rows**: If a total row is missing, employees after the last found boundary may not be categorized
2. **Multiple Total Rows**: Only the first occurrence of each total row is used
3. **Out of Order**: Categories are assigned based on row position, not content

## Future Enhancements

- Manual category override in UI
- Category-based reporting
- Category statistics dashboard
- Export filtered by category

