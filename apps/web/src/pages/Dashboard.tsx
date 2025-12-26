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
  const [merging, setMerging] = useState(false);
  const [lastImport, setLastImport] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [importReport, setImportReport] = useState<any>(null);
  const [mergeReport, setMergeReport] = useState<any>(null);
  const [showImportReport, setShowImportReport] = useState(false);
  const [showMergeReport, setShowMergeReport] = useState(false);
  
  const handleImport = async () => {
    setImporting(true);
    setImportReport(null);
    setShowImportReport(false);
    try {
      const response = await axios.post(`${API_BASE_URL}/import`);
      if (response.data.success) {
        setLastImport(new Date().toISOString());
        setImportReport(response.data);
        setShowImportReport(true);
        const errorMsg = response.data.errors && response.data.errors.length > 0
          ? `\n\nErrors: ${response.data.errors.slice(0, 5).join('\n')}`
          : '';
        alert(`Import successful! ${response.data.recordsImported} records imported from ${response.data.filesProcessed} files.${errorMsg}\n\nClick "View Import Report" to see detailed information.`);
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
  
  const handleMergeDuplicates = async () => {
    if (!confirm('This will merge duplicate employees based on normalized names. Continue?')) {
      return;
    }
    
    setMerging(true);
    setMergeReport(null);
    setShowMergeReport(false);
    try {
      const response = await axios.post(`${API_BASE_URL}/import/merge-duplicates`);
      if (response.data.success) {
        setMergeReport(response.data);
        setShowMergeReport(true);
        alert(`Duplicate merge completed!\n\n- ${response.data.merged} employees merged\n- ${response.data.duplicates} total duplicates found\n\nClick "View Merge Report" to see detailed information.`);
      } else {
        alert(`Failed to merge duplicates: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to merge duplicates: ${errorMsg}`);
      console.error('Merge duplicates error:', error);
    } finally {
      setMerging(false);
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
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleImport}
              disabled={importing || clearing || merging}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {importing ? 'Importing...' : t('importNow')}
            </button>
            <button
              onClick={handleMergeDuplicates}
              disabled={importing || clearing || merging}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              {merging ? 'Merging...' : 'Merge Duplicates'}
            </button>
            <button
              onClick={handleClearDatabase}
              disabled={importing || clearing || merging}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Clear Database'}
            </button>
            {importReport && (
              <button
                onClick={() => setShowImportReport(!showImportReport)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {showImportReport ? 'Hide' : 'View'} Import Report
              </button>
            )}
            {mergeReport && (
              <button
                onClick={() => setShowMergeReport(!showMergeReport)}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                {showMergeReport ? 'Hide' : 'View'} Merge Report
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Import Report */}
      {showImportReport && importReport && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Import Report</h3>
          <div className="mb-4">
            <p><strong>Files Processed:</strong> {importReport.filesProcessed}</p>
            <p><strong>Records Imported:</strong> {importReport.recordsImported}</p>
            {importReport.errors && importReport.errors.length > 0 && (
              <div className="mt-2">
                <p><strong>Errors:</strong> {importReport.errors.length}</p>
                <ul className="list-disc list-inside text-red-600 text-sm">
                  {importReport.errors.slice(0, 10).map((error: string, idx: number) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {importReport.similarNameMatches && importReport.similarNameMatches.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Similar Name Matches ({importReport.similarNameMatches.length}):</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Existing Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">New Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Records Linked</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importReport.similarNameMatches.map((match: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 whitespace-nowrap">{match.existingName}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{match.newName}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{match.recordsLinked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Merge Report */}
      {showMergeReport && mergeReport && mergeReport.report && mergeReport.report.length > 0 && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Merge Report</h3>
          <div className="mb-4">
            <p><strong>Total Merged:</strong> {mergeReport.merged} employees</p>
            <p><strong>Total Duplicates Found:</strong> {mergeReport.duplicates}</p>
          </div>
          
          <div className="space-y-4">
            {mergeReport.report.map((group: any, idx: number) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="mb-2">
                  <h4 className="font-semibold text-green-600">Kept Employee:</h4>
                  <p className="ml-4">
                    <strong>{group.keptEmployee.name}</strong><br />
                    Initial Records: {group.keptEmployee.initialRecords} → Final Records: {group.keptEmployee.finalRecords}
                  </p>
                </div>
                {group.mergedEmployees && group.mergedEmployees.length > 0 && (
                  <div className="mt-2">
                    <h5 className="font-semibold text-blue-600">Merged Into Above:</h5>
                    <ul className="ml-4 space-y-1">
                      {group.mergedEmployees.map((merged: any, mIdx: number) => (
                        <li key={mIdx} className="text-sm">
                          <strong>{merged.fromName}</strong> ({merged.fromRecords} records)
                          <br />
                          <span className="text-gray-600">
                            → {merged.recordsMoved} records moved, {merged.recordsSkipped} skipped
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
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

