import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
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
import EmployeeDetails from './pages/EmployeeDetails';
import EmployeeDetail from './pages/EmployeeDetail';
import EmployeeManagement from './pages/EmployeeManagement';
import ContractManagement from './pages/ContractManagement';
import SalaryManagement from './pages/SalaryManagement';
import BonusManagement from './pages/BonusManagement';
import BulkSalaryEntry from './pages/BulkSalaryEntry';
import PersonnelDiagnostics from './pages/PersonnelDiagnostics';
import DocumentComplianceReport from './pages/DocumentComplianceReport';
import AssetInventoryReport from './pages/AssetInventoryReport';
import PersonnelStatusDashboard from './pages/PersonnelStatusDashboard';
import NotificationSettings from './pages/NotificationSettings';
import UserManagement from './pages/UserManagement';
import ContractRenewals from './pages/ContractRenewals';
import Login from './pages/Login';
import { RequireAuth, RequireRole } from './hooks/useAuth';

function InnerAppRoutes() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const isLoginRoute = location.pathname === '/login';

  useEffect(() => {
    // Set HTML dir attribute based on language
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);

  if (isLoginRoute) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  return (
    <RequireAuth>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/employees/details" element={<EmployeeDetails />} />
          <Route path="/employees/:id" element={<EmployeeDetail />} />
          <Route path="/employees/:id/annual" element={<EmployeeAnnual />} />
          <Route path="/employees/:id/bonus" element={<EmployeeBonus />} />
          <Route path="/manage/employees" element={<EmployeeManagement />} />
          <Route path="/manage/contracts" element={<ContractManagement />} />
          <Route path="/manage/salaries" element={<SalaryManagement />} />
          <Route path="/manage/bonuses" element={<BonusManagement />} />
          <Route path="/manage/bulk-salary" element={<BulkSalaryEntry />} />
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
          <Route path="/reports/document-compliance" element={<DocumentComplianceReport />} />
          <Route path="/reports/asset-inventory" element={<AssetInventoryReport />} />
          <Route path="/reports/personnel-dashboard" element={<PersonnelStatusDashboard />} />
          <Route path="/reports/contract-renewals" element={<ContractRenewals />} />
          <Route path="/import/bonus" element={<BonusImport />} />
          <Route path="/personnel-diagnostics" element={<PersonnelDiagnostics />} />
          <Route path="/settings/notifications" element={
            <RequireRole allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
              <NotificationSettings />
            </RequireRole>
          } />
          <Route path="/manage/users" element={<UserManagement />} />
        </Routes>
      </Layout>
    </RequireAuth>
  );
}

function App() {
  return (
    <BrowserRouter>
      <InnerAppRoutes />
    </BrowserRouter>
  );
}

export default App;

