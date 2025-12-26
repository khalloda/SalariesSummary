# User Guide

## Getting Started

### First Time Setup

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Set Up Database**
   ```bash
   cd apps/api
   pnpm prisma generate
   pnpm prisma migrate dev
   ```

3. **Prepare Excel Files**
   - Place all 12 monthly salary workbooks in `./Sheets/` directory
   - Name them: `01 - Jan Salaries 2025.xlsx`, `02- Feb Salaries 2025.xlsx`, etc.
   - Ensure passwords are removed (or add password to `./Sheets/pass.txt`)

4. **Start Application**
   ```bash
   # From root directory
   pnpm dev
   ```

5. **Access Application**
   - Open browser to `http://localhost:3000`
   - Or `http://salaries.local` if using XAMPP

## Dashboard

The Dashboard is the main entry point of the application.

### Features

- **Import Status**: Shows last import time and record count
- **Import Now Button**: Triggers import of all workbooks
- **Merge Duplicates Button**: Merges duplicate employees based on normalized names
- **Clear Database Button**: Removes all imported data (use with caution!)

### Importing Data

1. Click **"Import Now"** button
2. Wait for import to complete (progress shown in alert)
3. Check import status:
   - Success: Shows number of files processed and records imported
   - Errors: Shows list of errors encountered

### Merging Duplicates

If you notice duplicate employees (e.g., "أ/ أحمد" and "أ/أحمد" appearing as separate employees):

1. Click **"Merge Duplicates"** button
2. Confirm the action
3. The system will:
   - Find all duplicate employees based on normalized names
   - Keep the oldest employee (first created)
   - Move all salary records from duplicates to the kept employee
   - Delete the duplicate employees
4. A summary shows how many duplicates were merged

**Note:** This is safe to run multiple times. It only merges actual duplicates.

### Clearing Data

1. Click **"Clear Database"** button
2. Confirm the action
3. All employees, salary records, and import logs will be deleted

## Employees Page

Browse and search all employees.

### Features

- **Search Bar**: Filter employees by name (case-insensitive)
- **Category Filter**: Filter by employee category
  - All Categories
  - Partners/شركاء
  - Lawyers/محامين
  - Admins/عاملين
  - Consultants/مستشارين
- **Employee Table**:
  - Name: Employee full name
  - Category: Employee category
  - Records: Number of salary records (months) available
  - Actions: "View Annual Report" button

### Viewing Annual Report

1. Find employee in the list
2. Click **"View Annual Report"** button
3. Annual report page opens showing:
   - Month-by-month breakdown
   - Detailed additions and deductions
   - Consolidated totals

## Employee Annual Report Page

Detailed view of an employee's salary data for a specific year.

### Features

- **Year Selector**: Choose year to view
- **Tabs**:
  - **Summary**: Month-by-month overview with totals
  - **Details**: Full breakdown including additions and deductions by category
  - **Charts**: Visual representations (Bar, Pie, Line charts) of various metrics
  - **Multi-Year Comparison**: Compare data across multiple years
  - **Month-to-Month Comparison**: Compare any two specific months
- **Monthly Table**: Shows all 12 months with:
  - Basic Salary
  - Direct Additions
  - Indirect Additions
  - Yearly Increase
  - Bonuses
  - Salary Deductions
  - Total Deduction
  - Gross
  - Net
- **Totals Row**: Sum of all months
- **Export Buttons**:
  - **PDF**: Download formatted PDF report
  - **CSV**: Download CSV file for Excel
  - **XLSX**: Download Excel workbook

### Summary Tab

- Quick overview of monthly data
- Basic Salary, Gross, and Net columns
- Total row at the bottom

### Details Tab

- Complete monthly breakdown
- Additions breakdown by category
- Deductions breakdown by category
- All financial metrics

### Charts Tab

- **Chart Type**: Choose Bar, Pie, or Line chart
- **Metric**: Select which metric to visualize (Basic Salary, Gross, Net, Additions, Deductions, etc.)
- **Monthly Data Chart**: Shows selected metric across all 12 months
- **Additions Pie Chart**: Breakdown of additions by category
- **Deductions Pie Chart**: Breakdown of deductions by category
- **Print Support**: Charts are optimized for printing

