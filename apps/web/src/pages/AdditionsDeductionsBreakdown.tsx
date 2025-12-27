import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function AdditionsDeductionsBreakdown() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [viewType, setViewType] = useState<'additions' | 'deductions' | 'both'>('both');

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
    axios.get(`${API_BASE_URL}/reports/additions-deductions-breakdown?year=${year}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [year]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data found</div>;

  const additionsData = data.additions.breakdown.map((item: any) => ({
    name: item.category,
    value: item.amount,
    percentage: ((item.amount / data.additions.total) * 100).toFixed(1)
  }));

  const deductionsData = data.deductions.breakdown.map((item: any) => ({
    name: item.category,
    value: item.amount,
    percentage: ((item.amount / data.deductions.total) * 100).toFixed(1)
  }));

  return (
    <div className="print:hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Additions & Deductions Breakdown - {year}</h2>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 p-6 rounded-lg shadow border-2 border-green-200">
          <h3 className="text-lg font-semibold mb-2 text-green-800">Total Additions</h3>
          <p className="text-3xl font-bold text-green-600">{data.additions.total.toLocaleString()}</p>
          <p className="text-sm text-green-700 mt-1">{data.additions.breakdown.length} categories</p>
        </div>
        <div className="bg-red-50 p-6 rounded-lg shadow border-2 border-red-200">
          <h3 className="text-lg font-semibold mb-2 text-red-800">Total Deductions</h3>
          <p className="text-3xl font-bold text-red-600">{data.deductions.total.toLocaleString()}</p>
          <p className="text-sm text-red-700 mt-1">{data.deductions.breakdown.length} categories</p>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 flex items-center space-x-4 flex-wrap">
        <div>
          <label className="text-gray-700 mr-2">View:</label>
          <select value={viewType} onChange={(e) => setViewType(e.target.value as any)} className="border rounded px-3 py-2">
            <option value="both">Both</option>
            <option value="additions">Additions Only</option>
            <option value="deductions">Deductions Only</option>
          </select>
        </div>
        <div>
          <label className="text-gray-700 mr-2">Chart Type:</label>
          <select value={chartType} onChange={(e) => setChartType(e.target.value as any)} className="border rounded px-3 py-2">
            <option value="bar">Bar Chart</option>
            <option value="pie">Pie Chart</option>
          </select>
        </div>
      </div>

      {/* Additions Section */}
      {(viewType === 'both' || viewType === 'additions') && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-xl font-semibold mb-4 text-green-800">Additions Breakdown</h3>
          
          {/* Chart */}
          <div style={{ width: '100%', height: '400px' }} className="mb-6">
            <ResponsiveContainer>
              {chartType === 'bar' ? (
                <BarChart data={additionsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Legend />
                  <Bar dataKey="value" fill="#00C49F" />
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={additionsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={120}
                    fill="#00C49F"
                    dataKey="value"
                  >
                    {additionsData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Legend />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.additions.breakdown.map((item: any, index: number) => {
                  const percentage = ((item.amount / data.additions.total) * 100).toFixed(2);
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{item.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{item.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{percentage}%</td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                  <td className="px-6 py-4 whitespace-nowrap">TOTAL</td>
                  <td className="px-6 py-4 whitespace-nowrap">{data.additions.total.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">100.00%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deductions Section */}
      {(viewType === 'both' || viewType === 'deductions') && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4 text-red-800">Deductions Breakdown</h3>
          
          {/* Chart */}
          <div style={{ width: '100%', height: '400px' }} className="mb-6">
            <ResponsiveContainer>
              {chartType === 'bar' ? (
                <BarChart data={deductionsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Legend />
                  <Bar dataKey="value" fill="#FF8042" />
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={deductionsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={120}
                    fill="#FF8042"
                    dataKey="value"
                  >
                    {deductionsData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Legend />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.deductions.breakdown.map((item: any, index: number) => {
                  const percentage = ((item.amount / data.deductions.total) * 100).toFixed(2);
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{item.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{item.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{percentage}%</td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                  <td className="px-6 py-4 whitespace-nowrap">TOTAL</td>
                  <td className="px-6 py-4 whitespace-nowrap">{data.deductions.total.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">100.00%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

