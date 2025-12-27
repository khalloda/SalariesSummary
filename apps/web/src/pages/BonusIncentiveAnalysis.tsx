import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function BonusIncentiveAnalysis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [chartMetric, setChartMetric] = useState<'bonuses' | 'yearlyIncrease' | 'both'>('both');

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
    axios.get(`${API_BASE_URL}/reports/bonus-incentive-analysis?year=${year}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [year]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data found</div>;

  const chartData = data.monthlyBonuses.map((month: any) => ({
    month: month.monthName.substring(0, 3),
    fullMonth: month.monthName,
    bonuses: month.bonuses,
    yearlyIncrease: month.yearlyIncrease,
    recordCount: month.recordCount
  }));

  return (
    <div className="print:hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Bonus & Incentive Analysis - {year}</h2>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 p-6 rounded-lg shadow border-2 border-green-200">
          <h3 className="text-lg font-semibold mb-2 text-green-800">Total Bonuses</h3>
          <p className="text-3xl font-bold text-green-600">{data.bonusStats.totalBonusAmount.toLocaleString()}</p>
          <p className="text-sm text-green-700 mt-1">{data.bonusStats.recordsWithBonuses} records</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-2 text-blue-800">Total Yearly Increase</h3>
          <p className="text-3xl font-bold text-blue-600">{data.bonusStats.totalYearlyIncrease.toLocaleString()}</p>
          <p className="text-sm text-blue-700 mt-1">{data.bonusStats.recordsWithYearlyIncrease} records</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg shadow border-2 border-purple-200">
          <h3 className="text-lg font-semibold mb-2 text-purple-800">Average Bonus</h3>
          <p className="text-3xl font-bold text-purple-600">{Math.round(data.bonusStats.averageBonus).toLocaleString()}</p>
          <p className="text-sm text-purple-700 mt-1">Per record</p>
        </div>
        <div className="bg-orange-50 p-6 rounded-lg shadow border-2 border-orange-200">
          <h3 className="text-lg font-semibold mb-2 text-orange-800">Max Bonus</h3>
          <p className="text-3xl font-bold text-orange-600">{data.bonusStats.maxBonus.toLocaleString()}</p>
          <p className="text-sm text-orange-700 mt-1">Single record</p>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="mb-4 flex items-center space-x-4 flex-wrap">
        <div>
          <label className="text-gray-700 mr-2">Chart Type:</label>
          <select value={chartType} onChange={(e) => setChartType(e.target.value as any)} className="border rounded px-3 py-2">
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
          </select>
        </div>
        <div>
          <label className="text-gray-700 mr-2">Show:</label>
          <select value={chartMetric} onChange={(e) => setChartMetric(e.target.value as any)} className="border rounded px-3 py-2">
            <option value="both">Both</option>
            <option value="bonuses">Bonuses Only</option>
            <option value="yearlyIncrease">Yearly Increase Only</option>
          </select>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-xl font-semibold mb-4">Monthly Distribution</h3>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer>
            {chartType === 'bar' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend />
                {(chartMetric === 'both' || chartMetric === 'bonuses') && (
                  <Bar dataKey="bonuses" fill="#00C49F" name="Bonuses" />
                )}
                {(chartMetric === 'both' || chartMetric === 'yearlyIncrease') && (
                  <Bar dataKey="yearlyIncrease" fill="#0088FE" name="Yearly Increase" />
                )}
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend />
                {(chartMetric === 'both' || chartMetric === 'bonuses') && (
                  <Line type="monotone" dataKey="bonuses" stroke="#00C49F" strokeWidth={2} name="Bonuses" />
                )}
                {(chartMetric === 'both' || chartMetric === 'yearlyIncrease') && (
                  <Line type="monotone" dataKey="yearlyIncrease" stroke="#0088FE" strokeWidth={2} name="Yearly Increase" />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      {data.categoryBonuses && data.categoryBonuses.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold">By Category</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Bonuses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Yearly Increase</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.categoryBonuses.map((cat: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{cat.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{cat.employeeCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600">{cat.bonuses.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-blue-600">{cat.yearlyIncrease.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top Recipients */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Bonus Recipients */}
        {data.topBonusRecipients && data.topBonusRecipients.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-green-50 border-b">
              <h3 className="text-lg font-semibold text-green-800">Top Bonus Recipients (Top 20)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Bonuses</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.topBonusRecipients.map((emp: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{emp.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{emp.category || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-green-600">{emp.totalBonuses.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top Yearly Increase Recipients */}
        {data.topYearlyIncreaseRecipients && data.topYearlyIncreaseRecipients.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-blue-50 border-b">
              <h3 className="text-lg font-semibold text-blue-800">Top Yearly Increase Recipients (Top 20)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Increase</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.topYearlyIncreaseRecipients.map((emp: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{emp.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{emp.category || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-blue-600">{emp.totalYearlyIncrease.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

