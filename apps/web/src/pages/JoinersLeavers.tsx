import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

export default function JoinersLeavers() {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    axios.get(`${API_BASE_URL}/reports/joiners-leavers?year=${year}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [year]);
  
  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data found</div>;
  
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{t('joinersLeavers')} - {year}</h2>
      
      {/* Summary Totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-6 rounded-lg shadow border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-2 text-blue-800">Total Joiners</h3>
          <p className="text-3xl font-bold text-blue-600">{data.joinersCount}</p>
        </div>
        <div className="bg-red-50 p-6 rounded-lg shadow border-2 border-red-200">
          <h3 className="text-lg font-semibold mb-2 text-red-800">Total Leavers</h3>
          <p className="text-3xl font-bold text-red-600">{data.leaversCount}</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg shadow border-2 border-gray-200">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Net Change</h3>
          <p className={`text-3xl font-bold ${data.joinersCount - data.leaversCount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.joinersCount - data.leaversCount >= 0 ? '+' : ''}{data.joinersCount - data.leaversCount}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Joiners ({data.joinersCount})</h3>
          <div className="space-y-2">
            {data.joiners.length > 0 ? (
              data.joiners.map((item: any) => (
                <div key={item.employee.id} className="border-b pb-2">
                  <p className="font-medium">{item.employee.name}</p>
                  <p className="text-sm text-gray-600">Joined in {item.firstMonthName}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic">No joiners for this year</p>
            )}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Leavers ({data.leaversCount})</h3>
          <div className="space-y-2">
            {data.leavers.length > 0 ? (
              data.leavers.map((item: any) => (
                <div key={item.employee.id} className="border-b pb-2">
                  <p className="font-medium">{item.employee.name}</p>
                  <p className="text-sm text-gray-600">Left in {item.lastMonthName}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic">No leavers for this year</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

