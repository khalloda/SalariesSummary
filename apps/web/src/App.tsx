import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeAnnual from './pages/EmployeeAnnual';
import Reports from './pages/Reports';
import JoinersLeavers from './pages/JoinersLeavers';
import SalaryChanges from './pages/SalaryChanges';
import CategoryTotals from './pages/CategoryTotals';
import MonthlySummary from './pages/MonthlySummary';
import CategoryComparison from './pages/CategoryComparison';
import CategoryMigration from './pages/CategoryMigration';
import AdditionsDeductionsBreakdown from './pages/AdditionsDeductionsBreakdown';
import EmployeeTenure from './pages/EmployeeTenure';
import PaymentMethodDistribution from './pages/PaymentMethodDistribution';
import CustomDateRange from './pages/CustomDateRange';
import BonusIncentiveAnalysis from './pages/BonusIncentiveAnalysis';
import YearEndSummary from './pages/YearEndSummary';
import MultiYearComparison from './pages/MultiYearComparison';
import MonthToMonthComparison from './pages/MonthToMonthComparison';
import EmployeeBonus from './pages/EmployeeBonus';
import AnnualBonusReport from './pages/AnnualBonusReport';
import BonusComparison from './pages/BonusComparison';
import BonusImport from './pages/BonusImport';
import EmployeeCard from './pages/EmployeeCard';

function App() {
  const { i18n } = useTranslation();
  
  useEffect(() => {
    // Set HTML dir attribute based on language
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);
  
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/employees/:id/annual" element={<EmployeeAnnual />} />
          <Route path="/employees/:id/bonus" element={<EmployeeBonus />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/category-totals" element={<CategoryTotals />} />
          <Route path="/reports/joiners-leavers" element={<JoinersLeavers />} />
          <Route path="/reports/salary-changes" element={<SalaryChanges />} />
          <Route path="/reports/monthly-summary" element={<MonthlySummary />} />
          <Route path="/reports/category-comparison" element={<CategoryComparison />} />
          <Route path="/reports/category-migration" element={<CategoryMigration />} />
          <Route path="/reports/additions-deductions-breakdown" element={<AdditionsDeductionsBreakdown />} />
          <Route path="/reports/employee-tenure" element={<EmployeeTenure />} />
          <Route path="/reports/payment-method-distribution" element={<PaymentMethodDistribution />} />
          <Route path="/reports/custom-date-range" element={<CustomDateRange />} />
          <Route path="/reports/bonus-incentive-analysis" element={<BonusIncentiveAnalysis />} />
          <Route path="/reports/year-end-summary" element={<YearEndSummary />} />
          <Route path="/reports/multi-year-comparison" element={<MultiYearComparison />} />
          <Route path="/reports/month-to-month-comparison" element={<MonthToMonthComparison />} />
          <Route path="/reports/annual-bonus" element={<AnnualBonusReport />} />
          <Route path="/reports/bonus-comparison" element={<BonusComparison />} />
          <Route path="/reports/employee-card" element={<EmployeeCard />} />
          <Route path="/import/bonus" element={<BonusImport />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

