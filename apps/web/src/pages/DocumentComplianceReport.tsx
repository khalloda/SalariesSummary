import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import Tooltip from '../components/Tooltip';
import { tooltips } from '../utils/tooltips';

interface ComplianceData {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  category: string;
  department: string;
  status?: string;
  compliancePercentage: number;
  completedDocuments: number;
  totalApplicableDocuments: number;
  missingDocuments: string[];
  personnelRecord: any;
}

interface ComplianceReport {
  summary: {
    totalEmployees: number;
    averageCompliance: number;
    complianceLevels: {
      critical: number;
      warning: number;
      good: number;
    };
  };
  employees: ComplianceData[];
}

export default function DocumentComplianceReport() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Active');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [minComplianceFilter, setMinComplianceFilter] = useState<string>('0');
  const [categories, setCategories] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  
  // Add print styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        .no-print {
          display: none !important;
        }
        nav, header {
          display: none !important;
        }
        body {
          margin: 0;
          padding: 20px;
        }
        .bg-white {
          background: white !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    fetchData();
  }, [categoryFilter, minComplianceFilter, statusFilter, departmentFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      params.append('minCompliance', minComplianceFilter);
      
      const response = await axios.get(`${API_BASE_URL}/personnel/compliance/report?${params.toString()}`);
      setData(response.data);
      
      // Extract unique categories and departments
      const uniqueCategories = Array.from(new Set(response.data.employees.map((e: ComplianceData) => e.category).filter(Boolean)));
      const uniqueDepartments = Array.from(new Set(response.data.employees.map((e: ComplianceData) => e.department).filter(Boolean)));
      setCategories(uniqueCategories);
      setDepartments(uniqueDepartments.sort());
    } catch (error) {
      console.error('Error fetching compliance report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getComplianceColor = (percentage: number) => {
    if (percentage < 70) return 'text-red-600 bg-red-50';
    if (percentage < 90) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getComplianceBadge = (percentage: number) => {
    if (percentage < 70) return 'Critical';
    if (percentage < 90) return 'Warning';
    return 'Good';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async (format: 'pdf' | 'xlsx' | 'csv') => {
    try {
      if (format === 'csv') {
        if (!data) return;
        
        const headers = [t('employeeCodeHeader'), t('nameHeader'), t('categoryHeader'), t('department'), t('compliancePercentage'), t('completed'), t('totalHeader'), t('missingDocuments')];
        const rows = data.employees.map(emp => [
          emp.employeeCode,
          emp.employeeName,
          emp.category,
          emp.department,
          emp.compliancePercentage.toFixed(2),
          emp.completedDocuments,
          emp.totalApplicableDocuments,
          emp.missingDocuments.join('; ')
        ]);
        
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Document_Compliance_Report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/exports/document-compliance/pdf`,
            { data, categoryFilter, minComplianceFilter },
            { responseType: 'blob' }
          );
          
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `Document_Compliance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        } catch (apiError: any) {
          console.error('PDF export error:', apiError);
          alert(`Failed to export PDF: ${apiError.response?.data?.error || apiError.message}`);
        }
      } else {
        // XLSX export
        alert('XLSX export will be implemented soon');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-500">No data found</div>
      </div>
    );
  }

  // Normalize search text for robust matching
  const normalizeForSearch = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .trim();
  };

  // Category sorting: Partners first, then Lawyers, Admins, Consultants
  const getCategoryPriority = (category: string | undefined): number => {
    if (!category) return 999;
    const lowerCaseCategory = category.toLowerCase();
    if (lowerCaseCategory.includes('partner')) return 1;
    if (lowerCaseCategory.includes('lawyer')) return 2;
    if (lowerCaseCategory.includes('admin')) return 3;
    if (lowerCaseCategory.includes('consultant')) return 4;
    return 999;
  };

  const sortCategories = (a: string, b: string) => {
    const priorityA = getCategoryPriority(a);
    const priorityB = getCategoryPriority(b);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return a.localeCompare(b);
  };

  // Sort employee codes numerically (e.g., "2-1", "2-2", "2-14")
  const compareEmployeeCodes = (codeA: string | undefined, codeB: string | undefined) => {
    if (!codeA && !codeB) return 0;
    if (!codeA) return 1;
    if (!codeB) return -1;

    const partsA = codeA.split('-').map(Number);
    const partsB = codeB.split('-').map(Number);

    for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
      if (partsA[i] !== partsB[i]) {
        return partsA[i] - partsB[i];
      }
    }
    return partsA.length - partsB.length;
  };

  // Filter employees
  const filtered = data.employees.filter(emp => {
    // Search filter
    const normalizedSearch = normalizeForSearch(search);
    const normalizedName = normalizeForSearch(emp.employeeName);
    const matchesSearch = !search || normalizedName.includes(normalizedSearch);
    
    // Status filter
    const matchesStatus = !statusFilter || statusFilter === 'all' || (emp.status || 'Active') === statusFilter;
    
    // Department filter
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
    
    // Category filter
    const matchesCategory = categoryFilter === 'all' || emp.category === categoryFilter;
    
    // Min compliance filter
    const matchesMinCompliance = parseFloat(minComplianceFilter) === 0 || emp.compliancePercentage >= parseFloat(minComplianceFilter);
    
    return matchesSearch && matchesStatus && matchesDepartment && matchesCategory && matchesMinCompliance;
  });

  // Group by category
  const employeesByCategory: Record<string, ComplianceData[]> = {};
  filtered.forEach(emp => {
    const category = emp.category || 'Uncategorized';
    if (!employeesByCategory[category]) {
      employeesByCategory[category] = [];
    }
    employeesByCategory[category].push(emp);
  });

  // Sort categories
  const sortedCategories = Object.keys(employeesByCategory).sort(sortCategories);

  // Sort employees within each category by employee code
  sortedCategories.forEach(category => {
    employeesByCategory[category].sort((a, b) => compareEmployeeCodes(a.employeeCode, b.employeeCode));
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 no-print">
        <h2 className="text-3xl font-bold">{t('documentComplianceReport')}</h2>
        <div className="flex gap-2">
          <Tooltip content={tooltips.reports.print}>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {t('print')}
            </button>
          </Tooltip>
          <Tooltip content={tooltips.reports.exportPDF}>
            <button
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              {t('exportPDF')}
            </button>
          </Tooltip>
          <Tooltip content={tooltips.reports.exportXLSX}>
            <button
              onClick={() => handleExport('xlsx')}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {t('exportXLSX')}
            </button>
          </Tooltip>
          <Tooltip content={tooltips.reports.exportCSV}>
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {t('exportCSV')}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">{t('totalEmployeesLabel')}</div>
          <div className="text-3xl font-bold text-gray-900">{data.summary.totalEmployees}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">{t('averageCompliance')}</div>
          <div className="text-3xl font-bold text-blue-600">
            {data.summary.averageCompliance.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">{t('critical')}</div>
          <div className="text-3xl font-bold text-red-600">{data.summary.complianceLevels.critical}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">{t('good')}</div>
          <div className="text-3xl font-bold text-green-600">{data.summary.complianceLevels.good}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <Tooltip content={tooltips.common.search}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('search')}</label>
            </Tooltip>
            <input
              type="text"
              placeholder={t('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('status')}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('all')}</option>
              <option value="Active">{t('statusActive')}</option>
              <option value="Resigned">{t('statusResigned')}</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <Tooltip content={tooltips.reports.filterByCategory}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('category')}</label>
            </Tooltip>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('allCategories')}</option>
              {categories.sort(sortCategories).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('department')}</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('all')}</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Min Compliance Filter */}
          <div>
            <Tooltip content={tooltips.reports.minCompliance}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('minCompliance')}</label>
            </Tooltip>
            <select
              value={minComplianceFilter}
              onChange={(e) => setMinComplianceFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="0">{t('all')}</option>
              <option value="70">≥70%</option>
              <option value="80">≥80%</option>
              <option value="90">≥90%</option>
            </select>
          </div>
        </div>
      </div>

      {/* Compliance Tables by Category */}
      <div className="space-y-6">
        {sortedCategories.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            No employees found
          </div>
        ) : (
          sortedCategories.map(category => {
            const categoryEmployees = employeesByCategory[category];
            if (categoryEmployees.length === 0) return null;

            return (
              <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {category} ({categoryEmployees.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '8%' }}>
                          {t('id')}
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '22%' }}>
                          {t('name')}
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '12%' }}>
                          {t('category')}
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '15%' }}>
                          {t('department')}
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '15%' }}>
                          {t('compliancePercentage')}
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '10%' }}>
                          {t('documents')}
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '18%' }}>
                          {t('missingDocuments')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {categoryEmployees.map((emp) => (
                        <tr key={emp.employeeId} className="hover:bg-gray-50">
                          <td className="px-3 py-4 text-sm font-medium text-gray-900">
                            {emp.employeeCode}
                          </td>
                          <td className="px-3 py-4 text-sm">
                            <button
                              onClick={() => navigate(`/employees/${emp.employeeId}`)}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-left"
                            >
                              {emp.employeeName}
                            </button>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            {emp.category}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            {emp.department || 'N/A'}
                          </td>
                          <td className="px-3 py-4">
                            <div className={`px-2 py-1 rounded-full text-xs font-semibold inline-block ${getComplianceColor(emp.compliancePercentage)}`}>
                              {emp.compliancePercentage.toFixed(1)}% ({getComplianceBadge(emp.compliancePercentage)})
                            </div>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            {emp.completedDocuments} / {emp.totalApplicableDocuments}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            {emp.missingDocuments.length > 0 ? (
                              <div>
                                <div className="text-red-600 font-medium">{emp.missingDocuments.length} missing</div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {emp.missingDocuments.slice(0, 2).join(', ')}
                                  {emp.missingDocuments.length > 2 && ` +${emp.missingDocuments.length - 2} more`}
                                </div>
                              </div>
                            ) : (
                              <span className="text-green-600 font-medium">Complete</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}