### Multi-Year Comparison Tab

Compare an employee's salary data across multiple years.

- **Year-over-Year Totals Chart**: Line chart showing Basic Salary, Gross, and Net trends
- **Monthly Trend Chart**: Line chart showing monthly Basic Salary across all years
- **Year-over-Year Comparison Table**: 
  - Shows totals for each year
  - Two comparison modes:
    - **Selectable Metric**: Choose one metric (Basic Salary, Gross, or Net) to show change and % change
    - **Show All Metrics**: Display change and % change for all three metrics side by side
  - Color-coded changes (green for increases, red for decreases)
- **Year-over-Year Bar Chart**: Bar chart comparing Basic Salary, Gross, and Net across years

### Month-to-Month Comparison Tab

Compare any two specific months from the same or different years.

- **Month Selection**: Choose two months to compare
  - First Month: Select month and year
  - Second Month: Select month and year
- **Comparison Table**:
  - Shows both months side by side
  - Two comparison modes:
    - **Selectable Metric**: Choose one metric to show change and % change
    - **Show All Metrics**: Display change and % change for all three metrics
  - Color-coded changes (green for increases, red for decreases)
- **Example**: Compare January 2024 vs March 2024, or December 2024 vs November 2025

### Exporting Reports

1. Click desired export button (PDF, CSV, or XLSX)
2. File downloads automatically
3. Open file in appropriate application

## Joiners/Leavers Report

View employees who joined or left during the year.

### Features

- **Year Selector**: Choose year to analyze
- **Summary Cards**:
  - Total Joiners
  - Total Leavers
  - Net Change
- **Joiners Table**: Lists employees who joined
  - Employee name
  - Category
  - First month present
- **Leavers Table**: Lists employees who left
  - Employee name
  - Category
  - Last month present

## Salary Changes Report

Track changes in Basic Salary across months.

### Features

- **Year Selector**: Choose year to analyze
- **Changes Table**: Lists all salary changes
  - Employee name
  - Category
  - Month of change
  - Previous Basic Salary
  - New Basic Salary
  - Change amount
- **Grand Total Row**: Sum of all changes

## Category Totals Page

View aggregated totals by employee category.

### Features

- **Year Selector**: Choose year to analyze
- **Category Totals Table**: Shows totals for each category:
  - Partners/شركاء
  - Lawyers/محامين
  - Admins/عاملين
  - Consultants/مستشارين
- **Metrics Displayed**:
  - Employee Count
  - Basic Salary Total
  - Gross Total
  - Net Total
- **Grand Total Row**: Sum across all categories
- **Charts**:
  - **Chart Type**: Choose Bar, Pie, or Line chart
  - **Metric**: Select which metric to visualize
  - Visual representation of category distribution
- **Print Support**: Optimized for printing

## Language Toggle

Switch between Arabic and English.

### Features

- **Toggle Button**: Located in top-right corner
- **Automatic Layout**: 
  - Arabic: RTL layout, logo on right
  - English: LTR layout, logo on left
- **Persistent**: Language preference is saved

## Tips and Best Practices

### Importing Data

- **Before Import**: Ensure all Excel files are properly formatted
- **After Import**: Check Dashboard for any errors
- **Re-importing**: Clear database first if needed

### Searching Employees

- Search is case-insensitive
- Partial matches work (e.g., "أحمد" finds all Ahmeds)
- Combine with category filter for precise results

### Exporting Reports

- **PDF**: Best for printing or sharing
- **CSV**: Best for data analysis in Excel
- **XLSX**: Best for formatted Excel workbooks

### Troubleshooting

- **No Data Showing**: Check if import completed successfully
- **Missing Months**: Verify Excel files are named correctly
- **Wrong Categories**: Check Excel files have proper total rows
- **Export Not Working**: Check browser download settings

## Keyboard Shortcuts

Currently no keyboard shortcuts are implemented. Consider adding in future versions.

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- IE11: Not supported

## Mobile Support

The application is responsive and works on tablets. Mobile phone support is limited due to table complexity.

