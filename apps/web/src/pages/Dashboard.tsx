import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [lastImport, setLastImport] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  
  const handleImport = async () => {
    setImporting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/import`);
      if (response.data.success) {
        setLastImport(new Date().toISOString());
        const errorMsg = response.data.errors && response.data.errors.length > 0
          ? `\n\nErrors: ${response.data.errors.slice(0, 5).join('\n')}`
          : '';
        alert(`Import successful! ${response.data.recordsImported} records imported from ${response.data.filesProcessed} files.${errorMsg}`);
      } else {
        const errorMsg = response.data.errors && response.data.errors.length > 0
          ? response.data.errors.slice(0, 10).join('\n')
          : 'Unknown error';
        alert(`Import completed with errors:\n\n${errorMsg}`);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      const errorDetails = error.response?.data?.stack 
        ? `\n\nDetails: ${error.response.data.stack.split('\n').slice(0, 3).join('\n')}`
        : '';
      alert(`Import failed: ${errorMsg}${errorDetails}`);
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };
  
  const handleClearDatabase = async () => {
    if (!confirm('Are you sure you want to clear all imported data? This action cannot be undone!')) {
      return;
    }
    
    setClearing(true);
    try {
      const response = await axios.delete(`${API_BASE_URL}/import/clear`);
      if (response.data.success) {
        alert(`Database cleared successfully!\n\nDeleted:\n- ${response.data.deleted.salaryRecords} salary records\n- ${response.data.deleted.employees} employees\n- ${response.data.deleted.importLogs} import logs`);
        setLastImport(null);
      } else {
        alert(`Failed to clear database: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to clear database: ${errorMsg}`);
      console.error('Clear database error:', error);
    } finally {
      setClearing(false);
    }
  };
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">{t('dashboard')}</h2>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">{t('year')}</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="border rounded px-3 py-2"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-600">{t('lastImported')}: {lastImport || 'Never'}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={importing || clearing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {importing ? 'Importing...' : t('importNow')}
            </button>
            <button
              onClick={handleClearDatabase}
              disabled={importing || clearing}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Clear Database'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg transition" onClick={() => navigate('/employees')}>
          <h3 className="text-lg font-semibold mb-2">{t('employees')}</h3>
          <p className="text-gray-600">View all employees</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg transition" onClick={() => navigate('/reports/joiners-leavers')}>
          <h3 className="text-lg font-semibold mb-2">{t('joinersLeavers')}</h3>
          <p className="text-gray-600">View joiners and leavers</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg transition" onClick={() => navigate('/reports/salary-changes')}>
          <h3 className="text-lg font-semibold mb-2">{t('salaryChanges')}</h3>
          <p className="text-gray-600">View salary changes</p>
        </div>
      </div>
    </div>
  );
}

