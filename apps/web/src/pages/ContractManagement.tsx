import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { ContractFormSchema } from '../validation/contracts';

interface Contract {
  id: string;
  employeeId: string | null;
  employeeName: string | null;
  employeeCode: string | null;
  contractDate: string | null;
  contractDuration: string | null;
  comments: string | null;
  employee?: {
    id: string;
    name: string;
    employeeCode: string | null;
  };
}

interface Employee {
  id: string;
  name: string;
  employeeCode: string | null;
}

export default function ContractManagement() {
  const { t } = useTranslation();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState<Partial<Contract>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchContracts();
    fetchEmployees();
  }, []);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/contracts`);
      setContracts(response.data.contracts || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      alert(t('failedToLoad') + ' ' + t('contracts').toLowerCase());
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/employees`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleCreate = () => {
    setEditingContract(null);
    setFormData({});
    setShowForm(true);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      employeeId: contract.employeeId || undefined,
      employeeName: contract.employeeName || undefined,
      employeeCode: contract.employeeCode || undefined,
      contractDate: contract.contractDate ? new Date(contract.contractDate).toISOString().split('T')[0] : undefined,
      contractDuration: contract.contractDuration || undefined,
      comments: contract.comments || undefined
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteContractConfirm'))) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/contracts/${id}`);
      alert(t('contractDeleted'));
      fetchContracts();
    } catch (error: any) {
      alert(`${t('failedToDelete')} ${t('contract').toLowerCase()}: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      // Validate form data
      const parseResult = ContractFormSchema.safeParse(formData);
      if (!parseResult.success) {
        const errorMessages = parseResult.error.errors.map((err) => err.message).join('\n');
        setFormError(errorMessages || 'Validation error');
        setSaving(false);
        return;
      }

      const submitData = parseResult.data;

      if (editingContract) {
        await axios.put(`${API_BASE_URL}/contracts/${editingContract.id}`, submitData);
        alert(t('contractUpdated'));
      } else {
        await axios.post(`${API_BASE_URL}/contracts`, submitData);
        alert(t('contractCreated'));
      }
      setShowForm(false);
      setFormData({});
      fetchContracts();
    } catch (error: any) {
      alert(`${t('failedToSave')} ${t('contract').toLowerCase()}: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const filtered = contracts.filter(c => {
    const matchesSearch = 
      (c.employeeName && c.employeeName.toLowerCase().includes(search.toLowerCase())) ||
      (c.employeeCode && c.employeeCode.toLowerCase().includes(search.toLowerCase())) ||
      (c.contractDuration && c.contractDuration.toLowerCase().includes(search.toLowerCase()));
    const matchesEmployee = employeeFilter === 'all' || c.employeeId === employeeFilter;
    return matchesSearch && matchesEmployee;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loadingContracts')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('contractManagement')}</h1>
            <p className="text-gray-600">{t('createUpdateManageContracts')}</p>
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + {t('newContract')}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder={t('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('employees')}</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode || 'N/A'})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Contract List */}
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('employees')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('contract')} {t('dateOfBirth').split(' ')[0]}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('contractDuration')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('notes')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map(contract => (
                <tr key={contract.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">
                        {contract.employee?.name || contract.employeeName || t('unlinked')}
                      </div>
                      {contract.employeeCode && (
                        <div className="text-sm text-gray-500">{contract.employeeCode}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(contract.contractDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {contract.contractDuration || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {contract.comments || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(contract)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(contract.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('noContractsFound')}</p>
            </div>
          )}
        </div>

        {/* Create/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingContract ? t('editContract') : t('createNewContract')}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setFormData({});
                    setEditingContract(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                {formError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded whitespace-pre-line text-sm">
                    {formError}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('employees')}</label>
                    <select
                      value={formData.employeeId || ''}
                      onChange={(e) => {
                        const selectedEmployee = employees.find(emp => emp.id === e.target.value);
                        setFormData({
                          ...formData,
                          employeeId: e.target.value || undefined,
                          employeeName: selectedEmployee?.name,
                          employeeCode: selectedEmployee?.employeeCode || undefined
                        });
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">{t('selectEmployeeOrBlank')}</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.employeeCode || 'N/A'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('employeeNameIfNotLinked')}</label>
                      <input
                        type="text"
                        value={formData.employeeName || ''}
                        onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('enterNameIfNotInSystem')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('employeeCodeIfNotLinked')}</label>
                      <input
                        type="text"
                        value={formData.employeeCode || ''}
                        onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 2-21"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('contractDate')}</label>
                    <input
                      type="date"
                      value={formData.contractDate || ''}
                      onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('contractDuration')}</label>
                    <input
                      type="text"
                      value={formData.contractDuration || ''}
                      onChange={(e) => setFormData({ ...formData, contractDuration: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Renewal for One Year"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes')}</label>
                    <textarea
                      value={formData.comments || ''}
                      onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('additionalNotes')}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setFormData({});
                      setEditingContract(null);
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? t('loading') : editingContract ? t('update') : t('create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}

