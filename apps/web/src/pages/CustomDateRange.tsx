import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function CustomDateRange() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  // Date range state
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(1);
  const [endYear, setEndYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(12);
  const [chartMetric, setChartMetric] = useState<'net' | 'gross' | 'basicSalary'>('net');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/reports/available-years`)
      .then(res => {
        const years = res.data.years || [];
        if (years.length > 0) {
          setAvailableYears(years);
          setStartYear(years[0]);
          setEndYear(years[years.length - 1]);
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

  const handleGenerateReport = () => {
    if (startYear > endYear || (startYear === endYear && startMonth > endMonth)) {
      alert('Start date must be before or equal to end date');
      return;
    }
    
    setLoading(true);
    axios.get(`${API_BASE_URL}/reports/custom-date-range?startYear=${startYear}&startMonth=${startMonth}&endYear=${endYear}&endMonth=${endMonth}`)
      .then(res => setData(res.data))
      .catch(err => {
        console.error(err);
        alert('Error generating report: ' + (err.response?.data?.error || err.message));
      })
      .finally(() => setLoading(false));
  };

  const handlePrint = () => {
    window.print();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="print:hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Custom Date Range Report</h2>
        <button onClick={handlePrint} className="px-4 py-2 bg-gray-600 text-white rounded">{t('print')}</button>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Select Date Range</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <div className="flex gap-2">
              <select
                value={startYear}
                onChange={(e) => setStartYear(parseInt(e.target.value))}
                className="border rounded px-3 py-2"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(parseInt(e.target.value))}
                className="border rounded px-3 py-2"
              >
                {monthNames.map((name, index) => (
                  <option key={index + 1} value={index + 1}>{name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <div className="flex gap-2">
              <select
                value={endYear}
                onChange={(e) => setEndYear(parseInt(e.target.value))}
                className="border rounded px-3 py-2"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                value={endMonth}
                onChange={(e) => setEndMonth(parseInt(e.target.value))}
                className="border rounded px-3 py-2"
              >
                {monthNames.map((name, index) => (
                  <option key={index + 1} value={index + 1}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={loading}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-6 rounded-lg shadow border-2 border-blue-200">
              <h3 className="text-lg font-semibold mb-2 text-blue-800">Total Records</h3>
              <p className="text-3xl font-bold text-blue-600">{data.summary.totalRecords}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg shadow border-2 border-green-200">
              <h3 className="text-lg font-semibold mb-2 text-green-800">Total Net</h3>
              <p className="text-3xl font-bold text-green-600">{data.totals.net.toLocaleString()}</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg shadow border-2 border-purple-200">
              <h3 className="text-lg font-semibold mb-2 text-purple-800">Unique Employees</h3>
              <p className="text-3xl font-bold text-purple-600">{data.summary.uniqueEmployees}</p>
            </div>
            <div className="bg-orange-50 p-6 rounded-lg shadow border-2 border-orange-200">
              <h3 className="text-lg font-semibold mb-2 text-orange-800">Months</h3>
              <p className="text-3xl font-bold text-orange-600">{data.summary.totalMonths}</p>
            </div>
          </div>

          {/* Chart Controls */}
          <div className="mb-4 flex items-center space-x-4">
            <label className="text-gray-700">Chart Metric:</label>
            <select value={chartMetric} onChange={(e) => setChartMetric(e.target.value as any)} className="border rounded px-3 py-2">
              <option value="net">Net</option>
              <option value="gross">Gross</option>
              <option value="basicSalary">Basic Salary</option>
            </select>
          </div>

          {/* Monthly Chart */}
          {data.monthlyData && data.monthlyData.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-xl font-semibold mb-4">Monthly Trends</h3>
              <div style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer>
                  <LineChart data={data.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="monthName" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Legend />
                    <Line type="monotone" dataKey={chartMetric} stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Totals Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h3 className="text-lg font-semibold">Totals Summary</h3>
              <p className="text-sm text-gray-600">
                {monthNames[startMonth - 1]} {startYear} to {monthNames[endMonth - 1]} {endYear}
              </p>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">Basic Salary</td>
                  <td className="px-6 py-4 whitespace-nowrap">{data.totals.basicSalary.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">Direct Additions</td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600">{data.totals.directAdditions.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">Indirect Additions</td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600">{data.totals.indirectAdditions.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">Yearly Increase</td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600">{data.totals.yearlyIncrease.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">Bonuses</td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600">{data.totals.bonuses.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">Gross</td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">{data.totals.gross.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">Salary Deductions</td>
                  <td className="px-6 py-4 whitespace-nowrap text-red-600">{data.totals.salaryDeductions.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">Gross Deductions</td>
                  <td className="px-6 py-4 whitespace-nowrap text-red-600">{data.totals.grossDeductions.toLocaleString()}</td>
                </tr>
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap">Net</td>
                  <td className="px-6 py-4 whitespace-nowrap text-blue-600">{data.totals.net.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Category Totals */}
          {data.categoryTotals && data.categoryTotals.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold">Category Totals</h3>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic Salary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.categoryTotals.map((cat: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{cat.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{cat.employeeCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{cat.basicSalary.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{cat.gross.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold">{cat.net.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Monthly Breakdown Table */}
          {data.monthlyData && data.monthlyData.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold">Monthly Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic Salary</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.monthlyData.map((month: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{month.monthName} {month.year}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{month.employeeCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{month.basicSalary.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{month.gross.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold">{month.net.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

