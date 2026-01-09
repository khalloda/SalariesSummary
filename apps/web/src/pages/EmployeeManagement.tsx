import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import Tooltip from '../components/Tooltip';
import { tooltips } from '../utils/tooltips';
import { EmployeeFormSchema, type EmployeeFormValues } from '../validation/employees';
import LoadingButton from '../components/LoadingButton';
import ConfirmDialog from '../components/ConfirmDialog';
import FieldCheckmark from '../components/FieldCheckmark';
import { useFormDraft } from '../hooks/useFormDraft';
import { useKeyboardShortcuts, createSaveShortcut, createEscapeShortcut } from '../hooks/useKeyboardShortcuts';
import ProgressIndicator from '../components/ProgressIndicator';

interface Employee {
  id: string;
  name: string;
  nameArabic: string | null;
  category: string | null;
  employeeCode: string | null;
  jobTitle: string | null;
  department: string | null;
  status: string | null;
  [key: string]: any;
}

export default function EmployeeManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Active');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; employeeId: string; employeeName: string }>({
    isOpen: false,
    employeeId: '',
    employeeName: '',
  });
  const [deleting, setDeleting] = useState(false);

  // Use react-hook-form for validated fields, but keep formData for all other fields
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isSubmitting, touchedFields },
    reset,
    watch,
    setValue,
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(EmployeeFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      nameArabic: '',
      employeeCode: '',
      category: '',
      jobTitle: '',
      department: '',
      status: 'Active',
    },
  });

  // Keep additional fields in separate state (not validated by schema)
  const [additionalFields, setAdditionalFields] = useState<Partial<Employee>>({});

  const formValues = watch();
  const allFormData = { ...formValues, ...additionalFields };
  const watchedName = watch('name');
  const watchedEmployeeCode = watch('employeeCode');

  // Auto-save form draft
  const { loadDraft, clearDraft } = useFormDraft(
    'employee-form',
    editingEmployee?.id || null,
    allFormData,
    showForm
  );

  // Keyboard shortcuts
  useKeyboardShortcuts([
    createSaveShortcut(() => {
      if (showForm && !saving && !isSubmitting) {
        handleFormSubmit(onSubmit)();
      }
    }, showForm && !saving && !isSubmitting),
    createEscapeShortcut(() => {
      if (showForm && !saving) {
        setShowForm(false);
        reset();
        setAdditionalFields({});
        setEditingEmployee(null);
        clearDraft();
      }
    }, showForm && !saving),
  ]);

  // Load draft when form opens
  useEffect(() => {
    if (showForm && !editingEmployee) {
      const draft = loadDraft();
      if (draft) {
        // Restore validated fields
        if (draft.name) setValue('name', draft.name);
        if (draft.nameArabic) setValue('nameArabic', draft.nameArabic);
        if (draft.employeeCode) setValue('employeeCode', draft.employeeCode);
        if (draft.category) setValue('category', draft.category);
        if (draft.jobTitle) setValue('jobTitle', draft.jobTitle);
        if (draft.department) setValue('department', draft.department);
        if (draft.status) setValue('status', draft.status);
        // Restore additional fields
        const { name, nameArabic, employeeCode, category, jobTitle, department, status, ...rest } = draft;
        setAdditionalFields(rest);
        toast.success('Draft restored', { duration: 2000 });
      }
    }
  }, [showForm, editingEmployee, loadDraft, setValue]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Auto-open edit modal if editId is in URL
  useEffect(() => {
    const editId = searchParams.get('editId');
    if (editId && employees.length > 0 && !editingEmployee) {
      const employee = employees.find(emp => emp.id === editId);
      if (employee) {
        setEditingEmployee(employee);
        // Reset form with validated fields
        reset({
          name: employee.name || '',
          nameArabic: employee.nameArabic || '',
          employeeCode: employee.employeeCode || '',
          category: employee.category || '',
          jobTitle: employee.jobTitle || '',
          department: employee.department || '',
          status: employee.status || 'Active',
        });
        // Store additional fields separately
        const { name, nameArabic, employeeCode, category, jobTitle, department, status, ...rest } = employee;
        setAdditionalFields(rest);
        setShowForm(true);
        // Remove editId from URL
        setSearchParams({});
      }
    }
  }, [employees, searchParams, setSearchParams, editingEmployee, reset]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/employees`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error(t('failedToLoadEmployees'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEmployee(null);
    setServerError(null);
    reset({
      name: '',
      nameArabic: '',
      employeeCode: '',
      category: '',
      jobTitle: '',
      department: '',
      status: 'Active',
    });
    setAdditionalFields({});
    setShowForm(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setServerError(null);
    reset({
      name: employee.name || '',
      nameArabic: employee.nameArabic || '',
      employeeCode: employee.employeeCode || '',
      category: employee.category || '',
      jobTitle: employee.jobTitle || '',
      department: employee.department || '',
      status: employee.status || 'Active',
    });
    const { name, nameArabic, employeeCode, category, jobTitle, department, status, ...rest } = employee;
    setAdditionalFields(rest);
    setShowForm(true);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteConfirm({ isOpen: true, employeeId: id, employeeName: name });
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE_URL}/employees/${deleteConfirm.employeeId}`);
      toast.success(t('employeeDeletedSuccessfully'));
      setDeleteConfirm({ isOpen: false, employeeId: '', employeeName: '' });
      fetchEmployees();
    } catch (error: any) {
      toast.error(t('failedToDeleteEmployee', { error: error.response?.data?.error || error.message }));
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, employeeId: '', employeeName: '' });
  };

  const onSubmit = async (data: EmployeeFormValues) => {
    setServerError(null);
    setSaving(true);

    try {
      // Merge validated data with additional fields
      const submitData = {
        ...data,
        ...additionalFields,
      };

      if (editingEmployee) {
        await axios.put(`${API_BASE_URL}/employees/${editingEmployee.id}`, submitData);
        toast.success(t('employeeUpdatedSuccessfully'));
      } else {
        await axios.post(`${API_BASE_URL}/employees`, submitData);
        toast.success(t('employeeCreatedSuccessfully'));
      }
      setShowForm(false);
      reset();
      setAdditionalFields({});
      clearDraft(); // Clear draft on successful save
      fetchEmployees();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save employee';
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Get unique departments and categories for filters
  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean))) as string[];
  const categories = Array.from(new Set(employees.map(e => e.category).filter(Boolean))) as string[];

  const filtered = employees.filter(e => {
    // Search filter
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || (
      e.name.toLowerCase().includes(searchLower) ||
      (e.nameArabic && e.nameArabic.toLowerCase().includes(searchLower)) ||
      (e.employeeCode && e.employeeCode.toLowerCase().includes(searchLower)) ||
      (e.jobTitle && e.jobTitle.toLowerCase().includes(searchLower))
    );

    // Status filter
    const matchesStatus = !statusFilter || statusFilter === 'all' || (e.status || 'Active') === statusFilter;

    // Department filter
    const matchesDepartment = departmentFilter === 'all' || e.department === departmentFilter;

    // Category filter
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesDepartment && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('employeeManagement')}</h1>
          <p className="text-gray-600">{t('createUpdateManageEmployees')}</p>
        </div>
        <Tooltip content={tooltips.management.create}>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + {t('newEmployee')}
          </button>
        </Tooltip>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-1">
            <Tooltip content={tooltips.common.search}>
              <input
                type="text"
                placeholder={t('searchEmployees')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </Tooltip>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('status')}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('all')}</option>
              <option value="Active">{t('statusActive')}</option>
              <option value="Resigned">{t('statusResigned')}</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('department')}</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('all')}</option>
              {departments.sort().map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('category')}</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('allCategories')}</option>
              {categories.sort().map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '22%' }}>{t('name')}</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '7%' }}>ID</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '12%' }}>{t('category')}</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '18%' }}>{t('jobTitle')}</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '15%' }}>{t('department')}</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '8%' }}>{t('status')}</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '18%' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map(employee => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="truncate">
                      <button
                        onClick={() => navigate(`/employees/${employee.id}`)}
                        className="font-medium text-gray-900 truncate hover:text-indigo-600 hover:underline text-left"
                      >
                        {employee.name}
                      </button>
                      {employee.nameArabic && (
                        <div className="text-sm text-gray-500 truncate">{employee.nameArabic}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                    {employee.employeeCode || '-'}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="truncate">{employee.category || '-'}</div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="truncate">{employee.jobTitle || '-'}</div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="truncate">{employee.department || '-'}</div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      employee.status === 'Resigned' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {employee.status ? (employee.status === 'Resigned' ? t('statusResigned') : t('statusActive')) : t('statusActive')}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Tooltip content={tooltips.common.viewDetails}>
                        <button
                          onClick={() => navigate(`/employees/${employee.id}`)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {t('view')}
                        </button>
                      </Tooltip>
                      <Tooltip content={tooltips.management.edit}>
                        <button
                          onClick={() => handleEdit(employee)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {t('edit')}
                        </button>
                      </Tooltip>
                      <Tooltip content={tooltips.management.delete}>
                        <button
                          onClick={() => handleDeleteClick(employee.id, employee.name)}
                          disabled={deleting}
                          className="text-red-600 hover:text-red-900"
                        >
                          {t('delete')}
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('noEmployeesFound')}</p>
            </div>
          )}
        </div>

        {/* Create/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingEmployee ? t('editEmployee') : t('createNewEmployee')}
                </h2>
                <Tooltip content={tooltips.common.close}>
                    <button
                      onClick={() => {
                        setShowForm(false);
                        reset();
                        setAdditionalFields({});
                        setEditingEmployee(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </Tooltip>
              </div>

              <form onSubmit={handleFormSubmit(onSubmit)} className="p-6">
                {serverError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded whitespace-pre-line">
                    {serverError}
                  </div>
                )}
                
                {/* Progress Indicator */}
                <ProgressIndicator
                  current={(() => {
                    let completed = 0;
                    const sections = [
                      formValues.name && formValues.employeeCode, // Basic Info
                      additionalFields.phone || additionalFields.email || additionalFields.address, // Contact
                      additionalFields.graduationCertificate || additionalFields.graduationYear, // Education
                      additionalFields.nationalId || additionalFields.socialInsurance, // Identification
                      additionalFields.contractType || additionalFields.contractDuration, // Employment
                      additionalFields.experienceInYears !== null && additionalFields.experienceInYears !== undefined, // Experience
                    ];
                    sections.forEach(hasData => { if (hasData) completed++; });
                    return completed;
                  })()}
                  total={6}
                  labels={['Basic Info', 'Contact', 'Education', 'Identification', 'Employment', 'Experience']}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('basicInformation')}</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('nameEnglish')} *</label>
                    <div className="relative">
                      <input
                        type="text"
                        {...register('name')}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent pr-10 ${
                          errors.name
                            ? 'border-red-500 focus:ring-red-500'
                            : touchedFields.name && !errors.name && watchedName
                            ? 'border-green-500 focus:ring-green-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                      <FieldCheckmark
                        show={!!(touchedFields.name && !errors.name && watchedName)}
                      />
                    </div>
                    {errors.name && (
                      <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('nameArabic')}</label>
                    <input
                      type="text"
                      {...register('nameArabic')}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent ${
                        errors.nameArabic
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.nameArabic && (
                      <p className="mt-1 text-xs text-red-600">{errors.nameArabic.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('systemId')}</label>
                    <div className="relative">
                      <input
                        type="text"
                        {...register('employeeCode')}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent pr-10 ${
                          errors.employeeCode
                            ? 'border-red-500 focus:ring-red-500'
                            : touchedFields.employeeCode && !errors.employeeCode && watchedEmployeeCode
                            ? 'border-green-500 focus:ring-green-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                      <FieldCheckmark
                        show={!!(touchedFields.employeeCode && !errors.employeeCode && watchedEmployeeCode)}
                      />
                    </div>
                    {errors.employeeCode && (
                      <p className="mt-1 text-xs text-red-600">{errors.employeeCode.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('category')}</label>
                    <select
                      {...register('category')}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent ${
                        errors.category
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    >
                      <option value="">{t('selectCategory')}</option>
                      <option value="Partners/شركاء">Partners/شركاء</option>
                      <option value="Lawyers/محامين">Lawyers/محامين</option>
                      <option value="Admins/عاملين">Admins/عاملين</option>
                      <option value="Consultants/مستشارين">Consultants/مستشارين</option>
                    </select>
                    {errors.category && (
                      <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('jobTitle')}</label>
                    <input
                      type="text"
                      {...register('jobTitle')}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent ${
                        errors.jobTitle
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.jobTitle && (
                      <p className="mt-1 text-xs text-red-600">{errors.jobTitle.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('department')}</label>
                    <input
                      type="text"
                      {...register('department')}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent ${
                        errors.department
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.department && (
                      <p className="mt-1 text-xs text-red-600">{errors.department.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('dateOfBirth')}</label>
                    <input
                      type="date"
                      value={additionalFields.dateOfBirth ? new Date(additionalFields.dateOfBirth).toISOString().split('T')[0] : ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, dateOfBirth: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('joiningDate')}</label>
                    <input
                      type="date"
                      value={additionalFields.joiningDate ? new Date(additionalFields.joiningDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, joiningDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('status')}</label>
                    <select
                      {...register('status')}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent ${
                        errors.status
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    >
                      <option value="Active">{t('statusActive')}</option>
                      <option value="Resigned">{t('statusResigned')}</option>
                    </select>
                    {errors.status && (
                      <p className="mt-1 text-xs text-red-600">{errors.status.message}</p>
                    )}
                  </div>

                  {/* Contact Information */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={additionalFields.mobileNumber || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, mobileNumber: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Extension</label>
                    <input
                      type="text"
                      value={additionalFields.extension || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, extension: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={additionalFields.address || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, address: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region / City</label>
                    <input
                      type="text"
                      value={additionalFields.addressRegion || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, addressRegion: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Governorate</label>
                    <input
                      type="text"
                      value={additionalFields.addressGovernorate || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, addressGovernorate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Education */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Education</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Certificate</label>
                    <input
                      type="text"
                      value={additionalFields.graduationCertificate || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, graduationCertificate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Ph.D., Masters, Bachelor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                    <input
                      type="text"
                      value={additionalFields.graduationSection || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, graduationSection: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., International Business Law"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">University / School</label>
                    <input
                      type="text"
                      value={additionalFields.graduationUniversity || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, graduationUniversity: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
                    <input
                      type="number"
                      value={additionalFields.graduationYear || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, graduationYear: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1900"
                      max="2100"
                    />
                  </div>

                  {/* Identification */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Identification</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">National ID</label>
                    <input
                      type="text"
                      value={additionalFields.nationalId || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, nationalId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">National ID Valid Till</label>
                    <input
                      type="date"
                      value={additionalFields.nationalIdValidTill ? new Date(additionalFields.nationalIdValidTill).toISOString().split('T')[0] : ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, nationalIdValidTill: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Social Insurance</label>
                    <input
                      type="text"
                      value={additionalFields.socialInsurance || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, socialInsurance: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bar Association Number</label>
                    <input
                      type="text"
                      value={additionalFields.barAssociation || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, barAssociation: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bar Association Valid Till</label>
                    <input
                      type="date"
                      value={additionalFields.barAssociationValidTill ? new Date(additionalFields.barAssociationValidTill).toISOString().split('T')[0] : ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, barAssociationValidTill: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bar Association Degree (درجة القيد)</label>
                    <input
                      type="text"
                      value={additionalFields.barAssociationDegree || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, barAssociationDegree: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Card Number</label>
                    <input
                      type="text"
                      value={additionalFields.taxCard || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, taxCard: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Employment Details */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
                    <input
                      type="text"
                      value={additionalFields.contractType || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, contractType: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contract Duration</label>
                    <input
                      type="text"
                      value={additionalFields.contractDuration || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, contractDuration: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Renewal for One Year"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contract Renewal Date</label>
                    <input
                      type="date"
                      value={additionalFields.contractRenewalDate ? new Date(additionalFields.contractRenewalDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, contractRenewalDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Experience */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Experience</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience In - Years</label>
                    <input
                      type="number"
                      value={additionalFields.experienceInYears || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, experienceInYears: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience In - Months</label>
                    <input
                      type="number"
                      value={additionalFields.experienceInMonths || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, experienceInMonths: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      max="11"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience Out - Years</label>
                    <input
                      type="number"
                      value={additionalFields.experienceOutYears || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, experienceOutYears: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience Out - Months</label>
                    <input
                      type="number"
                      value={additionalFields.experienceOutMonths || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, experienceOutMonths: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      max="11"
                    />
                  </div>

                  {/* Resignation */}
                  {watch('status') === 'Resigned' && (
                    <>
                      <div className="md:col-span-2 mt-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resignation Details</h3>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Resignation Date</label>
                        <input
                          type="date"
                          value={additionalFields.resignationDate ? new Date(additionalFields.resignationDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => setAdditionalFields({ ...additionalFields, resignationDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Resignation Reason</label>
                        <textarea
                          value={additionalFields.resignationReason || ''}
                          onChange={(e) => setAdditionalFields({ ...additionalFields, resignationReason: e.target.value })}
                          rows={3}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </>
                  )}

                  {/* Notes */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={additionalFields.notes || ''}
                      onChange={(e) => setAdditionalFields({ ...additionalFields, notes: e.target.value })}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Additional notes or comments"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Tooltip content={tooltips.common.cancel}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        reset();
                        setAdditionalFields({});
                        setEditingEmployee(null);
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </Tooltip>
                  <Tooltip content={tooltips.management.save}>
                    <LoadingButton
                      type="submit"
                      loading={isSubmitting || saving}
                    >
                      {editingEmployee ? 'Update' : 'Create'}
                    </LoadingButton>
                  </Tooltip>
                </div>
              </form>
            </div>
          </div>
        )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={t('deleteEmployee') || 'Delete Employee'}
        message={t('deleteEmployeeConfirm', { name: deleteConfirm.employeeName }) || `Are you sure you want to delete employee "${deleteConfirm.employeeName}"?`}
        confirmText={t('delete') || 'Delete'}
        cancelText={t('cancel') || 'Cancel'}
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}

