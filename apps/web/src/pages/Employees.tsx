import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import Tooltip from '../components/Tooltip';
import { tooltips } from '../utils/tooltips';
import { normalizeForSearch, groupAndSortEmployeesByCategory, sortCategories, compareEmployeeCodes, getCategoryPriority } from '../utils/employee-utils';

interface Employee {
  id: string;
  name: string;
  nameArabic?: string;
  employeeCode?: string;
  category?: string;
  jobTitle?: string;
  department?: string;
  status?: string;
  _count: {
    salaries: number;
  };
}

const FILTER_STORAGE_KEY = 'employees-filters';

export default function Employees() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Load filters from localStorage on mount
  const loadFilters = () => {
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          search: parsed.search || '',
          statusFilter: parsed.statusFilter || 'Active',
          departmentFilter: parsed.departmentFilter || 'all',
          categoryFilter: parsed.categoryFilter || 'all',
        };
      }
    } catch (e) {
      console.error('Failed to load filters:', e);
    }
    return {
      search: '',
      statusFilter: 'Active',
      departmentFilter: 'all',
      categoryFilter: 'all',
    };
  };
  
  const initialFilters = loadFilters();
  const [search, setSearch] = useState(initialFilters.search);
  const [statusFilter, setStatusFilter] = useState<string>(initialFilters.statusFilter);
  const [departmentFilter, setDepartmentFilter] = useState<string>(initialFilters.departmentFilter);
  const [categoryFilter, setCategoryFilter] = useState<string>(initialFilters.categoryFilter);
  
  // Save filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({
        search,
        statusFilter,
        departmentFilter,
        categoryFilter,
      }));
    } catch (e) {
      console.error('Failed to save filters:', e);
    }
  }, [search, statusFilter, departmentFilter, categoryFilter]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [showManualMerge, setShowManualMerge] = useState(false);
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>('');
  
  const fetchEmployees = () => {
    setLoading(true);
    axios.get(`${API_BASE_URL}/employees`)
      .then(res => setEmployees(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEmployees();
  }, []);
  
  const handleEdit = (employee: Employee) => {
    navigate(`/manage/employees?editId=${employee.id}`);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t('deleteEmployeeConfirm', { name }))) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/employees/${id}`);
      alert(t('employeeDeletedSuccessfully'));
      fetchEmployees();
    } catch (error: any) {
      alert(t('failedToDeleteEmployee', { error: error.response?.data?.error || error.message }));
    }
  };

  const handleManualMerge = async () => {
    if (selectedEmployees.size < 2) {
      alert(t('pleaseSelectAtLeast2Employees'));
      return;
    }
    
    if (!targetEmployeeId || !selectedEmployees.has(targetEmployeeId)) {
      alert(t('pleaseSelectEmployeeToKeep'));
      return;
    }
    
    const employeesToMerge = Array.from(selectedEmployees).filter(id => id !== targetEmployeeId);
    const targetEmployee = employees.find(e => e.id === targetEmployeeId);
    
    if (!confirm(t('mergeConfirmMessage', { count: employeesToMerge.length, name: targetEmployee?.name || '' }))) {
      return;
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/import/manual-merge`, {
        targetEmployeeId,
        employeeIdsToMerge: employeesToMerge
      });
      
      if (response.data.success) {
        alert(t('mergeSuccessful', { moved: response.data.recordsMoved, skipped: response.data.recordsSkipped }));
        setSelectedEmployees(new Set());
        setTargetEmployeeId('');
        setShowManualMerge(false);
        fetchEmployees(); // Refresh the list
      } else {
        alert(t('mergeFailed', { error: response.data.error || 'Unknown error' }));
      }
    } catch (error: any) {
      alert(t('mergeFailed', { error: error.response?.data?.error || error.message || 'Unknown error' }));
      console.error('Manual merge error:', error);
    }
  };
  
  // Get unique categories, departments
  const categories = Array.from(new Set(employees.map(e => e.category).filter(Boolean))) as string[];
  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean))) as string[];
  
  // Sort categories: Partners first, then Lawyers, Admins, Consultants, then others
  const sortedCategories = [...categories].sort(sortCategories);
  
  const filtered = employees.filter(e => {
    // Search filter
    const normalizedSearch = normalizeForSearch(search);
    const normalizedName = normalizeForSearch(e.name);
    const matchesSearch = normalizedName.includes(normalizedSearch);
    
    // Status filter
    const matchesStatus = !statusFilter || statusFilter === 'all' || (e.status || 'Active') === statusFilter;
    
    // Department filter
    const matchesDepartment = departmentFilter === 'all' || e.department === departmentFilter;
    
    // Category filter
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesDepartment && matchesCategory;
  });
  
  // Group employees by category and sort by employee code within each category
  const employeesByCategory = groupAndSortEmployeesByCategory(filtered);
  
  if (loading) return <div>{t('loading')}</div>;
  
  return (
    <div>
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">📋 {t('manualMergeInstructions')}</h3>
        <p className="text-sm text-blue-700">
          1. {t('selectEmployeesToMerge')}<br />
          2. {t('clickMergeSelected')}<br />
          3. {t('chooseEmployeeToKeep')}<br />
          4. {t('confirmTheMerge')}
        </p>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">{t('employees')}</h2>
        </div>
        <div className="flex gap-2">
          <Tooltip content={tooltips.management.create}>
            <button
              onClick={() => navigate('/manage/employees')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + {t('newEmployee')}
            </button>
          </Tooltip>
          <button
            onClick={() => navigate('/employees/details')}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {t('viewAllDetails')}
          </button>
          {selectedEmployees.size > 0 && (
            <>
              <button
                onClick={() => setShowManualMerge(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                {t('mergeSelected')} ({selectedEmployees.size})
              </button>
              <button
                onClick={() => {
                  setSelectedEmployees(new Set());
                  setTargetEmployeeId('');
                  setShowManualMerge(false);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                {t('clearSelection')}
              </button>
            </>
          )}
        </div>
      </div>
      
      {showManualMerge && selectedEmployees.size >= 2 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">{t('manualMergeInstructions')}</h3>
          <p className="text-sm mb-3">{t('selectEmployeeToKeep')}</p>
          <div className="space-y-2">
            {Array.from(selectedEmployees).map(id => {
              const emp = employees.find(e => e.id === id);
              if (!emp) return null;
              return (
                <label key={id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="targetEmployee"
                    value={id}
                    checked={targetEmployeeId === id}
                    onChange={(e) => setTargetEmployeeId(e.target.value)}
                    className="cursor-pointer"
                  />
                  <span>
                    <strong>{emp.name}</strong> ({emp._count.salaries} records)
                  </span>
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleManualMerge}
              disabled={!targetEmployeeId}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {t('confirmMergeButton')}
            </button>
            <button
              onClick={() => {
                setShowManualMerge(false);
                setTargetEmployeeId('');
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
      
      <div className="mb-4 bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-1">
            <Tooltip content={tooltips.common.search}>
              <input
                type="text"
                placeholder={t('search')}
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
            <Tooltip content={tooltips.reports.filterByCategory}>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">{t('allCategories')}</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </Tooltip>
          </div>
        </div>
      </div>
      {/* Employee List */}
      <div className="space-y-6">
        {sortedCategories.map(category => {
          const categoryEmployees = employeesByCategory[category] || [];
          if (categoryFilter !== 'all' && categoryFilter !== category) return null;
          if (categoryEmployees.length === 0) return null;
          
          // Ensure Partners appears first
          const isPartners = category === 'Partners/شركاء' || category.toLowerCase().includes('partners');
          
          return (
            <div key={category} className="bg-white rounded-lg shadow-sm overflow-x-auto">
              <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">
                  {category} ({categoryEmployees.length})
                </h3>
              </div>
              <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '3%' }}>
                      <input
                        type="checkbox"
                        checked={categoryEmployees.length > 0 && categoryEmployees.every(e => selectedEmployees.has(e.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newSet = new Set(selectedEmployees);
                            categoryEmployees.forEach(emp => newSet.add(emp.id));
                            setSelectedEmployees(newSet);
                          } else {
                            const newSet = new Set(selectedEmployees);
                            categoryEmployees.forEach(emp => newSet.delete(emp.id));
                            setSelectedEmployees(newSet);
                          }
                        }}
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '22%' }}>{t('name')}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '7%' }}>{t('id')}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '12%' }}>{t('category')}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '18%' }}>{t('jobTitle')}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '15%' }}>{t('department')}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '8%' }}>{t('status')}</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '15%' }}>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categoryEmployees.map(employee => (
              <tr 
                key={employee.id} 
                className={`hover:bg-gray-50 ${selectedEmployees.has(employee.id) ? 'bg-blue-50' : ''}`}
              >
                <td className="px-3 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.has(employee.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedEmployees);
                      if (e.target.checked) {
                        newSet.add(employee.id);
                      } else {
                        newSet.delete(employee.id);
                        if (targetEmployeeId === employee.id) {
                          setTargetEmployeeId('');
                        }
                      }
                      setSelectedEmployees(newSet);
                    }}
                    className="cursor-pointer"
                  />
                </td>
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
                <td className="px-3 py-4 text-right text-sm font-medium">
                  <div className="flex flex-col gap-2 items-end">
                    <div className="flex gap-2">
                      <Tooltip content={tooltips.common.viewDetails}>
                        <button
                          onClick={() => navigate(`/employees/${employee.id}`)}
                          className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 whitespace-nowrap"
                        >
                          {t('view')}
                        </button>
                      </Tooltip>
                      <Tooltip content={tooltips.management.edit}>
                        <button
                          onClick={() => handleEdit(employee)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 whitespace-nowrap"
                        >
                          {t('edit')}
                        </button>
                      </Tooltip>
                      <Tooltip content={tooltips.management.delete}>
                        <button
                          onClick={() => handleDelete(employee.id, employee.name)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 whitespace-nowrap"
                        >
                          {t('delete')}
                        </button>
                      </Tooltip>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/employees/${employee.id}`)}
                        className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 whitespace-nowrap"
                      >
                        {t('details')}
                      </button>
                      <button
                        onClick={() => navigate(`/employees/${employee.id}/annual?year=${new Date().getFullYear()}`)}
                        className="px-3 py-1 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 whitespace-nowrap"
                      >
                        {t('annual')}
                      </button>
                      <button
                        onClick={() => navigate(`/employees/${employee.id}/bonus?year=${new Date().getFullYear()}`)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 whitespace-nowrap"
                      >
                        {t('bonus')}
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        
        {/* Show uncategorized employees if any */}
        {(() => {
          const uncategorized = employeesByCategory['Uncategorized'];
          if (!uncategorized || uncategorized.length === 0) return null;
          if (categoryFilter !== 'all' && categoryFilter !== 'Uncategorized') return null;
          
          return (
            <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
              <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">
                  {t('uncategorized')} ({uncategorized.length})
                </h3>
              </div>
              <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '3%' }}>
                      <input
                        type="checkbox"
                        checked={uncategorized.length > 0 && 
                                 uncategorized.every(e => selectedEmployees.has(e.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newSet = new Set(selectedEmployees);
                            uncategorized.forEach(emp => newSet.add(emp.id));
                            setSelectedEmployees(newSet);
                          } else {
                            const newSet = new Set(selectedEmployees);
                            uncategorized.forEach(emp => newSet.delete(emp.id));
                            setSelectedEmployees(newSet);
                          }
                        }}
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '22%' }}>{t('name')}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '7%' }}>{t('id')}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '12%' }}>{t('category')}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '18%' }}>{t('jobTitle')}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '15%' }}>{t('department')}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '8%' }}>{t('status')}</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ width: '15%' }}>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {uncategorized.map(employee => (
                    <tr 
                      key={employee.id} 
                      className={`hover:bg-gray-50 ${selectedEmployees.has(employee.id) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-3 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.has(employee.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedEmployees);
                            if (e.target.checked) {
                              newSet.add(employee.id);
                            } else {
                              newSet.delete(employee.id);
                              if (targetEmployeeId === employee.id) {
                                setTargetEmployeeId('');
                              }
                            }
                            setSelectedEmployees(newSet);
                          }}
                          className="cursor-pointer"
                        />
                      </td>
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
                      <td className="px-3 py-4 text-right text-sm font-medium">
                        <div className="flex flex-col gap-2 items-end">
                          <div className="flex gap-2">
                            <Tooltip content={tooltips.common.viewDetails}>
                              <button
                                onClick={() => navigate(`/employees/${employee.id}`)}
                                className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 whitespace-nowrap"
                              >
                                {t('view')}
                              </button>
                            </Tooltip>
                            <Tooltip content={tooltips.management.edit}>
                              <button
                                onClick={() => handleEdit(employee)}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 whitespace-nowrap"
                              >
                                {t('edit')}
                              </button>
                            </Tooltip>
                            <Tooltip content={tooltips.management.delete}>
                              <button
                                onClick={() => handleDelete(employee.id, employee.name)}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 whitespace-nowrap"
                              >
                                {t('delete')}
                              </button>
                            </Tooltip>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate(`/employees/${employee.id}`)}
                              className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 whitespace-nowrap"
                            >
                              {t('details')}
                            </button>
                            <button
                              onClick={() => navigate(`/employees/${employee.id}/annual?year=${new Date().getFullYear()}`)}
                              className="px-3 py-1 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 whitespace-nowrap"
                            >
                              {t('annual')}
                            </button>
                            <button
                              onClick={() => navigate(`/employees/${employee.id}/bonus?year=${new Date().getFullYear()}`)}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 whitespace-nowrap"
                            >
                              {t('bonus')}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
        
        {filtered.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center text-gray-500">
              {t('noEmployeesFound')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

