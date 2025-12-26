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
- **Clear Database Button**: Removes all imported data (use with caution!)

### Importing Data

1. Click **"Import Now"** button
2. Wait for import to complete (progress shown in alert)
3. Check import status:
   - Success: Shows number of files processed and records imported
   - Errors: Shows list of errors encountered

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

