import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MonthlySummary() {
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
    axios.get(`${API_BASE_URL}/reports/monthly-summary?year=${year}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [year]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data found</div>;

  const chartData = data.monthlyData.map((month: any) => ({
    month: month.monthName.substring(0, 3),
    fullMonth: month.monthName,
    basicSalary: month.basicSalary,
    gross: month.gross,
    net: month.net,
    employees: month.employeeCount
  }));

  return (
    <div className="print:hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Monthly Summary - {year}</h2>
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

      {/* Chart Controls */}
      <div className="mb-4 flex items-center space-x-4">
        <label className="text-gray-700">Chart Metric:</label>
        <select value={chartMetric} onChange={(e) => setChartMetric(e.target.value as any)} className="border rounded px-3 py-2">
          <option value="net">Net</option>
          <option value="gross">Gross</option>
          <option value="basicSalary">Basic Salary</option>
        </select>
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-xl font-semibold mb-4">Monthly Trends</h3>
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

      {/* Monthly Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic Salary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Additions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.monthlyData.map((month: any) => (
              <tr key={month.month} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{month.monthName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{month.employeeCount}</td>
                <td className="px-6 py-4 whitespace-nowrap">{month.basicSalary.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{month.gross.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap font-semibold">{month.net.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-green-600">
                  {(month.directAdditions + month.indirectAdditions + month.bonuses).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-red-600">
                  {(month.salaryDeductions + month.grossDeductions).toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
              <td className="px-6 py-4 whitespace-nowrap" colSpan={2}>TOTAL</td>
              <td className="px-6 py-4 whitespace-nowrap">{data.totals.basicSalary.toLocaleString()}</td>
              <td className="px-6 py-4 whitespace-nowrap">{data.totals.gross.toLocaleString()}</td>
              <td className="px-6 py-4 whitespace-nowrap">{data.totals.net.toLocaleString()}</td>
              <td className="px-6 py-4 whitespace-nowrap text-green-600">
                {(data.totals.directAdditions + data.totals.indirectAdditions + data.totals.bonuses).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-red-600">
                {(data.totals.salaryDeductions + data.totals.grossDeductions).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

