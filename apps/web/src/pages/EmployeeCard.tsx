import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import Tooltip from '../components/Tooltip';
import { tooltips } from '../utils/tooltips';
import { normalizeForSearch, groupAndSortEmployeesByCategory, sortCategories, compareEmployeeCodes } from '../utils/employee-utils';

const logo = '/logo.png';

interface Employee {
  id: string;
  name: string;
  nameArabic?: string;
  category?: string;
  employeeCode?: string;
  jobTitle?: string;
  department?: string;
  status?: string;
  dateOfBirth?: string;
  joiningDate?: string;
  mobileNumber?: string;
  graduationCertificate?: string;
  graduationSection?: string;
  graduationUniversity?: string;
  graduationYear?: number;
  barAssociation?: string;
  barAssociationDegree?: string;
  taxCard?: string;
  socialInsurance?: string;
  nationalId?: string;
  nationalIdValidTill?: string;
  address?: string;
  addressRegion?: string;
  addressGovernorate?: string;
  contractType?: string;
  contractDuration?: string;
  contractRenewalDate?: string;
  salaries?: Array<{
    year: number;
    month: number;
    monthName: string;
    basicSalary: number;
    gross: number;
    net: number;
  }>;
  personnelRecord?: {
    criminalRecord?: string | null;
    militaryCertificate?: string | null;
    idCopy?: boolean | null;
    educationCertificate?: string | null;
    birthCertificate?: string | null;
    recommendationLetter?: boolean | null;
    personalPhotos?: boolean | null;
    taxCard?: boolean | null;
    associationId?: boolean | null;
    form6?: string | null;
    laptopPcTablet?: string | null;
    workStub?: string | null;
    insuranceStartDate?: string | null;
  } | null;
}

