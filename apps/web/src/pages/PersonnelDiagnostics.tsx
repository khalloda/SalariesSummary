import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

interface PotentialMatch {
  name: string;
  code: string | null;
  id?: string;
  similarity?: string;
  matchType?: string;
}

interface MissingEmployee {
  row: number;
  code: string | null;
  name: string | null;
  potentialMatches: PotentialMatch[];
}

interface DiagnosticResult {
  success: boolean;
  file: string;
  stats: {
    personnelSheetTotal: number;
    allOfficeSheetTotal: number;
    databaseTotal: number;
    missingFromAllOffice: number;
    missingFromDatabase: number;
    inPersonnelAndAllOffice: number;
    inPersonnelAndDatabase: number;
  };
  missingFromAllOffice: MissingEmployee[];
  missingFromDatabase: MissingEmployee[];
  summary: {
    message: string;
    recommendations: string[];
  };
}

export default function PersonnelDiagnostics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useFileUpload, setUseFileUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleRunDiagnostics = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let response;
      
      if (useFileUpload && selectedFile) {
        // Upload file and run diagnostics
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        // For now, we'll use the server-side endpoint
        // You could create an upload endpoint if needed
        response = await axios.get(`${API_BASE_URL}/personnel-diagnostics/compare-sheets?filePath=${encodeURIComponent(selectedFile.name)}`);
      } else {
        // Use server-side file
        response = await axios.get(`${API_BASE_URL}/personnel-diagnostics/compare-sheets`);
      }

      if (response.data.success) {
        setResult(response.data);
      } else {
        setError(response.data.error || 'Diagnostics failed');
      }
    } catch (err: any) {
      console.error('Diagnostics error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to run diagnostics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Personnel Diagnostics</h1>
          <p className="text-gray-600">
            Compare Personnel sheet with AllOffice sheet and database to identify missing employees
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="mb-4">
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={useFileUpload}
                onChange={(e) => setUseFileUpload(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Upload file from my computer</span>
            </label>
            <p className="text-xs text-gray-500 ml-6">
              {useFileUpload 
                ? 'Select SEPEmployees.xlsx from your computer'
                : 'Use SEPEmployees.xlsx from server Sheets directory'}
            </p>
          </div>

          {useFileUpload && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Select SEPEmployees.xlsx File
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={loading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50"
              />
              {selectedFile && (
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleRunDiagnostics}
            disabled={loading || (useFileUpload && !selectedFile)}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">Error:</p>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary Statistics */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Summary Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-600 text-sm font-medium">Personnel Sheet</p>
                  <p className="text-3xl font-bold text-blue-900 mt-2">{result.stats.personnelSheetTotal}</p>
                  <p className="text-xs text-blue-600 mt-1">Total employees</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-600 text-sm font-medium">AllOffice Sheet</p>
                  <p className="text-3xl font-bold text-green-900 mt-2">{result.stats.allOfficeSheetTotal}</p>
                  <p className="text-xs text-green-600 mt-1">Total employees</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-purple-600 text-sm font-medium">Database</p>
                  <p className="text-3xl font-bold text-purple-900 mt-2">{result.stats.databaseTotal}</p>
                  <p className="text-xs text-purple-600 mt-1">Total employees</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`border-2 rounded-lg p-4 ${result.stats.missingFromAllOffice > 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
                  <p className={`text-sm font-medium ${result.stats.missingFromAllOffice > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    Missing from AllOffice
                  </p>
                  <p className={`text-2xl font-bold mt-2 ${result.stats.missingFromAllOffice > 0 ? 'text-red-900' : 'text-green-900'}`}>
                    {result.stats.missingFromAllOffice}
                  </p>
                </div>
                <div className={`border-2 rounded-lg p-4 ${result.stats.missingFromDatabase > 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
                  <p className={`text-sm font-medium ${result.stats.missingFromDatabase > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    Missing from Database
                  </p>
                  <p className={`text-2xl font-bold mt-2 ${result.stats.missingFromDatabase > 0 ? 'text-red-900' : 'text-green-900'}`}>
                    {result.stats.missingFromDatabase}
                  </p>
                </div>
              </div>

              {result.summary.recommendations.length > 0 && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 font-medium mb-2">Recommendations:</p>
                  <ul className="list-disc list-inside text-yellow-700 text-sm space-y-1">
                    {result.summary.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Missing from AllOffice */}
            {result.missingFromAllOffice.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Missing from AllOffice Sheet ({result.missingFromAllOffice.length})
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  These employees exist in the Personnel sheet but not in the AllOffice sheet.
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Row
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name (Personnel)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Potential Matches in AllOffice
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {result.missingFromAllOffice.map((emp, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {emp.row}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {emp.code || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {emp.name || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {emp.potentialMatches.length > 0 ? (
                              <ul className="space-y-1">
                                {emp.potentialMatches.map((match, matchIdx) => (
                                  <li key={matchIdx} className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      match.similarity?.includes('High') 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {match.similarity}
                                    </span>
                                    <span className="font-medium">{match.name}</span>
                                    {match.code && <span className="text-gray-500">({match.code})</span>}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-gray-400 italic">No potential matches found</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Missing from Database */}
            {result.missingFromDatabase.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Missing from Database ({result.missingFromDatabase.length})
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  These employees exist in the Personnel sheet but not in the database. Import the AllOffice sheet first to create employee records.
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Row
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name (Personnel)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Potential Matches in Database
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {result.missingFromDatabase.map((emp, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {emp.row}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {emp.code || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {emp.name || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {emp.potentialMatches.length > 0 ? (
                              <ul className="space-y-1">
                                {emp.potentialMatches.map((match, matchIdx) => (
                                  <li key={matchIdx} className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      match.similarity?.includes('High') || match.matchType === 'Fuzzy match'
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {match.similarity || match.matchType}
                                    </span>
                                    <span className="font-medium">{match.name}</span>
                                    {match.code && <span className="text-gray-500">({match.code})</span>}
                                    {match.id && (
                                      <button
                                        onClick={() => navigate(`/employees/${match.id}/details`)}
                                        className="text-blue-600 hover:text-blue-800 text-xs underline"
                                      >
                                        View
                                      </button>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-gray-400 italic">No potential matches found</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Success Message */}
            {result.missingFromAllOffice.length === 0 && result.missingFromDatabase.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <p className="text-green-800 text-lg font-medium">✅ All employees matched!</p>
                <p className="text-green-600 text-sm mt-2">
                  All employees in the Personnel sheet have corresponding records in both AllOffice sheet and the database.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!result && !loading && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">How to Use</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Ensure SEPEmployees.xlsx is in the Sheets directory (or upload it)</li>
              <li>Click "Run Diagnostics" to compare the Personnel and AllOffice sheets</li>
              <li>Review the results to see which employees are missing</li>
              <li>For employees missing from AllOffice: Add them to the AllOffice sheet or correct name variations</li>
              <li>For employees missing from Database: Import the AllOffice sheet first, then re-import Personnel</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

