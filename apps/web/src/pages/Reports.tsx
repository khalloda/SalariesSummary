import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

export default function Reports() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [quickStats, setQuickStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch available years
    axios.get(`${API_BASE_URL}/reports/available-years`)
      .then(res => {
        const years = res.data.years || [];
        if (years.length > 0) {
          setAvailableYears(years);
          setYear(years[0]); // Set to most recent year
        } else {
          const currentYear = new Date().getFullYear();
          setAvailableYears(Array.from({ length: 10 }, (_, i) => currentYear - i));
        }
      })
      .catch(() => {
        const currentYear = new Date().getFullYear();
        setAvailableYears(Array.from({ length: 10 }, (_, i) => currentYear - i));
      });
  }, []);

  useEffect(() => {
    if (year) {
      setLoading(true);
      axios.get(`${API_BASE_URL}/reports/quick-stats?year=${year}`)
        .then(res => setQuickStats(res.data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [year]);

  const reportCards = [
    {
      title: 'Joiners/Leavers',
      description: 'Employees who joined or left during the year',
      path: '/reports/joiners-leavers',
      icon: '👥',
      color: 'blue'
    },
    {
      title: 'Salary Changes',
      description: 'Track basic salary changes across months',
      path: '/reports/salary-changes',
      icon: '📈',
      color: 'green'
    },
    {
      title: 'Category Totals',
      description: 'Aggregated totals by category',
      path: '/reports/category-totals',
      icon: '📊',
      color: 'purple'
    },
    {
      title: 'Monthly Summary',
      description: 'Monthly totals and trends',
      path: '/reports/monthly-summary',
      icon: '📅',
      color: 'orange'
    },
    {
      title: 'Category Comparison',
      description: 'Compare categories side-by-side',
      path: '/reports/category-comparison',
      icon: '⚖️',
      color: 'indigo'
    },
    {
      title: 'Category Migration',
      description: 'Employees who changed categories',
      path: '/reports/category-migration',
      icon: '🔄',
      color: 'pink'
    },
    {
      title: 'Additions & Deductions',
      description: 'Breakdown of additions and deductions by category',
      path: '/reports/additions-deductions-breakdown',
      icon: '💰',
      color: 'teal'
    },
    {
      title: 'Employee Tenure',
      description: 'Employee tenure and service length analysis',
      path: '/reports/employee-tenure',
      icon: '⏳',
      color: 'amber'
    },
    {
      title: 'Payment Methods',
      description: 'Distribution of payment methods and accounts',
      path: '/reports/payment-method-distribution',
      icon: '💳',
      color: 'cyan'
    },
    {
      title: 'Custom Date Range',
      description: 'Flexible date range analysis with custom metrics',
      path: '/reports/custom-date-range',
      icon: '📆',
      color: 'slate'
    },
    {
      title: 'Bonus & Incentive',
      description: 'Analyze bonuses and yearly increases',
      path: '/reports/bonus-incentive-analysis',
      icon: '🎁',
      color: 'emerald'
    },
    {
      title: 'Year-End Summary',
      description: 'Comprehensive annual summary with growth metrics',
      path: '/reports/year-end-summary',
      icon: '📋',
      color: 'rose'
    },
    {
      title: 'Multi-Year Comparison',
      description: 'Compare multiple years for categories or entire office',
      path: '/reports/multi-year-comparison',
      icon: '📊',
      color: 'violet'
    },
    {
      title: 'Month-to-Month Comparison',
      description: 'Compare any two months for categories or entire office',
      path: '/reports/month-to-month-comparison',
      icon: '📈',
      color: 'fuchsia'
    },
    {
      title: 'Annual Bonus Report',
      description: 'Comprehensive annual bonus analysis by category and office-wide',
      path: '/reports/annual-bonus',
      icon: '🎁',
      color: 'emerald'
    },
    {
      title: 'Bonus Comparison',
      description: 'Compare bonuses between two years',
      path: '/reports/bonus-comparison',
      icon: '📊',
      color: 'teal'
    }
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    green: 'bg-green-50 border-green-200 hover:bg-green-100',
    purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    indigo: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
    pink: 'bg-pink-50 border-pink-200 hover:bg-pink-100',
    teal: 'bg-teal-50 border-teal-200 hover:bg-teal-100',
    amber: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
    cyan: 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100',
    slate: 'bg-slate-50 border-slate-200 hover:bg-slate-100',
    emerald: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
    rose: 'bg-rose-50 border-rose-200 hover:bg-rose-100',
    violet: 'bg-violet-50 border-violet-200 hover:bg-violet-100',
    fuchsia: 'bg-fuchsia-50 border-fuchsia-200 hover:bg-fuchsia-100'
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">{t('reports')}</h2>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="border rounded px-3 py-2"
        >
          {availableYears.length > 0 ? (
            availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))
          ) : (
            Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))
          )}
        </select>
      </div>

      {/* Quick Stats Dashboard */}
      {quickStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Total Employees</div>
            <div className="text-3xl font-bold text-gray-900">{quickStats.totalEmployees}</div>
            <div className="text-xs text-gray-500 mt-1">For {year}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Total Payroll</div>
            <div className="text-3xl font-bold text-green-600">
              {quickStats.totalPayroll.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">Net total for {year}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Average Salary</div>
            <div className="text-3xl font-bold text-blue-600">
              {Math.round(quickStats.averageSalary).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">Per month average</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Categories</div>
            <div className="text-3xl font-bold text-purple-600">
              {Object.keys(quickStats.categoryDistribution || {}).length}
            </div>
            <div className="text-xs text-gray-500 mt-1">Active categories</div>
          </div>
        </div>
      )}

      {/* Category Distribution */}
      {quickStats && quickStats.categoryDistribution && Object.keys(quickStats.categoryDistribution).length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-lg font-semibold mb-4">Category Distribution / توزيع الفئات</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(quickStats.categoryDistribution).map(([category, count]: [string, any]) => (
              <div key={category} className="text-center p-4 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600 mt-1">{category}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCards.map((report, index) => (
          <div
            key={index}
            onClick={() => navigate(`${report.path}?year=${year}`)}
            className={`${colorClasses[report.color]} border-2 rounded-lg p-6 cursor-pointer transition-all shadow-sm hover:shadow-md`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-4xl">{report.icon}</div>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">{report.title}</h3>
            <p className="text-sm text-gray-600">{report.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