export default function EmployeeCard() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [employeesForPrint, setEmployeesForPrint] = useState<Employee[]>([]);
  const [isBatchPrintMode, setIsBatchPrintMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Active');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'systemId'>('systemId');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Get unique categories, departments
  const categories = Array.from(new Set(employees.map(e => e.category).filter(Boolean))) as string[];
  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean))) as string[];

  // Filter employees
  const filtered = employees.filter(emp => {
    // Search filter
    const normalizedSearch = normalizeForSearch(searchTerm);
    const normalizedName = normalizeForSearch(emp.name);
    const normalizedNameArabic = normalizeForSearch(emp.nameArabic || '');
    const normalizedCode = normalizeForSearch(emp.employeeCode || '');
    const matchesSearch = !searchTerm || 
      normalizedName.includes(normalizedSearch) || 
      normalizedNameArabic.includes(normalizedSearch) || 
      normalizedCode.includes(normalizedSearch);
    
    // Status filter
    const matchesStatus = !statusFilter || statusFilter === 'all' || (emp.status || 'Active') === statusFilter;
    
    // Department filter
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
    
    // Category filter
    const matchesCategory = categoryFilter === 'all' || emp.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesDepartment && matchesCategory;
  });

  // Group employees by category and sort
  const employeesByCategory = groupAndSortEmployeesByCategory(filtered);
  const sortedCategories = Object.keys(employeesByCategory).sort(sortCategories);

  // Sort within each category
  Object.keys(employeesByCategory).forEach(category => {
    if (sortBy === 'systemId') {
      employeesByCategory[category].sort((a, b) => compareEmployeeCodes(a.employeeCode, b.employeeCode));
    } else {
      employeesByCategory[category].sort((a, b) => a.name.localeCompare(b.name));
    }
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/employees`);
      setEmployees(response.data);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      alert('Failed to load employees: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeDetails = async (employeeId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/employees/${employeeId}/card`);
      setSelectedEmployee(response.data);
    } catch (error: any) {
      console.error('Error fetching employee details:', error);
      alert('Failed to load employee details: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(null);
    setIsBatchPrintMode(false);
    fetchEmployeeDetails(employee.id);
  };

  const handleCheckboxChange = (employeeId: string, checked: boolean) => {
    setSelectedEmployeeIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(employeeId);
      } else {
        newSet.delete(employeeId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedEmployeeIds.size === filtered.length) {
      setSelectedEmployeeIds(new Set());
    } else {
      setSelectedEmployeeIds(new Set(filtered.map(e => e.id)));
    }
  };

  const handleSelectCategory = (category: string) => {
    const categoryEmployees = employeesByCategory[category] || [];
    const categoryIds = new Set(categoryEmployees.map(e => e.id));
    setSelectedEmployeeIds(categoryIds);
  };

  const fetchEmployeeDetailsForBatch = async (employeeIds: string[]) => {
    setLoadingBatch(true);
    try {
      const detailsPromises = employeeIds.map(id => 
        axios.get(`${API_BASE_URL}/employees/${id}/card`).then(res => res.data)
      );
      const details = await Promise.all(detailsPromises);
      setEmployeesForPrint(details);
      setSelectedEmployee(null);
      setIsBatchPrintMode(true);
      
      // Small delay to ensure state is updated before printing
      setTimeout(() => {
        window.print();
      }, 100);
    } catch (error: any) {
      console.error('Error fetching employee details:', error);
      alert('Failed to load employee details: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingBatch(false);
    }
  };

  const handlePrintSelected = () => {
    if (selectedEmployeeIds.size === 0) {
      alert('Please select at least one employee');
      return;
    }
    fetchEmployeeDetailsForBatch(Array.from(selectedEmployeeIds));
  };

  const handlePrintCategory = (category: string) => {
    const categoryEmployees = employeesByCategory[category] || [];
    if (categoryEmployees.length === 0) {
      alert('No employees in this category');
      return;
    }
    fetchEmployeeDetailsForBatch(categoryEmployees.map(e => e.id));
  };

  const handlePrintAll = () => {
    if (filtered.length === 0) {
      alert('No employees to print');
      return;
    }
    fetchEmployeeDetailsForBatch(filtered.map(e => e.id));
  };

  const handleExportPDF = async () => {
    if (!selectedEmployee) return;
    
    setExporting(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/exports/employee-card/pdf`,
        { employeeId: selectedEmployee.id },
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeName = (selectedEmployee.name || 'Employee').replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '_').substring(0, 50);
      link.setAttribute('download', `Employee_Card_${safeName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF: ' + (error.response?.data?.error || error.message));
    } finally {
      setExporting(false);
    }
  };

  const handleExportXLSX = async () => {
    if (!selectedEmployee) return;
    
    setExporting(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/exports/employee-card/xlsx`,
        { employeeId: selectedEmployee.id },
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeName = (selectedEmployee.name || 'Employee').replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '_').substring(0, 50);
      link.setAttribute('download', `Employee_Card_${safeName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      console.error('XLSX export error:', error);
      alert('Failed to export XLSX: ' + (error.response?.data?.error || error.message));
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatDateOrNotSpecified = (date: string | null | undefined) => {
    if (!date) return t('notSpecified');
    const parsedDate = new Date(date);
    // Reject placeholder dates like January 1, 2000
    if (parsedDate.getFullYear() === 2000 && parsedDate.getMonth() === 0 && parsedDate.getDate() === 1) {
      return t('notSpecified');
    }
    if (isNaN(parsedDate.getTime())) return t('notSpecified');
    return parsedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '0.00';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatLargeNumber = (value: string | number | null | undefined) => {
    // Format ID numbers without commas
    if (!value && value !== 0) return 'N/A';
    
    // Convert to number if it's a string
    let num: number;
    if (typeof value === 'number') {
      num = value;
    } else {
      // Remove any existing commas from string
      const cleanStr = String(value).replace(/,/g, '');
      num = parseFloat(cleanStr);
      if (isNaN(num)) {
        // If it's not a valid number, return the original string without commas
        return cleanStr;
      }
    }
    
    // Always format without commas (useGrouping: false)
    return num.toLocaleString('en-US', { maximumFractionDigits: 0, useGrouping: false });
  };

  const calculateWorkDuration = (joiningDate: string | null | undefined) => {
    if (!joiningDate) return 'N/A';
    
    const start = new Date(joiningDate);
    const end = new Date();
    
    if (isNaN(start.getTime())) return 'N/A';
    
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();
    
    if (days < 0) {
      months--;
      const lastMonth = new Date(end.getFullYear(), end.getMonth(), 0);
      days += lastMonth.getDate();
    }
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    const parts: string[] = [];
    if (years > 0) parts.push(`${years} Year${years !== 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} Month${months !== 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} Day${days !== 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : 'Less than 1 day';
  };

  // Handle print header repetition
  useEffect(() => {
    if (!selectedEmployee) return;

    const handleBeforePrint = () => {
      const printContainer = document.querySelector('.print-container');
      const printHeader = document.querySelector('.print-header');
      
      if (!printContainer || !printHeader) return;

      // Calculate approximate page height (A4: 297mm = ~1123px at 96dpi, minus margins)
      const pageHeight = 1123 - 60; // A4 height minus top margin
      const elements = printContainer.querySelectorAll('.print-top-box, .print-table, table');
      
      // Insert header before elements that might cause page breaks
      elements.forEach((el, index) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        const containerRect = printContainer.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top;
        
        // If element is likely on a new page (every ~1000px), insert header
        if (index > 0 && relativeTop > pageHeight * 0.8) {
          const headerClone = printHeader.cloneNode(true) as HTMLElement;
          headerClone.classList.add('print-header-repeat');
          el.parentNode?.insertBefore(headerClone, el);
        }
      });
    };

    const handleAfterPrint = () => {
      // Remove all repeated headers
      const repeatedHeaders = document.querySelectorAll('.print-header-repeat');
      repeatedHeaders.forEach(header => header.remove());
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      handleAfterPrint(); // Clean up on unmount
    };
  }, [selectedEmployee]);

  return (
    <div className="p-6">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm 15mm 15mm 15mm;
            @bottom-center {
              content: "P " counter(page) " of " counter(pages);
              font-size: 10px;
              color: #666;
            }
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          nav {
            display: none !important;
          }
          header {
            display: none !important;
          }
          .p-6 {
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Hide the main header in print */
          .employee-card-header:not(.print-header) {
            display: none !important;
          }
          .print-header,
          .print-header-repeat {
            display: flex !important;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding: 0.5rem 0;
            border-bottom: 2px solid #000;
            page-break-after: avoid;
            break-after: avoid;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .print-container {
            margin: 0;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          .print-top-box {
            margin-top: 0 !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          /* Ensure header appears on first page with content */
          .print-container > .print-header:first-child {
            margin-top: 0;
            display: flex !important;
          }
          .print-top-box {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 1rem;
            margin-top: 0;
          }
          .print-table {
            page-break-inside: auto;
            width: 100%;
            border-collapse: collapse;
            margin-top: 0;
          }
          .print-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          .page-break-before {
            page-break-before: always;
            break-inside: avoid;
          }
          .print-table thead {
            display: table-header-group;
          }
          .print-table tbody {
            display: table-row-group;
          }
          .print-table td,
          .print-table th {
            border: 1px solid #000 !important;
            padding: 8px !important;
            font-size: 11px !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          table td,
          table th {
            border: 1px solid #000 !important;
          }
        }
        .employee-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 1.5rem;
        }
        .employee-card-header.rtl {
          flex-direction: row-reverse;
        }
        .employee-card-header .logo-container {
          flex-shrink: 0;
        }
        .employee-card-header .title-container {
          flex: 1;
          text-align: center;
        }
      `}</style>
      
      {/* Custom Header - Hidden in print */}
      <div className={`employee-card-header ${isRTL ? 'rtl' : ''} no-print`}>
        <div className="logo-container">
          <img 
            src={logo} 
            alt="Logo" 
            className="h-10 w-auto"
          />
        </div>
        <div className="title-container">
          <h1 className="text-2xl font-bold text-gray-900">{t('employeeCard')}</h1>
        </div>
        <div className="logo-container">
          <div className="text-sm text-gray-600 text-right" style={isRTL ? { textAlign: 'left' } : { textAlign: 'right' }}>
            <div className="font-semibold">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div className="text-xs">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        
        {/* Search/Filter Section */}
        <div className="bg-white p-4 rounded-lg shadow mb-4 no-print">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            {/* Search */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-2">
                {t('searchEmployee')}
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('typeToSearch')}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('status')}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">{t('allStatuses')}</option>
                <option value="Active">{t('active')}</option>
                <option value="Resigned">{t('resigned')}</option>
              </select>
            </div>
            
            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('department')}
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">{t('allDepartments')}</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('category')}
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">{t('allCategories')}</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            {/* Sort */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('sortBy') || 'Sort By'}
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'systemId')}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="systemId">System ID</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>
          
          {/* Batch Print Buttons */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              {selectedEmployeeIds.size === filtered.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={handlePrintSelected}
              disabled={selectedEmployeeIds.size === 0 || loadingBatch}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingBatch ? 'Loading...' : `Print Selected (${selectedEmployeeIds.size})`}
            </button>
            {sortedCategories.map(category => {
              const categoryEmployees = employeesByCategory[category] || [];
              if (categoryEmployees.length === 0) return null;
              return (
                <button
                  key={category}
                  onClick={() => handlePrintCategory(category)}
                  disabled={loadingBatch}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {loadingBatch ? 'Loading...' : `Print ${category} (${categoryEmployees.length})`}
                </button>
              );
            })}
            <button
              onClick={handlePrintAll}
              disabled={filtered.length === 0 || loadingBatch}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {loadingBatch ? 'Loading...' : `Print All (${filtered.length})`}
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500">{t('loadingEmployees')}</p>
          ) : (
            <div className="max-h-96 overflow-y-auto border rounded">
              {sortedCategories.length === 0 ? (
                <p className="p-3 text-gray-500 text-center">{t('noEmployeesFoundList')}</p>
              ) : (
                <div className="divide-y">
                  {sortedCategories.map(category => {
                    const categoryEmployees = employeesByCategory[category];
                    if (categoryEmployees.length === 0) return null;
                    
                    return (
                      <div key={category}>
                        <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 sticky top-0 z-10 flex justify-between items-center">
                          <h3 className="text-sm font-semibold text-gray-800">
                            {category} ({categoryEmployees.length})
                          </h3>
                          <button
                            onClick={() => handlePrintCategory(category)}
                            disabled={loadingBatch}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            Print
                          </button>
                        </div>
                        <ul className="divide-y">
                          {categoryEmployees.map(emp => (
                            <li
                              key={emp.id}
                              className={`p-3 hover:bg-blue-50 ${
                                selectedEmployee?.id === emp.id ? 'bg-blue-100' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedEmployeeIds.has(emp.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleCheckboxChange(emp.id, e.target.checked);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <div
                                  onClick={() => handleEmployeeSelect(emp)}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div className="font-medium">{emp.name}</div>
                                  <div className="text-sm text-gray-600">
                                    {emp.employeeCode && `ID: ${emp.employeeCode} | `}
                                    {emp.category && `Category: ${emp.category}`}
                                    {emp.department && ` | Department: ${emp.department}`}
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export Buttons */}
        {selectedEmployee && (
          <div className="flex gap-2 mb-4 no-print">
            <Tooltip content={tooltips.reports.exportPDF}>
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {exporting ? t('loading') : t('exportPDF')}
              </button>
            </Tooltip>
            <Tooltip content={tooltips.reports.exportXLSX}>
              <button
                onClick={handleExportXLSX}
                disabled={exporting}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {exporting ? t('loading') : t('exportXLSX')}
              </button>
            </Tooltip>
            <Tooltip content={tooltips.reports.print}>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {t('print')}
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Employee Card Display */}
      {isBatchPrintMode && employeesForPrint.length > 0 ? (
        <div className="bg-white p-6 rounded-lg shadow print-container">
          {employeesForPrint.map((emp, index) => (
            <div key={emp.id} className={index > 0 ? 'mt-8 page-break-before' : ''}>
              {/* Header - will repeat on each page */}
              <div className="employee-card-header print-header">
                <div className="logo-container">
                  <img 
                    src={logo} 
                    alt="Logo" 
                    className="h-8 w-auto"
                  />
                </div>
                <div className="title-container">
                  <h1 className="text-xl font-bold text-gray-900">{t('employeeCard')}</h1>
                </div>
                <div className="logo-container">
                  <div className="text-xs text-gray-600 text-right" style={isRTL ? { textAlign: 'left' } : { textAlign: 'right' }}>
                    <div className="font-semibold">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    <div className="text-xs">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                  </div>
                </div>
              </div>
              
              {/* Top Box */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-3 rounded-lg mb-4 print-top-box">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <div className="text-xs opacity-90 mb-0.5 uppercase tracking-wide">{t('systemId')}</div>
                    <div className="text-sm font-bold">{emp.employeeCode || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-90 mb-0.5 uppercase tracking-wide">{t('category')}</div>
                    <div className="text-sm font-bold">{emp.category || 'N/A'}</div>
                  </div>
                </div>
                <div className="text-center border-t border-purple-400 pt-2 mt-2">
                  <div className="text-xl font-bold">{emp.name || 'N/A'}</div>
                  {emp.nameArabic && (
                    <div className="text-base mt-0.5 opacity-95">{emp.nameArabic}</div>
                  )}
                </div>
              </div>

              {/* Info Table - Reuse the same structure as single employee view */}
              <table className="w-full border-collapse mb-4 print-table">
                <tbody>
                  {/* Basic Info */}
                  <tr>
                    <td className="w-48 p-3 border bg-gray-50 font-bold text-sm align-top">{t('basicInfo')}</td>
                    <td className="p-3 border">
                      <div className="space-y-2">
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('name')}:</span> {emp.name || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('nameArabic')}:</span> {emp.nameArabic || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('joiningDate')}:</span> {formatDate(emp.joiningDate)}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('jobTitle')}:</span> {emp.jobTitle || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('department')}:</span> {emp.department || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('dateOfBirth')}:</span> {formatDate(emp.dateOfBirth)}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('mobileNumber')}:</span> {emp.mobileNumber || 'N/A'}</div>
                      </div>
                    </td>
                  </tr>

                  {/* Education */}
                  <tr>
                    <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('education')}</td>
                    <td className="p-3 border">
                      <div className="space-y-2">
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('certificate')}:</span> {emp.graduationCertificate || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('section')}:</span> {emp.graduationSection || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('university')}:</span> {emp.graduationUniversity || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('graduationYear')}:</span> {emp.graduationYear || 'N/A'}</div>
                      </div>
                    </td>
                  </tr>

                  {/* IDs */}
                  <tr>
                    <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('ids')}</td>
                    <td className="p-3 border">
                      <div className="space-y-2">
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('nationalId')}:</span> {formatLargeNumber(emp.nationalId)}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('nationalIdValidTill')}:</span> {formatDateOrNotSpecified(emp.nationalIdValidTill)}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('barAssociationNo')}:</span> {formatLargeNumber(emp.barAssociation)}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('barAssociationDegree')}:</span> {emp.barAssociationDegree || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('taxCardNo')}:</span> {emp.taxCard || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('socialInsurance')}:</span> {formatLargeNumber(emp.socialInsurance)}</div>
                      </div>
                    </td>
                  </tr>

                  {/* Address */}
                  <tr>
                    <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('address')}</td>
                    <td className="p-3 border">
                      <div className="space-y-2">
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('addressDetails')}:</span> {emp.address || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('regionCity')}:</span> {emp.addressRegion || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('governorate')}:</span> {emp.addressGovernorate || 'N/A'}</div>
                      </div>
                    </td>
                  </tr>

                  {/* Contract */}
                  <tr>
                    <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('contract')}</td>
                    <td className="p-3 border">
                      <div className="space-y-2">
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('contractType')}:</span> {emp.contractType || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('workDuration')}:</span> {calculateWorkDuration(emp.joiningDate)}</div>
                        <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('nextRenewalDate')}:</span> {formatDateOrNotSpecified(emp.contractRenewalDate)}</div>
                      </div>
                    </td>
                  </tr>

                  {/* Salary */}
                  <tr>
                    <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('salary')}</td>
                    <td className="p-3 border">
                      {emp.salaries && emp.salaries.length > 0 ? (
                        <table className="w-full border-collapse mt-2">
                          <thead>
                            <tr className="bg-purple-600 text-white">
                              <th className="p-2 text-left text-xs border">{t('month')}</th>
                              <th className="p-2 text-left text-xs border">{t('year')}</th>
                              <th className="p-2 text-left text-xs border">{t('basicSalary')}</th>
                              <th className="p-2 text-left text-xs border">{t('gross')}</th>
                              <th className="p-2 text-left text-xs border">{t('net')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {emp.salaries.map((salary: any, idx: number) => (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                                <td className="p-2 text-xs border">{salary.monthName || `${salary.month}/${salary.year}`}</td>
                                <td className="p-2 text-xs border">{salary.year}</td>
                                <td className="p-2 text-xs border">{formatCurrency(salary.basicSalary)}</td>
                                <td className="p-2 text-xs border">{formatCurrency(salary.gross)}</td>
                                <td className="p-2 text-xs border">{formatCurrency(salary.net)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <span className="text-gray-500 italic">{t('noData')}</span>
                      )}
                    </td>
                  </tr>

                  {/* Personnel */}
                  {emp.personnelRecord && (
                    <tr>
                      <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('personnel')}</td>
                      <td className="p-3 border">
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="font-semibold text-gray-600">Criminal Record:</span> {emp.personnelRecord.criminalRecord || 'N/A'}</div>
                            <div><span className="font-semibold text-gray-600">Military Certificate:</span> {emp.personnelRecord.militaryCertificate || 'N/A'}</div>
                            <div><span className="font-semibold text-gray-600">ID Copy:</span> {emp.personnelRecord.idCopy === true ? 'Present' : (emp.personnelRecord.idCopy === false ? 'Missing' : 'N/A')}</div>
                            <div><span className="font-semibold text-gray-600">Education Certificate:</span> {emp.personnelRecord.educationCertificate || 'N/A'}</div>
                            <div><span className="font-semibold text-gray-600">Birth Certificate:</span> {emp.personnelRecord.birthCertificate || 'N/A'}</div>
                            <div><span className="font-semibold text-gray-600">Recommendation Letter:</span> {emp.personnelRecord.recommendationLetter === true ? 'Present' : (emp.personnelRecord.recommendationLetter === false ? 'Missing' : 'N/A')}</div>
                            <div><span className="font-semibold text-gray-600">Personal Photos:</span> {emp.personnelRecord.personalPhotos === true ? 'Present' : (emp.personnelRecord.personalPhotos === false ? 'Missing' : 'N/A')}</div>
                            <div><span className="font-semibold text-gray-600">Tax Card:</span> {emp.personnelRecord.taxCard === null ? 'N/A' : (emp.personnelRecord.taxCard ? 'Present' : 'Missing')}</div>
                            <div><span className="font-semibold text-gray-600">Association ID:</span> {emp.personnelRecord.associationId === null ? 'N/A' : (emp.personnelRecord.associationId ? 'Present' : 'Missing')}</div>
                            <div><span className="font-semibold text-gray-600">Form 6:</span> {emp.personnelRecord.form6 || 'N/A'}</div>
                          </div>
                          <div className="border-t pt-2 mt-2">
                            <div><span className="font-semibold text-gray-600 text-xs">Asset (Laptop/PC/Tablet):</span> 
                              {emp.personnelRecord.laptopPcTablet ? (
                                (() => {
                                  try {
                                    const assets = JSON.parse(emp.personnelRecord.laptopPcTablet);
                                    return Array.isArray(assets) ? assets.join(', ') : emp.personnelRecord.laptopPcTablet;
                                  } catch {
                                    return emp.personnelRecord.laptopPcTablet;
                                  }
                                })()
                              ) : t('none')}
                            </div>
                            <div><span className="font-semibold text-gray-600 text-xs">Work Stub:</span> {emp.personnelRecord.workStub || 'N/A'}</div>
                            <div><span className="font-semibold text-gray-600 text-xs">Insurance Start Date:</span> {formatDateOrNotSpecified(emp.personnelRecord.insuranceStartDate)}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : selectedEmployee ? (
        <div className="bg-white p-6 rounded-lg shadow print-container">
          {/* Header - will repeat on each page */}
          <div className="employee-card-header print-header">
            <div className="logo-container">
              <img 
                src={logo} 
                alt="Logo" 
                className="h-8 w-auto"
              />
            </div>
            <div className="title-container">
              <h1 className="text-xl font-bold text-gray-900">{t('employeeCard')}</h1>
            </div>
            <div className="logo-container">
              <div className="text-xs text-gray-600 text-right" style={isRTL ? { textAlign: 'left' } : { textAlign: 'right' }}>
                <div className="font-semibold">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div className="text-xs">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
              </div>
            </div>
          </div>
          
          {/* Top Box */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-3 rounded-lg mb-4 print-top-box">
            <div className="flex justify-between items-center mb-2">
              <div>
                <div className="text-xs opacity-90 mb-0.5 uppercase tracking-wide">{t('systemId')}</div>
                <div className="text-sm font-bold">{selectedEmployee.employeeCode || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs opacity-90 mb-0.5 uppercase tracking-wide">{t('category')}</div>
                <div className="text-sm font-bold">{selectedEmployee.category || 'N/A'}</div>
              </div>
            </div>
            <div className="text-center border-t border-purple-400 pt-2 mt-2">
              <div className="text-xl font-bold">{selectedEmployee.name || 'N/A'}</div>
              {selectedEmployee.nameArabic && (
                <div className="text-base mt-0.5 opacity-95">{selectedEmployee.nameArabic}</div>
              )}
            </div>
          </div>

          {/* Info Table */}
          <table className="w-full border-collapse mb-4 print-table">
            <tbody>
              {/* Basic Info */}
              <tr>
                <td className="w-48 p-3 border bg-gray-50 font-bold text-sm align-top">{t('basicInfo')}</td>
                <td className="p-3 border">
                  <div className="space-y-2">
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('name')}:</span> {selectedEmployee.name || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('nameArabic')}:</span> {selectedEmployee.nameArabic || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('joiningDate')}:</span> {formatDate(selectedEmployee.joiningDate)}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('jobTitle')}:</span> {selectedEmployee.jobTitle || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('department')}:</span> {selectedEmployee.department || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('dateOfBirth')}:</span> {formatDate(selectedEmployee.dateOfBirth)}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('mobileNumber')}:</span> {selectedEmployee.mobileNumber || 'N/A'}</div>
                  </div>
                </td>
              </tr>

              {/* Education */}
              <tr>
                <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('education')}</td>
                <td className="p-3 border">
                  <div className="space-y-2">
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('certificate')}:</span> {selectedEmployee.graduationCertificate || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('section')}:</span> {selectedEmployee.graduationSection || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('university')}:</span> {selectedEmployee.graduationUniversity || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('graduationYear')}:</span> {selectedEmployee.graduationYear || 'N/A'}</div>
                  </div>
                </td>
              </tr>

              {/* IDs */}
              <tr>
                <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('ids')}</td>
                <td className="p-3 border">
                  <div className="space-y-2">
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('nationalId')}:</span> {formatLargeNumber(selectedEmployee.nationalId)}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('nationalIdValidTill')}:</span> {formatDateOrNotSpecified(selectedEmployee.nationalIdValidTill)}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('barAssociationNo')}:</span> {formatLargeNumber(selectedEmployee.barAssociation)}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('barAssociationDegree')}:</span> {selectedEmployee.barAssociationDegree || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('taxCardNo')}:</span> {selectedEmployee.taxCard || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('socialInsurance')}:</span> {formatLargeNumber(selectedEmployee.socialInsurance)}</div>
                  </div>
                </td>
              </tr>

              {/* Address */}
              <tr>
                <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('address')}</td>
                <td className="p-3 border">
                  <div className="space-y-2">
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('addressDetails')}:</span> {selectedEmployee.address || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('regionCity')}:</span> {selectedEmployee.addressRegion || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('governorate')}:</span> {selectedEmployee.addressGovernorate || 'N/A'}</div>
                  </div>
                </td>
              </tr>

              {/* Contract */}
              <tr>
                <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('contract')}</td>
                <td className="p-3 border">
                  <div className="space-y-2">
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('contractType')}:</span> {selectedEmployee.contractType || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('workDuration')}:</span> {calculateWorkDuration(selectedEmployee.joiningDate)}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('nextRenewalDate')}:</span> {formatDateOrNotSpecified(selectedEmployee.contractRenewalDate)}</div>
                  </div>
                </td>
              </tr>

              {/* Salary */}
              <tr>
                <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('salary')}</td>
                <td className="p-3 border">
                  {selectedEmployee.salaries && selectedEmployee.salaries.length > 0 ? (
                    <table className="w-full border-collapse mt-2">
                      <thead>
                        <tr className="bg-purple-600 text-white">
                          <th className="p-2 text-left text-xs border">{t('month')}</th>
                          <th className="p-2 text-left text-xs border">{t('year')}</th>
                          <th className="p-2 text-left text-xs border">{t('basicSalary')}</th>
                          <th className="p-2 text-left text-xs border">{t('gross')}</th>
                          <th className="p-2 text-left text-xs border">{t('net')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEmployee.salaries.map((salary, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                            <td className="p-2 text-xs border">{salary.monthName || `${salary.month}/${salary.year}`}</td>
                            <td className="p-2 text-xs border">{salary.year}</td>
                            <td className="p-2 text-xs border">{formatCurrency(salary.basicSalary)}</td>
                            <td className="p-2 text-xs border">{formatCurrency(salary.gross)}</td>
                            <td className="p-2 text-xs border">{formatCurrency(salary.net)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <span className="text-gray-500 italic">{t('noData')}</span>
                  )}
                </td>
              </tr>

              {/* Personnel */}
              {selectedEmployee.personnelRecord && (
                <tr>
                  <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('personnel')}</td>
                  <td className="p-3 border">
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="font-semibold text-gray-600">Criminal Record:</span> {selectedEmployee.personnelRecord.criminalRecord || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600">Military Certificate:</span> {selectedEmployee.personnelRecord.militaryCertificate || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600">ID Copy:</span> {selectedEmployee.personnelRecord.idCopy ? 'Present' : 'Missing'}</div>
                        <div><span className="font-semibold text-gray-600">Education Certificate:</span> {selectedEmployee.personnelRecord.educationCertificate || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600">Birth Certificate:</span> {selectedEmployee.personnelRecord.birthCertificate || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600">Recommendation Letter:</span> {selectedEmployee.personnelRecord.recommendationLetter ? 'Present' : 'Missing'}</div>
                        <div><span className="font-semibold text-gray-600">Personal Photos:</span> {selectedEmployee.personnelRecord.personalPhotos ? 'Present' : 'Missing'}</div>
                        <div><span className="font-semibold text-gray-600">Tax Card:</span> {selectedEmployee.personnelRecord.taxCard === null ? 'N/A' : (selectedEmployee.personnelRecord.taxCard ? 'Present' : 'Missing')}</div>
                        <div><span className="font-semibold text-gray-600">Association ID:</span> {selectedEmployee.personnelRecord.associationId === null ? 'N/A' : (selectedEmployee.personnelRecord.associationId ? 'Present' : 'Missing')}</div>
                        <div><span className="font-semibold text-gray-600">Form 6:</span> {selectedEmployee.personnelRecord.form6 || 'N/A'}</div>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div><span className="font-semibold text-gray-600 text-xs">Asset (Laptop/PC/Tablet):</span> 
                          {selectedEmployee.personnelRecord.laptopPcTablet ? (
                            (() => {
                              try {
                                const assets = JSON.parse(selectedEmployee.personnelRecord.laptopPcTablet);
                                return Array.isArray(assets) ? assets.join(', ') : selectedEmployee.personnelRecord.laptopPcTablet;
                              } catch {
                                return selectedEmployee.personnelRecord.laptopPcTablet;
                              }
                            })()
                          ) : t('none')}
                        </div>
                        <div><span className="font-semibold text-gray-600 text-xs">Work Stub:</span> {selectedEmployee.personnelRecord.workStub || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600 text-xs">Insurance Start Date:</span> {formatDateOrNotSpecified(selectedEmployee.personnelRecord.insuranceStartDate)}</div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
          Please select an employee from the list above
        </div>
      )}
    </div>
  );
}

