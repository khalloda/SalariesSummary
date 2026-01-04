import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function EmployeeTenure() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [sortBy, setSortBy] = useState<'tenure' | 'name'>('tenure');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/reports/available-years`)
      .then(res => {
        const years = res.data.years || [];
        if (years.length > 0) {
          setAvailableYears(years);
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
    axios.get(`${API_BASE_URL}/reports/employee-tenure?year=${year}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [year]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data found</div>;

  // Prepare chart data for tenure ranges
  const tenureRangeData = Object.entries(data.tenureRanges).map(([range, count]) => ({
    name: range,
    value: count as number
  }));

  // Get unique categories
  const categories = Array.from(new Set(data.employees.map((e: any) => e.employee.category).filter(Boolean)));

  // Filter and sort employees
  let filteredEmployees = [...data.employees];
  
  if (filterCategory !== 'all') {
    filteredEmployees = filteredEmployees.filter((e: any) => e.employee.category === filterCategory);
  }
  
  if (sortBy === 'tenure') {
    filteredEmployees.sort((a: any, b: any) => b.monthsOfService - a.monthsOfService);
  } else {
    filteredEmployees.sort((a: any, b: any) => a.employee.name.localeCompare(b.employee.name));
  }

  return (
    <div className="print:hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Employee Tenure Report - {year}</h2>
        <div className="flex items-center space-x-2">
          <select
            value={year}
            onChange={(e) => {
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.set('year', e.target.value);
              setSearchParams(newSearchParams);
            }}
            className="border rounded px-3 py-2"
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button onClick={handlePrint} className="px-4 py-2 bg-gray-600 text-white rounded">{t('print')}</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-2 text-blue-800">{t('totalEmployeesLabel')}</h3>
          <p className="text-3xl font-bold text-blue-600">{data.summary.totalEmployees}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg shadow border-2 border-green-200">
          <h3 className="text-lg font-semibold mb-2 text-green-800">Average Tenure</h3>
          <p className="text-3xl font-bold text-green-600">{data.summary.averageTenure} years</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg shadow border-2 border-purple-200">
          <h3 className="text-lg font-semibold mb-2 text-purple-800">Tenure Ranges</h3>
          <p className="text-3xl font-bold text-purple-600">{Object.keys(data.tenureRanges).length}</p>
        </div>
      </div>

      {/* Tenure Ranges Chart */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-xl font-semibold mb-4">Tenure Distribution</h3>
        <div className="mb-4">
          <label className="text-gray-700 mr-2">Chart Type:</label>
          <select value={chartType} onChange={(e) => setChartType(e.target.value as any)} className="border rounded px-3 py-2">
            <option value="bar">Bar Chart</option>
            <option value="pie">Pie Chart</option>
          </select>
        </div>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer>
            {chartType === 'bar' ? (
              <BarChart data={tenureRangeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={tenureRangeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tenureRangeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Averages */}
      {Object.keys(data.categoryAverages).length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-xl font-semibold mb-4">Average Tenure by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(data.categoryAverages).map(([category, stats]: [string, any]) => (
              <div key={category} className="text-center p-4 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-gray-900">{stats.averageYears} years</div>
                <div className="text-sm text-gray-600 mt-1">{category}</div>
                <div className="text-xs text-gray-500 mt-1">({stats.count} employees)</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 flex items-center space-x-4 flex-wrap">
        <div>
          <label className="text-gray-700 mr-2">Filter by Category:</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border rounded px-3 py-2">
            <option value="all">{t('allCategories')}</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-gray-700 mr-2">Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="border rounded px-3 py-2">
            <option value="tenure">Tenure (Longest First)</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Record</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Months</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Years</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Range</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEmployees.map((item: any, index: number) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{item.employee.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.employee.category || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.startDate.monthName} {item.startDate.year}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.endDate.monthName} {item.endDate.year}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.monthsOfService}</td>
                <td className="px-6 py-4 whitespace-nowrap font-semibold">{item.yearsOfService}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{item.tenureRange}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

