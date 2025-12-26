import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

export default function EmployeeAnnual() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    axios.get(`${API_BASE_URL}/employees/${id}/annual?year=${year}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id, year]);
  
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
      
      // Create blob and download
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${data.employee.name}_${year}.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
          // Decode URI if needed
          try {
            filename = decodeURIComponent(filename);
          } catch (e) {
            // Keep original if decode fails
          }
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
  
  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data found</div>;
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{data.employee.name} - {year}</h2>
        <div className="space-x-2">
          <button onClick={() => handleExport('pdf')} className="px-4 py-2 bg-red-600 text-white rounded">{t('exportPDF')}</button>
          <button onClick={() => handleExport('csv')} className="px-4 py-2 bg-green-600 text-white rounded">{t('exportCSV')}</button>
          <button onClick={() => handleExport('xlsx')} className="px-4 py-2 bg-blue-600 text-white rounded">{t('exportXLSX')}</button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
              return (
                <tr key={month} className={!record ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">{monthNames[month - 1]}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{record?.basicSalary?.toLocaleString() || '0'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{record?.gross?.toLocaleString() || '0'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{record?.net?.toLocaleString() || '0'}</td>
                </tr>
              );
            })}
            {/* Totals Row */}
            <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
              <td className="px-6 py-4 whitespace-nowrap">TOTAL</td>
              <td className="px-6 py-4 whitespace-nowrap">{data.totals?.basicSalary?.toLocaleString() || '0'}</td>
              <td className="px-6 py-4 whitespace-nowrap">{data.totals?.gross?.toLocaleString() || '0'}</td>
              <td className="px-6 py-4 whitespace-nowrap">{data.totals?.net?.toLocaleString() || '0'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

