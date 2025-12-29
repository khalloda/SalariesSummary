import { useState, useEffect } from 'react';
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
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [importReport, setImportReport] = useState<any>(null);
  const [mergeReport, setMergeReport] = useState<any>(null);
  const [showImportReport, setShowImportReport] = useState(false);
  const [showMergeReport, setShowMergeReport] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPairs, setSelectedPairs] = useState<Set<number>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [useFileUpload, setUseFileUpload] = useState(true);
  
  useEffect(() => {
    // Fetch available years from database
    axios.get(`${API_BASE_URL}/reports/available-years`)
      .then(res => {
        const years = res.data.years || [];
        if (years.length > 0) {
          setAvailableYears(years);
          setYear(years[0]); // Set to most recent year
        } else {
          // Fallback to last 10 years if no data
          const currentYear = new Date().getFullYear();
          setAvailableYears(Array.from({ length: 10 }, (_, i) => currentYear - i));
        }
      })
      .catch(() => {
        // Fallback on error
        const currentYear = new Date().getFullYear();
        setAvailableYears(Array.from({ length: 10 }, (_, i) => currentYear - i));
      });
  }, [lastImport]); // Refresh when import completes
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const excelFiles = Array.from(files).filter(file => 
        file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
      );
      setSelectedFiles(excelFiles);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setImportReport(null);
    setShowImportReport(false);
    try {
      let response;
      
      if (useFileUpload && selectedFiles.length > 0) {
        // Upload files from client
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });
        
        response = await axios.post(`${API_BASE_URL}/import/salaries/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Use server-side Sheets directory (legacy method)
        response = await axios.post(`${API_BASE_URL}/import/salaries`);
      }
      
      if (response.data.success) {
        setLastImport(new Date().toISOString());
        setImportReport(response.data);
        setShowImportReport(true);
        const errorMsg = response.data.errors && response.data.errors.length > 0
          ? `\n\nErrors: ${response.data.errors.slice(0, 5).join('\n')}`
          : '';
        alert(`Import successful! ${response.data.recordsImported} records imported from ${response.data.filesProcessed} files.${errorMsg}\n\nClick "View Import Report" to see detailed information.`);
        // Clear selected files after successful import
        setSelectedFiles([]);
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
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
  
  const handlePreviewDuplicates = async () => {
    setMerging(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/import/preview-duplicates`);
      if (response.data.success) {
        setPreviewData(response.data);
        setSelectedPairs(new Set());
        setShowPreview(true);
      } else {
        alert(`Failed to preview duplicates: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to preview duplicates: ${errorMsg}`);
      console.error('Preview duplicates error:', error);
    } finally {
      setMerging(false);
    }
  };

  const handleMergeDuplicates = async () => {
    if (!confirm('This will merge duplicate employees based on normalized names. Continue?')) {
      return;
    }
    
    setMerging(true);
    setMergeReport(null);
    setShowMergeReport(false);
    setShowPreview(false);
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
  
  const handleConfirmSelectedMerges = async () => {
    if (selectedPairs.size === 0) {
      alert('Please select at least one pair to merge');
      return;
    }
    
    if (!confirm(`Merge ${selectedPairs.size} selected pair(s)?`)) {
      return;
    }
    
    setMerging(true);
    try {
      // Build the selected pairs array
      const selectedPairsArray = Array.from(selectedPairs).map(idx => ({
        employee1Id: previewData.pairs[idx].employee1.id,
        employee2Id: previewData.pairs[idx].employee2.id
      }));
      
      const response = await axios.post(`${API_BASE_URL}/import/merge-duplicates`, {
        selectedPairs: selectedPairsArray
      });
      
      if (response.data.success) {
        setMergeReport(response.data);
        setShowMergeReport(true);
        setShowPreview(false);
        setSelectedPairs(new Set());
        alert(`Merge completed!\n\n- ${response.data.merged} pairs merged\n- ${response.data.recordsMoved} records moved\n- ${response.data.recordsSkipped} records skipped`);
        // Refresh the page or reload data
        window.location.reload();
      } else {
        alert(`Failed to merge: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Failed to merge: ${error.response?.data?.error || error.message}`);
      console.error('Merge error:', error);
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
              {availableYears.length > 0 ? (
                availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))
              ) : (
                Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))
              )}
            </select>
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-600">{t('lastImported')}: {lastImport || 'Never'}</p>
          </div>
          
          {/* File Upload Section */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="mb-3">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={useFileUpload}
                  onChange={(e) => setUseFileUpload(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">Upload files from my computer</span>
              </label>
              <p className="text-xs text-gray-500 ml-6">
                {useFileUpload 
                  ? 'Select Excel files (.xlsx) from your computer to import'
                  : 'Use files from server Sheets directory (legacy method)'}
              </p>
            </div>
            
            {useFileUpload && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Excel Files (.xlsx)
                </label>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  disabled={importing || clearing || merging}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>{selectedFiles.length}</strong> file(s) selected:
                    </p>
                    <ul className="text-xs text-gray-500 list-disc list-inside max-h-32 overflow-y-auto">
                      {selectedFiles.map((file, idx) => (
                        <li key={idx}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
                      ))}
                    </ul>
                  </div>
                )}
                {useFileUpload && selectedFiles.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ Please select at least one Excel file to import
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleImport}
              disabled={importing || clearing || merging || (useFileUpload && selectedFiles.length === 0)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {importing ? 'Importing...' : 'Import Salaries'}
            </button>
            <button
              onClick={() => navigate('/import/bonus')}
              disabled={importing || clearing || merging}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Import Bonuses
            </button>
            <button
              onClick={handlePreviewDuplicates}
              disabled={importing || clearing || merging}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              {merging ? 'Loading...' : 'Preview Duplicates'}
            </button>
            <button
              onClick={handleMergeDuplicates}
              disabled={importing || clearing || merging}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
            >
              {merging ? 'Merging...' : 'Auto Merge All'}
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
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Note:</strong> {importReport.similarNameMatches.length} similar name match(es) were found but NOT automatically merged.
                  Please review these in the Employees page and merge manually if they are the same person.
                </p>
              </div>
              <h4 className="font-semibold mb-2">Similar Name Matches ({importReport.similarNameMatches.length}):</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Existing Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">New Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
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
      
      {/* Preview Duplicates */}
      {showPreview && previewData && previewData.pairs && previewData.pairs.length > 0 && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Preview Duplicates ({previewData.totalPairs} pairs found)</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPairs(new Set(previewData.pairs.map((_: any, idx: number) => idx)))}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedPairs(new Set())}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
              >
                Deselect All
              </button>
              <button
                onClick={handleConfirmSelectedMerges}
                disabled={selectedPairs.size === 0 || merging}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50"
              >
                Merge Selected ({selectedPairs.size})
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
              >
                Close
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-12">
                    <input
                      type="checkbox"
                      checked={selectedPairs.size === previewData.pairs.length && previewData.pairs.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPairs(new Set(previewData.pairs.map((_: any, idx: number) => idx)));
                        } else {
                          setSelectedPairs(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee 1</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee 2</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Match Reason</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.pairs.map((pair: any, idx: number) => (
                  <tr key={idx} className={selectedPairs.has(idx) ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedPairs.has(idx)}
                        onChange={(e) => {
                          const newSet = new Set(selectedPairs);
                          if (e.target.checked) {
                            newSet.add(idx);
                          } else {
                            newSet.delete(idx);
                          }
                          setSelectedPairs(newSet);
                        }}
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{pair.employee1.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{pair.employee1.recordCount}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{pair.employee2.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{pair.employee2.recordCount}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{pair.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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


