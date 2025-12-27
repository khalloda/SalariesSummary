import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function CategoryComparison() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [chartMetric, setChartMetric] = useState<'totalNet' | 'averageNet' | 'employeeCount'>('totalNet');

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
    axios.get(`${API_BASE_URL}/reports/category-comparison?year=${year}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [year]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data found</div>;

  const categories = Object.keys(data.comparison);
  const chartData = categories.map(cat => {
    const comp = data.comparison[cat];
    return {
      name: cat.split('/')[0], // Use English name
      fullName: cat,
      employeeCount: comp.employeeCount,
      totalNet: comp.totalNet,
      totalGross: comp.totalGross,
      totalBasicSalary: comp.totalBasicSalary,
      averageNet: comp.monthlyAverageNet,
      averageGross: comp.monthlyAverageGross,
      averageBasicSalary: comp.monthlyAverageBasicSalary
    };
  });

  const getChartValue = (item: any) => {
    switch (chartMetric) {
      case 'totalNet': return item.totalNet;
      case 'averageNet': return item.averageNet;
      case 'employeeCount': return item.employeeCount;
      default: return item.totalNet;
    }
  };

  return (
    <div className="print:hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Category Comparison - {year}</h2>
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
          <option value="totalNet">Total Net</option>
          <option value="averageNet">Average Net (per employee/month)</option>
          <option value="employeeCount">Employee Count</option>
        </select>
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-xl font-semibold mb-4">Category Comparison Chart</h3>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => typeof value === 'number' ? value.toLocaleString() : value} />
              <Legend />
              <Bar dataKey={chartMetric} fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Basic Salary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Gross</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Net</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Basic Salary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Gross</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Net</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map(category => {
              const comp = data.comparison[category];
              return (
                <tr key={category} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{category}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{comp.employeeCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{comp.totalBasicSalary.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{comp.totalGross.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">{comp.totalNet.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{Math.round(comp.monthlyAverageBasicSalary).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{Math.round(comp.monthlyAverageGross).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{Math.round(comp.monthlyAverageNet).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

