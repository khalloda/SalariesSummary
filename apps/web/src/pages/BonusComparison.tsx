import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function BonusComparison() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [year1, setYear1] = useState(new Date().getFullYear() - 1);
  const [year2, setYear2] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'consolidated' | 'individual'>('consolidated');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/reports/available-years`)
      .then(res => {
        const years = res.data.years || [];
        if (years.length > 0) {
          setAvailableYears(years);
          setYear1(years[1] || years[0]);
          setYear2(years[0]);
        } else {
          const currentYear = new Date().getFullYear();
          setAvailableYears(Array.from({ length: 5 }, (_, i) => currentYear - i));
        }
      })
      .catch(() => {
        const currentYear = new Date().getFullYear();
        setAvailableYears(Array.from({ length: 5 }, (_, i) => currentYear - i));
      });
  }, []);

  const handleGenerateReport = () => {
    if (year1 === year2) {
      alert('Please select two different years');
      return;
    }
    
    setLoading(true);
    setData(null);
    axios.get(`${API_BASE_URL}/reports/bonus-comparison?year1=${year1}&year2=${year2}`)
      .then(res => {
        if (res.data.message) {
          alert(res.data.message);
        }
        setData(res.data);
      })
      .catch(err => {
        console.error(err);
        const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
        alert('Error generating report: ' + errorMsg);
        setData(null);
      })
      .finally(() => setLoading(false));
  };

  const handlePrint = () => {
    window.print();
  };

  // Prepare chart data
  const categoryChartData = data?.categoryComparison?.map((cat: any) => ({
    name: (cat.category || 'Uncategorized').split('/')[0],
    year1: cat.totalBonusYear1 || 0,
    year2: cat.totalBonusYear2 || 0,
    change: cat.change || 0
  })) || [];

  return (
    <div className="print-container">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h2 className="text-2xl font-bold">Bonus Comparison Report</h2>
        <button onClick={handlePrint} className="px-4 py-2 bg-gray-600 text-white rounded">{t('print')}</button>
      </div>

      {/* Year Selection */}
      <div className="bg-white p-6 rounded-lg shadow mb-6 print:hidden">
        <h3 className="text-lg font-semibold mb-4">Select Years to Compare</h3>
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year 1</label>
            <select
              value={year1}
              onChange={(e) => setYear1(parseInt(e.target.value))}
              className="border rounded px-3 py-2"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year 2</label>
            <select
              value={year2}
              onChange={(e) => setYear2(parseInt(e.target.value))}
              className="border rounded px-3 py-2"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerateReport}
              disabled={loading || year1 === year2}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Comparison'}
            </button>
          </div>
        </div>
      </div>

      {data?.message ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-6">
          <p className="text-yellow-700">{data.message}</p>
        </div>
      ) : data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-6 rounded-lg shadow border-2 border-blue-200">
              <h3 className="text-lg font-semibold mb-2 text-blue-800">Total {year1}</h3>
              <p className="text-3xl font-bold text-blue-600">{(data.grandTotals?.totalBonusYear1 || 0).toLocaleString()}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg shadow border-2 border-green-200">
              <h3 className="text-lg font-semibold mb-2 text-green-800">Total {year2}</h3>
              <p className="text-3xl font-bold text-green-600">{(data.grandTotals?.totalBonusYear2 || 0).toLocaleString()}</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg shadow border-2 border-purple-200">
              <h3 className="text-lg font-semibold mb-2 text-purple-800">Change</h3>
              <p className={`text-3xl font-bold ${(data.grandTotals?.absoluteChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(data.grandTotals?.absoluteChange || 0) >= 0 ? '+' : ''}{(data.grandTotals?.absoluteChange || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-orange-50 p-6 rounded-lg shadow border-2 border-orange-200">
              <h3 className="text-lg font-semibold mb-2 text-orange-800">% Change</h3>
              <p className={`text-3xl font-bold ${(data.grandTotals?.percentageChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(data.grandTotals?.percentageChange || 0).toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Category Comparison Chart */}
          {categoryChartData.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-xl font-semibold mb-4">Category Comparison</h3>
              <div style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer>
                  <BarChart data={categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis formatter={(value: number) => value.toLocaleString()} />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Legend />
                    <Bar dataKey="year1" fill="#8884d8" name={`${year1}`} />
                    <Bar dataKey="year2" fill="#82ca9d" name={`${year2}`} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Category Comparison Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Category Comparison</h3>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as any)}
                className="border rounded px-3 py-2 print:hidden"
              >
                <option value="consolidated">Consolidated</option>
                <option value="individual">Individual</option>
              </select>
            </div>
            {viewMode === 'consolidated' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{year1} Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{year1} Count</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{year2} Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{year2} Count</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% Change</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.categoryComparison?.map((cat: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{(cat.category || 'Uncategorized').split('/')[0]}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{(cat.totalBonusYear1 || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{cat.employeeCount || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{(cat.totalBonusYear2 || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{cat.employeeCount || 0}</td>
                        <td className={`px-6 py-4 whitespace-nowrap font-semibold ${(cat.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(cat.change || 0) >= 0 ? '+' : ''}{(cat.change || 0).toLocaleString()}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${(cat.percentageChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(cat.percentageChange || 0).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                    {data.grandTotals && (
                      <tr className="bg-gray-100 font-semibold">
                        <td className="px-6 py-4 whitespace-nowrap">Grand Total</td>
                        <td className="px-6 py-4 whitespace-nowrap">{(data.grandTotals.totalBonusYear1 || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">-</td>
                        <td className="px-6 py-4 whitespace-nowrap">{(data.grandTotals.totalBonusYear2 || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">-</td>
                        <td className={`px-6 py-4 whitespace-nowrap ${(data.grandTotals.absoluteChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(data.grandTotals.absoluteChange || 0) >= 0 ? '+' : ''}{(data.grandTotals.absoluteChange || 0).toLocaleString()}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${(data.grandTotals.percentageChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(data.grandTotals.percentageChange || 0).toFixed(2)}%
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{year1} Bonus</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{year2} Bonus</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% Change</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.individualComparison?.map((comp: any, index: number) => (
                      <tr key={comp.employeeId || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{comp.employeeName || 'Unknown'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{comp.category || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{(comp.bonusYear1 || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{(comp.bonusYear2 || 0).toLocaleString()}</td>
                        <td className={`px-6 py-4 whitespace-nowrap font-semibold ${(comp.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(comp.change || 0) >= 0 ? '+' : ''}{(comp.change || 0).toLocaleString()}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${(comp.percentageChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(comp.percentageChange || 0).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

