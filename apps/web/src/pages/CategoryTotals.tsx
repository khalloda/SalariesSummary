import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function CategoryTotals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar');
  const [chartMetric, setChartMetric] = useState<string>('gross');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/reports/category-totals?year=${year}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [year]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data found</div>;

  const categories = Object.keys(data.categoryTotals);
  const chartData = categories.map(cat => ({
    name: cat.split('/')[0], // Get English part
    fullName: cat,
    ...data.categoryTotals[cat].totals
  }));

  const pieData = chartData.map(item => ({
    name: item.name,
    value: item[chartMetric] || 0
  }));

  return (
    <div className="print-container">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h2 className="text-2xl font-bold">Category Totals - {year}</h2>
        <div className="flex gap-2">
          <select
            value={year}
            onChange={(e) => setSearchParams({ year: e.target.value })}
            className="border rounded px-3 py-2"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Print
          </button>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-4 print:hidden">
        <div className="flex gap-4 items-center flex-wrap">
          <div>
            <label className="mr-2">Chart Type:</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as 'bar' | 'pie' | 'line')}
              className="border rounded px-3 py-2"
            >
              <option value="bar">Bar Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="line">Line Chart</option>
            </select>
          </div>
          <div>
            <label className="mr-2">Metric:</label>
            <select
              value={chartMetric}
              onChange={(e) => setChartMetric(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="basicSalary">Basic Salary</option>
              <option value="gross">Gross</option>
              <option value="net">Net</option>
              <option value="directAdditions">Direct Additions</option>
              <option value="indirectAdditions">Indirect Additions</option>
              <option value="bonuses">Bonuses</option>
              <option value="salaryDeductions">Salary Deductions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded-lg shadow mb-4 print:shadow-none">
        <h3 className="text-xl font-semibold mb-4">
          {chartMetric.charAt(0).toUpperCase() + chartMetric.slice(1).replace(/([A-Z])/g, ' $1')} by Category
        </h3>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer>
            {chartType === 'bar' && (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend />
                <Bar dataKey={chartMetric} fill="#0088FE" />
              </BarChart>
            )}
            {chartType === 'pie' && (
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
              </PieChart>
            )}
            {chartType === 'line' && (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey={chartMetric} stroke="#0088FE" strokeWidth={2} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Totals Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic Salary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direct Additions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Indirect Additions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bonuses</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map(cat => {
              const catData = data.categoryTotals[cat];
              return (
                <tr key={cat} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{cat}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{catData.employeeCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{catData.totals.basicSalary.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{catData.totals.directAdditions.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{catData.totals.indirectAdditions.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{catData.totals.bonuses.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{(catData.totals.salaryDeductions + catData.totals.grossDeductions).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">{catData.totals.gross.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">{catData.totals.net.toLocaleString()}</td>
                </tr>
              );
            })}
            {/* Grand Total */}
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
              <td className="px-6 py-4 whitespace-nowrap">GRAND TOTAL</td>
              <td className="px-6 py-4 whitespace-nowrap">
                {categories.reduce((sum, cat) => sum + data.categoryTotals[cat].employeeCount, 0)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {categories.reduce((sum, cat) => sum + data.categoryTotals[cat].totals.basicSalary, 0).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {categories.reduce((sum, cat) => sum + data.categoryTotals[cat].totals.directAdditions, 0).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {categories.reduce((sum, cat) => sum + data.categoryTotals[cat].totals.indirectAdditions, 0).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {categories.reduce((sum, cat) => sum + data.categoryTotals[cat].totals.bonuses, 0).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {categories.reduce((sum, cat) => sum + data.categoryTotals[cat].totals.salaryDeductions + data.categoryTotals[cat].totals.grossDeductions, 0).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {categories.reduce((sum, cat) => sum + data.categoryTotals[cat].totals.gross, 0).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {categories.reduce((sum, cat) => sum + data.categoryTotals[cat].totals.net, 0).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

