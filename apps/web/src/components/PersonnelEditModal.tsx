import { PersonnelRecord } from '../pages/EmployeeDetail';

interface PersonnelEditModalProps {
  employee: {
    id: string;
    name: string;
  };
  personnelFormData: Partial<PersonnelRecord>;
  setPersonnelFormData: (data: Partial<PersonnelRecord>) => void;
  editingPersonnel: boolean;
  setEditingPersonnel: (editing: boolean) => void;
  savingPersonnel: boolean;
  handleSavePersonnel: () => void;
}

export default function PersonnelEditModal({
  employee,
  personnelFormData,
  setPersonnelFormData,
  editingPersonnel,
  setEditingPersonnel,
  savingPersonnel,
  handleSavePersonnel
}: PersonnelEditModalProps) {
  if (!editingPersonnel || !employee) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900">Edit Personnel Data</h3>
            <button
              onClick={() => setEditingPersonnel(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">Employee: {employee.name}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Document Checklist */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Document Checklist</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Criminal Record */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Criminal Record</label>
                <select
                  value={personnelFormData.criminalRecord || ''}
                  onChange={(e) => setPersonnelFormData({ ...personnelFormData, criminalRecord: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select...</option>
                  <option value="Present">Present</option>
                  <option value="Missing">Missing</option>
                </select>
              </div>

              {/* Military Certificate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Military Certificate</label>
                <select
                  value={personnelFormData.militaryCertificate || ''}
                  onChange={(e) => setPersonnelFormData({ ...personnelFormData, militaryCertificate: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select...</option>
                  <option value="Copy">Copy</option>
                  <option value="Original">Original</option>
                  <option value="N/A">N/A</option>
                  <option value="Missing">Missing</option>
                </select>
              </div>

              {/* ID Copy */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Copy</label>
                <select
                  value={personnelFormData.idCopy === true ? 'true' : personnelFormData.idCopy === false ? 'false' : ''}
                  onChange={(e) => setPersonnelFormData({ ...personnelFormData, idCopy: e.target.value === 'true' ? true : e.target.value === 'false' ? false : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select...</option>
                  <option value="true">Present</option>
                  <option value="false">Missing</option>
                </select>
              </div>

              {/* Education Certificate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Education Certificate</label>
                <select
                  value={personnelFormData.educationCertificate || ''}
                  onChange={(e) => setPersonnelFormData({ ...personnelFormData, educationCertificate: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select...</option>
                  <option value="Copy">Copy</option>
                  <option value="Original">Original</option>
                  <option value="Missing">Missing</option>
                </select>
              </div>

              {/* Birth Certificate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birth Certificate</label>
                <select
                  value={personnelFormData.birthCertificate || ''}
                  onChange={(e) => setPersonnelFormData({ ...personnelFormData, birthCertificate: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select...</option>
                  <option value="Copy">Copy</option>
                  <option value="Original">Original</option>
                  <option value="Missing">Missing</option>
                </select>
              </div>

              {/* Recommendation Letter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation Letter</label>
                <select
                  value={personnelFormData.recommendationLetter === true ? 'true' : personnelFormData.recommendationLetter === false ? 'false' : ''}
                  onChange={(e) => setPersonnelFormData({ ...personnelFormData, recommendationLetter: e.target.value === 'true' ? true : e.target.value === 'false' ? false : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select...</option>
                  <option value="true">Present</option>
                  <option value="false">Missing</option>
                </select>
              </div>

              {/* Personal Photos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Personal Photos</label>
                <select
                  value={personnelFormData.personalPhotos === true ? 'true' : personnelFormData.personalPhotos === false ? 'false' : ''}
                  onChange={(e) => setPersonnelFormData({ ...personnelFormData, personalPhotos: e.target.value === 'true' ? true : e.target.value === 'false' ? false : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select...</option>
                  <option value="true">Present</option>
                  <option value="false">Missing</option>
                </select>
              </div>

              {/* Tax Card */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Card</label>
                <select
                  value={personnelFormData.taxCard === true ? 'true' : personnelFormData.taxCard === false ? 'false' : ''}
                  onChange={(e) => setPersonnelFormData({ ...personnelFormData, taxCard: e.target.value === 'true' ? true : e.target.value === 'false' ? false : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select...</option>
                  <option value="true">Present</option>
                  <option value="false">Missing</option>
                </select>
              </div>

              {/* Association ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Association ID</label>
                <select
                  value={personnelFormData.associationId === true ? 'true' : personnelFormData.associationId === false ? 'false' : ''}
                  onChange={(e) => setPersonnelFormData({ ...personnelFormData, associationId: e.target.value === 'true' ? true : e.target.value === 'false' ? false : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select...</option>
                  <option value="true">Present</option>
                  <option value="false">Missing</option>
                </select>
              </div>

              {/* Form 6 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Form 6</label>
                <select
                  value={personnelFormData.form6 || 'N/A'}
                  onChange={(e) => setPersonnelFormData({ ...personnelFormData, form6: e.target.value || 'N/A' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="N/A">N/A</option>
                  <option value="Present">Present</option>
                  <option value="Missing">Missing</option>
                </select>
              </div>

              {/* Work Stub */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Stub (كعب العمل)</label>
                <select
                  value={personnelFormData.workStub || 'N/A'}
                  onChange={(e) => setPersonnelFormData({ ...personnelFormData, workStub: e.target.value || 'N/A' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="N/A">N/A</option>
                  <option value="Present">Present</option>
                  <option value="Missing">Missing</option>
                </select>
              </div>
            </div>
          </div>

          {/* Asset Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Asset Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Laptop / PC / Tablet</label>
                <div className="space-y-2">
                  {['Laptop', 'PC', 'Tablet'].map((asset) => {
                    const currentAssets = (() => {
                      try {
                        return personnelFormData.laptopPcTablet 
                          ? JSON.parse(personnelFormData.laptopPcTablet)
                          : [];
                      } catch {
                        // If not JSON, treat as single value
                        return personnelFormData.laptopPcTablet && personnelFormData.laptopPcTablet !== 'None'
                          ? [personnelFormData.laptopPcTablet]
                          : [];
                      }
                    })();
                    const isChecked = Array.isArray(currentAssets) && currentAssets.includes(asset);
                    
                    return (
                      <label key={asset} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const currentAssets = (() => {
                              try {
                                return personnelFormData.laptopPcTablet 
                                  ? JSON.parse(personnelFormData.laptopPcTablet)
                                  : [];
                              } catch {
                                return personnelFormData.laptopPcTablet && personnelFormData.laptopPcTablet !== 'None'
                                  ? [personnelFormData.laptopPcTablet]
                                  : [];
                              }
                            })();
                            
                            let newAssets: string[];
                            if (e.target.checked) {
                              newAssets = [...currentAssets, asset].filter((a, i, arr) => arr.indexOf(a) === i); // Remove duplicates
                            } else {
                              newAssets = currentAssets.filter(a => a !== asset);
                            }
                            
                            setPersonnelFormData({
                              ...personnelFormData,
                              laptopPcTablet: newAssets.length > 0 ? JSON.stringify(newAssets) : null
                            });
                          }}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="text-gray-700">{asset}</span>
                      </label>
                    );
                  })}
                  {(() => {
                    const currentAssets = (() => {
                      try {
                        return personnelFormData.laptopPcTablet 
                          ? JSON.parse(personnelFormData.laptopPcTablet)
                          : [];
                      } catch {
                        return personnelFormData.laptopPcTablet && personnelFormData.laptopPcTablet !== 'None'
                          ? [personnelFormData.laptopPcTablet]
                          : [];
                      }
                    })();
                    if (currentAssets.length > 0) {
                      return (
                        <p className="text-xs text-gray-500 mt-2">
                          Selected: {currentAssets.join(', ')}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Start Date</label>
                <input
                  type="date"
                  value={personnelFormData.insuranceStartDate ? new Date(personnelFormData.insuranceStartDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setPersonnelFormData({ ...personnelFormData, insuranceStartDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={() => setEditingPersonnel(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSavePersonnel}
            disabled={savingPersonnel}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
          >
            {savingPersonnel ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

