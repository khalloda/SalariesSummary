import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Tooltip from '../components/Tooltip';
import { tooltips } from '../utils/tooltips';

interface DashboardData {
  overallCompliance: number;
  totalEmployees: number;
  documentStatuses: Record<string, {
    present: number;
    missing: number;
    na: number;
    copy: number;
    original: number;
  }>;
  complianceByCategory: Record<string, {
    total: number;
    avgCompliance: number;
  }>;
  assetDistribution: {
    laptops: number;
    pcs: number;
    tablets: number;
    none: number;
  };
  mostCommonMissing: Array<{
    document: string;
    count: number;
  }>;
  complianceLevels: {
    critical: number;
    warning: number;
    good: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function PersonnelStatusDashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
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
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/personnel/dashboard`);
      console.log('Dashboard API response:', response.data);
      if (response.data && response.data.totalEmployees !== undefined) {
        setData(response.data);
      } else {
        console.warn('Unexpected API response structure:', response.data);
        setData(null);
      }
    } catch (error: any) {
      console.error('Error fetching dashboard:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    try {
      if (format === 'pdf') {
        const response = await axios.post(
          `${API_BASE_URL}/exports/personnel-dashboard/pdf`,
          { data },
          { responseType: 'blob' }
        );
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Personnel_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        // XLSX export
        alert('XLSX export will be implemented soon');
      }
    } catch (error: any) {
      console.error(`${format.toUpperCase()} export error:`, error);
      alert(`Failed to export ${format.toUpperCase()}: ${error.response?.data?.error || error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">{t('loading')}</div>
      </div>
    );
  }

  if (!data || (data.totalEmployees === 0 && !data.overallCompliance)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-lg text-gray-500 mb-2">No data found</div>
          <div className="text-sm text-gray-400">Please ensure personnel data has been imported.</div>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const complianceByCategoryData = Object.entries(data.complianceByCategory).map(([category, stats]) => ({
    category,
    compliance: Math.round(stats.avgCompliance * 100) / 100,
    employees: stats.total
  }));

  const assetDistributionData = [
    { name: 'Laptops', value: data.assetDistribution.laptops },
    { name: 'PCs', value: data.assetDistribution.pcs },
    { name: 'Tablets', value: data.assetDistribution.tablets },
    { name: 'None', value: data.assetDistribution.none }
  ].filter(item => item.value > 0);

  const documentStatusData = Object.entries(data.documentStatuses).map(([document, status]) => ({
    document,
    present: status.present + status.copy + status.original,
    missing: status.missing,
    na: status.na
  }));

  const complianceLevelsData = [
    { name: 'Critical (<70%)', value: data.complianceLevels.critical, color: '#ef4444' },
    { name: 'Warning (70-90%)', value: data.complianceLevels.warning, color: '#f59e0b' },
    { name: 'Good (≥90%)', value: data.complianceLevels.good, color: '#10b981' }
  ].filter(item => item.value > 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 no-print">
        <h2 className="text-3xl font-bold">{t('personnelStatusDashboard')}</h2>
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
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">{t('totalEmployees')}</div>
          <div className="text-3xl font-bold text-gray-900">{data.totalEmployees}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Overall Compliance</div>
          <div className={`text-3xl font-bold ${
            data.overallCompliance >= 90 ? 'text-green-600' :
            data.overallCompliance >= 70 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {data.overallCompliance.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Critical Compliance</div>
          <div className="text-3xl font-bold text-red-600">{data.complianceLevels.critical}</div>
          <div className="text-xs text-gray-500 mt-1">Employees &lt;70%</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Good Compliance</div>
          <div className="text-3xl font-bold text-green-600">{data.complianceLevels.good}</div>
          <div className="text-xs text-gray-500 mt-1">Employees ≥90%</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Compliance by Category */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Compliance by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={complianceByCategoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              <Legend />
              <Bar dataKey="compliance" fill="#0088FE" name="Compliance %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Asset Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Asset Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={assetDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {assetDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Compliance Levels */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Compliance Levels Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={complianceLevelsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {complianceLevelsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Document Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Document Status Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={documentStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="document" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" stackId="a" fill="#10b981" name="Present" />
              <Bar dataKey="missing" stackId="a" fill="#ef4444" name="Missing" />
              <Bar dataKey="na" stackId="a" fill="#9ca3af" name="N/A" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Most Common Missing Documents */}
      {data.mostCommonMissing.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">Most Common Missing Documents</h3>
          <div className="space-y-2">
            {data.mostCommonMissing.map((item, index) => (
              <div key={item.document} className="flex items-center justify-between p-3 bg-red-50 rounded">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{item.document}</span>
                </div>
                <span className="text-red-600 font-bold">{item.count} employees</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance by Category Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Compliance by Category Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-center">{t('totalEmployeesLabel')}</th>
                <th className="px-4 py-2 text-center">Average Compliance</th>
                <th className="px-4 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.complianceByCategory).map(([category, stats]) => (
                <tr key={category} className="border-b">
                  <td className="px-4 py-2 font-medium">{category}</td>
                  <td className="px-4 py-2 text-center">{stats.total}</td>
                  <td className="px-4 py-2 text-center font-semibold">
                    {Math.round(stats.avgCompliance * 100) / 100}%
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      stats.avgCompliance >= 90 ? 'bg-green-100 text-green-800' :
                      stats.avgCompliance >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {stats.avgCompliance >= 90 ? 'Good' :
                       stats.avgCompliance >= 70 ? 'Warning' : 'Critical'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

