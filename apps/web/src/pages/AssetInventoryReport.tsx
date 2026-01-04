import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import Tooltip from '../components/Tooltip';
import { tooltips } from '../utils/tooltips';
import { normalizeForSearch, groupAndSortEmployeesByCategory, sortCategories } from '../utils/employee-utils';

interface AssetData {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  category: string;
  department: string;
  assetType: string;
  status: string;
}

interface AssetReport {
  summary: {
    total: number;
    laptops: number;
    pcs: number;
    tablets: number;
    none: number;
    byCategory: Record<string, {
      laptops: number;
      pcs: number;
      tablets: number;
      none: number;
    }>;
  };
  employees: AssetData[];
}

export default function AssetInventoryReport() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<AssetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Active');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [assetFilter, setAssetFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  
  // Add print styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        @page {
          @bottom-center {
            content: "P " counter(page) " of " counter(pages);
            font-size: 10px;
            color: #666;
          }
        }
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
        span[role="button"] {
          color: #000 !important;
          text-decoration: none !important;
          cursor: default !important;
        }
        button {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          color: #000 !important;
          text-decoration: none !important;
          cursor: default !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    fetchData();
  }, [categoryFilter, statusFilter, departmentFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      
      const response = await axios.get(`${API_BASE_URL}/personnel/assets/report?${params.toString()}`);
      setData(response.data);
      
      // Extract unique categories and departments
      const uniqueCategories = Array.from(new Set(response.data.employees.map((e: AssetData) => e.category).filter(Boolean)));
      const uniqueDepartments = Array.from(new Set(response.data.employees.map((e: AssetData) => e.department).filter(Boolean)));
      setCategories(uniqueCategories);
      setDepartments(uniqueDepartments.sort());
    } catch (error) {
      console.error('Error fetching asset report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async (format: 'pdf' | 'xlsx' | 'csv') => {
    try {
      if (format === 'csv') {
        if (!data) return;
        
        const headers = [t('employeeCodeHeader'), t('nameHeader'), t('categoryHeader'), t('department'), t('assetTypeHeader'), t('statusHeader')];
        const rows = data.employees.map(emp => [
          emp.employeeCode,
          emp.employeeName,
          emp.category,
          emp.department,
          emp.assetType || t('none'),
          emp.status === 'Active' ? t('statusActive') : t('statusResigned')
        ]);
        
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Asset_Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/exports/asset-inventory/pdf`,
            { data, categoryFilter, assetFilter },
            { responseType: 'blob' }
          );
          
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `Asset_Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`);
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

  const getAssetColor = (assetType: string) => {
    switch (assetType) {
      case 'Laptop':
        return 'bg-blue-100 text-blue-800';
      case 'PC':
        return 'bg-purple-100 text-purple-800';
      case 'Tablet':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    
    // Asset filter
    const asset = emp.assetType || 'None';
    const matchesAsset = assetFilter === 'all' || 
      (assetFilter === 'none' ? (asset === 'None' || !asset) : asset === assetFilter);
    
    return matchesSearch && matchesStatus && matchesDepartment && matchesCategory && matchesAsset;
  });

  // Group by category
  const employeesByCategory = groupAndSortEmployeesByCategory(filtered);
  const sortedCategories = Object.keys(employeesByCategory).sort(sortCategories);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 no-print">
        <h2 className="text-3xl font-bold">{t('assetInventoryReport')}</h2>
        <div className="flex gap-2">
          <Tooltip content={tooltips.reports.print}>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Print
            </button>
          </Tooltip>
          <Tooltip content={tooltips.reports.exportPDF}>
            <button
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Export PDF
            </button>
          </Tooltip>
          <Tooltip content={tooltips.reports.exportXLSX}>
            <button
              onClick={() => handleExport('xlsx')}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Export XLSX
            </button>
          </Tooltip>
          <Tooltip content={tooltips.reports.exportCSV}>
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Export CSV
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">{t('totalEmployees')}</div>
          <div className="text-3xl font-bold text-gray-900">{data.summary.total}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">{t('laptops')}</div>
          <div className="text-3xl font-bold text-blue-600">{data.summary.laptops}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">{t('pcs')}</div>
          <div className="text-3xl font-bold text-purple-600">{data.summary.pcs}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">{t('tablets')}</div>
          <div className="text-3xl font-bold text-pink-600">{data.summary.tablets}</div>
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(data.summary.byCategory).length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">Asset Distribution by Category</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-center">Laptops</th>
                  <th className="px-4 py-2 text-center">PCs</th>
                  <th className="px-4 py-2 text-center">Tablets</th>
                  <th className="px-4 py-2 text-center">None</th>
                  <th className="px-4 py-2 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.summary.byCategory).map(([category, counts]) => (
                  <tr key={category} className="border-b">
                    <td className="px-4 py-2 font-medium">{category}</td>
                    <td className="px-4 py-2 text-center">{counts.laptops}</td>
                    <td className="px-4 py-2 text-center">{counts.pcs}</td>
                    <td className="px-4 py-2 text-center">{counts.tablets}</td>
                    <td className="px-4 py-2 text-center">{counts.none}</td>
                    <td className="px-4 py-2 text-center font-semibold">
                      {counts.laptops + counts.pcs + counts.tablets + counts.none}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

          {/* Asset Filter */}
          <div>
            <Tooltip content={tooltips.reports.assetType}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('assetType')}</label>
            </Tooltip>
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('allAssets')}</option>
              <option value="Laptop">{t('laptop')}</option>
              <option value="PC">{t('pc')}</option>
              <option value="Tablet">{t('tablet')}</option>
              <option value="none">{t('none')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Asset Tables by Category */}
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
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '10%' }}>
                          {t('id')}
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '25%' }}>
                          {t('name')}
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '12%' }}>
                          {t('category')}
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '18%' }}>
                          {t('department')}
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '15%' }}>
                          {t('assetType')}
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '10%' }}>
                          {t('status')}
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
                            <span 
                              onClick={() => navigate(`/employees/${emp.employeeId}`)}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer print:text-black print:no-underline print:cursor-default"
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  navigate(`/employees/${emp.employeeId}`);
                                }
                              }}
                            >
                              {emp.employeeName || ''}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            {emp.category}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            {emp.department || 'N/A'}
                          </td>
                          <td className="px-3 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getAssetColor(emp.assetType || 'None')}`}>
                              {emp.assetType || 'None'}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              emp.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {emp.status === 'Active' ? t('statusActive') : t('statusResigned')}
                            </span>
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

