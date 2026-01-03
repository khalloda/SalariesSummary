import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

interface ComplianceData {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  category: string;
  department: string;
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
  const [data, setData] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [minComplianceFilter, setMinComplianceFilter] = useState<string>('0');
  const [categories, setCategories] = useState<string[]>([]);
  
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
  }, [categoryFilter, minComplianceFilter]);

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
      
      // Extract unique categories
      const uniqueCategories = Array.from(new Set(response.data.employees.map((e: ComplianceData) => e.category).filter(Boolean)));
      setCategories(uniqueCategories.sort());
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
        
        const headers = ['Employee Code', 'Name', 'Category', 'Department', 'Compliance %', 'Completed', 'Total', 'Missing Documents'];
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

  const filteredEmployees = data.employees;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 no-print">
        <h2 className="text-3xl font-bold">Document Compliance Report</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Print
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Export PDF
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Export XLSX
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Total Employees</div>
          <div className="text-3xl font-bold text-gray-900">{data.summary.totalEmployees}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Average Compliance</div>
          <div className="text-3xl font-bold text-blue-600">
            {data.summary.averageCompliance.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Critical (&lt;70%)</div>
          <div className="text-3xl font-bold text-red-600">{data.summary.complianceLevels.critical}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Good (≥90%)</div>
          <div className="text-3xl font-bold text-green-600">{data.summary.complianceLevels.good}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Min Compliance %</label>
            <select
              value={minComplianceFilter}
              onChange={(e) => setMinComplianceFilter(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="0">All</option>
              <option value="70">≥70%</option>
              <option value="80">≥80%</option>
              <option value="90">≥90%</option>
            </select>
          </div>
        </div>
      </div>

      {/* Compliance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compliance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Missing
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No employees found
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.employeeId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {emp.employeeCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {emp.employeeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {emp.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {emp.department || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold inline-block ${getComplianceColor(emp.compliancePercentage)}`}>
                        {emp.compliancePercentage.toFixed(1)}% ({getComplianceBadge(emp.compliancePercentage)})
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {emp.completedDocuments} / {emp.totalApplicableDocuments}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {emp.missingDocuments.length > 0 ? (
                        <div className="max-w-xs">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

