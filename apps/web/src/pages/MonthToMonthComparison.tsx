import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

export default function MonthToMonthComparison() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  // Month selection
  const [year1, setYear1] = useState(new Date().getFullYear());
  const [month1, setMonth1] = useState(1);
  const [year2, setYear2] = useState(new Date().getFullYear());
  const [month2, setMonth2] = useState(2);
  const [category, setCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'consolidated' | 'individual'>('consolidated');
  const [comparisonMode, setComparisonMode] = useState<'selectable' | 'all'>('selectable');
  const [selectedMetric, setSelectedMetric] = useState<'basicSalary' | 'gross' | 'net'>('net');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/reports/available-years`)
      .then(res => {
        const years = res.data.years || [];
        if (years.length > 0) {
          setAvailableYears(years);
          setYear1(years[0]);
          setYear2(years[0]);
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
    if (year1 === year2 && month1 === month2) {
      alert('Please select two different months for comparison');
      return;
    }
    
    setLoading(true);
    axios.get(`${API_BASE_URL}/reports/month-to-month-comparison?year1=${year1}&month1=${month1}&year2=${year2}&month2=${month2}&category=${category}&viewMode=${viewMode}`)
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

  const categories = ['all', 'Partners/شركاء', 'Lawyers/محامين', 'Admins/عاملين', 'Consultants/مستشارين'];

  return (
    <div className="print:hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Month-to-Month Comparison</h2>
        <button onClick={handlePrint} className="px-4 py-2 bg-gray-600 text-white rounded">{t('print')}</button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Select Comparison Options</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* First Month */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">First Month</label>
            <div className="flex gap-2">
              <select
                value={year1}
                onChange={(e) => setYear1(parseInt(e.target.value))}
                className="border rounded px-3 py-2"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                value={month1}
                onChange={(e) => setMonth1(parseInt(e.target.value))}
                className="border rounded px-3 py-2 flex-1"
              >
                {monthNames.map((name, index) => (
                  <option key={index + 1} value={index + 1}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Second Month */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Second Month</label>
            <div className="flex gap-2">
              <select
                value={year2}
                onChange={(e) => setYear2(parseInt(e.target.value))}
                className="border rounded px-3 py-2"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                value={month2}
                onChange={(e) => setMonth2(parseInt(e.target.value))}
                className="border rounded px-3 py-2 flex-1"
              >
                {monthNames.map((name, index) => (
                  <option key={index + 1} value={index + 1}>{name}</option>
                ))}
              </select>
            </div>
          </div>
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
          disabled={loading || (year1 === year2 && month1 === month2)}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Comparison'}
        </button>
      </div>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-6 rounded-lg shadow border-2 border-blue-200">
              <h3 className="text-lg font-semibold mb-2 text-blue-800">First Month</h3>
              <p className="text-2xl font-bold text-blue-600">{data.month1.monthName} {data.month1.year}</p>
              <p className="text-sm text-blue-700 mt-1">Net: {data.month1.totals.net.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg shadow border-2 border-green-200">
              <h3 className="text-lg font-semibold mb-2 text-green-800">Second Month</h3>
              <p className="text-2xl font-bold text-green-600">{data.month2.monthName} {data.month2.year}</p>
              <p className="text-sm text-green-700 mt-1">Net: {data.month2.totals.net.toLocaleString()}</p>
            </div>
          </div>

          {/* Consolidated View */}
          {viewMode === 'consolidated' && (
            <>
              {/* Comparison Mode Controls */}
              <div className="mb-4 flex items-center space-x-4">
                <label className="text-gray-700">Comparison Mode:</label>
                <select
                  value={comparisonMode}
                  onChange={(e) => setComparisonMode(e.target.value as 'selectable' | 'all')}
                  className="border rounded px-3 py-2"
                >
                  <option value="selectable">Selectable Metric</option>
                  <option value="all">Show All Metrics</option>
                </select>
                {comparisonMode === 'selectable' && (
                  <>
                    <label className="text-gray-700">Metric:</label>
                    <select
                      value={selectedMetric}
                      onChange={(e) => setSelectedMetric(e.target.value as any)}
                      className="border rounded px-3 py-2"
                    >
                      <option value="basicSalary">Basic Salary</option>
                      <option value="gross">Gross</option>
                      <option value="net">Net</option>
                    </select>
                  </>
                )}
              </div>

              {/* Comparison Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                <div className="px-6 py-4 bg-gray-50 border-b">
                  <h3 className="text-lg font-semibold">Month Comparison</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {data.month1.monthName} {data.month1.year}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {data.month2.monthName} {data.month2.year}
                        </th>
                        {comparisonMode === 'selectable' ? (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Change ({selectedMetric === 'basicSalary' ? 'Basic Salary' : selectedMetric === 'gross' ? 'Gross' : 'Net'})
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              % Change ({selectedMetric === 'basicSalary' ? 'Basic Salary' : selectedMetric === 'gross' ? 'Gross' : 'Net'})
                            </th>
                          </>
                        ) : (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change (Basic Salary)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% Change (Basic Salary)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change (Gross)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% Change (Gross)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change (Net)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% Change (Net)</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {comparisonMode === 'selectable' ? (
                        <>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap font-medium">Basic Salary</td>
                            <td className="px-6 py-4 whitespace-nowrap">{data.month1.totals.basicSalary.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{data.month2.totals.basicSalary.toLocaleString()}</td>
                            {selectedMetric === 'basicSalary' && (
                              <>
                                <td className={`px-6 py-4 whitespace-nowrap font-semibold ${data.changes.basicSalary.absolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {data.changes.basicSalary.absolute >= 0 ? '+' : ''}{data.changes.basicSalary.absolute.toLocaleString()}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${data.changes.basicSalary.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {data.changes.basicSalary.percentage >= 0 ? '+' : ''}{data.changes.basicSalary.percentage.toFixed(2)}%
                                </td>
                              </>
                            )}
                            {selectedMetric !== 'basicSalary' && <td colSpan={2}></td>}
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap font-medium">Gross</td>
                            <td className="px-6 py-4 whitespace-nowrap">{data.month1.totals.gross.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{data.month2.totals.gross.toLocaleString()}</td>
                            {selectedMetric === 'gross' && (
                              <>
                                <td className={`px-6 py-4 whitespace-nowrap font-semibold ${data.changes.gross.absolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {data.changes.gross.absolute >= 0 ? '+' : ''}{data.changes.gross.absolute.toLocaleString()}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${data.changes.gross.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {data.changes.gross.percentage >= 0 ? '+' : ''}{data.changes.gross.percentage.toFixed(2)}%
                                </td>
                              </>
                            )}
                            {selectedMetric !== 'gross' && <td colSpan={2}></td>}
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap font-medium">Net</td>
                            <td className="px-6 py-4 whitespace-nowrap">{data.month1.totals.net.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{data.month2.totals.net.toLocaleString()}</td>
                            {selectedMetric === 'net' && (
                              <>
                                <td className={`px-6 py-4 whitespace-nowrap font-semibold ${data.changes.net.absolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {data.changes.net.absolute >= 0 ? '+' : ''}{data.changes.net.absolute.toLocaleString()}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${data.changes.net.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {data.changes.net.percentage >= 0 ? '+' : ''}{data.changes.net.percentage.toFixed(2)}%
                                </td>
                              </>
                            )}
                            {selectedMetric !== 'net' && <td colSpan={2}></td>}
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap font-medium">Basic Salary</td>
                            <td className="px-6 py-4 whitespace-nowrap">{data.month1.totals.basicSalary.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{data.month2.totals.basicSalary.toLocaleString()}</td>
                            <td className={`px-6 py-4 whitespace-nowrap font-semibold ${data.changes.basicSalary.absolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {data.changes.basicSalary.absolute >= 0 ? '+' : ''}{data.changes.basicSalary.absolute.toLocaleString()}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap ${data.changes.basicSalary.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {data.changes.basicSalary.percentage >= 0 ? '+' : ''}{data.changes.basicSalary.percentage.toFixed(2)}%
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap font-semibold ${data.changes.gross.absolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {data.changes.gross.absolute >= 0 ? '+' : ''}{data.changes.gross.absolute.toLocaleString()}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap ${data.changes.gross.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {data.changes.gross.percentage >= 0 ? '+' : ''}{data.changes.gross.percentage.toFixed(2)}%
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap font-semibold ${data.changes.net.absolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {data.changes.net.absolute >= 0 ? '+' : ''}{data.changes.net.absolute.toLocaleString()}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap ${data.changes.net.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {data.changes.net.percentage >= 0 ? '+' : ''}{data.changes.net.percentage.toFixed(2)}%
                            </td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap font-medium">Gross</td>
                            <td className="px-6 py-4 whitespace-nowrap">{data.month1.totals.gross.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{data.month2.totals.gross.toLocaleString()}</td>
                            <td colSpan={6}></td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap font-medium">Net</td>
                            <td className="px-6 py-4 whitespace-nowrap">{data.month1.totals.net.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{data.month2.totals.net.toLocaleString()}</td>
                            <td colSpan={6}></td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detailed Totals */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b">
                  <h3 className="text-lg font-semibold">Detailed Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {data.month1.monthName} {data.month1.year}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {data.month2.monthName} {data.month2.year}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% Change</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {['basicSalary', 'directAdditions', 'indirectAdditions', 'bonuses', 'gross', 'salaryDeductions', 'grossDeductions', 'net'].map(metric => {
                        const change = data.changes[metric];
                        if (!change) return null;
                        const metricName = metric.replace(/([A-Z])/g, ' $1').trim();
                        return (
                          <tr key={metric} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap font-medium">{metricName}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{data.month1.totals[metric].toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{data.month2.totals[metric].toLocaleString()}</td>
                            <td className={`px-6 py-4 whitespace-nowrap font-semibold ${change.absolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {change.absolute >= 0 ? '+' : ''}{change.absolute.toLocaleString()}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap ${change.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {change.percentage >= 0 ? '+' : ''}{change.percentage.toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Individual View */}
          {viewMode === 'individual' && data.employeeComparison && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold">Employee Comparison</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {data.employeeComparison.length} employees
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th colSpan={3} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase border-l">
                        {data.month1.monthName} {data.month1.year}
                      </th>
                      <th colSpan={3} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase border-l">
                        {data.month2.monthName} {data.month2.year}
                      </th>
                      <th colSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase border-l">
                        Change (Net)
                      </th>
                    </tr>
                    <tr>
                      <th></th>
                      <th></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase border-l">Basic</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase border-l">Basic</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase border-l">Absolute</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">%</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.employeeComparison.map((emp: any, index: number) => {
                      const change = emp.changes?.net;
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium">{emp.employee.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{emp.employee.category || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap border-l">
                            {emp.month1 ? emp.month1.basicSalary.toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {emp.month1 ? emp.month1.gross.toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {emp.month1 ? emp.month1.net.toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap border-l">
                            {emp.month2 ? emp.month2.basicSalary.toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {emp.month2 ? emp.month2.gross.toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {emp.month2 ? emp.month2.net.toLocaleString() : '-'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap border-l font-semibold ${change && change.absolute >= 0 ? 'text-green-600' : change && change.absolute < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {change ? (change.absolute >= 0 ? '+' : '') + change.absolute.toLocaleString() : '-'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap ${change && change.percentage >= 0 ? 'text-green-600' : change && change.percentage < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {change ? (change.percentage >= 0 ? '+' : '') + change.percentage.toFixed(2) + '%' : '-'}
                          </td>
                        </tr>
                      );
                    })}
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

