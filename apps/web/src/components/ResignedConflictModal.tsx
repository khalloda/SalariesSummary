import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

interface ResignedConflict {
  rowIndex: number;
  incomingData: {
    name: string;
    nationalId?: string | null;
    classification?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    resignationDate: Date | string;
    dateOfBirth?: Date | string | null;
    nationalIdValidTill?: Date | string | null;
    barAssociation?: string | null;
    barAssociationDegree?: string | null;
    joiningDate?: Date | string | null;
  };
  matchingEmployees: Array<{
    id: string;
    name: string;
    nationalId?: string | null;
    employeeCode?: string | null;
    category?: string | null;
    status?: string | null;
    resignationDate?: Date | string | null;
  }>;
  matchMethod: 'nationalId' | 'name';
}

interface ResignedConflictModalProps {
  conflicts: ResignedConflict[];
  onResolve: (resolutions: any[]) => Promise<void>;
  onClose: () => void;
}

export default function ResignedConflictModal({ conflicts, onResolve, onClose }: ResignedConflictModalProps) {
  const { t } = useTranslation();
  const [resolutions, setResolutions] = useState<Record<number, { employeeId: string; action: 'update' | 'skip' }>>({});
  const [resolving, setResolving] = useState(false);

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleResolve = async () => {
    setResolving(true);
    try {
      const resolutionArray = conflicts.map(conflict => ({
        rowIndex: conflict.rowIndex,
        employeeId: resolutions[conflict.rowIndex]?.employeeId || conflict.matchingEmployees[0].id,
        action: resolutions[conflict.rowIndex]?.action || 'skip',
        incomingData: conflict.incomingData
      }));

      await onResolve(resolutionArray);
      onClose();
    } catch (error: any) {
      alert(t('failedToResolveConflicts', { error: error.message }) || `Failed to resolve conflicts: ${error.message}`);
    } finally {
      setResolving(false);
    }
  };

  const setAllResolutions = (action: 'update' | 'skip') => {
    const newResolutions: Record<number, { employeeId: string; action: 'update' | 'skip' }> = {};
    conflicts.forEach(conflict => {
      newResolutions[conflict.rowIndex] = {
        employeeId: conflict.matchingEmployees[0].id,
        action
      };
    });
    setResolutions(newResolutions);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">
            {t('resignedImportConflicts') || 'Resigned Import Conflicts'}
          </h2>
          <p className="text-gray-600 mt-2">
            {t('multipleEmployeesMatched') || `Found ${conflicts.length} conflict(s) where multiple employees match. Select which employee to update:`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setAllResolutions('update')}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                {t('updateAll') || 'Update All (First Match)'}
              </button>
              <button
                onClick={() => setAllResolutions('skip')}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                {t('skipAll') || 'Skip All'}
              </button>
            </div>
            <span className="text-sm text-gray-600">
              {Object.keys(resolutions).length} / {conflicts.length} {t('resolved') || 'resolved'}
            </span>
          </div>

          {conflicts.map((conflict, idx) => {
            const resolution = resolutions[conflict.rowIndex];
            const selectedEmployeeId = resolution?.employeeId || conflict.matchingEmployees[0].id;
            const selectedAction = resolution?.action || 'skip';

            return (
              <div key={idx} className="mb-6 p-4 border rounded-lg bg-gray-50">
                <h3 className="font-bold mb-2 text-lg">
                  Row {conflict.rowIndex}: {conflict.incomingData.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t('matchedBy') || 'Matched by'}: <strong>{conflict.matchMethod === 'nationalId' ? 'National ID' : 'Name'}</strong>
                </p>
                
                <div className="mb-4">
                  <p className="font-semibold mb-2">{t('incomingData') || 'Incoming Data'}:</p>
                  <div className="bg-blue-50 p-3 rounded text-sm">
                    <p><strong>{t('name') || 'Name'}:</strong> {conflict.incomingData.name}</p>
                    <p><strong>{t('nationalId') || 'National ID'}:</strong> {conflict.incomingData.nationalId || 'N/A'}</p>
                    <p><strong>{t('resignationDate') || 'Resignation Date'}:</strong> {formatDate(conflict.incomingData.resignationDate)}</p>
                    {conflict.incomingData.classification && (
                      <p><strong>{t('classification') || 'Classification'}:</strong> {conflict.incomingData.classification}</p>
                    )}
                    {conflict.incomingData.jobTitle && (
                      <p><strong>{t('jobTitle') || 'Job Title'}:</strong> {conflict.incomingData.jobTitle}</p>
                    )}
                    {conflict.incomingData.department && (
                      <p><strong>{t('department') || 'Department'}:</strong> {conflict.incomingData.department}</p>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="font-semibold mb-2">
                    {t('matchingEmployees') || 'Matching Employees'} ({conflict.matchingEmployees.length}):
                  </p>
                  <div className="space-y-2">
                    {conflict.matchingEmployees.map((emp) => (
                      <label
                        key={emp.id}
                        className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-colors ${
                          selectedEmployeeId === emp.id && selectedAction === 'update'
                            ? 'bg-blue-100 border-blue-300'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`conflict-${idx}`}
                          value={emp.id}
                          checked={selectedEmployeeId === emp.id && selectedAction === 'update'}
                          onChange={() => setResolutions({
                            ...resolutions,
                            [conflict.rowIndex]: { employeeId: emp.id, action: 'update' }
                          })}
                          className="rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{emp.name}</p>
                          <div className="text-sm text-gray-600 mt-1">
                            <p>
                              {t('nationalId') || 'National ID'}: {emp.nationalId || 'N/A'} | 
                              {t('employeeCode') || 'Code'}: {emp.employeeCode || 'N/A'} | 
                              {t('status') || 'Status'}: {emp.status || 'N/A'}
                            </p>
                            {emp.category && (
                              <p>{t('category') || 'Category'}: {emp.category}</p>
                            )}
                            {emp.resignationDate && (
                              <p className="text-orange-600">
                                {t('alreadyResigned') || 'Already Resigned'}: {formatDate(emp.resignationDate)}
                              </p>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setResolutions({
                      ...resolutions,
                      [conflict.rowIndex]: { 
                        employeeId: selectedEmployeeId,
                        action: 'update'
                      }
                    })}
                    className={`px-3 py-1 text-sm rounded ${
                      selectedAction === 'update'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {t('updateSelected') || 'Update Selected'}
                  </button>
                  <button
                    onClick={() => setResolutions({
                      ...resolutions,
                      [conflict.rowIndex]: { 
                        employeeId: conflict.matchingEmployees[0].id,
                        action: 'skip'
                      }
                    })}
                    className={`px-3 py-1 text-sm rounded ${
                      selectedAction === 'skip'
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t('skip') || 'Skip'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={resolving}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            {t('cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {resolving
              ? (t('resolving') || 'Resolving...')
              : `${t('resolveConflicts') || 'Resolve Conflicts'} (${Object.keys(resolutions).length}/${conflicts.length})`
            }
          </button>
        </div>
      </div>
    </div>
  );
}

