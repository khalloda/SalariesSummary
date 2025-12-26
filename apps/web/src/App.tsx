import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeAnnual from './pages/EmployeeAnnual';
import JoinersLeavers from './pages/JoinersLeavers';
import SalaryChanges from './pages/SalaryChanges';
import CategoryTotals from './pages/CategoryTotals';

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
          <Route path="/reports/category-totals" element={<CategoryTotals />} />
          <Route path="/reports/joiners-leavers" element={<JoinersLeavers />} />
          <Route path="/reports/salary-changes" element={<SalaryChanges />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

