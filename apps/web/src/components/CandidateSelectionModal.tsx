import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

interface CandidateEmployee {
  rowIndex: number;
  name: string;
  nationalId?: string | null;
  classification?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  dateOfBirth?: Date | null;
  nationalIdValidTill?: Date | null;
  barAssociation?: string | null;
  barAssociationDegree?: string | null;
  joiningDate?: Date | null;
  resignationDate: Date;
}

interface CandidateSelectionModalProps {
  candidates: CandidateEmployee[];
  onClose: () => void;
  onComplete: (created: number, skipped: number) => void;
}

export default function CandidateSelectionModal({ candidates, onClose, onComplete }: CandidateSelectionModalProps) {
  const { t } = useTranslation();
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleToggleSelect = (rowIndex: number) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedCandidates(newSelected);
    setSelectAll(newSelected.size === candidates.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCandidates(new Set());
      setSelectAll(false);
    } else {
      setSelectedCandidates(new Set(candidates.map(c => c.rowIndex)));
      setSelectAll(true);
    }
  };

  const handleCreate = async () => {
    if (selectedCandidates.size === 0) {
      alert(t('pleaseSelectAtLeastOneCandidate') || 'Please select at least one candidate to create.');
      return;
    }

    setCreating(true);
    try {
      const candidatesToCreate = candidates.filter(c => selectedCandidates.has(c.rowIndex));
      
      const response = await axios.post(`${API_BASE_URL}/import/resigned/create-candidates`, {
        candidates: candidatesToCreate
      });

      if (response.data.success) {
        alert(
          t('candidatesCreatedSuccessfully', {
            created: response.data.created,
            skipped: response.data.skipped
          }) || `Successfully created ${response.data.created} employee(s). ${response.data.skipped > 0 ? `${response.data.skipped} skipped.` : ''}`
        );
        onComplete(response.data.created, response.data.skipped);
        onClose();
      } else {
        const errorMsg = response.data.errors && response.data.errors.length > 0
          ? response.data.errors.slice(0, 5).join('\n')
          : 'Unknown error';
        alert(t('candidateCreationFailed', { error: errorMsg }) || `Failed to create candidates: ${errorMsg}`);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      alert(t('candidateCreationError', { error: errorMsg }) || `Error creating candidates: ${errorMsg}`);
      console.error('Create candidates error:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">
            {t('candidateEmployeesForCreation') || 'Candidate Employees for Creation'}
          </h2>
          <p className="text-gray-600 mt-2">
            {t('selectEmployeesToCreate') || `Found ${candidates.length} employee(s) in the Resigned sheet that don't exist in the system. Select which ones to create:`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              {selectAll ? (t('deselectAll') || 'Deselect All') : (t('selectAll') || 'Select All')}
            </button>
            <span className="text-sm text-gray-600">
              {selectedCandidates.size} / {candidates.length} {t('selected') || 'selected'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('name') || 'Name'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('nationalId') || 'National ID'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('classification') || 'Classification'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('jobTitle') || 'Job Title'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('department') || 'Department'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('resignationDate') || 'Resignation Date'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {candidates.map((candidate) => (
                  <tr
                    key={candidate.rowIndex}
                    className={selectedCandidates.has(candidate.rowIndex) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCandidates.has(candidate.rowIndex)}
                        onChange={() => handleToggleSelect(candidate.rowIndex)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {candidate.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {candidate.nationalId || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {candidate.classification || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {candidate.jobTitle || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {candidate.department || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(candidate.resignationDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            {t('cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || selectedCandidates.size === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {creating
              ? (t('creating') || 'Creating...')
              : `${t('createSelected') || 'Create Selected'} (${selectedCandidates.size})`
            }
          </button>
        </div>
      </div>
    </div>
  );
}

