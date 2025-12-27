import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MultiYearComparison() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  // Filters
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [category, setCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'consolidated' | 'individual'>('consolidated');
  const [chartMetric, setChartMetric] = useState<'net' | 'gross' | 'basicSalary'>('net');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/reports/available-years`)
      .then(res => {
        const years = res.data.years || [];
        if (years.length > 0) {
          setAvailableYears(years);
          // Default to last 3 years
          setSelectedYears(years.slice(0, Math.min(3, years.length)));
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
    if (selectedYears.length < 2) {
      alert('Please select at least 2 years for comparison');
      return;
    }
    
    setLoading(true);
    const yearsParam = selectedYears.join(',');
    axios.get(`${API_BASE_URL}/reports/multi-year-comparison?years=${yearsParam}&category=${category}&viewMode=${viewMode}`)
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

  const toggleYear = (year: number) => {
    setSelectedYears(prev => {
      if (prev.includes(year)) {
        return prev.filter(y => y !== year);
      } else {
        return [...prev, year].sort((a, b) => b - a);
      }
    });
  };

  const categories = ['all', 'Partners/شركاء', 'Lawyers/محامين', 'Admins/عاملين', 'Consultants/مستشارين'];

  return (
    <div className="print:hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Multi-Year Comparison</h2>
        <button onClick={handlePrint} className="px-4 py-2 bg-gray-600 text-white rounded">{t('print')}</button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Select Comparison Options</h3>
        
        {/* Year Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Years (at least 2)</label>
          <div className="flex flex-wrap gap-2">
            {availableYears.map(year => (
              <label key={year} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedYears.includes(year)}
                  onChange={() => toggleYear(year)}
                  className="cursor-pointer"
                />
                <span>{year}</span>
              </label>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">Selected: {selectedYears.length} year(s)</p>
        </div>

        {/* Category Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border rounded px-3 py-2 w-full max-w-md"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'Entire Office / المكتب كامل' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="border rounded px-3 py-2 w-full max-w-md"
          >
            <option value="consolidated">Consolidated Totals</option>
            <option value="individual">Individual Employees</option>
          </select>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={loading || selectedYears.length < 2}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Comparison'}
        </button>
      </div>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-6 rounded-lg shadow border-2 border-blue-200">
              <h3 className="text-lg font-semibold mb-2 text-blue-800">Years Compared</h3>
              <p className="text-3xl font-bold text-blue-600">{data.years.join(', ')}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg shadow border-2 border-green-200">
              <h3 className="text-lg font-semibold mb-2 text-green-800">Total Records</h3>
              <p className="text-3xl font-bold text-green-600">{data.summary.totalRecords}</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg shadow border-2 border-purple-200">
              <h3 className="text-lg font-semibold mb-2 text-purple-800">Category</h3>
              <p className="text-3xl font-bold text-purple-600">{data.category === 'all' ? 'All' : data.category.split('/')[0]}</p>
            </div>
          </div>

          {/* Chart Controls */}
          {viewMode === 'consolidated' && (
            <div className="mb-4 flex items-center space-x-4">
              <label className="text-gray-700">Chart Type:</label>
              <select value={chartType} onChange={(e) => setChartType(e.target.value as any)} className="border rounded px-3 py-2">
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
              </select>
              <label className="text-gray-700">Metric:</label>
              <select value={chartMetric} onChange={(e) => setChartMetric(e.target.value as any)} className="border rounded px-3 py-2">
                <option value="net">Net</option>
                <option value="gross">Gross</option>
                <option value="basicSalary">Basic Salary</option>
              </select>
            </div>
          )}

          {/* Consolidated View */}
          {viewMode === 'consolidated' && (
            <>
              {/* Chart */}
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h3 className="text-xl font-semibold mb-4">Year-over-Year Trend</h3>
                <div style={{ width: '100%', height: '400px' }}>
                  <ResponsiveContainer>
                    {chartType === 'bar' ? (
                      <BarChart data={data.years.map((year: number) => ({
                        year: year.toString(),
                        value: data.yearTotals[year][chartMetric]
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => value.toLocaleString()} />
                        <Legend />
                        <Bar dataKey="value" fill="#8884d8" />
                      </BarChart>
                    ) : (
                      <LineChart data={data.years.map((year: number) => ({
                        year: year.toString(),
                        value: data.yearTotals[year][chartMetric]
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => value.toLocaleString()} />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Year Totals Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                <div className="px-6 py-4 bg-gray-50 border-b">
                  <h3 className="text-lg font-semibold">Year Totals</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic Salary</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.years.map((year: number) => {
                        const totals = data.yearTotals[year];
                        return (
                          <tr key={year} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap font-semibold">{year}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{totals.employeeCount}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{totals.basicSalary.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{totals.gross.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap font-semibold">{totals.net.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{totals.recordCount}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Year Changes Table */}
              {data.yearChanges && data.yearChanges.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b">
                    <h3 className="text-lg font-semibold">Year-over-Year Changes</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From → To</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic Salary Change</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross Change</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Change</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.yearChanges.map((change: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap font-semibold">
                              {change.fromYear} → {change.toYear}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`font-semibold ${change.changes.basicSalary.absolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {change.changes.basicSalary.absolute >= 0 ? '+' : ''}{change.changes.basicSalary.absolute.toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-500">
                                ({change.changes.basicSalary.percentage >= 0 ? '+' : ''}{change.changes.basicSalary.percentage.toFixed(2)}%)
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`font-semibold ${change.changes.gross.absolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {change.changes.gross.absolute >= 0 ? '+' : ''}{change.changes.gross.absolute.toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-500">
                                ({change.changes.gross.percentage >= 0 ? '+' : ''}{change.changes.gross.percentage.toFixed(2)}%)
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`font-semibold ${change.changes.net.absolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {change.changes.net.absolute >= 0 ? '+' : ''}{change.changes.net.absolute.toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-500">
                                ({change.changes.net.percentage >= 0 ? '+' : ''}{change.changes.net.percentage.toFixed(2)}%)
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Individual View */}
          {viewMode === 'individual' && data.employeeComparison && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold">Employee Comparison</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {data.employeeComparison.length} employees across {data.years.length} years
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      {data.years.map((year: number) => (
                        <th key={year} colSpan={3} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase border-l">
                          {year}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      <th></th>
                      <th></th>
                      {data.years.map((year: number) => (
                        <React.Fragment key={year}>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase border-l">Basic</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.employeeComparison.map((emp: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{emp.employee.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{emp.employee.category || '-'}</td>
                        {data.years.map((year: number) => {
                          const yearData = emp.years[year];
                          if (!yearData) {
                            return (
                              <React.Fragment key={year}>
                                <td className="px-6 py-4 whitespace-nowrap border-l text-gray-400">-</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400">-</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400">-</td>
                              </React.Fragment>
                            );
                          }
                          return (
                            <React.Fragment key={year}>
                              <td className="px-6 py-4 whitespace-nowrap border-l">{yearData.basicSalary.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{yearData.gross.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap font-semibold">{yearData.net.toLocaleString()}</td>
                            </React.Fragment>
                          );
                        })}
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

