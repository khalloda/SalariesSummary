import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

export default function SalaryChanges() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    axios.get(`${API_BASE_URL}/reports/salary-changes?year=${year}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [year]);
  
  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data found</div>;
  
  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    try {
      const url = `${API_BASE_URL}/exports/salary-changes?year=${year}&format=pdf`;
      const response = await axios.get(url, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url2 = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url2;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `Salary_Changes_${year}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
          // Decode URI if needed
          try {
            filename = decodeURIComponent(filename);
          } catch (e) {
            // If decoding fails, use as is
          }
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url2);
    } catch (error: any) {
      console.error('Export error:', error);
      alert(`Failed to export PDF: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h2 className="text-2xl font-bold">{t('salaryChanges')} - {year}</h2>
        <div className="flex gap-2 items-center">
          <select
            value={year}
            onChange={(e) => {
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.set('year', e.target.value);
              setSearchParams(newSearchParams);
            }}
            className="border rounded px-3 py-2"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {t('print') || 'Print'}
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Export PDF
          </button>
        </div>
      </div>
      <div className="print:block hidden mb-4">
        <h2 className="text-2xl font-bold">{t('salaryChanges')} - {year}</h2>
      </div>
      {data.changes && data.changes.length > 0 && (
        <p className="mb-4 text-gray-600">Total changes: {data.changes.length}</p>
      )}
      
      <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('name')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('month')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Previous Basic Salary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Basic Salary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.changes && data.changes.length > 0 ? (
              data.changes.map((change: any, idx: number) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap">{change.employee?.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{change.monthName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{(change.previousBasicSalary || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{(change.newBasicSalary || 0).toLocaleString()}</td>
                  <td className={`px-6 py-4 whitespace-nowrap font-semibold ${change.change > 0 ? 'text-green-600' : change.change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {change.change > 0 ? '+' : ''}{(change.change || 0).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No salary changes found for {year}</td>
              </tr>
            )}
            {/* Grand Totals Row */}
            {data.totals && (
              <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                <td className="px-6 py-4 whitespace-nowrap" colSpan={2}>GRAND TOTAL</td>
                <td className="px-6 py-4 whitespace-nowrap">{(data.totals.previousBasicSalary || 0).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{(data.totals.newBasicSalary || 0).toLocaleString()}</td>
                <td className={`px-6 py-4 whitespace-nowrap ${data.totals.change > 0 ? 'text-green-600' : data.totals.change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {data.totals.change > 0 ? '+' : ''}{(data.totals.change || 0).toLocaleString()}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

