import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

export default function SalaryChanges() {
  const [searchParams] = useSearchParams();
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
  
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{t('salaryChanges')} - {year}</h2>
      <p className="mb-4">Total changes: {data.totalChanges}</p>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
            {data.changes.map((change: any, idx: number) => (
              <tr key={idx}>
                <td className="px-6 py-4 whitespace-nowrap">{change.employee.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{change.monthName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{change.previousValue.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{change.newValue.toLocaleString()}</td>
                <td className={`px-6 py-4 whitespace-nowrap font-semibold ${change.delta > 0 ? 'text-green-600' : change.delta < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {change.delta > 0 ? '+' : ''}{change.delta.toLocaleString()}
                </td>
              </tr>
            ))}
            {/* Grand Totals Row */}
            {data.totals && (
              <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                <td className="px-6 py-4 whitespace-nowrap" colSpan={2}>GRAND TOTAL</td>
                <td className="px-6 py-4 whitespace-nowrap">{data.totals.previousValue.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{data.totals.newValue.toLocaleString()}</td>
                <td className={`px-6 py-4 whitespace-nowrap ${data.totals.delta > 0 ? 'text-green-600' : data.totals.delta < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {data.totals.delta > 0 ? '+' : ''}{data.totals.delta.toLocaleString()}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

