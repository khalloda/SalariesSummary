import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      title: 'Salaries Summary',
      dashboard: 'Dashboard',
      employees: 'Employees',
      reports: 'Reports',
      import: 'Import',
      categoryTotals: 'Category Totals',
      joinersLeavers: 'Joiners & Leavers',
      salaryChanges: 'Salary Changes',
      employeeAnnual: 'Employee Annual Report',
      language: 'Language',
      lastImported: 'Last Imported',
      importNow: 'Import Now',
      year: 'Year',
      selectYear: 'Select Year',
      name: 'Name',
      basicSalary: 'Basic Salary',
      gross: 'Gross',
      net: 'Net',
      month: 'Month',
      export: 'Export',
      exportPDF: 'Export PDF',
      exportCSV: 'Export CSV',
      exportXLSX: 'Export XLSX'
    }
  },
  ar: {
    translation: {
      title: 'ملخص الرواتب',
      dashboard: 'لوحة التحكم',
      employees: 'الموظفين',
      reports: 'التقارير',
      import: 'استيراد',
      categoryTotals: 'إجمالي الفئات',
      joinersLeavers: 'الموظفين الجدد والمغادرين',
      salaryChanges: 'تغييرات الرواتب',
      employeeAnnual: 'التقرير السنوي للموظف',
      language: 'اللغة',
      lastImported: 'آخر استيراد',
      importNow: 'استيراد الآن',
      year: 'السنة',
      selectYear: 'اختر السنة',
      name: 'الاسم',
      basicSalary: 'الراتب الأساسي',
      gross: 'الإجمالي',
      net: 'الصافي',
      month: 'الشهر',
      export: 'تصدير',
      exportPDF: 'تصدير PDF',
      exportCSV: 'تصدير CSV',
      exportXLSX: 'تصدير XLSX'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

