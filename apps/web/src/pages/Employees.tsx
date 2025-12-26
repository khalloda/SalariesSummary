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
  
  useEffect(() => {
    axios.get(`${API_BASE_URL}/employees`)
      .then(res => setEmployees(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);
  
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
      <h2 className="text-2xl font-bold mb-4">{t('employees')}</h2>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('name')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map(employee => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">{employee.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{employee.category || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{employee._count.salaries}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => navigate(`/employees/${employee.id}/annual`)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View Annual Report
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

