import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import Tooltip from '../components/Tooltip';
import { tooltips } from '../utils/tooltips';

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [saving, setSaving] = useState(false);

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
        setFormData(employee);
        setShowForm(true);
        // Remove editId from URL
        setSearchParams({});
      }
    }
  }, [employees, searchParams, setSearchParams, editingEmployee]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/employees`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      alert('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEmployee(null);
    setFormData({ status: 'Active' });
    setShowForm(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData(employee);
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete employee "${name}"? This will also delete all related salary, bonus, and contract records.`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/employees/${id}`);
      alert('Employee deleted successfully');
      fetchEmployees();
    } catch (error: any) {
      alert(`Failed to delete employee: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingEmployee) {
        await axios.put(`${API_BASE_URL}/employees/${editingEmployee.id}`, formData);
        alert('Employee updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/employees`, formData);
        alert('Employee created successfully');
      }
      setShowForm(false);
      setFormData({});
      fetchEmployees();
    } catch (error: any) {
      alert(`Failed to save employee: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filtered = employees.filter(e => {
    const searchLower = search.toLowerCase();
    return (
      e.name.toLowerCase().includes(searchLower) ||
      (e.nameArabic && e.nameArabic.toLowerCase().includes(searchLower)) ||
      (e.employeeCode && e.employeeCode.toLowerCase().includes(searchLower)) ||
      (e.jobTitle && e.jobTitle.toLowerCase().includes(searchLower))
    );
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Management</h1>
          <p className="text-gray-600">Create, update, and manage employee records</p>
        </div>
        <Tooltip content={tooltips.management.create}>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + New Employee
          </button>
        </Tooltip>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <Tooltip content={tooltips.common.search}>
          <input
            type="text"
            placeholder="Search by name, ID, job title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </Tooltip>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map(employee => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{employee.name}</div>
                      {employee.nameArabic && (
                        <div className="text-sm text-gray-500">{employee.nameArabic}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {employee.employeeCode || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {employee.category || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {employee.jobTitle || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {employee.department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      employee.status === 'Resigned' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {employee.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Tooltip content={tooltips.common.viewDetails}>
                        <button
                          onClick={() => navigate(`/employees/${employee.id}`)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View
                        </button>
                      </Tooltip>
                      <Tooltip content={tooltips.management.edit}>
                        <button
                          onClick={() => handleEdit(employee)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                      </Tooltip>
                      <Tooltip content={tooltips.management.delete}>
                        <button
                          onClick={() => handleDelete(employee.id, employee.name)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
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
              <p className="text-gray-500">No employees found</p>
            </div>
          )}
        </div>

        {/* Create/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingEmployee ? 'Edit Employee' : 'Create New Employee'}
                </h2>
                <Tooltip content={tooltips.common.close}>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setFormData({});
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

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name (English) *</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name (Arabic)</label>
                    <input
                      type="text"
                      value={formData.nameArabic || ''}
                      onChange={(e) => setFormData({ ...formData, nameArabic: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">System ID</label>
                    <input
                      type="text"
                      value={formData.employeeCode || ''}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Category</option>
                      <option value="Partners/شركاء">Partners/شركاء</option>
                      <option value="Lawyers/محامين">Lawyers/محامين</option>
                      <option value="Admins/عاملين">Admins/عاملين</option>
                      <option value="Consultants/مستشارين">Consultants/مستشارين</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                    <input
                      type="text"
                      value={formData.jobTitle || ''}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={formData.department || ''}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                    <input
                      type="date"
                      value={formData.joiningDate ? new Date(formData.joiningDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status || 'Active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Active">Active</option>
                      <option value="Resigned">Resigned</option>
                    </select>
                  </div>

                  {/* Contact Information */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={formData.mobileNumber || ''}
                      onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Extension</label>
                    <input
                      type="text"
                      value={formData.extension || ''}
                      onChange={(e) => setFormData({ ...formData, extension: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region / City</label>
                    <input
                      type="text"
                      value={formData.addressRegion || ''}
                      onChange={(e) => setFormData({ ...formData, addressRegion: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Governorate</label>
                    <input
                      type="text"
                      value={formData.addressGovernorate || ''}
                      onChange={(e) => setFormData({ ...formData, addressGovernorate: e.target.value })}
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
                      value={formData.graduationCertificate || ''}
                      onChange={(e) => setFormData({ ...formData, graduationCertificate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Ph.D., Masters, Bachelor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                    <input
                      type="text"
                      value={formData.graduationSection || ''}
                      onChange={(e) => setFormData({ ...formData, graduationSection: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., International Business Law"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">University / School</label>
                    <input
                      type="text"
                      value={formData.graduationUniversity || ''}
                      onChange={(e) => setFormData({ ...formData, graduationUniversity: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
                    <input
                      type="number"
                      value={formData.graduationYear || ''}
                      onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value ? parseInt(e.target.value) : null })}
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
                      value={formData.nationalId || ''}
                      onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">National ID Valid Till</label>
                    <input
                      type="date"
                      value={formData.nationalIdValidTill ? new Date(formData.nationalIdValidTill).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData({ ...formData, nationalIdValidTill: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Social Insurance</label>
                    <input
                      type="text"
                      value={formData.socialInsurance || ''}
                      onChange={(e) => setFormData({ ...formData, socialInsurance: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bar Association Number</label>
                    <input
                      type="text"
                      value={formData.barAssociation || ''}
                      onChange={(e) => setFormData({ ...formData, barAssociation: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bar Association Valid Till</label>
                    <input
                      type="date"
                      value={formData.barAssociationValidTill ? new Date(formData.barAssociationValidTill).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData({ ...formData, barAssociationValidTill: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bar Association Degree (درجة القيد)</label>
                    <input
                      type="text"
                      value={formData.barAssociationDegree || ''}
                      onChange={(e) => setFormData({ ...formData, barAssociationDegree: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Card Number</label>
                    <input
                      type="text"
                      value={formData.taxCard || ''}
                      onChange={(e) => setFormData({ ...formData, taxCard: e.target.value })}
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
                      value={formData.contractType || ''}
                      onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contract Duration</label>
                    <input
                      type="text"
                      value={formData.contractDuration || ''}
                      onChange={(e) => setFormData({ ...formData, contractDuration: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Renewal for One Year"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contract Renewal Date</label>
                    <input
                      type="date"
                      value={formData.contractRenewalDate ? new Date(formData.contractRenewalDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData({ ...formData, contractRenewalDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
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
                      value={formData.experienceInYears || ''}
                      onChange={(e) => setFormData({ ...formData, experienceInYears: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience In - Months</label>
                    <input
                      type="number"
                      value={formData.experienceInMonths || ''}
                      onChange={(e) => setFormData({ ...formData, experienceInMonths: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      max="11"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience Out - Years</label>
                    <input
                      type="number"
                      value={formData.experienceOutYears || ''}
                      onChange={(e) => setFormData({ ...formData, experienceOutYears: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience Out - Months</label>
                    <input
                      type="number"
                      value={formData.experienceOutMonths || ''}
                      onChange={(e) => setFormData({ ...formData, experienceOutMonths: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      max="11"
                    />
                  </div>

                  {/* Resignation */}
                  {formData.status === 'Resigned' && (
                    <>
                      <div className="md:col-span-2 mt-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resignation Details</h3>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Resignation Date</label>
                        <input
                          type="date"
                          value={formData.resignationDate ? new Date(formData.resignationDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => setFormData({ ...formData, resignationDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Resignation Reason</label>
                        <textarea
                          value={formData.resignationReason || ''}
                          onChange={(e) => setFormData({ ...formData, resignationReason: e.target.value })}
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
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                        setFormData({});
                        setEditingEmployee(null);
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </Tooltip>
                  <Tooltip content={tooltips.management.save}>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : editingEmployee ? 'Update' : 'Create'}
                    </button>
                  </Tooltip>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}

