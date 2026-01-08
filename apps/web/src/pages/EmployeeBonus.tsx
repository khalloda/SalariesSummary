import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, AreaChart } from 'recharts';
import { useBonusHalfSwitch } from '../hooks/useBonusHalfSwitch';

export default function EmployeeBonus() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'current' | 'bonus-comparison' | 'annual-increase'>('current');
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [fromYear, setFromYear] = useState(new Date().getFullYear() - 4);
  const [toYear, setToYear] = useState(new Date().getFullYear());
  const showHalves = useBonusHalfSwitch();

  useEffect(() => {
    // Get available years from bonus records
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
    if (id && year) {
      setLoading(true);
      axios.get(`${API_BASE_URL}/employees/${id}/bonus?year=${year}`)
        .then(res => {
          if (res.data.error) {
            setData({ error: res.data.error, employee: res.data.employee });
          } else {
            setData(res.data);
          }
        })
        .catch(err => {
          console.error('Error fetching bonus data:', err);
          const errorMsg = err.response?.data?.error || 'Failed to load bonus data';
          const employee = err.response?.data?.employee;
          setData({ error: errorMsg, employee });
        })
        .finally(() => setLoading(false));
    }
  }, [id, year]);

  const handlePrint = () => {
    window.print();
  };

  const handleLoadComparison = useCallback(() => {
    if (!id) return;
    setComparisonLoading(true);
    axios.get(`${API_BASE_URL}/employees/${id}/bonus-comparison?fromYear=${fromYear}&toYear=${toYear}`)
      .then(res => setComparisonData(res.data))
      .catch(err => {
        console.error('Error fetching comparison data:', err);
        setComparisonData(null);
      })
      .finally(() => setComparisonLoading(false));
  }, [id, fromYear, toYear]);

  useEffect(() => {
    if ((activeTab === 'bonus-comparison' || activeTab === 'annual-increase') && id) {
      handleLoadComparison();
    }
  }, [activeTab, handleLoadComparison, id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!data) return <div className="p-6">No data available</div>;
  if (data.error) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-4">
          <p className="text-yellow-700 font-semibold mb-2">{data.error}</p>
          {data.employee && (
            <div className="mt-2 text-sm text-yellow-600">
              <p>Employee: {data.employee.name}</p>
              <p>Normalized Name: {data.employee.normalizedName}</p>
              <p className="mt-2 text-xs">
                This might indicate a name matching issue. The bonus data may exist but is linked to a different employee record.
                Please check if there are duplicate employee records with similar names.
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/employees/${id}/annual?year=${year}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            View Annual Report Instead
          </button>
          <button
            onClick={() => navigate('/employees')}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back to Employees
          </button>
        </div>
      </div>
    );
  }

  const { employee, bonus, previousBonus, historicalBonuses, averageSalary, growth } = data;

  // Prepare chart data for historical trend
  const chartData = historicalBonuses
    .slice()
    .reverse()
    .map((b: any) => ({
      year: b.year.toString(),
      bonus: b.bonusAmount,
      firstHalf: showHalves ? (b.bonusFirstHalf || 0) : 0,
      secondHalf: showHalves ? (b.bonusSecondHalf || 0) : 0
    }));

  return (
    <div className="print-container">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold">{employee.name} - Annual Bonus & Increases</h2>
          <p className="text-gray-600">{employee.category || 'Uncategorized'}</p>
        </div>
        <div className="flex items-center space-x-2">
          {activeTab === 'current' && (
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
          <button onClick={handlePrint} className="px-4 py-2 bg-gray-600 text-white rounded">{t('print')}</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 print:hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('current')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'current'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Current Year
            </button>
            <button
              onClick={() => setActiveTab('bonus-comparison')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bonus-comparison'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bonus Comparison
            </button>
            <button
              onClick={() => setActiveTab('annual-increase')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'annual-increase'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Annual Increase Comparison
            </button>
          </nav>
        </div>
      </div>

      {/* Current Year Tab */}
      {activeTab === 'current' && bonus ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-6 rounded-lg shadow border-2 border-green-200">
              <h3 className="text-lg font-semibold mb-2 text-green-800">Total Bonus {year}</h3>
              <p className="text-3xl font-bold text-green-600">{bonus.bonusAmount.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg shadow border-2 border-blue-200">
              <h3 className="text-lg font-semibold mb-2 text-blue-800">Reflected in Months</h3>
              <p className="text-3xl font-bold text-blue-600">
                {bonus.reflectedInMonths?.toFixed(2) || 'N/A'}
              </p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg shadow border-2 border-purple-200">
              <h3 className="text-lg font-semibold mb-2 text-purple-800">Reflected in %</h3>
              <p className="text-3xl font-bold text-purple-600">
                {bonus.reflectedInPercent?.toFixed(2) || 'N/A'}%
              </p>
            </div>
            <div className="bg-orange-50 p-6 rounded-lg shadow border-2 border-orange-200">
              <h3 className="text-lg font-semibold mb-2 text-orange-800">Net Salary {year}</h3>
              <p className="text-3xl font-bold text-orange-600">{bonus.netSalary.toLocaleString()}</p>
            </div>
          </div>

          {/* Bonus Breakdown */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h3 className="text-lg font-semibold">Bonus Breakdown - {year}</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Bonus Details</h4>
                  <table className="w-full">
                    <tbody className="space-y-2">
                      {showHalves && (
                        <>
                          <tr>
                            <td className="py-2 text-gray-600">First Half:</td>
                            <td className="py-2 font-semibold text-right">
                              {bonus.bonusFirstHalf?.toLocaleString() || 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 text-gray-600">Second Half:</td>
                            <td className="py-2 font-semibold text-right">
                              {bonus.bonusSecondHalf?.toLocaleString() || 'N/A'}
                            </td>
                          </tr>
                        </>
                      )}
                      <tr className="border-t">
                        <td className="py-2 font-semibold">Total Bonus:</td>
                        <td className="py-2 font-bold text-right text-green-600">
                          {bonus.bonusAmount.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Reflected Metrics</h4>
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="py-2 text-gray-600">In Months:</td>
                        <td className="py-2 font-semibold text-right">
                          {bonus.reflectedInMonths?.toFixed(2) || 'N/A'} Months
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-gray-600">In Percentage:</td>
                        <td className="py-2 font-semibold text-right">
                          {bonus.reflectedInPercent?.toFixed(2) || 'N/A'}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Previous Year Comparison */}
          {previousBonus && (
            <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold">Year-over-Year Comparison</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-4">Previous Year ({previousBonus.year})</h4>
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="py-2 text-gray-600">Total Bonus:</td>
                          <td className="py-2 font-semibold text-right">
                            {previousBonus.bonusAmount.toLocaleString()}
                          </td>
                        </tr>
                        {showHalves && (
                          <>
                            <tr>
                              <td className="py-2 text-gray-600">First Half:</td>
                              <td className="py-2 text-right">
                                {previousBonus.bonusFirstHalf?.toLocaleString() || 'N/A'}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2 text-gray-600">Second Half:</td>
                              <td className="py-2 text-right">
                                {previousBonus.bonusSecondHalf?.toLocaleString() || 'N/A'}
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-4">Change</h4>
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="py-2 text-gray-600">Absolute Change:</td>
                          <td className={`py-2 font-semibold text-right ${growth?.absolute && growth.absolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {growth?.absolute !== null && growth.absolute !== undefined
                              ? `${growth.absolute >= 0 ? '+' : ''}${growth.absolute.toLocaleString()}`
                              : 'N/A'}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 text-gray-600">Percentage Change:</td>
                          <td className={`py-2 font-semibold text-right ${growth?.percent && growth.percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {growth?.percent !== null && growth.percent !== undefined
                              ? `${growth.percent >= 0 ? '+' : ''}${growth.percent.toFixed(2)}%`
                              : 'N/A'}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 text-gray-600">Remaining from Previous:</td>
                          <td className={`py-2 font-semibold text-right ${bonus.remainingFromPrevious !== null && bonus.remainingFromPrevious !== undefined && bonus.remainingFromPrevious >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {bonus.remainingFromPrevious !== null && bonus.remainingFromPrevious !== undefined
                              ? `${bonus.remainingFromPrevious >= 0 ? '+' : ''}${bonus.remainingFromPrevious.toLocaleString()}`
                              : 'N/A'}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 text-gray-600">Year Comparison:</td>
                          <td className={`py-2 font-semibold text-right ${bonus.yearComparison !== null && bonus.yearComparison !== undefined && bonus.yearComparison >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {bonus.yearComparison !== null && bonus.yearComparison !== undefined
                              ? `${bonus.yearComparison >= 0 ? '+' : ''}${bonus.yearComparison.toLocaleString()}`
                              : 'N/A'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Historical Trend Chart */}
          {chartData.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-xl font-semibold mb-4">Historical Bonus Trend</h3>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Legend />
                    <Line type="monotone" dataKey="bonus" stroke="#8884d8" strokeWidth={2} name="Total Bonus" />
                    {showHalves && bonus.bonusFirstHalf && (
                      <Line type="monotone" dataKey="firstHalf" stroke="#82ca9d" strokeWidth={2} name="First Half" />
                    )}
                    {showHalves && bonus.bonusSecondHalf && (
                      <Line type="monotone" dataKey="secondHalf" stroke="#ffc658" strokeWidth={2} name="Second Half" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Historical Data Table */}
          {historicalBonuses.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold">Historical Bonus Data</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
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
                    {historicalBonuses.map((b: any) => (
                      <tr key={b.year} className={b.year === year ? 'bg-blue-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold">{b.year}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{b.bonusAmount.toLocaleString()}</td>
                        {showHalves && (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">{b.bonusFirstHalf?.toLocaleString() || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{b.bonusSecondHalf?.toLocaleString() || '-'}</td>
                          </>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">{b.reflectedInMonths?.toFixed(2) || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{b.reflectedInPercent?.toFixed(2) || '-'}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : activeTab === 'current' ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-yellow-700">No bonus data found for {year}.</p>
        </div>
      ) : null}

      {/* Bonus Comparison Tab */}
      {activeTab === 'bonus-comparison' && comparisonData && (
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-6 rounded-lg shadow border-2 border-green-200">
              <h3 className="text-lg font-semibold mb-2 text-green-800">Total Bonuses</h3>
              <p className="text-3xl font-bold text-green-600">
                {comparisonData.summary?.totalBonuses?.toLocaleString() || '0'}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {fromYear} - {toYear}
              </p>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg shadow border-2 border-blue-200">
              <h3 className="text-lg font-semibold mb-2 text-blue-800">Average Bonus</h3>
              <p className="text-3xl font-bold text-blue-600">
                {comparisonData.summary?.averageBonus?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}
              </p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg shadow border-2 border-purple-200">
              <h3 className="text-lg font-semibold mb-2 text-purple-800">Years with Data</h3>
              <p className="text-3xl font-bold text-purple-600">
                {comparisonData.comparisonData?.filter((d: any) => d.bonus > 0).length || 0}
              </p>
            </div>
            <div className="bg-orange-50 p-6 rounded-lg shadow border-2 border-orange-200">
              <h3 className="text-lg font-semibold mb-2 text-orange-800">Year Range</h3>
              <p className="text-3xl font-bold text-orange-600">
                {toYear - fromYear + 1}
              </p>
              <p className="text-sm text-orange-600 mt-1">Years</p>
            </div>
          </div>

          {/* Bonus Comparison Chart */}
          {comparisonData.comparisonData && comparisonData.comparisonData.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-xl font-semibold mb-4">Bonus Comparison ({fromYear} - {toYear})</h3>
              <div style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer>
                  <ComposedChart data={comparisonData.comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="bonus" fill="#8884d8" name="Total Bonus" />
                    {showHalves && (
                      <>
                        <Bar yAxisId="left" dataKey="bonusFirstHalf" fill="#82ca9d" name="First Half" />
                        <Bar yAxisId="left" dataKey="bonusSecondHalf" fill="#ffc658" name="Second Half" />
                      </>
                    )}
                    <Line yAxisId="right" type="monotone" dataKey="reflectedInMonths" stroke="#ff7300" strokeWidth={2} name="Reflected (Months)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Bonus Trend Line Chart */}
          {comparisonData.comparisonData && comparisonData.comparisonData.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-xl font-semibold mb-4">Bonus Trend Over Years</h3>
              <div style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer>
                  <AreaChart data={comparisonData.comparisonData}>
                    <defs>
                      <linearGradient id="colorBonus" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Legend />
                    <Area type="monotone" dataKey="bonus" stroke="#8884d8" fillOpacity={1} fill="url(#colorBonus)" name="Total Bonus" />
                    {showHalves && (
                      <>
                        <Line type="monotone" dataKey="bonusFirstHalf" stroke="#82ca9d" strokeWidth={2} name="First Half" />
                        <Line type="monotone" dataKey="bonusSecondHalf" stroke="#ffc658" strokeWidth={2} name="Second Half" />
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Comparison Data Table */}
          {comparisonData.comparisonData && comparisonData.comparisonData.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold">Bonus Comparison Data</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
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
                    {comparisonData.comparisonData.map((d: any) => (
                      <tr key={d.year} className={d.bonus > 0 ? '' : 'opacity-50'}>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold">{d.year}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{d.bonus.toLocaleString()}</td>
                        {showHalves && (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">{d.bonusFirstHalf > 0 ? d.bonusFirstHalf.toLocaleString() : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{d.bonusSecondHalf > 0 ? d.bonusSecondHalf.toLocaleString() : '-'}</td>
                          </>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">{d.reflectedInMonths > 0 ? d.reflectedInMonths.toFixed(2) : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{d.reflectedInPercent > 0 ? d.reflectedInPercent.toFixed(2) + '%' : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Annual Increase Comparison Tab */}
      {activeTab === 'annual-increase' && comparisonData && (
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-6 rounded-lg shadow border-2 border-green-200">
              <h3 className="text-lg font-semibold mb-2 text-green-800">Total Annual Increases</h3>
              <p className="text-3xl font-bold text-green-600">
                {comparisonData.summary?.totalAnnualIncreases?.toLocaleString() || '0'}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {fromYear} - {toYear}
              </p>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg shadow border-2 border-blue-200">
              <h3 className="text-lg font-semibold mb-2 text-blue-800">Average Annual Increase</h3>
              <p className="text-3xl font-bold text-blue-600">
                {comparisonData.summary?.averageAnnualIncrease?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}
              </p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg shadow border-2 border-purple-200">
              <h3 className="text-lg font-semibold mb-2 text-purple-800">Years with Data</h3>
              <p className="text-3xl font-bold text-purple-600">
                {comparisonData.comparisonData?.filter((d: any) => d.annualIncreaseTotal > 0).length || 0}
              </p>
            </div>
            <div className="bg-orange-50 p-6 rounded-lg shadow border-2 border-orange-200">
              <h3 className="text-lg font-semibold mb-2 text-orange-800">Year Range</h3>
              <p className="text-3xl font-bold text-orange-600">
                {toYear - fromYear + 1}
              </p>
              <p className="text-sm text-orange-600 mt-1">Years</p>
            </div>
          </div>

          {/* Annual Increase Comparison Chart */}
          {comparisonData.comparisonData && comparisonData.comparisonData.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-xl font-semibold mb-4">Annual Increase Comparison ({fromYear} - {toYear})</h3>
              <div style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer>
                  <ComposedChart data={comparisonData.comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="annualIncreaseTotal" fill="#8884d8" name="Total Annual Increase (Net)" />
                    <Line yAxisId="right" type="monotone" dataKey="previousYearNet" stroke="#ff7300" strokeWidth={2} name="Previous Year Net" />
                    <Line yAxisId="right" type="monotone" dataKey="currentYearNet" stroke="#00ff00" strokeWidth={2} name="Current Year Net" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Annual Increase Trend Chart */}
          {comparisonData.comparisonData && comparisonData.comparisonData.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-xl font-semibold mb-4">Annual Increase Trend Over Years</h3>
              <div style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer>
                  <AreaChart data={comparisonData.comparisonData}>
                    <defs>
                      <linearGradient id="colorIncrease" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Legend />
                    <Area type="monotone" dataKey="annualIncreaseTotal" stroke="#82ca9d" fillOpacity={1} fill="url(#colorIncrease)" name="Total Annual Increase (Net)" />
                    <Line type="monotone" dataKey="previousYearNet" stroke="#ff7300" strokeWidth={2} name="Previous Year Net" />
                    <Line type="monotone" dataKey="currentYearNet" stroke="#00ff00" strokeWidth={2} name="Current Year Net" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Annual Increase vs Salary Chart */}
          {comparisonData.comparisonData && comparisonData.comparisonData.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-xl font-semibold mb-4">Annual Increase vs Salary ({fromYear} - {toYear})</h3>
              <div style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer>
                  <ComposedChart data={comparisonData.comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis yAxisId="left" label={{ value: 'Amount', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: 'Salary', angle: 90, position: 'insideRight' }} />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="annualIncreaseTotal" fill="#8884d8" name="Total Annual Increase (Net)" />
                    <Line yAxisId="right" type="monotone" dataKey="previousYearNet" stroke="#ff7300" strokeWidth={3} name="Previous Year Net" />
                    <Line yAxisId="right" type="monotone" dataKey="currentYearNet" stroke="#82ca9d" strokeWidth={2} strokeDasharray="5 5" name="Current Year Net" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Annual Increase Data Table */}
          {comparisonData.comparisonData && comparisonData.comparisonData.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold">Annual Increase Comparison Data</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Annual Increase</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net 2024</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net 2025</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current vs 2025 (Net)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross 2024</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross 2025</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current vs 2025 (Gross)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {comparisonData.comparisonData.map((d: any) => (
                      <tr key={d.year} className={d.annualIncreaseTotal > 0 ? '' : 'opacity-50'}>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold">{d.year}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{d.annualIncreaseTotal > 0 ? d.annualIncreaseTotal.toLocaleString() : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{d.previousYearNet > 0 ? d.previousYearNet.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{d.currentYearNet > 0 ? d.currentYearNet.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-green-600">{d.annualIncreaseNet > 0 ? d.annualIncreaseNet.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{d.previousYearGross > 0 ? d.previousYearGross.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{d.currentYearGross > 0 ? d.currentYearGross.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-green-600">{d.annualIncreaseGross > 0 ? d.annualIncreaseGross.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {comparisonLoading && (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading comparison data...</p>
        </div>
      )}
    </div>
  );
}

