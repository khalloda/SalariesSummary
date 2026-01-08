import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useBonusHalfSwitch } from '../hooks/useBonusHalfSwitch';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AnnualBonusReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [includeConsultants, setIncludeConsultants] = useState(true);
  const [viewMode, setViewMode] = useState<'consolidated' | 'individual'>('consolidated');
  const [printMode, setPrintMode] = useState<'by-category' | 'table-only' | 'table-with-charts'>('table-only');
  const [exportMode, setExportMode] = useState<'by-category' | 'table-only' | 'table-with-charts'>('table-only');
  const [exporting, setExporting] = useState(false);
  const showHalves = useBonusHalfSwitch();

  useEffect(() => {
    axios.get(`${API_BASE_URL}/reports/available-years`)
      .then(res => {
        const years = res.data.years || [];
        if (years.length > 0) {
          setAvailableYears(years);
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

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_BASE_URL}/reports/annual-bonus?year=${year}&includeConsultants=${includeConsultants}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [year, includeConsultants]);

  const handlePrint = () => {
    // Add print mode class to body for CSS targeting
    document.body.setAttribute('data-print-mode', printMode);
    window.print();
    // Clean up after print
    setTimeout(() => {
      document.body.removeAttribute('data-print-mode');
    }, 1000);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/exports/annual-bonus-report/pdf`,
        {
          year,
          includeConsultants,
          viewMode,
          exportMode,
          showHalves,
          data: {
            grandTotal: totalsToShow,
            categoryTotals,
            growthRatios,
            categoryChartData
          }
        },
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Annual_Bonus_Report_${year}_${exportMode}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('PDF export error:', error);
      alert(`Failed to export PDF: ${error.response?.data?.error || error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportXLSX = async () => {
    setExporting(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/exports/annual-bonus-report/xlsx`,
        {
          year,
          includeConsultants,
          viewMode,
          exportMode,
          data: {
            grandTotal: totalsToShow,
            categoryTotals,
            growthRatios
          }
        },
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Annual_Bonus_Report_${year}_${exportMode}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('XLSX export error:', error);
      alert(`Failed to export XLSX: ${error.response?.data?.error || error.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Extract data safely
  const grandTotal = data?.grandTotal || {
    totalBonus: 0,
    totalFirstHalf: 0,
    totalSecondHalf: 0,
    totalPreviousYear: 0,
    employeeCount: 0,
    averageBonus: 0
  };
  const totalsWithoutConsultants = data?.totalsWithoutConsultants || {
    totalBonus: 0,
    totalFirstHalf: 0,
    totalSecondHalf: 0,
    totalPreviousYear: 0,
    employeeCount: 0,
    averageBonus: 0
  };
  const growthRatios = data?.growthRatios || { netSalary: null, grossSalary: null };
  const categoryTotals = data?.categoryTotals || {};

  // Prepare chart data
  const categoryChartData = Object.entries(categoryTotals).map(([category, totals]: [string, any]) => ({
    name: category.split('/')[0],
    totalBonus: totals.totalBonus,
    employeeCount: totals.employeeCount,
    averageBonus: totals.averageBonus
  }));

  const totalsToShow = includeConsultants ? grandTotal : totalsWithoutConsultants;

  return (
    <div className="print-container">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h2 className="text-2xl font-bold">Annual Bonus Report - {year}</h2>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeConsultants}
              onChange={(e) => setIncludeConsultants(e.target.checked)}
              className="rounded"
            />
            <span>Include Consultants</span>
          </label>
          {availableYears.length > 0 && (
            <select
              value={year}
              onChange={(e) => {
                setSearchParams({ year: e.target.value });
              }}
              className="border rounded px-3 py-2"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
          {availableYears.length === 0 && (
            <select
              value={year}
              onChange={(e) => {
                setSearchParams({ year: e.target.value });
              }}
              className="border rounded px-3 py-2"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
          <div className="flex items-center space-x-2">
            <label className="text-sm">
              Print Mode:
              <select
                value={printMode}
                onChange={(e) => setPrintMode(e.target.value as any)}
                className="ml-2 border rounded px-2 py-1 text-sm"
              >
                <option value="by-category">By Category</option>
                <option value="table-only">Table Only</option>
                <option value="table-with-charts">Table with Charts</option>
              </select>
            </label>
            <button 
              onClick={handlePrint} 
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              {t('print')}
            </button>
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <label className="text-sm">
              Export Mode:
              <select
                value={exportMode}
                onChange={(e) => setExportMode(e.target.value as any)}
                className="ml-2 border rounded px-2 py-1 text-sm"
              >
                <option value="by-category">By Category</option>
                <option value="table-only">Table Only</option>
                <option value="table-with-charts">Table with Charts</option>
              </select>
            </label>
            <button 
              onClick={handleExportPDF} 
              disabled={exporting}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
            <button 
              onClick={handleExportXLSX} 
              disabled={exporting}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export XLSX'}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading bonus data...</p>
        </div>
      )}

      {!loading && (!data || Object.keys(categoryTotals).length === 0) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-6">
          <p className="text-yellow-700">No bonus data found for {year}. Please import bonus data for this year.</p>
        </div>
      )}

      {!loading && data && Object.keys(categoryTotals).length > 0 && (
        <>
          {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 print-summary-cards">
        <div className="bg-green-50 p-6 rounded-lg shadow border-2 border-green-200">
          <h3 className="text-lg font-semibold mb-2 text-green-800">Total Bonus</h3>
          <p className="text-3xl font-bold text-green-600">{totalsToShow.totalBonus.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-2 text-blue-800">{t('totalEmployeesLabel')}</h3>
          <p className="text-3xl font-bold text-blue-600">{totalsToShow.employeeCount}</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg shadow border-2 border-purple-200">
          <h3 className="text-lg font-semibold mb-2 text-purple-800">Average Bonus</h3>
          <p className="text-3xl font-bold text-purple-600">{Math.round(totalsToShow.averageBonus).toLocaleString()}</p>
        </div>
        <div className="bg-orange-50 p-6 rounded-lg shadow border-2 border-orange-200">
          <h3 className="text-lg font-semibold mb-2 text-orange-800">Growth Ratio</h3>
          <p className={`text-3xl font-bold ${growthRatios?.netSalary && growthRatios.netSalary >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {growthRatios?.netSalary !== null && growthRatios.netSalary !== undefined
              ? `${growthRatios.netSalary >= 0 ? '+' : ''}${growthRatios.netSalary.toFixed(2)}%`
              : 'N/A'}
          </p>
        </div>
      </div>

      {/* Category Comparison Chart */}
      {categoryChartData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6 print-chart-section">
          <h3 className="text-xl font-semibold mb-4">Bonus by Category</h3>
          <div style={{ width: '100%', height: '400px', minWidth: 300, minHeight: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend />
                <Bar dataKey="totalBonus" fill="#8884d8" name="Total Bonus" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Totals Table - Consolidated View */}
      <div className={`bg-white rounded-lg shadow overflow-hidden mb-6 print-table-section ${viewMode === 'consolidated' ? '' : 'hidden print:block'}`}>
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Category Breakdown</h3>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="border rounded px-3 py-2 print:hidden"
          >
            <option value="consolidated">Consolidated</option>
            <option value="individual">Individual</option>
          </select>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Bonus</th>
                  {showHalves && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">First Half</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Second Half</th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Average Bonus</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Previous Year</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(() => {
                  // Define category order: Partners, Lawyers, Admins, Consultants, then others
                  const categoryOrder = [
                    'Partners/شركاء',
                    'Lawyers/محامين',
                    'Admins/عاملين',
                    'Consultants/مستشارين'
                  ];
                  
                  // Sort categories: first by predefined order, then alphabetically for others
                  const sortedCategories = Object.entries(categoryTotals).sort(([catA], [catB]) => {
                    const indexA = categoryOrder.indexOf(catA);
                    const indexB = categoryOrder.indexOf(catB);
                    
                    // If both are in predefined order, sort by index
                    if (indexA !== -1 && indexB !== -1) {
                      return indexA - indexB;
                    }
                    // If only A is in predefined order, A comes first
                    if (indexA !== -1) return -1;
                    // If only B is in predefined order, B comes first
                    if (indexB !== -1) return 1;
                    // Both are not in predefined order, sort alphabetically
                    return catA.localeCompare(catB);
                  });
                  
                  return sortedCategories.map(([category, totals]: [string, any]) => (
                    <tr key={category} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{category}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{totals.employeeCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold">{totals.totalBonus.toLocaleString()}</td>
                      {showHalves && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">{totals.totalFirstHalf.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{totals.totalSecondHalf.toLocaleString()}</td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">{Math.round(totals.averageBonus).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{totals.totalPreviousYear.toLocaleString()}</td>
                    </tr>
                  ));
                })()}
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap">Total</td>
                  <td className="px-6 py-4 whitespace-nowrap">{totalsToShow.employeeCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{totalsToShow.totalBonus.toLocaleString()}</td>
                  {showHalves && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">{totalsToShow.totalFirstHalf.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{totalsToShow.totalSecondHalf.toLocaleString()}</td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">{Math.round(totalsToShow.averageBonus).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{totalsToShow.totalPreviousYear.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      
      {/* Category Totals Table - Individual View */}
      <div className={`p-6 space-y-6 print-category-section ${viewMode === 'individual' ? '' : 'hidden print:hidden'}`}>
            {(() => {
              // Define category order: Partners, Lawyers, Admins, Consultants, then others
              const categoryOrder = [
                'Partners/شركاء',
                'Lawyers/محامين',
                'Admins/عاملين',
                'Consultants/مستشارين'
              ];
              
              // Sort categories: first by predefined order, then alphabetically for others
              const sortedCategories = Object.entries(categoryTotals).sort(([catA], [catB]) => {
                const indexA = categoryOrder.indexOf(catA);
                const indexB = categoryOrder.indexOf(catB);
                
                // If both are in predefined order, sort by index
                if (indexA !== -1 && indexB !== -1) {
                  return indexA - indexB;
                }
                // If only A is in predefined order, A comes first
                if (indexA !== -1) return -1;
                // If only B is in predefined order, B comes first
                if (indexB !== -1) return 1;
                // Both are not in predefined order, sort alphabetically
                return catA.localeCompare(catB);
              });
              
              return sortedCategories.map(([category, totals]: [string, any]) => (
                <div key={category} className="border rounded-lg p-4">
                  <h4 className="font-semibold text-lg mb-4">{category} ({totals.employeeCount} employees)</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Bonus</th>
                          {showHalves && (
                            <>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">First Half</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Second Half</th>
                            </>
                          )}
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reflected (Months)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reflected (%)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(totals.employees || []).map((emp: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">{emp.employee?.name || 'Unknown'}</td>
                            <td className="px-6 py-4 whitespace-nowrap font-semibold">{emp.bonus?.toLocaleString() || '0'}</td>
                            {showHalves && (
                              <>
                                <td className="px-6 py-4 whitespace-nowrap">{emp.bonusFirstHalf?.toLocaleString() || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{emp.bonusSecondHalf?.toLocaleString() || '-'}</td>
                              </>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">{emp.reflectedInMonths?.toFixed(2) || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{emp.reflectedInPercent?.toFixed(2) || '-'}%</td>
                          </tr>
                        ))}
                        {/* Category Totals Row */}
                        <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                          <td className="px-6 py-4 whitespace-nowrap">Total - {category}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{totals.totalBonus.toLocaleString()}</td>
                          {showHalves && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap">{totals.totalFirstHalf.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{totals.totalSecondHalf.toLocaleString()}</td>
                            </>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">-</td>
                          <td className="px-6 py-4 whitespace-nowrap">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ));
            })()}
            
            {/* Grand Totals */}
            <div className="border-2 border-gray-400 rounded-lg p-4 bg-gray-50">
              <h4 className="font-bold text-xl mb-4">Grand Totals</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Metric</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total Bonus</th>
                      {showHalves && (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">First Half</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Second Half</th>
                        </>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Average Bonus</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Previous Year</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr className="font-bold">
                      <td className="px-6 py-4 whitespace-nowrap">{t('allCategories')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-green-600">{totalsToShow.totalBonus.toLocaleString()}</td>
                      {showHalves && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">{totalsToShow.totalFirstHalf.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{totalsToShow.totalSecondHalf.toLocaleString()}</td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">{Math.round(totalsToShow.averageBonus).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{totalsToShow.totalPreviousYear.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{t('totalEmployeesLabel')}</td>
                      <td colSpan={showHalves ? 5 : 3} className="px-6 py-4 whitespace-nowrap font-semibold">{totalsToShow.employeeCount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

