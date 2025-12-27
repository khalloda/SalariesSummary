import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function EmployeeAnnual() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'details' | 'charts' | 'multiYear' | 'monthComparison'>('summary');
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar');
  const [chartMetric, setChartMetric] = useState<string>('net');
  const [allYearsData, setAllYearsData] = useState<any>(null);
  const [loadingAllYears, setLoadingAllYears] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  useEffect(() => {
    // Fetch available years
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
  const [comparisonMode, setComparisonMode] = useState<'selectable' | 'all'>('selectable');
  const [selectedMetric, setSelectedMetric] = useState<'basicSalary' | 'gross' | 'net'>('basicSalary');
  
  // Month-to-Month comparison state
  const [monthComparisonMode, setMonthComparisonMode] = useState<'selectable' | 'all'>('selectable');
  const [selectedMonthMetric, setSelectedMonthMetric] = useState<'basicSalary' | 'gross' | 'net'>('basicSalary');
  const [month1, setMonth1] = useState<number>(1);
  const [year1, setYear1] = useState<number>(new Date().getFullYear());
  const [month2, setMonth2] = useState<number>(2);
  const [year2, setYear2] = useState<number>(new Date().getFullYear());
  
  useEffect(() => {
    axios.get(`${API_BASE_URL}/employees/${id}/annual?year=${year}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id, year]);

  useEffect(() => {
    if (activeTab === 'multiYear' || activeTab === 'monthComparison') {
      setLoadingAllYears(true);
      axios.get(`${API_BASE_URL}/employees/${id}/all-years`)
        .then(res => setAllYearsData(res.data))
        .catch(err => {
          console.error(err);
          setAllYearsData(null);
        })
        .finally(() => setLoadingAllYears(false));
    }
  }, [id, activeTab]);
  
  const handleExport = async (format: string) => {
    try {
      const url = `${API_BASE_URL}/exports/employee/${id}/annual?year=${year}&format=${format}`;
      const response = await axios.get(url, {
        responseType: 'blob',
        headers: {
          'Accept': format === 'pdf' ? 'application/pdf' : 
                   format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                   'text/csv'
        }
      });
      
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${data.employee.name}_${year}.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
          try {
            filename = decodeURIComponent(filename);
          } catch (e) {}
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      console.error('Export error:', error);
      alert(`Failed to export ${format.toUpperCase()}: ${error.response?.data?.error || error.message}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };
  
  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data found</div>;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const record = data.monthlyData.find((r: any) => r.month === month);
    return {
      month: monthNames[month - 1].substring(0, 3),
      fullMonth: monthNames[month - 1],
      basicSalary: record?.basicSalary || 0,
      gross: record?.gross || 0,
      net: record?.net || 0,
      directAdditions: record?.directAdditions || 0,
      indirectAdditions: record?.indirectAdditions || 0,
      bonuses: record?.bonuses || 0,
      salaryDeductions: record?.salaryDeductions || 0
    };
  });

  // Prepare additions breakdown data
  const additionsData = Object.entries(data.additionsByCategory || {}).map(([key, value]) => ({
    name: key.replace(/([A-Z])/g, ' $1').trim(),
    value: value as number
  }));

  // Prepare deductions breakdown data
  const deductionsData = Object.entries(data.deductionsByCategory || {}).map(([key, value]) => ({
    name: key.replace(/([A-Z])/g, ' $1').trim(),
    value: value as number
  }));

  return (
    <div className="print-container">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h2 className="text-2xl font-bold">{data.employee.name} - {year}</h2>
        <div className="flex gap-2">
          <select
            value={year}
            onChange={(e) => setSearchParams({ year: e.target.value })}
            className="border rounded px-3 py-2"
            >
              {availableYears.length > 0 ? (
                availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))
              ) : (
                Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))
              )}
            </select>
          <button onClick={() => handleExport('pdf')} className="px-4 py-2 bg-red-600 text-white rounded">{t('exportPDF')}</button>
          <button onClick={() => handleExport('csv')} className="px-4 py-2 bg-green-600 text-white rounded">{t('exportCSV')}</button>
          <button onClick={() => handleExport('xlsx')} className="px-4 py-2 bg-blue-600 text-white rounded">{t('exportXLSX')}</button>
          <button onClick={handlePrint} className="px-4 py-2 bg-gray-600 text-white rounded">Print</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4 print:hidden">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'summary'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'charts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Charts
          </button>
          <button
            onClick={() => setActiveTab('multiYear')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'multiYear'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Multi-Year Comparison
          </button>
          <button
            onClick={() => setActiveTab('monthComparison')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'monthComparison'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Month-to-Month Comparison
          </button>
        </nav>
      </div>

      {/* Category Changes Section - Show on all tabs */}
      {data.categoryChanges && data.categoryChanges.length > 0 && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">Category Changes / تغييرات الفئة</h3>
          <div className="space-y-3">
            {data.categoryChanges.map((change: any, index: number) => {
              // Format the message based on whether there was a previous category
              const getCategoryName = (cat: string | null) => {
                if (!cat) return null;
                // Extract Arabic part if available (format: "English/Arabic")
                const parts = cat.split('/');
                return parts.length > 1 ? parts[1] : parts[0];
              };
              
              const fromCategoryName = getCategoryName(change.fromCategory);
              const toCategoryName = getCategoryName(change.toCategory);
              
              return (
                <div key={index} className="text-sm text-yellow-800 bg-white p-3 rounded border border-yellow-200">
                  {change.fromCategory ? (
                    <div>
                      <div className="font-medium">
                        {data.employee.name} was in <strong>{change.fromCategory}</strong> until {change.monthName} {change.year}
                      </div>
                      <div className="mt-1 text-yellow-700">
                        {data.employee.name} كان في <strong>{fromCategoryName || change.fromCategory}</strong> حتى {change.monthName} {change.year}
                      </div>
                      <div className="font-medium mt-2">
                        Changed to <strong>{change.toCategory}</strong> in {change.monthName} {change.year}
                      </div>
                      <div className="mt-1 text-yellow-700">
                        تغير إلى <strong>{toCategoryName || change.toCategory}</strong> في {change.monthName} {change.year}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">
                        Assigned to <strong>{change.toCategory}</strong> in {change.monthName} {change.year}
                      </div>
                      <div className="mt-1 text-yellow-700">
                        تم تعيينه إلى <strong>{toCategoryName || change.toCategory}</strong> في {change.monthName} {change.year}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('month')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('basicSalary')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('gross')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('net')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                const record = data.monthlyData.find((r: any) => r.month === month);
                return (
                  <tr key={month} className={!record ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">{monthNames[month - 1]}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{record?.basicSalary?.toLocaleString() || '0'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{record?.gross?.toLocaleString() || '0'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{record?.net?.toLocaleString() || '0'}</td>
                  </tr>
                );
              })}
              <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                <td className="px-6 py-4 whitespace-nowrap">TOTAL</td>
                <td className="px-6 py-4 whitespace-nowrap">{data.totals?.basicSalary?.toLocaleString() || '0'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{data.totals?.gross?.toLocaleString() || '0'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{data.totals?.net?.toLocaleString() || '0'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="space-y-4">
          {/* Monthly Details Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none">
            <h3 className="text-lg font-semibold p-4 bg-gray-50">Monthly Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic Salary</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direct Additions</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Indirect Additions</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yearly Increase</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bonuses</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                    const record = data.monthlyData.find((r: any) => r.month === month);
                    return (
                      <tr key={month} className={!record ? 'bg-gray-50 opacity-60' : ''}>
                        <td className="px-4 py-3 whitespace-nowrap">{monthNames[month - 1]}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{record?.basicSalary?.toLocaleString() || '0'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{record?.directAdditions?.toLocaleString() || '0'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{record?.indirectAdditions?.toLocaleString() || '0'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{record?.yearlyIncrease?.toLocaleString() || '0'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{record?.bonuses?.toLocaleString() || '0'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{((record?.salaryDeductions || 0) + (record?.grossDeductions || 0)).toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{record?.gross?.toLocaleString() || '0'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{record?.net?.toLocaleString() || '0'}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                    <td className="px-4 py-3 whitespace-nowrap">TOTAL</td>
                    <td className="px-4 py-3 whitespace-nowrap">{data.totals?.basicSalary?.toLocaleString() || '0'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{data.totals?.directAdditions?.toLocaleString() || '0'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{data.totals?.indirectAdditions?.toLocaleString() || '0'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{data.totals?.yearlyIncrease?.toLocaleString() || '0'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{data.totals?.bonuses?.toLocaleString() || '0'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{((data.totals?.salaryDeductions || 0) + (data.totals?.grossDeductions || 0)).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{data.totals?.gross?.toLocaleString() || '0'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{data.totals?.net?.toLocaleString() || '0'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Additions Breakdown */}
          {additionsData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 print:shadow-none">
              <h3 className="text-lg font-semibold mb-4">Additions Breakdown (Annual Total)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {additionsData.map((item, index) => (
                  <div key={index} className="border rounded p-3">
                    <div className="text-sm text-gray-600">{item.name}</div>
                    <div className="text-lg font-semibold">{item.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deductions Breakdown */}
          {deductionsData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 print:shadow-none">
              <h3 className="text-lg font-semibold mb-4">Deductions Breakdown (Annual Total)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {deductionsData.map((item, index) => (
                  <div key={index} className="border rounded p-3">
                    <div className="text-sm text-gray-600">{item.name}</div>
                    <div className="text-lg font-semibold">{item.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts Tab */}
      {activeTab === 'charts' && (
        <div className="space-y-4">
          {/* Chart Controls */}
          <div className="bg-white p-4 rounded-lg shadow print:hidden">
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

          {/* Monthly Trend Chart */}
          <div className="bg-white p-4 rounded-lg shadow print:shadow-none">
            <h3 className="text-xl font-semibold mb-4">
              Monthly {chartMetric.charAt(0).toUpperCase() + chartMetric.slice(1).replace(/([A-Z])/g, ' $1')} Trend
            </h3>
            <div style={{ width: '100%', height: '400px' }}>
              <ResponsiveContainer>
                {chartType === 'bar' && (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Legend />
                    <Bar dataKey={chartMetric} fill="#0088FE" />
                  </BarChart>
                )}
                {chartType === 'pie' && (
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ fullMonth, [chartMetric]: value }) => `${fullMonth}: ${value.toLocaleString()}`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey={chartMetric}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  </PieChart>
                )}
                {chartType === 'line' && (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Legend />
                    <Line type="monotone" dataKey={chartMetric} stroke="#0088FE" strokeWidth={2} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Additions Pie Chart */}
          {additionsData.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow print:shadow-none">
              <h3 className="text-xl font-semibold mb-4">Additions Breakdown</h3>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={additionsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {additionsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Deductions Pie Chart */}
          {deductionsData.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow print:shadow-none">
              <h3 className="text-xl font-semibold mb-4">Deductions Breakdown</h3>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={deductionsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {deductionsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Multi-Year Comparison Tab */}
      {activeTab === 'multiYear' && (
        <div className="space-y-4">
          {loadingAllYears ? (
            <div className="text-center py-8">Loading multi-year data...</div>
          ) : !allYearsData || !allYearsData.years || allYearsData.years.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No multi-year data available</div>
          ) : (
            <>
              {/* Year-over-Year Totals Chart */}
              <div className="bg-white p-4 rounded-lg shadow print:shadow-none">
                <h3 className="text-xl font-semibold mb-4">Year-over-Year Totals Trend</h3>
                <div style={{ width: '100%', height: '400px' }}>
                  <ResponsiveContainer>
                    <LineChart data={allYearsData.years.map((year: number) => ({
                      year: year.toString(),
                      basicSalary: allYearsData.yearTotals[year]?.basicSalary || 0,
                      gross: allYearsData.yearTotals[year]?.gross || 0,
                      net: allYearsData.yearTotals[year]?.net || 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => value.toLocaleString()} />
                      <Legend />
                      <Line type="monotone" dataKey="basicSalary" stroke="#0088FE" strokeWidth={2} name="Basic Salary" />
                      <Line type="monotone" dataKey="gross" stroke="#00C49F" strokeWidth={2} name="Gross" />
                      <Line type="monotone" dataKey="net" stroke="#FFBB28" strokeWidth={2} name="Net" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly Trend Across All Years */}
              {allYearsData.allRecords && allYearsData.allRecords.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow print:shadow-none">
                  <h3 className="text-xl font-semibold mb-4">Monthly Basic Salary Trend (All Years)</h3>
                  <div style={{ width: '100%', height: '500px' }}>
                    <ResponsiveContainer>
                      <LineChart data={allYearsData.allRecords.map((r: any) => ({
                        date: `${r.year}-${String(r.month).padStart(2, '0')}`,
                        monthYear: `${r.monthName} ${r.year}`,
                        basicSalary: r.basicSalary,
                        gross: r.gross,
                        net: r.net
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          interval={allYearsData.allRecords.length > 24 ? 2 : 0}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => value.toLocaleString()}
                          labelFormatter={(label) => {
                            const record = allYearsData.allRecords.find((r: any) => 
                              `${r.year}-${String(r.month).padStart(2, '0')}` === label
                            );
                            return record ? `${record.monthName} ${record.year}` : label;
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="basicSalary" stroke="#0088FE" strokeWidth={2} name="Basic Salary" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="gross" stroke="#00C49F" strokeWidth={2} name="Gross" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="net" stroke="#FFBB28" strokeWidth={2} name="Net" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Year-over-Year Comparison Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none">
                <div className="p-4 bg-gray-50 flex justify-between items-center flex-wrap gap-4 print:hidden">
                  <h3 className="text-lg font-semibold">Year-over-Year Comparison</h3>
                  <div className="flex gap-4 items-center flex-wrap">
                    <div>
                      <label className="mr-2 text-sm">Comparison Mode:</label>
                      <select
                        value={comparisonMode}
                        onChange={(e) => setComparisonMode(e.target.value as 'selectable' | 'all')}
                        className="border rounded px-3 py-2 text-sm"
                      >
                        <option value="selectable">Selectable Metric</option>
                        <option value="all">Show All Metrics</option>
                      </select>
                    </div>
                    {comparisonMode === 'selectable' && (
                      <div>
                        <label className="mr-2 text-sm">Metric:</label>
                        <select
                          value={selectedMetric}
                          onChange={(e) => setSelectedMetric(e.target.value as 'basicSalary' | 'gross' | 'net')}
                          className="border rounded px-3 py-2 text-sm"
                        >
                          <option value="basicSalary">Basic Salary</option>
                          <option value="gross">Gross</option>
                          <option value="net">Net</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Months</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic Salary</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
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
                      {allYearsData.years.map((year: number, index: number) => {
                        const current = allYearsData.yearTotals[year];
                        const previous = index > 0 ? allYearsData.yearTotals[allYearsData.years[index - 1]] : null;
                        const monthsCount = allYearsData.byYear[year]?.length || 0;
                        
                        // Calculate changes for all metrics
                        const basicSalaryChange = previous ? current.basicSalary - previous.basicSalary : 0;
                        const basicSalaryPercentChange = previous && previous.basicSalary > 0 
                          ? ((basicSalaryChange / previous.basicSalary) * 100) 
                          : 0;
                        
                        const grossChange = previous ? current.gross - previous.gross : 0;
                        const grossPercentChange = previous && previous.gross > 0 
                          ? ((grossChange / previous.gross) * 100) 
                          : 0;
                        
                        const netChange = previous ? current.net - previous.net : 0;
                        const netPercentChange = previous && previous.net > 0 
                          ? ((netChange / previous.net) * 100) 
                          : 0;
                        
                        // Get selected metric values for selectable mode
                        const selectedChange = selectedMetric === 'basicSalary' ? basicSalaryChange :
                                              selectedMetric === 'gross' ? grossChange : netChange;
                        const selectedPercentChange = selectedMetric === 'basicSalary' ? basicSalaryPercentChange :
                                                     selectedMetric === 'gross' ? grossPercentChange : netPercentChange;
                        
                        return (
                          <tr key={year} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap font-semibold">{year}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{monthsCount}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{current.basicSalary.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{current.gross.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{current.net.toLocaleString()}</td>
                            
                            {comparisonMode === 'selectable' ? (
                              <>
                                <td className={`px-6 py-4 whitespace-nowrap font-semibold ${selectedChange > 0 ? 'text-green-600' : selectedChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {index > 0 && (selectedChange > 0 ? '+' : '')}{selectedChange.toLocaleString()}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${selectedPercentChange > 0 ? 'text-green-600' : selectedPercentChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {index > 0 && (selectedPercentChange > 0 ? '+' : '')}{selectedPercentChange.toFixed(2)}%
                                </td>
                              </>
                            ) : (
                              <>
                                {/* Basic Salary Change */}
                                <td className={`px-6 py-4 whitespace-nowrap font-semibold ${basicSalaryChange > 0 ? 'text-green-600' : basicSalaryChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {index > 0 && (basicSalaryChange > 0 ? '+' : '')}{basicSalaryChange.toLocaleString()}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${basicSalaryPercentChange > 0 ? 'text-green-600' : basicSalaryPercentChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {index > 0 && (basicSalaryPercentChange > 0 ? '+' : '')}{basicSalaryPercentChange.toFixed(2)}%
                                </td>
                                {/* Gross Change */}
                                <td className={`px-6 py-4 whitespace-nowrap font-semibold ${grossChange > 0 ? 'text-green-600' : grossChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {index > 0 && (grossChange > 0 ? '+' : '')}{grossChange.toLocaleString()}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${grossPercentChange > 0 ? 'text-green-600' : grossPercentChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {index > 0 && (grossPercentChange > 0 ? '+' : '')}{grossPercentChange.toFixed(2)}%
                                </td>
                                {/* Net Change */}
                                <td className={`px-6 py-4 whitespace-nowrap font-semibold ${netChange > 0 ? 'text-green-600' : netChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {index > 0 && (netChange > 0 ? '+' : '')}{netChange.toLocaleString()}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${netPercentChange > 0 ? 'text-green-600' : netPercentChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {index > 0 && (netPercentChange > 0 ? '+' : '')}{netPercentChange.toFixed(2)}%
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Year-over-Year Bar Chart */}
              <div className="bg-white p-4 rounded-lg shadow print:shadow-none">
                <h3 className="text-xl font-semibold mb-4">Year-over-Year Comparison (Bar Chart)</h3>
                <div style={{ width: '100%', height: '400px' }}>
                  <ResponsiveContainer>
                    <BarChart data={allYearsData.years.map((year: number) => ({
                      year: year.toString(),
                      basicSalary: allYearsData.yearTotals[year]?.basicSalary || 0,
                      gross: allYearsData.yearTotals[year]?.gross || 0,
                      net: allYearsData.yearTotals[year]?.net || 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => value.toLocaleString()} />
                      <Legend />
                      <Bar dataKey="basicSalary" fill="#0088FE" name="Basic Salary" />
                      <Bar dataKey="gross" fill="#00C49F" name="Gross" />
                      <Bar dataKey="net" fill="#FFBB28" name="Net" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Month-to-Month Comparison Tab */}
      {activeTab === 'monthComparison' && (
        <div className="space-y-4">
          {loadingAllYears ? (
            <div className="text-center py-8">Loading data...</div>
          ) : !allYearsData || !allYearsData.allRecords || allYearsData.allRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No data available</div>
          ) : (
            <>
              {/* Month Selection Controls */}
              <div className="bg-white p-4 rounded-lg shadow print:hidden">
                <h3 className="text-lg font-semibold mb-4">Select Months to Compare</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Month Selection */}
                  <div className="border rounded p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Month</label>
                    <div className="flex gap-2">
                      <select
                        value={month1}
                        onChange={(e) => setMonth1(parseInt(e.target.value))}
                        className="border rounded px-3 py-2 flex-1"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>
                            {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                      <select
                        value={year1}
                        onChange={(e) => setYear1(parseInt(e.target.value))}
                        className="border rounded px-3 py-2"
                      >
                        {allYearsData.years && allYearsData.years.map((y: number) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Second Month Selection */}
                  <div className="border rounded p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Second Month</label>
                    <div className="flex gap-2">
                      <select
                        value={month2}
                        onChange={(e) => setMonth2(parseInt(e.target.value))}
                        className="border rounded px-3 py-2 flex-1"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>
                            {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                      <select
                        value={year2}
                        onChange={(e) => setYear2(parseInt(e.target.value))}
                        className="border rounded px-3 py-2"
                      >
                        {allYearsData.years && allYearsData.years.map((y: number) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Month-to-Month Comparison Table */}
              {(() => {
                const record1 = allYearsData.allRecords.find((r: any) => r.year === year1 && r.month === month1);
                const record2 = allYearsData.allRecords.find((r: any) => r.year === year2 && r.month === month2);

                if (!record1 || !record2) {
                  return (
                    <div className="bg-white p-4 rounded-lg shadow text-center text-gray-500">
                      {!record1 && !record2 
                        ? `No data available for both selected months.`
                        : !record1 
                        ? `No data available for ${new Date(2000, month1 - 1).toLocaleString('default', { month: 'long' })} ${year1}.`
                        : `No data available for ${new Date(2000, month2 - 1).toLocaleString('default', { month: 'long' })} ${year2}.`}
                    </div>
                  );
                }

                // Calculate changes for all metrics
                const basicSalaryChange = record2.basicSalary - record1.basicSalary;
                const basicSalaryPercentChange = record1.basicSalary > 0 
                  ? ((basicSalaryChange / record1.basicSalary) * 100) 
                  : 0;

                const grossChange = record2.gross - record1.gross;
                const grossPercentChange = record1.gross > 0 
                  ? ((grossChange / record1.gross) * 100) 
                  : 0;

                const netChange = record2.net - record1.net;
                const netPercentChange = record1.net > 0 
                  ? ((netChange / record1.net) * 100) 
                  : 0;

                // Get selected metric values for selectable mode
                const selectedChange = selectedMonthMetric === 'basicSalary' ? basicSalaryChange :
                                      selectedMonthMetric === 'gross' ? grossChange : netChange;
                const selectedPercentChange = selectedMonthMetric === 'basicSalary' ? basicSalaryPercentChange :
                                             selectedMonthMetric === 'gross' ? grossPercentChange : netPercentChange;

                return (
                  <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none">
                    <div className="p-4 bg-gray-50 flex justify-between items-center flex-wrap gap-4 print:hidden">
                      <h3 className="text-lg font-semibold">
                        Comparison: {record1.monthName} {year1} vs {record2.monthName} {year2}
                      </h3>
                      <div className="flex gap-4 items-center flex-wrap">
                        <div>
                          <label className="mr-2 text-sm">Comparison Mode:</label>
                          <select
                            value={monthComparisonMode}
                            onChange={(e) => setMonthComparisonMode(e.target.value as 'selectable' | 'all')}
                            className="border rounded px-3 py-2 text-sm"
                          >
                            <option value="selectable">Selectable Metric</option>
                            <option value="all">Show All Metrics</option>
                          </select>
                        </div>
                        {monthComparisonMode === 'selectable' && (
                          <div>
                            <label className="mr-2 text-sm">Metric:</label>
                            <select
                              value={selectedMonthMetric}
                              onChange={(e) => setSelectedMonthMetric(e.target.value as 'basicSalary' | 'gross' | 'net')}
                              className="border rounded px-3 py-2 text-sm"
                            >
                              <option value="basicSalary">Basic Salary</option>
                              <option value="gross">Gross</option>
                              <option value="net">Net</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic Salary</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                            {monthComparisonMode === 'selectable' ? (
                              <>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Change ({selectedMonthMetric === 'basicSalary' ? 'Basic Salary' : selectedMonthMetric === 'gross' ? 'Gross' : 'Net'})
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  % Change ({selectedMonthMetric === 'basicSalary' ? 'Basic Salary' : selectedMonthMetric === 'gross' ? 'Gross' : 'Net'})
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
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap font-semibold">{record1.monthName}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{year1}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{record1.basicSalary.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{record1.gross.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{record1.net.toLocaleString()}</td>
                            {monthComparisonMode === 'selectable' ? (
                              <>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400">—</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400">—</td>
                              </>
                            ) : (
                              <>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400">—</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400">—</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400">—</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400">—</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400">—</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400">—</td>
                              </>
                            )}
                          </tr>
                          <tr className="hover:bg-gray-50 bg-blue-50">
                            <td className="px-6 py-4 whitespace-nowrap font-semibold">{record2.monthName}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{year2}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{record2.basicSalary.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{record2.gross.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{record2.net.toLocaleString()}</td>
                            {monthComparisonMode === 'selectable' ? (
                              <>
                                <td className={`px-6 py-4 whitespace-nowrap font-semibold ${selectedChange > 0 ? 'text-green-600' : selectedChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {(selectedChange > 0 ? '+' : '')}{selectedChange.toLocaleString()}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${selectedPercentChange > 0 ? 'text-green-600' : selectedPercentChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {(selectedPercentChange > 0 ? '+' : '')}{selectedPercentChange.toFixed(2)}%
                                </td>
                              </>
                            ) : (
                              <>
                                {/* Basic Salary Change */}
                                <td className={`px-6 py-4 whitespace-nowrap font-semibold ${basicSalaryChange > 0 ? 'text-green-600' : basicSalaryChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {(basicSalaryChange > 0 ? '+' : '')}{basicSalaryChange.toLocaleString()}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${basicSalaryPercentChange > 0 ? 'text-green-600' : basicSalaryPercentChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {(basicSalaryPercentChange > 0 ? '+' : '')}{basicSalaryPercentChange.toFixed(2)}%
                                </td>
                                {/* Gross Change */}
                                <td className={`px-6 py-4 whitespace-nowrap font-semibold ${grossChange > 0 ? 'text-green-600' : grossChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {(grossChange > 0 ? '+' : '')}{grossChange.toLocaleString()}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${grossPercentChange > 0 ? 'text-green-600' : grossPercentChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {(grossPercentChange > 0 ? '+' : '')}{grossPercentChange.toFixed(2)}%
                                </td>
                                {/* Net Change */}
                                <td className={`px-6 py-4 whitespace-nowrap font-semibold ${netChange > 0 ? 'text-green-600' : netChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {(netChange > 0 ? '+' : '')}{netChange.toLocaleString()}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${netPercentChange > 0 ? 'text-green-600' : netPercentChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {(netPercentChange > 0 ? '+' : '')}{netPercentChange.toFixed(2)}%
                                </td>
                              </>
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
