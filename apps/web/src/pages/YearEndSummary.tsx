import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function YearEndSummary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [chartMetric, setChartMetric] = useState<'net' | 'gross' | 'basicSalary'>('net');

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
    axios.get(`${API_BASE_URL}/reports/year-end-summary?year=${year}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [year]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data found</div>;

  const chartData = data.monthlyBreakdown.map((month: any) => ({
    month: month.monthName.substring(0, 3),
    fullMonth: month.monthName,
    basicSalary: month.basicSalary,
    gross: month.gross,
    net: month.net
  }));

  return (
    <div className="print:hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Year-End Summary Report - {year}</h2>
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

      {/* Executive Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg shadow mb-6 border-2 border-blue-200">
        <h3 className="text-2xl font-bold mb-4 text-gray-800">Executive Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">{t('totalEmployeesLabel')}</div>
            <div className="text-3xl font-bold text-blue-600">{data.summary.totalEmployees}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">{t('totalPayrollLabel')} ({t('net')})</div>
            <div className="text-3xl font-bold text-green-600">{data.totals.net.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Average per Employee</div>
            <div className="text-3xl font-bold text-purple-600">{Math.round(data.averages.perEmployee).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Year-over-Year Growth */}
      {data.yearOverYear && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-xl font-semibold mb-4">Year-over-Year Growth</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded p-4">
              <div className="text-sm text-gray-600 mb-1">Net Payroll Growth</div>
              <div className={`text-2xl font-bold ${data.yearOverYear.growth.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.yearOverYear.growth.net >= 0 ? '+' : ''}{data.yearOverYear.growth.net.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {data.yearOverYear.previousYear}: {data.yearOverYear.previousYearTotals.net.toLocaleString()} → 
                {year}: {data.yearOverYear.currentYearTotals.net.toLocaleString()}
              </div>
            </div>
            <div className="border rounded p-4">
              <div className="text-sm text-gray-600 mb-1">Gross Payroll Growth</div>
              <div className={`text-2xl font-bold ${data.yearOverYear.growth.gross >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.yearOverYear.growth.gross >= 0 ? '+' : ''}{data.yearOverYear.growth.gross.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {data.yearOverYear.previousYear}: {data.yearOverYear.previousYearTotals.gross.toLocaleString()} → 
                {year}: {data.yearOverYear.currentYearTotals.gross.toLocaleString()}
              </div>
            </div>
            <div className="border rounded p-4">
              <div className="text-sm text-gray-600 mb-1">Basic Salary Growth</div>
              <div className={`text-2xl font-bold ${data.yearOverYear.growth.basicSalary >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.yearOverYear.growth.basicSalary >= 0 ? '+' : ''}{data.yearOverYear.growth.basicSalary.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {data.yearOverYear.previousYear}: {data.yearOverYear.previousYearTotals.basicSalary.toLocaleString()} → 
                {year}: {data.yearOverYear.currentYearTotals.basicSalary.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Controls */}
      <div className="mb-4 flex items-center space-x-4">
        <label className="text-gray-700">Chart Metric:</label>
        <select value={chartMetric} onChange={(e) => setChartMetric(e.target.value as any)} className="border rounded px-3 py-2">
          <option value="net">Net</option>
          <option value="gross">Gross</option>
          <option value="basicSalary">Basic Salary</option>
        </select>
      </div>

      {/* Monthly Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-xl font-semibold mb-4">Monthly Trend</h3>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
              <Legend />
              <Line type="monotone" dataKey={chartMetric} stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Totals Breakdown */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold">Financial Totals</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
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
              <td className="px-6 py-4 whitespace-nowrap text-red-600">-{data.totals.salaryDeductions.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap font-medium">Gross Deductions</td>
              <td className="px-6 py-4 whitespace-nowrap text-red-600">-{data.totals.grossDeductions.toLocaleString()}</td>
            </tr>
            <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
              <td className="px-6 py-4 whitespace-nowrap">Net Payroll</td>
              <td className="px-6 py-4 whitespace-nowrap text-blue-600">{data.totals.net.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Category Summary */}
      {data.categorySummary && data.categorySummary.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold">Category Summary</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bonuses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yearly Increase</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.categorySummary.map((cat: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{cat.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{cat.employeeCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{cat.basicSalary.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{cat.gross.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">{cat.net.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600">{cat.bonuses.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-blue-600">{cat.yearlyIncrease.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Averages */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Key Averages</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-sm text-gray-600 mb-1">Average per Employee</div>
            <div className="text-2xl font-bold text-gray-900">{Math.round(data.averages.perEmployee).toLocaleString()}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-sm text-gray-600 mb-1">Average per Month</div>
            <div className="text-2xl font-bold text-gray-900">{Math.round(data.averages.perMonth).toLocaleString()}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-sm text-gray-600 mb-1">Average per Record</div>
            <div className="text-2xl font-bold text-gray-900">{Math.round(data.averages.perRecord).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

