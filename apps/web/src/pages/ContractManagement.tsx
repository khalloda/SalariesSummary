import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { ContractFormSchema, type ContractFormValues } from '../validation/contracts';
import LoadingButton from '../components/LoadingButton';
import ConfirmDialog from '../components/ConfirmDialog';
import FieldCheckmark from '../components/FieldCheckmark';

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

const CONTRACT_FILTER_STORAGE_KEY = 'contracts-filters';

export default function ContractManagement() {
  const { t } = useTranslation();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Load filters from localStorage on mount
  const loadFilters = () => {
    try {
      const saved = localStorage.getItem(CONTRACT_FILTER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          search: parsed.search || '',
          employeeFilter: parsed.employeeFilter || 'all',
        };
      }
    } catch (e) {
      console.error('Failed to load filters:', e);
    }
    return {
      search: '',
      employeeFilter: 'all',
    };
  };
  
  const initialFilters = loadFilters();
  const [search, setSearch] = useState(initialFilters.search);
  const [employeeFilter, setEmployeeFilter] = useState<string>(initialFilters.employeeFilter);
  
  // Save filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(CONTRACT_FILTER_STORAGE_KEY, JSON.stringify({
        search,
        employeeFilter,
      }));
    } catch (e) {
      console.error('Failed to save filters:', e);
    }
  }, [search, employeeFilter]);
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isSubmitting, touchedFields },
    reset,
    setValue,
    watch,
  } = useForm<ContractFormValues>({
    resolver: zodResolver(ContractFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      employeeId: null,
      employeeName: null,
      employeeCode: null,
      contractDate: null,
      contractDuration: null,
      comments: null,
    },
  });

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
      toast.error(t('failedToLoad') + ' ' + t('contracts').toLowerCase());
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
    setServerError(null);
    reset({
      employeeId: null,
      employeeName: null,
      employeeCode: null,
      contractDate: null,
      contractDuration: null,
      comments: null,
    });
    setShowForm(true);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setServerError(null);
    reset({
      employeeId: contract.employeeId || null,
      employeeName: contract.employeeName || null,
      employeeCode: contract.employeeCode || null,
      contractDate: contract.contractDate ? new Date(contract.contractDate).toISOString().split('T')[0] : null,
      contractDuration: contract.contractDuration || null,
      comments: contract.comments || null,
    });
    setShowForm(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ isOpen: true, contractId: id });
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE_URL}/contracts/${deleteConfirm.contractId}`);
      toast.success(t('contractDeleted'));
      setDeleteConfirm({ isOpen: false, contractId: '' });
      fetchContracts();
    } catch (error: any) {
      toast.error(`${t('failedToDelete')} ${t('contract').toLowerCase()}: ${error.response?.data?.error || error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, contractId: '' });
  };

  const onSubmit = async (data: ContractFormValues) => {
    setServerError(null);
    setSaving(true);

    try {
      if (editingContract) {
        await axios.put(`${API_BASE_URL}/contracts/${editingContract.id}`, data);
        toast.success(t('contractUpdated'));
      } else {
        await axios.post(`${API_BASE_URL}/contracts`, data);
        toast.success(t('contractCreated'));
      }
      setShowForm(false);
      reset();
      fetchContracts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save contract';
      setServerError(errorMessage);
      toast.error(errorMessage);
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
                        onClick={() => handleDeleteClick(contract.id)}
                        disabled={deleting}
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

              <form onSubmit={handleFormSubmit(onSubmit)} className="p-6">
                {serverError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded whitespace-pre-line text-sm">
                    {serverError}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('employees')}</label>
                    <div className="relative">
                      <select
                        {...register('employeeId')}
                        onChange={(e) => {
                          const selectedEmployee = employees.find(emp => emp.id === e.target.value);
                          setValue('employeeId', e.target.value || null, { shouldValidate: true });
                          if (selectedEmployee) {
                            setValue('employeeName', selectedEmployee.name, { shouldValidate: true });
                            setValue('employeeCode', selectedEmployee.employeeCode || null, { shouldValidate: true });
                          } else {
                            setValue('employeeName', null, { shouldValidate: true });
                            setValue('employeeCode', null, { shouldValidate: true });
                          }
                        }}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent pr-10 ${
                          errors.employeeId
                            ? 'border-red-500 focus:ring-red-500'
                            : touchedFields.employeeId && !errors.employeeId && watch('employeeId')
                            ? 'border-green-500 focus:ring-green-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      >
                        <option value="">{t('selectEmployeeOrBlank')}</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.employeeCode || 'N/A'})
                          </option>
                        ))}
                      </select>
                      <FieldCheckmark
                        show={!!(touchedFields.employeeId && !errors.employeeId && watch('employeeId'))}
                      />
                    </div>
                    {errors.employeeId && (
                      <p className="mt-1 text-xs text-red-600">{errors.employeeId.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('employeeNameIfNotLinked')}</label>
                      <input
                        type="text"
                        {...register('employeeName')}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent ${
                          errors.employeeName
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        placeholder={t('enterNameIfNotInSystem')}
                      />
                      {errors.employeeName && (
                        <p className="mt-1 text-xs text-red-600">{errors.employeeName.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('employeeCodeIfNotLinked')}</label>
                      <input
                        type="text"
                        {...register('employeeCode')}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent ${
                          errors.employeeCode
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        placeholder="e.g., 2-21"
                      />
                      {errors.employeeCode && (
                        <p className="mt-1 text-xs text-red-600">{errors.employeeCode.message}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('contractDate')}</label>
                    <input
                      type="date"
                      {...register('contractDate')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('contractDuration')}</label>
                    <input
                      type="text"
                      {...register('contractDuration')}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent ${
                        errors.contractDuration
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="e.g., Renewal for One Year"
                    />
                    {errors.contractDuration && (
                      <p className="mt-1 text-xs text-red-600">{errors.contractDuration.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes')}</label>
                    <textarea
                      {...register('comments')}
                      rows={3}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent ${
                        errors.comments
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder={t('additionalNotes')}
                    />
                    {errors.comments && (
                      <p className="mt-1 text-xs text-red-600">{errors.comments.message}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      reset();
                      setEditingContract(null);
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    {t('cancel')}
                  </button>
                  <LoadingButton
                    type="submit"
                    loading={isSubmitting || saving}
                  >
                    {editingContract ? t('update') : t('create')}
                  </LoadingButton>
                </div>
              </form>
            </div>
          </div>
        )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={t('deleteContract') || 'Delete Contract'}
        message={t('deleteContractConfirm') || 'Are you sure you want to delete this contract?'}
        confirmText={t('delete') || 'Delete'}
        cancelText={t('cancel') || 'Cancel'}
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}

