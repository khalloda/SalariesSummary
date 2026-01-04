import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

interface ConflictRecord {
  employeeId: string;
  employeeName: string;
  year?: number;
  month?: number;
  contractId?: string;
  employeeCode?: string | null;
  contractDate?: Date | null;
  existingRecord: any;
  incomingRecord: any;
  comparison: {
    isIdentical: boolean;
    similarity: number;
    differences: Array<{
      field: string;
      existing: any;
      incoming: any;
    }>;
  };
}

interface ConflictResolutionModalProps {
  conflicts: ConflictRecord[];
  onResolve: (resolutions: any[]) => Promise<void>;
  onClose: () => void;
  conflictType?: 'salary' | 'employee' | 'contract' | 'personnel';
}

export default function ConflictResolutionModal({ conflicts, onResolve, onClose, conflictType = 'salary' }: ConflictResolutionModalProps) {
  const { t } = useTranslation();
  const [resolutions, setResolutions] = useState<Record<string, 'keep' | 'update' | 'skip'>>({});
  const [resolving, setResolving] = useState(false);

  const getConflictKey = (conflict: ConflictRecord) => {
    if (conflictType === 'salary') {
      return `${conflict.employeeId}-${conflict.year}-${conflict.month}`;
    } else if (conflictType === 'contract') {
      return `${conflict.contractId || conflict.employeeId}-${conflict.contractDate?.toISOString() || ''}`;
    } else {
      return conflict.employeeId;
    }
  };

  const handleResolve = async () => {
    setResolving(true);
    try {
      const resolutionArray = conflicts.map(conflict => {
        const base = {
          employeeId: conflict.employeeId,
          action: resolutions[getConflictKey(conflict)] || 'keep',
          incomingRecord: conflict.incomingRecord
        };
        
        if (conflictType === 'salary') {
          return {
            ...base,
            year: conflict.year,
            month: conflict.month
          };
        } else if (conflictType === 'contract') {
          return {
            ...base,
            contractId: conflict.contractId,
            employeeCode: conflict.employeeCode,
            contractDate: conflict.contractDate,
            contractDuration: conflict.incomingRecord.contractDuration
          };
        } else {
          return base;
        }
      });

      await onResolve(resolutionArray);
      onClose();
    } catch (error: any) {
      alert(t('failedToResolveConflicts', { error: error.message }));
    } finally {
      setResolving(false);
    }
  };

  const setAllResolutions = (action: 'keep' | 'update' | 'skip') => {
    const newResolutions: Record<string, 'keep' | 'update' | 'skip'> = {};
    conflicts.forEach(conflict => {
      newResolutions[getConflictKey(conflict)] = action;
    });
    setResolutions(newResolutions);
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getMonthName = (month: number): string => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1] || `Month ${month}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-yellow-800">
              {t('importConflicts')} ({conflicts.length})
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-yellow-700 mt-2">
            {t('importConflictsDescription')}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setAllResolutions('keep')}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
            >
              {t('keepAll')}
            </button>
            <button
              onClick={() => setAllResolutions('update')}
              className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
            >
              {t('updateAll')}
            </button>
            <button
              onClick={() => setAllResolutions('skip')}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
            >
              {t('skipAll')}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {conflicts.map((conflict, index) => {
              const key = getConflictKey(conflict);
              const resolution = resolutions[key] || 'keep';
              
              return (
                <div key={key} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{conflict.employeeName}</h3>
                      <p className="text-sm text-gray-600">
                        {conflictType === 'salary' && conflict.year && conflict.month
                          ? `${getMonthName(conflict.month)} ${conflict.year} - `
                          : conflictType === 'contract' && conflict.contractDate
                          ? `Contract: ${conflict.contractDate.toISOString().split('T')[0]} - `
                          : ''}
                        {t('similarity')}: {conflict.comparison.similarity}%
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setResolutions({ ...resolutions, [key]: 'keep' })}
                        className={`px-3 py-1 rounded text-sm ${
                          resolution === 'keep'
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {t('keepExisting')}
                      </button>
                      <button
                        onClick={() => setResolutions({ ...resolutions, [key]: 'update' })}
                        className={`px-3 py-1 rounded text-sm ${
                          resolution === 'update'
                            ? 'bg-green-600 text-white'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {t('updateWithIncoming')}
                      </button>
                      <button
                        onClick={() => setResolutions({ ...resolutions, [key]: 'skip' })}
                        className={`px-3 py-1 rounded text-sm ${
                          resolution === 'skip'
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {t('skip')}
                      </button>
                    </div>
                  </div>

                  {conflict.comparison.differences.length > 0 && (
                    <div className="mt-3 bg-white rounded p-3">
                      <h4 className="font-medium mb-2 text-sm">{t('differences')}:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        <div className="font-medium">{t('field')}</div>
                        <div className="font-medium">{t('existing')}</div>
                        <div className="font-medium">{t('incoming')}</div>
                        {conflict.comparison.differences.map((diff, idx) => (
                          <>
                            <div key={`field-${idx}`} className="text-gray-700">{diff.field}</div>
                            <div key={`existing-${idx}`} className="text-red-600">{formatValue(diff.existing)}</div>
                            <div key={`incoming-${idx}`} className="text-green-600">{formatValue(diff.incoming)}</div>
                          </>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {resolving ? t('resolving') : t('resolveConflicts')}
          </button>
        </div>
      </div>
    </div>
  );
}

