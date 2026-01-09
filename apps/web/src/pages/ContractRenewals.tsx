import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

interface ContractData {
  id: string;
  employeeId: string | null;
  employeeName: string;
  employeeNameArabic: string | null;
  employeeCode: string | null;
  contractDate: string;
  contractDuration: string | null;
  category: string | null;
  department: string | null;
  jobTitle: string | null;
  status: string | null;
  daysUntilRenewal: number;
  isNear: boolean;
  isPast: boolean;
  colorCode: 'past' | 'near' | 'later';
  comments: string | null;
}

export default function ContractRenewals() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [data, setData] = useState<{
    filters: { year: number | null; month: number | null; category: string | null; hideRenewed: boolean };
    stats: { total: number; near: number; later: number; past: number };
    contracts: ContractData[];
    contractsByDate: Record<string, ContractData[]>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [year, setYear] = useState<number | null>(parseInt(searchParams.get('year') || '') || null);
  const [month, setMonth] = useState<number | null>(parseInt(searchParams.get('month') || '') || null);
  const [category, setCategory] = useState<string | null>(searchParams.get('category') || null);
  const [hideRenewed, setHideRenewed] = useState(searchParams.get('hideRenewed') === 'true');
  
  // Calendar view state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const categories = ['Partners/شركاء', 'Lawyers/محامين', 'Admins/عاملين', 'Consultants/مستشارين'];
  const months = [
    t('january') || 'January', t('february') || 'February', t('march') || 'March',
    t('april') || 'April', t('may') || 'May', t('june') || 'June',
    t('july') || 'July', t('august') || 'August', t('september') || 'September',
    t('october') || 'October', t('november') || 'November', t('december') || 'December'
  ];

  useEffect(() => {
    const params = new URLSearchParams();
    if (year) params.set('year', year.toString());
    if (month) params.set('month', month.toString());
    if (category) params.set('category', category);
    if (hideRenewed) params.set('hideRenewed', 'true');
    setSearchParams(params);
    
    fetchData();
  }, [year, month, category, hideRenewed]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (year) params.append('year', year.toString());
      if (month) params.append('month', month.toString());
      if (category) params.append('category', category);
      if (hideRenewed) params.append('hideRenewed', 'true');
      
      const response = await axios.get(`${API_BASE_URL}/reports/contract-renewals?${params.toString()}`);
      setData(response.data);
    } catch (error: any) {
      console.error('Error fetching contract renewals:', error);
      toast.error(t('errorGeneratingReport', { error: error.response?.data?.error || error.message }) || 'Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getColorClass = (colorCode: string) => {
    switch (colorCode) {
      case 'past':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'near':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'later':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Calendar view helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const getContractsForDate = (date: Date | string) => {
    if (!data) return [];
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const dateKey = dateObj.toISOString().split('T')[0];
    return data.contractsByDate[dateKey] || [];
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(selectedYear, selectedMonth - 1, day));
    }
    
    const weekDays = isRTL 
      ? ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => {
              if (selectedMonth === 1) {
                setSelectedMonth(12);
                setSelectedYear(selectedYear - 1);
              } else {
                setSelectedMonth(selectedMonth - 1);
              }
            }}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            {isRTL ? '→' : '←'}
          </button>
          <h3 className="text-xl font-semibold">
            {months[selectedMonth - 1]} {selectedYear}
          </h3>
          <button
            onClick={() => {
              if (selectedMonth === 12) {
                setSelectedMonth(1);
                setSelectedYear(selectedYear + 1);
              } else {
                setSelectedMonth(selectedMonth + 1);
              }
            }}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            {isRTL ? '←' : '→'}
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, idx) => (
            <div key={idx} className="text-center font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, idx) => {
            if (!date) {
              return <div key={idx} className="aspect-square"></div>;
            }
            
            const contracts = getContractsForDate(date);
            const dateKey = date.toISOString().split('T')[0];
            const isSelected = selectedDate === dateKey;
            const isToday = dateKey === new Date().toISOString().split('T')[0];
            
            // Determine color based on contracts
            let dayColorClass = 'bg-white border-gray-200';
            if (contracts.length > 0) {
              const hasNear = contracts.some(c => c.colorCode === 'near');
              const hasPast = contracts.some(c => c.colorCode === 'past');
              if (hasPast) {
                dayColorClass = 'bg-red-100 border-red-300';
              } else if (hasNear) {
                dayColorClass = 'bg-red-50 border-red-200';
              } else {
                dayColorClass = 'bg-green-50 border-green-200';
              }
            }
            
            // Get first 2 employee names
            const firstTwoNames = contracts.slice(0, 2).map(c => {
              // Extract first 2 words from employee name
              const nameParts = c.employeeName.split(' ').slice(0, 2);
              return nameParts.join(' ');
            });
            const hasMore = contracts.length > 2;

            return (
              <div
                key={idx}
                onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                className={`aspect-square border rounded p-1 cursor-pointer hover:shadow-md transition-all ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                } ${isToday ? 'ring-2 ring-blue-300' : ''} ${dayColorClass}`}
              >
                <div className="text-sm font-medium mb-1">{date.getDate()}</div>
                {contracts.length > 0 && (
                  <div className="text-xs space-y-0.5">
                    {firstTwoNames.map((name, nameIdx) => (
                      <div key={nameIdx} className="truncate font-medium" title={contracts[nameIdx].employeeName}>
                        {name}
                      </div>
                    ))}
                    {hasMore && (
                      <div className="text-xs font-bold text-center pt-0.5">
                        +{contracts.length - 2} {t('more') || 'more'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {selectedDate && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">
              {t('contractsForDate') || 'Contracts for'} {formatDate(selectedDate)}
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {getContractsForDate(new Date(selectedDate)).map((contract) => (
                <div
                  key={contract.id}
                  className={`p-3 rounded border ${getColorClass(contract.colorCode)}`}
                >
                  <div className="font-medium">{contract.employeeName}</div>
                  <div className="text-sm">
                    {contract.employeeCode && `${t('employeeCode') || 'Code'}: ${contract.employeeCode} • `}
                    {contract.contractDuration || t('noDuration') || 'No duration specified'}
                  </div>
                  <div className="text-xs mt-1">
                    {contract.daysUntilRenewal < 0
                      ? `${Math.abs(contract.daysUntilRenewal)} ${t('daysPast') || 'days past'}`
                      : `${contract.daysUntilRenewal} ${t('daysRemaining') || 'days remaining'}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">{t('loading') || 'Loading...'}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-red-600">{t('noData') || 'No data found'}</p>
      </div>
    );
  }

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-section, .print-section * {
            visibility: visible;
          }
          .print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          table {
            page-break-inside: auto;
            width: 100%;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          /* Allow text wrapping in print */
          th, td {
            white-space: normal !important;
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
          }
          /* Remove truncate in print */
          .truncate {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }
          /* Remove whitespace-nowrap in print */
          .whitespace-nowrap {
            white-space: normal !important;
          }
        }
      `}</style>
      <div className={`max-w-7xl mx-auto print-section ${isRTL ? 'text-right' : 'text-left'}`}>
      <div className="flex justify-between items-center mb-6 no-print">
        <h1 className="text-3xl font-bold">{t('contractRenewals') || 'Contract Renewals'}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            {t('tableView') || 'Table View'}
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            {t('calendarView') || 'Calendar View'}
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold mb-2">{t('contractRenewals') || 'Contract Renewals'}</h1>
        <div className="text-sm text-gray-600">
          {year && `${t('year') || 'Year'}: ${year} `}
          {month && `${t('month') || 'Month'}: ${months[month - 1]} `}
          {category && `${t('category') || 'Category'}: ${category} `}
          {hideRenewed && `(${t('hideRenewedContracts') || 'Hide Renewed Contracts'})`}
        </div>
        <div className="text-sm text-gray-600 mt-2">
          {t('generatedOn') || 'Generated on'}: {new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 no-print">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('year') || 'Year'}</label>
            <select
              value={year || ''}
              onChange={(e) => setYear(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">{t('all') || 'All'}</option>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">{t('month') || 'Month'}</label>
            <select
              value={month || ''}
              onChange={(e) => setMonth(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">{t('all') || 'All'}</option>
              {months.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">{t('category') || 'Category'}</label>
            <select
              value={category || ''}
              onChange={(e) => setCategory(e.target.value || null)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">{t('allCategories') || 'All Categories'}</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hideRenewed}
                onChange={(e) => setHideRenewed(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">{t('hideRenewedContracts') || 'Hide Renewed Contracts'}</span>
            </label>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={fetchData}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {t('applyFilters') || 'Apply Filters'}
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 no-print">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">{t('totalContracts') || 'Total Contracts'}</div>
          <div className="text-2xl font-bold">{data.stats.total}</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 border-2 border-red-200">
          <div className="text-sm text-red-700 mb-1">{t('nearRenewal') || 'Near Renewal (≤30 days)'}</div>
          <div className="text-2xl font-bold text-red-600">{data.stats.near}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border-2 border-green-200">
          <div className="text-sm text-green-700 mb-1">{t('laterRenewal') || 'Later Renewal (>30 days)'}</div>
          <div className="text-2xl font-bold text-green-600">{data.stats.later}</div>
        </div>
        <div className="bg-red-100 rounded-lg shadow p-4 border-2 border-red-300">
          <div className="text-sm text-red-800 mb-1">{t('pastDue') || 'Past Due'}</div>
          <div className="text-2xl font-bold text-red-700">{data.stats.past}</div>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">{t('contractRenewals') || 'Contract Renewals'}</h2>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 print:hidden"
            >
              {t('print') || 'Print'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '20%' }}>{t('employeeName') || 'Employee Name'}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '8%' }}>{t('employeeCode') || 'Employee Code'}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '12%' }}>{t('contractDate') || 'Contract Date'}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '15%' }}>{t('contractDuration') || 'Contract Duration'}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '12%' }}>{t('daysUntilRenewal') || 'Days Until Renewal'}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '12%' }}>{t('category') || 'Category'}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '12%' }}>{t('department') || 'Department'}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '9%' }}>{t('jobTitle') || 'Job Title'}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.contracts.map((contract) => (
                  <tr key={contract.id} className={`${getColorClass(contract.colorCode)} hover:bg-opacity-80`}>
                    <td className="px-3 py-4 text-sm font-medium">
                      <div className="truncate">{contract.employeeName}</div>
                      {contract.employeeNameArabic && (
                        <div className="text-xs text-gray-500 truncate">{contract.employeeNameArabic}</div>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{contract.employeeCode || '-'}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{formatDate(contract.contractDate)}</td>
                    <td className="px-3 py-4 text-sm">
                      <div className="truncate">{contract.contractDuration || '-'}</div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                      {contract.daysUntilRenewal < 0
                        ? `${Math.abs(contract.daysUntilRenewal)} ${t('daysPast') || 'days past'}`
                        : `${contract.daysUntilRenewal} ${t('days') || 'days'}`}
                    </td>
                    <td className="px-3 py-4 text-sm">
                      <div className="truncate">{contract.category || '-'}</div>
                    </td>
                    <td className="px-3 py-4 text-sm">
                      <div className="truncate">{contract.department || '-'}</div>
                    </td>
                    <td className="px-3 py-4 text-sm">
                      <div className="truncate">{contract.jobTitle || '-'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.contracts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {t('noContractsFound') || 'No contracts found matching the filters'}
            </div>
          )}
        </div>
      ) : (
        renderCalendar()
      )}
      </div>
    </>
  );
}

