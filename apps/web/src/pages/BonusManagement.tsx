import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

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
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingBonus, setEditingBonus] = useState<Bonus | null>(null);
  const [formData, setFormData] = useState<Partial<Bonus>>({});
  const [saving, setSaving] = useState(false);

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
      alert('Failed to load bonuses');
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
    setFormData({
      year: new Date().getFullYear(),
      previousYearNet: 0,
      previousYearGross: 0,
      currentYearNet: 0,
      currentYearGross: 0,
      annualIncreaseNet: 0,
      annualIncreaseGross: 0,
      bonusAmount: 0
    });
    setShowForm(true);
  };

  const handleEdit = (bonus: Bonus) => {
    setEditingBonus(bonus);
    setFormData(bonus);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bonus record?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/bonuses/${id}`);
      alert('Bonus record deleted successfully');
      fetchBonuses();
    } catch (error: any) {
      alert(`Failed to delete bonus: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Calculate annual increase if not provided
      const previousYearNet = parseFloat(String(formData.previousYearNet || 0));
      const currentYearNet = parseFloat(String(formData.currentYearNet || 0));
      const previousYearGross = parseFloat(String(formData.previousYearGross || 0));
      const currentYearGross = parseFloat(String(formData.currentYearGross || 0));

      const submitData = {
        ...formData,
        annualIncreaseNet: formData.annualIncreaseNet !== undefined 
          ? parseFloat(String(formData.annualIncreaseNet)) 
          : currentYearNet - previousYearNet,
        annualIncreaseGross: formData.annualIncreaseGross !== undefined
          ? parseFloat(String(formData.annualIncreaseGross))
          : currentYearGross - previousYearGross
      };

      if (editingBonus) {
        await axios.put(`${API_BASE_URL}/bonuses/${editingBonus.id}`, submitData);
        alert('Bonus record updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/bonuses`, submitData);
        alert('Bonus record created successfully');
      }
      setShowForm(false);
      setFormData({});
      fetchBonuses();
    } catch (error: any) {
      alert(`Failed to save bonus: ${error.response?.data?.error || error.message}`);
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bonus Management</h1>
            <p className="text-gray-600">Manage annual bonus records</p>
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + New Bonus Record
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bonus Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">First Half</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Second Half</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Annual Increase</th>
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
                          onClick={() => handleDelete(bonus.id)}
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
                  {editingBonus ? 'Edit Bonus Record' : 'Create New Bonus Record'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setFormData({});
                    setEditingBonus(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                    <select
                      required
                      value={formData.employeeId || ''}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Employee</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.employeeCode || 'N/A'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                    <input
                      type="number"
                      required
                      value={formData.year || ''}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="2000"
                      max="2100"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary Information</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Previous Year Net</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.previousYearNet || 0}
                      onChange={(e) => setFormData({ ...formData, previousYearNet: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Year Net</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.currentYearNet || 0}
                      onChange={(e) => setFormData({ ...formData, currentYearNet: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Previous Year Gross</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.previousYearGross || 0}
                      onChange={(e) => setFormData({ ...formData, previousYearGross: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Year Gross</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.currentYearGross || 0}
                      onChange={(e) => setFormData({ ...formData, currentYearGross: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Annual Increase Net (Auto)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={(() => {
                        const prev = parseFloat(String(formData.previousYearNet || 0));
                        const curr = parseFloat(String(formData.currentYearNet || 0));
                        return curr - prev;
                      })()}
                      readOnly
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Annual Increase Gross (Auto)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={(() => {
                        const prev = parseFloat(String(formData.previousYearGross || 0));
                        const curr = parseFloat(String(formData.currentYearGross || 0));
                        return curr - prev;
                      })()}
                      readOnly
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Bonus Information</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Amount *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={formData.bonusAmount || 0}
                      onChange={(e) => setFormData({ ...formData, bonusAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Previous Year Bonus</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.previousYearBonus || ''}
                      onChange={(e) => setFormData({ ...formData, previousYearBonus: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bonus First Half</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.bonusFirstHalf || ''}
                      onChange={(e) => setFormData({ ...formData, bonusFirstHalf: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Second Half</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.bonusSecondHalf || ''}
                      onChange={(e) => setFormData({ ...formData, bonusSecondHalf: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reflected in Months</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.reflectedInMonths || ''}
                      onChange={(e) => setFormData({ ...formData, reflectedInMonths: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reflected in Percent</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.reflectedInPercent || ''}
                      onChange={(e) => setFormData({ ...formData, reflectedInPercent: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                      setFormData({});
                      setEditingBonus(null);
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editingBonus ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}

