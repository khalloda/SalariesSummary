import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { BonusFormSchema, type BonusFormValues } from '../validation/bonuses';
import LoadingButton from '../components/LoadingButton';
import ConfirmDialog from '../components/ConfirmDialog';
import FormattedNumberInput from '../components/FormattedNumberInput';
import FieldCheckmark from '../components/FieldCheckmark';
import Tooltip from '../components/Tooltip';

interface Bonus {
  id: string;
  employeeId: string;
  year: number;
  previousYearNet: number;
  previousYearGross: number;
  currentYearNet: number;
  currentYearGross: number;
  annualIncreaseNet: number;
  annualIncreaseGross: number;
  bonusAmount: number;
  bonusFirstHalf: number | null;
  bonusSecondHalf: number | null;
  previousYearBonus: number | null;
  reflectedInMonths: number | null;
  reflectedInPercent: number | null;
  notes: string | null;
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

export default function BonusManagement() {
  const { t } = useTranslation();
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingBonus, setEditingBonus] = useState<Bonus | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit: handleFormSubmit,
    formState: { errors, isSubmitting, touchedFields },
    reset,
    watch,
  } = useForm<BonusFormValues>({
    resolver: zodResolver(BonusFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      employeeId: '',
      year: new Date().getFullYear(),
      previousYearNet: 0,
      previousYearGross: 0,
      currentYearNet: 0,
      currentYearGross: 0,
      annualIncreaseNet: 0,
      annualIncreaseGross: 0,
      bonusAmount: 0,
      bonusFirstHalf: null,
      bonusSecondHalf: null,
      previousYearBonus: null,
      reflectedInMonths: null,
      reflectedInPercent: null,
      notes: null,
    },
  });

  useEffect(() => {
    fetchBonuses();
    fetchEmployees();
  }, []);

  const fetchBonuses = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/bonuses`);
      setBonuses(response.data.bonuses || []);
    } catch (error) {
      console.error('Error fetching bonuses:', error);
      toast.error(t('failedToLoad') + ' ' + t('bonuses').toLowerCase());
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
    setEditingBonus(null);
    setServerError(null);
    reset({
      employeeId: '',
      year: new Date().getFullYear(),
      previousYearNet: 0,
      previousYearGross: 0,
      currentYearNet: 0,
      currentYearGross: 0,
      annualIncreaseNet: 0,
      annualIncreaseGross: 0,
      bonusAmount: 0,
      bonusFirstHalf: null,
      bonusSecondHalf: null,
      previousYearBonus: null,
      reflectedInMonths: null,
      reflectedInPercent: null,
      notes: null,
    });
    setShowForm(true);
  };

  const handleEdit = (bonus: Bonus) => {
    setEditingBonus(bonus);
    setServerError(null);
    reset({
      employeeId: bonus.employeeId,
      year: bonus.year,
      previousYearNet: bonus.previousYearNet,
      previousYearGross: bonus.previousYearGross,
      currentYearNet: bonus.currentYearNet,
      currentYearGross: bonus.currentYearGross,
      annualIncreaseNet: bonus.annualIncreaseNet,
      annualIncreaseGross: bonus.annualIncreaseGross,
      bonusAmount: bonus.bonusAmount,
      bonusFirstHalf: bonus.bonusFirstHalf,
      bonusSecondHalf: bonus.bonusSecondHalf,
      previousYearBonus: bonus.previousYearBonus,
      reflectedInMonths: bonus.reflectedInMonths,
      reflectedInPercent: bonus.reflectedInPercent,
      notes: bonus.notes,
    });
    setShowForm(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ isOpen: true, bonusId: id });
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE_URL}/bonuses/${deleteConfirm.bonusId}`);
      toast.success(t('bonusDeleted'));
      setDeleteConfirm({ isOpen: false, bonusId: '' });
      fetchBonuses();
    } catch (error: any) {
      toast.error(`${t('failedToDelete')} ${t('bonuses').toLowerCase()}: ${error.response?.data?.error || error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, bonusId: '' });
  };

  const onSubmit = async (data: BonusFormValues) => {
    setServerError(null);
    setSaving(true);

    try {
      const validatedData = data;

      // Calculate annual increase if not provided
      const previousYearNet = validatedData.previousYearNet || 0;
      const currentYearNet = validatedData.currentYearNet || 0;
      const previousYearGross = validatedData.previousYearGross || 0;
      const currentYearGross = validatedData.currentYearGross || 0;

      const submitData = {
        employeeId: validatedData.employeeId,
        year: validatedData.year,
        previousYearNet,
        previousYearGross,
        currentYearNet,
        currentYearGross,
        annualIncreaseNet: validatedData.annualIncreaseNet !== undefined 
          ? validatedData.annualIncreaseNet
          : currentYearNet - previousYearNet,
        annualIncreaseGross: validatedData.annualIncreaseGross !== undefined
          ? validatedData.annualIncreaseGross
          : currentYearGross - previousYearGross,
        amount: validatedData.bonusAmount,
        firstHalf: validatedData.bonusFirstHalf ?? undefined,
        secondHalf: validatedData.bonusSecondHalf ?? undefined,
        previousYearBonus: validatedData.previousYearBonus ?? undefined,
        reflectedInMonths: validatedData.reflectedInMonths ?? undefined,
        reflectedInPercent: validatedData.reflectedInPercent ?? undefined,
        notes: validatedData.notes ?? undefined,
      };

      if (editingBonus) {
        await axios.put(`${API_BASE_URL}/bonuses/${editingBonus.id}`, submitData);
        toast.success(t('bonusUpdated'));
      } else {
        await axios.post(`${API_BASE_URL}/bonuses`, submitData);
        toast.success(t('bonusCreated'));
      }
      setShowForm(false);
      reset();
      fetchBonuses();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save bonus';
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const filtered = bonuses.filter(b => {
    const matchesSearch = 
      (b.employee?.name && b.employee.name.toLowerCase().includes(search.toLowerCase())) ||
      (b.employee?.employeeCode && b.employee.employeeCode.toLowerCase().includes(search.toLowerCase()));
    const matchesEmployee = employeeFilter === 'all' || b.employeeId === employeeFilter;
    const matchesYear = yearFilter === 'all' || b.year.toString() === yearFilter;
    return matchesSearch && matchesEmployee && matchesYear;
  });

  const availableYears = Array.from(new Set(bonuses.map(b => b.year))).sort((a, b) => b - a);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bonuses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('bonusManagement')}</h1>
            <p className="text-gray-600">Manage annual bonus records</p>
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            {t('newBonusRecord')}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search by employee name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode || 'N/A'})</option>
              ))}
            </select>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bonus List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('bonusAmount')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">First Half</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Second Half</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('annualIncrease')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(bonus => (
                  <tr key={bonus.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {bonus.employee?.name || 'Unknown'}
                      </div>
                      {bonus.employee?.employeeCode && (
                        <div className="text-sm text-gray-500">{bonus.employee.employeeCode}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{bonus.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                      {bonus.bonusAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {bonus.bonusFirstHalf?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {bonus.bonusSecondHalf?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {bonus.annualIncreaseNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(bonus)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(bonus.id)}
                          disabled={deleting}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No bonus records found</p>
            </div>
          )}
        </div>

        {/* Create/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingBonus ? t('editBonusRecord') : t('createNewBonusRecord')}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    reset();
                    setEditingBonus(null);
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                    <div className="relative">
                      <select
                        {...register('employeeId')}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent pr-10 ${
                          errors.employeeId
                            ? 'border-red-500 focus:ring-red-500'
                            : touchedFields.employeeId && !errors.employeeId && watch('employeeId')
                            ? 'border-green-500 focus:ring-green-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      >
                      <option value="">Select Employee</option>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                    <div className="relative">
                      <input
                        type="number"
                        {...register('year')}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent pr-10 ${
                          errors.year
                            ? 'border-red-500 focus:ring-red-500'
                            : touchedFields.year && !errors.year && watch('year')
                            ? 'border-green-500 focus:ring-green-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        min="2000"
                        max="2100"
                      />
                      <FieldCheckmark
                        show={!!(touchedFields.year && !errors.year && watch('year'))}
                      />
                    </div>
                    {errors.year && (
                      <p className="mt-1 text-xs text-red-600">{errors.year.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary Information</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Previous Year Net</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('previousYearNet')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Year Net</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('currentYearNet')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Previous Year Gross</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('previousYearGross')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Year Gross</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('currentYearGross')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('annualIncreaseNetAuto')}
                      <Tooltip content="Automatically calculated as the difference between current year net and previous year net salary.">
                        <span className="ml-1 text-gray-400 cursor-help">ℹ️</span>
                      </Tooltip>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={(() => {
                        const prev = parseFloat(String(watch('previousYearNet') || 0));
                        const curr = parseFloat(String(watch('currentYearNet') || 0));
                        return curr - prev;
                      })()}
                      readOnly
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('annualIncreaseGrossAuto')}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={(() => {
                        const prev = parseFloat(String(watch('previousYearGross') || 0));
                        const curr = parseFloat(String(watch('currentYearGross') || 0));
                        return curr - prev;
                      })()}
                      readOnly
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('bonusInformation')}</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('bonusAmountRequired')}</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('bonusAmount')}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent ${
                        errors.bonusAmount
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.bonusAmount && (
                      <p className="mt-1 text-xs text-red-600">{errors.bonusAmount.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('previousYearBonus')}</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('previousYearBonus')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('bonusFirstHalf')}</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('bonusFirstHalf')}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent ${
                        errors.bonusFirstHalf
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.bonusFirstHalf && (
                      <p className="mt-1 text-xs text-red-600">{errors.bonusFirstHalf.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('bonusSecondHalf')}</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('bonusSecondHalf')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reflected in Months</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('reflectedInMonths')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reflected in Percent</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('reflectedInPercent')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      {...register('notes')}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      reset();
                      setEditingBonus(null);
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <LoadingButton
                    type="submit"
                    loading={isSubmitting || saving}
                  >
                    {editingBonus ? 'Update' : 'Create'}
                  </LoadingButton>
                </div>
              </form>
            </div>
          </div>
        )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={t('deleteBonus') || 'Delete Bonus'}
        message={t('deleteBonusConfirm') || 'Are you sure you want to delete this bonus record?'}
        confirmText={t('delete') || 'Delete'}
        cancelText={t('cancel') || 'Cancel'}
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}

