import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function PaymentMethodDistribution() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [chartMetric, setChartMetric] = useState<'totalAmount' | 'count' | 'uniqueEmployees'>('totalAmount');

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
    axios.get(`${API_BASE_URL}/reports/payment-method-distribution?year=${year}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [year]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data found</div>;

  const chartData = data.distribution.map((item: any) => ({
    method: item.method,
    totalAmount: item.totalAmount,
    count: item.count,
    uniqueEmployees: item.uniqueEmployees,
    uniqueAccountNumbers: item.uniqueAccountNumbers,
    averageAmount: item.averageAmount
  }));

  const getChartValue = (item: any) => {
    switch (chartMetric) {
      case 'totalAmount': return item.totalAmount;
      case 'count': return item.count;
      case 'uniqueEmployees': return item.uniqueEmployees;
      default: return item.totalAmount;
    }
  };

  return (
    <div className="print:hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Payment Method Distribution - {year}</h2>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-2 text-blue-800">Total Records</h3>
          <p className="text-3xl font-bold text-blue-600">{data.summary.totalRecords}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg shadow border-2 border-green-200">
          <h3 className="text-lg font-semibold mb-2 text-green-800">Total Amount</h3>
          <p className="text-3xl font-bold text-green-600">{data.summary.totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg shadow border-2 border-purple-200">
          <h3 className="text-lg font-semibold mb-2 text-purple-800">Unique Employees</h3>
          <p className="text-3xl font-bold text-purple-600">{data.summary.totalUniqueEmployees}</p>
        </div>
        <div className="bg-orange-50 p-6 rounded-lg shadow border-2 border-orange-200">
          <h3 className="text-lg font-semibold mb-2 text-orange-800">Payment Methods</h3>
          <p className="text-3xl font-bold text-orange-600">{data.summary.totalPaymentMethods}</p>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="mb-4 flex items-center space-x-4 flex-wrap">
        <div>
          <label className="text-gray-700 mr-2">Chart Type:</label>
          <select value={chartType} onChange={(e) => setChartType(e.target.value as any)} className="border rounded px-3 py-2">
            <option value="bar">Bar Chart</option>
            <option value="pie">Pie Chart</option>
          </select>
        </div>
        <div>
          <label className="text-gray-700 mr-2">Chart Metric:</label>
          <select value={chartMetric} onChange={(e) => setChartMetric(e.target.value as any)} className="border rounded px-3 py-2">
            <option value="totalAmount">Total Amount</option>
            <option value="count">Record Count</option>
            <option value="uniqueEmployees">Unique Employees</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-xl font-semibold mb-4">Payment Method Distribution</h3>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer>
            {chartType === 'bar' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="method" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value: number) => typeof value === 'number' ? value.toLocaleString() : value} />
                <Legend />
                <Bar dataKey={chartMetric} fill="#8884d8" />
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ method, value }) => {
                    const percentage = ((value as number) / chartData.reduce((sum: number, item: any) => sum + getChartValue(item), 0) * 100).toFixed(1);
                    return `${method}: ${percentage}%`;
                  }}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey={chartMetric}
                >
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => typeof value === 'number' ? value.toLocaleString() : value} />
                <Legend />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Record Count</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unique Employees</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unique Accounts</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Average Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% of Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.distribution.map((item: any, index: number) => {
              const percentage = ((item.totalAmount / data.summary.totalAmount) * 100).toFixed(2);
              return (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{item.method}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.count}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">{item.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.uniqueEmployees}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.uniqueAccountNumbers}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{Math.round(item.averageAmount).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{percentage}%</td>
                </tr>
              );
            })}
            <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
              <td className="px-6 py-4 whitespace-nowrap">TOTAL</td>
              <td className="px-6 py-4 whitespace-nowrap">{data.summary.totalRecords}</td>
              <td className="px-6 py-4 whitespace-nowrap">{data.summary.totalAmount.toLocaleString()}</td>
              <td className="px-6 py-4 whitespace-nowrap">{data.summary.totalUniqueEmployees}</td>
              <td className="px-6 py-4 whitespace-nowrap">-</td>
              <td className="px-6 py-4 whitespace-nowrap">-</td>
              <td className="px-6 py-4 whitespace-nowrap">100.00%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

