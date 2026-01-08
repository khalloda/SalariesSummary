import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

export default function BonusImport() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sheets, setSheets] = useState<Array<{ name: string; index: number }>>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setError(t('selectExcelFile'));
      return;
    }

    setFile(selectedFile);
    setSheets([]);
    setSelectedSheet('');
    setError(null);
    setImportResult(null);

    // Upload file to get sheet list
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(`${API_BASE_URL}/import/bonus/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setSheets(response.data.sheets);
        if (response.data.sheets.length > 0) {
          setSelectedSheet(response.data.sheets[0].name);
        }
      } else {
        setError(response.data.error || t('failedToReadWorkbook'));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || t('failedToUploadFile'));
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedSheet) {
      setError(t('selectFileAndSheet'));
      return;
    }

    setImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetName', selectedSheet);
      formData.append('year', String(year));

      const response = await axios.post(`${API_BASE_URL}/import/bonus/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setImportResult(response.data);
        alert(`${t('importSuccessful')}\n\n- ${response.data.recordsImported} ${t('recordsImported')}\n- ${response.data.recordsParsed} ${t('recordsParsed')}\n\n${t('clickViewReport')}`);
      } else {
        const errorMsg = response.data.errors && response.data.errors.length > 0
          ? response.data.errors.join('\n')
          : 'Unknown error';
        setError(errorMsg);
        alert(`${t('importCompletedWithErrors')}\n\n${errorMsg}`);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to import';
      setError(errorMsg);
      alert(`${t('importFailed')}: ${errorMsg}`);
      console.error('Import error:', err);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSheets([]);
    setSelectedSheet('');
    setError(null);
    setImportResult(null);
    // Reset file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">{t('importAnnualBonuses')}</h2>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">{t('step1')}</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('chooseBonusWorkbook')}
          </label>
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            disabled={uploading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              {t('selected')}: <strong>{file.name}</strong> ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
          {uploading && (
            <p className="mt-2 text-sm text-blue-600">{t('readingWorkbook')}</p>
          )}
        </div>
      </div>

      {sheets.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">{t('step2')}</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('availableSheets')} ({sheets.length})
            </label>
            <select
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {sheets.map((sheet) => (
                <option key={sheet.index} value={sheet.name}>
                  {sheet.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {sheets.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">{t('step3')}</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('yearForBonusData')}
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
              min="2000"
              max="2100"
              className="border rounded px-3 py-2 w-32"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {sheets.length > 0 && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={handleImport}
            disabled={importing || !selectedSheet}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {importing ? t('importing') : t('importBonuses')}
          </button>
          <button
            onClick={handleReset}
            disabled={importing}
            className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            {t('reset')}
          </button>
        </div>
      )}

      {importResult && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">{t('importReport')}</h3>
            <button
              onClick={() => setImportResult(null)}
              className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
            >
              {t('close')}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 font-medium mb-1">File Name</p>
              <p className="text-lg font-semibold text-blue-900">{importResult.fileName}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium mb-1">Sheet Name</p>
              <p className="text-lg font-semibold text-green-900">{importResult.sheetName}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-700 font-medium mb-1">Year</p>
              <p className="text-lg font-semibold text-purple-900">{importResult.year}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-700 font-medium mb-1">Records Parsed</p>
              <p className="text-lg font-semibold text-orange-900">{importResult.recordsParsed}</p>
            </div>
            <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
              <p className="text-sm text-teal-700 font-medium mb-1">Records Imported</p>
              <p className="text-lg font-semibold text-teal-900">{importResult.recordsImported}</p>
            </div>
            <div className={`p-4 rounded-lg border ${
              importResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <p className={`text-sm font-medium mb-1 ${
                importResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                Status
              </p>
              <p className={`text-lg font-semibold ${
                importResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {importResult.success ? '✓ Success' : '✗ Failed'}
              </p>
            </div>
          </div>

          {importResult.errors && importResult.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-red-700 mb-2">
                Errors ({importResult.errors.length})
              </h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                  {importResult.errors.map((err: string, idx: number) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {importResult.success && importResult.recordsImported > 0 && (
            <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-4 rounded">
              <p className="text-green-700">
                <strong>✓ Import completed successfully!</strong> {importResult.recordsImported} bonus record(s) have been imported/updated in the database.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <h4 className="font-semibold text-blue-800 mb-2">{t('importInstructions')}</h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>{t('selectExcelWorkbook')}</li>
          <li>{t('chooseSheetToImport')}</li>
          <li>{t('setYearForBonusData')}</li>
          <li>{t('clickImportBonuses')}</li>
          <li>{t('systemWillMatchEmployees')}</li>
        </ul>
      </div>
    </div>
  );
}

