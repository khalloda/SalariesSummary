import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import Tooltip from '../components/Tooltip';
import { tooltips } from '../utils/tooltips';

interface Employee {
  id: string;
  name: string;
  category?: string;
  _count: {
    salaries: number;
  };
}

/**
 * Normalize text for search comparison
 * Handles Arabic character variations to ensure "امي" matches "أمي"
 */
function normalizeForSearch(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  let normalized = text.trim();
  
  // Normalize Arabic character variations
  // Normalize all alif variations (أ, ا, إ, آ) to ا
  normalized = normalized.replace(/[أإآ]/g, 'ا');
  
  // ة (ta marbuta) -> ه (ha)
  normalized = normalized.replace(/ة/g, 'ه');
  
  // Remove special characters
  normalized = normalized.replace(/[ـ_]/g, '');
  
  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized.toLowerCase();
}

export default function Employees() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
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
  
  // Get unique categories
  const categories = Array.from(new Set(employees.map(e => e.category).filter(Boolean))) as string[];
  
  // Define category display order: Partners, Lawyers, Admins, Consultants, then others
  const categoryOrder = [
    'Partners/شركاء',
    'Lawyers/محامين', // Lawyers under Partners
    'Admins/عاملين',
    'Consultants/مستشارين'
  ];
  
  // Sort categories according to the specified order
  const sortedCategories = categoryOrder.filter(cat => categories.includes(cat))
    .concat(categories.filter(cat => !categoryOrder.includes(cat)));
  
  const filtered = employees.filter(e => {
    const normalizedSearch = normalizeForSearch(search);
    const normalizedName = normalizeForSearch(e.name);
    const matchesSearch = normalizedName.includes(normalizedSearch);
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  
  // Group employees by category
  const employeesByCategory: Record<string, Employee[]> = {};
  filtered.forEach(emp => {
    const category = emp.category || 'Uncategorized';
    if (!employeesByCategory[category]) {
      employeesByCategory[category] = [];
    }
    employeesByCategory[category].push(emp);
  });
  
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
        <h2 className="text-2xl font-bold">{t('employees')}</h2>
        <div className="flex gap-2">
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
      
      <div className="mb-4 flex gap-4 flex-wrap">
        <Tooltip content={tooltips.common.search}>
          <input
            type="text"
            placeholder={t('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-2 w-full max-w-md"
          />
        </Tooltip>
        <Tooltip content={tooltips.reports.filterByCategory}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">{t('allCategories')}</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </Tooltip>
      </div>
      <div className="space-y-6">
        {sortedCategories.map(category => {
          const categoryEmployees = employeesByCategory[category] || [];
          if (categoryFilter !== 'all' && categoryFilter !== category) return null;
          if (categoryEmployees.length === 0) return null;
          
          return (
            <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">
                  {category} ({categoryEmployees.length})
                </h3>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('name')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categoryEmployees.map(employee => (
                    <tr 
                      key={employee.id} 
                      className={`hover:bg-gray-50 ${selectedEmployees.has(employee.id) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/employees/${employee.id}`)}
                          className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                        >
                          {employee.name}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{employee.category || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{employee._count.salaries}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/employees/${employee.id}`)}
                            className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => navigate(`/employees/${employee.id}/annual?year=${new Date().getFullYear()}`)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Annual
                          </button>
                          <button
                            onClick={() => navigate(`/employees/${employee.id}/bonus?year=${new Date().getFullYear()}`)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            Bonus
                          </button>
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
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">
                  {t('uncategorized')} ({uncategorized.length})
                </h3>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('name')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('category')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('records')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {uncategorized.map(employee => (
                  <tr 
                    key={employee.id} 
                    className={`hover:bg-gray-50 ${selectedEmployees.has(employee.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/employees/${employee.id}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                      >
                        {employee.name}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{employee.category || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{employee._count.salaries}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/employees/${employee.id}`)}
                            className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                          >
                            {t('details')}
                          </button>
                          <button
                            onClick={() => navigate(`/employees/${employee.id}/annual?year=${new Date().getFullYear()}`)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            {t('annual')}
                          </button>
                          <button
                            onClick={() => navigate(`/employees/${employee.id}/bonus?year=${new Date().getFullYear()}`)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            {t('bonus')}
                          </button>
                        </div>
                      </td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

