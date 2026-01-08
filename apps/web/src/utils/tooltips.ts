/**
 * Centralized tooltip messages for the application
 * This file contains all tooltip text to ensure consistency
 */

export const tooltips = {
  // Dashboard
  dashboard: {
    importSalaries: 'Import monthly salary workbooks (XLSX files) from the Sheets directory or upload files directly',
    importEmployees: 'Import employee data from SEPEmployees.xlsx (AllOffice sheet)',
    importContracts: 'Import contract renewal data from SEPEmployees.xlsx (Contracts sheet)',
    importPersonnel: 'Import personnel document checklist from SEPEmployees.xlsx (Personnel sheet)',
    clearData: 'Clear all salary records from the database. This action cannot be undone!',
    mergeDuplicates: 'Automatically merge duplicate employees based on normalized names',
    yearSelector: 'Select the year to view data for',
    fileUpload: 'Upload files directly from your computer',
    serverFiles: 'Use files from the server\'s Sheets directory',
    viewImportReport: 'View detailed import results including errors and warnings',
    runDiagnostics: 'Compare Personnel sheet data with AllOffice sheet to find missing employees',
  },
  
  // Management Pages
  management: {
    create: 'Create a new record',
    edit: 'Edit this record',
    delete: 'Delete this record. This action cannot be undone!',
    save: 'Save changes',
    cancel: 'Cancel and discard changes',
    search: 'Search records by name or code',
    filter: 'Filter records by category or status',
    export: 'Export data to CSV, XLSX, or PDF',
    print: 'Print the current view',
  },
  
  // Employee Fields
  employee: {
    name: 'Full name of the employee in English',
    nameArabic: 'Full name of the employee in Arabic',
    employeeCode: 'Unique employee identifier (format: X-Y, e.g., 2-21)',
    category: 'Employee category: Partner, Lawyer, Admin, or Consultant',
    department: 'Department within the organization',
    jobTitle: 'Job title or position',
    joiningDate: 'Date when the employee joined the organization',
    dateOfBirth: 'Employee\'s date of birth',
    mobileNumber: 'Contact mobile phone number',
    address: 'Full address details',
    addressRegion: 'City or region',
    addressGovernorate: 'Governorate or state',
    nationalId: 'National ID number (14 digits)',
    nationalIdValidTill: 'Expiration date of the National ID',
    barAssociation: 'Bar Association registration number',
    barAssociationDegree: 'Bar Association degree (e.g., ابتدائي)',
    taxCard: 'Tax card number',
    socialInsurance: 'Social insurance number',
    graduationCertificate: 'Highest education certificate (Ph.D., Masters, Bachelor, etc.)',
    graduationSection: 'Field of study (e.g., International Business Law)',
    graduationUniversity: 'University or school name',
    graduationYear: 'Year of graduation',
    contractType: 'Type of employment contract',
    contractRenewalDate: 'Next contract renewal date',
    status: 'Current employment status (Active or Resigned)',
  },
  
  // Personnel Fields
  personnel: {
    criminalRecord: 'Status of criminal background check document',
    militaryCertificate: 'Status of military service certificate (Copy, Original, N/A, or Missing)',
    idCopy: 'Whether a copy of National ID is present',
    educationCertificate: 'Status of education certificate (Copy, Original, or Missing)',
    birthCertificate: 'Status of birth certificate (Copy, Original, or Missing)',
    recommendationLetter: 'Whether recommendation letter is present',
    personalPhotos: 'Whether personal photos are submitted',
    taxCard: 'Whether tax card is present (Required for Partners and Lawyers only)',
    associationId: 'Whether Bar Association ID is present (Required for Partners and Lawyers only)',
    form6: 'Status of Form 6 document',
    laptopPcTablet: 'Company-provided computing device (Laptop, PC, or Tablet)',
    workStub: 'Status of work stub document',
    insuranceStartDate: 'Date when social insurance coverage started',
  },
  
  // Salary Fields
  salary: {
    basicSalary: 'Base salary amount before additions and deductions',
    directAdditions: 'Additions that affect the salary calculation',
    indirectAdditions: 'Additions that affect gross only (insurance, taxes)',
    bonuses: 'Monthly and annual bonuses',
    yearlyIncrease: 'Yearly salary increase amount',
    salaryDeductions: 'Deductions from salary (loans, withdrawals, etc.)',
    grossDeductions: 'Deductions from gross (medical insurance, taxes)',
    gross: 'Total salary before deductions (Basic + All Additions)',
    net: 'Final salary after all deductions (Gross - All Deductions)',
  },
  
  // Contract Fields
  contract: {
    contractDate: 'Date when the contract was signed or renewed',
    fromDate: 'Contract start date',
    toDate: 'Contract end date',
    notes: 'Additional notes about the contract',
  },
  
  // Bonus Fields
  bonus: {
    bonusAmount: 'Total annual bonus amount',
    bonusFirstHalf: 'First half of the annual bonus',
    bonusSecondHalf: 'Second half of the annual bonus',
    previousYearNet: 'Average net salary from previous year',
    currentYearNet: 'Average net salary for current year',
    annualIncreaseNet: 'Annual salary increase (net)',
    annualIncreaseGross: 'Annual salary increase (gross)',
    reflectedInMonths: 'Number of months the increase is reflected in',
    reflectedInPercent: 'Percentage of the increase reflected',
  },
  
  // Reports
  reports: {
    filterByCategory: 'Filter results by employee category',
    filterByYear: 'Filter results by year',
    filterByMonth: 'Filter results by month',
    minCompliance: 'Minimum compliance percentage to display',
    assetType: 'Filter by asset type (Laptop, PC, Tablet, or None)',
    exportPDF: 'Export report as PDF document',
    exportXLSX: 'Export report as Excel workbook',
    exportCSV: 'Export report as CSV file',
    print: 'Print the current report',
  },
  
  // Navigation
  navigation: {
    '/': 'Go to the main dashboard',
    '/employees': 'View all employees',
    '/reports': 'View all available reports',
    '/manage/employees': 'Manage employees, contracts, salaries, and bonuses',
  },
  
  // Common Actions
  common: {
    search: 'Search by typing employee name or code',
    filter: 'Apply filters to narrow down results',
    sort: 'Click to sort by this column',
    viewDetails: 'View detailed information',
    edit: 'Edit this item',
    delete: 'Delete this item',
    save: 'Save changes',
    cancel: 'Cancel operation',
    close: 'Close this dialog',
    export: 'Export data',
    print: 'Print current view',
    refresh: 'Refresh data',
    clear: 'Clear all filters',
  },
};

