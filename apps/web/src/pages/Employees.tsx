import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

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
      alert('Please select at least 2 employees to merge');
      return;
    }
    
    if (!targetEmployeeId || !selectedEmployees.has(targetEmployeeId)) {
      alert('Please select which employee to keep (target employee)');
      return;
    }
    
    const employeesToMerge = Array.from(selectedEmployees).filter(id => id !== targetEmployeeId);
    
    if (!confirm(`Merge ${employeesToMerge.length} employee(s) into "${employees.find(e => e.id === targetEmployeeId)?.name}"?\n\nThis action cannot be undone!`)) {
      return;
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/import/manual-merge`, {
        targetEmployeeId,
        employeeIdsToMerge: employeesToMerge
      });
      
      if (response.data.success) {
        alert(`Merge successful!\n\n- ${response.data.recordsMoved} records moved\n- ${response.data.recordsSkipped} records skipped`);
        setSelectedEmployees(new Set());
        setTargetEmployeeId('');
        setShowManualMerge(false);
        fetchEmployees(); // Refresh the list
      } else {
        alert(`Merge failed: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Merge failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
      console.error('Manual merge error:', error);
    }
  };
  
  // Get unique categories
  const categories = Array.from(new Set(employees.map(e => e.category).filter(Boolean))) as string[];
  
  const filtered = employees.filter(e => {
    const normalizedSearch = normalizeForSearch(search);
    const normalizedName = normalizeForSearch(e.name);
    const matchesSearch = normalizedName.includes(normalizedSearch);
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">📋 Manual Merge Instructions</h3>
        <p className="text-sm text-blue-700">
          1. Select 2 or more employees using the checkboxes<br />
          2. Click "Merge Selected" button<br />
          3. Choose which employee to keep (all others will be merged into it)<br />
          4. Confirm the merge
        </p>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{t('employees')}</h2>
        <div className="flex gap-2">
          {selectedEmployees.size > 0 && (
            <>
              <button
                onClick={() => setShowManualMerge(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Merge Selected ({selectedEmployees.size})
              </button>
              <button
                onClick={() => {
                  setSelectedEmployees(new Set());
                  setTargetEmployeeId('');
                  setShowManualMerge(false);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Clear Selection
              </button>
            </>
          )}
        </div>
      </div>
      
      {showManualMerge && selectedEmployees.size >= 2 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Manual Merge</h3>
          <p className="text-sm mb-3">Select which employee to keep (all others will be merged into it):</p>
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
              Confirm Merge
            </button>
            <button
              onClick={() => {
                setShowManualMerge(false);
                setTargetEmployeeId('');
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <div className="mb-4 flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 w-full max-w-md"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every(e => selectedEmployees.has(e.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEmployees(new Set(filtered.map(e => e.id)));
                    } else {
                      const newSet = new Set(selectedEmployees);
                      filtered.forEach(e => newSet.delete(e.id));
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
            {filtered.map(employee => (
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
                <td className="px-6 py-4 whitespace-nowrap">{employee.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{employee.category || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{employee._count.salaries}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => navigate(`/employees/${employee.id}/annual?year=${new Date().getFullYear()}`)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {t('viewAnnualReport')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

