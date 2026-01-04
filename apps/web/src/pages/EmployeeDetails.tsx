import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

interface ContractRecord {
  id: string;
  contractDate: string | null;
  contractDuration: string | null;
  comments: string | null;
  employeeName: string | null;
  employeeCode: string | null;
}

interface Employee {
  id: string;
  name: string;
  nameArabic: string | null;
  category: string | null;
  employeeCode: string | null;
  jobTitle: string | null;
  department: string | null;
  dateOfBirth: string | null;
  joiningDate: string | null;
  graduationCertificate: string | null;
  graduationSection: string | null;
  graduationUniversity: string | null;
  graduationYear: number | null;
  socialInsurance: string | null;
  barAssociation: string | null;
  barAssociationValidTill: string | null;
  barAssociationDegree: string | null;
  taxCard: string | null;
  nationalId: string | null;
  nationalIdValidTill: string | null;
  address: string | null;
  addressRegion: string | null;
  addressGovernorate: string | null;
  extension: string | null;
  mobileNumber: string | null;
  contractType: string | null;
  contractDuration: string | null;
  contractRenewalDate: string | null;
  status: string | null;
  experienceInYears: number | null;
  experienceInMonths: number | null;
  experienceOutYears: number | null;
  experienceOutMonths: number | null;
  resignationDate: string | null;
  resignationReason: string | null;
  contractRecords: ContractRecord[];
  _count: {
    salaries: number;
    contractRecords: number;
  };
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return 'N/A';
  }
}

function formatLargeNumber(value: string | null | undefined): string {
  // Format ID numbers without commas
  if (!value) return 'N/A';
  
  // Remove any existing commas from string
  const cleanStr = String(value).replace(/,/g, '');
  const num = parseFloat(cleanStr);
  if (isNaN(num)) {
    // If it's not a valid number, return the original string without commas
    return cleanStr;
  }
  
  // Always format without commas (useGrouping: false)
  return num.toLocaleString('en-US', { maximumFractionDigits: 0, useGrouping: false });
}

function calculateWorkDuration(joiningDate: string | null): string {
  if (!joiningDate) return 'N/A';
  try {
    const joinDate = new Date(joiningDate);
    const today = new Date();
    let years = today.getFullYear() - joinDate.getFullYear();
    let months = today.getMonth() - joinDate.getMonth();
    let days = today.getDate() - joinDate.getDate();

    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    const parts: string[] = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? 'Year' : 'Years'}`);
    if (months > 0) parts.push(`${months} ${months === 1 ? 'Month' : 'Months'}`);
    if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? 'Day' : 'Days'}`);

    return parts.join(', ') || '0 Days';
  } catch {
    return 'N/A';
  }
}

export default function EmployeeDetails() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/employees/all/details`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      alert('Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };


  // Get unique categories
  const categories = Array.from(new Set(employees.map(e => e.category).filter(Boolean))) as string[];

  // Define category display order
  const categoryOrder = [
    'Partners/شركاء',
    'Lawyers/محامين',
    'Admins/عاملين',
    'Consultants/مستشارين'
  ];

  const sortedCategories = categoryOrder.filter(cat => categories.includes(cat))
    .concat(categories.filter(cat => !categoryOrder.includes(cat)));

  const filtered = employees.filter(e => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      e.name.toLowerCase().includes(searchLower) ||
      (e.nameArabic && e.nameArabic.toLowerCase().includes(searchLower)) ||
      (e.employeeCode && e.employeeCode.toLowerCase().includes(searchLower)) ||
      (e.jobTitle && e.jobTitle.toLowerCase().includes(searchLower)) ||
      (e.department && e.department.toLowerCase().includes(searchLower));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employee data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Directory</h1>
          <p className="text-gray-600">Complete employee information and contract history</p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px]">
              <input
                type="text"
                placeholder="Search by name, ID, job title, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="min-w-[200px]">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">{t('allCategories')}</option>
                {sortedCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Showing {filtered.length} of {employees.length} employees
          </div>
        </div>

        {/* Employee Cards by Category */}
        <div className="space-y-6">
          {sortedCategories.map(category => {
            const categoryEmployees = employeesByCategory[category] || [];
            if (categoryFilter !== 'all' && categoryFilter !== category) return null;
            if (categoryEmployees.length === 0) return null;

            return (
              <div key={category} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">
                    {category} ({categoryEmployees.length})
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid gap-4">
                    {categoryEmployees.map(employee => {
                      return (
                        <div
                          key={employee.id}
                          className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => navigate(`/employees/${employee.id}`)}
                        >
                          {/* Employee Header */}
                          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {employee.name}
                                </h3>
                                {employee.nameArabic && (
                                  <span className="text-sm text-gray-600">({employee.nameArabic})</span>
                                )}
                                {employee.status === 'Resigned' && (
                                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                                    {t('statusResigned')}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-600">
                                {employee.employeeCode && (
                                  <span><strong>ID:</strong> {employee.employeeCode}</span>
                                )}
                                {employee.jobTitle && (
                                  <span><strong>Position:</strong> {employee.jobTitle}</span>
                                )}
                                {employee.department && (
                                  <span><strong>Department:</strong> {employee.department}</span>
                                )}
                                {employee.contractRenewalDate && (
                                  <span className="text-green-700">
                                    <strong>Next Renewal:</strong> {formatDate(employee.contractRenewalDate)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="ml-4">
                              <svg
                                className="w-5 h-5 text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Show uncategorized employees if any */}
        {(() => {
          const uncategorized = employeesByCategory['Uncategorized'];
          if (!uncategorized || uncategorized.length === 0) return null;
          if (categoryFilter !== 'all' && categoryFilter !== 'Uncategorized') return null;

          return (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-4">
                <h2 className="text-xl font-bold text-white">
                  Uncategorized ({uncategorized.length})
                </h2>
              </div>
              <div className="p-6">
                <div className="grid gap-4">
                  {uncategorized.map(employee => {
                    return (
                      <div
                        key={employee.id}
                        className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/employees/${employee.id}`)}
                      >
                        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {employee.name}
                              </h3>
                              {employee.nameArabic && (
                                <span className="text-sm text-gray-600">({employee.nameArabic})</span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-600">
                              {employee.employeeCode && (
                                <span><strong>ID:</strong> {employee.employeeCode}</span>
                              )}
                              {employee.jobTitle && (
                                <span><strong>Position:</strong> {employee.jobTitle}</span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            <svg
                              className="w-5 h-5 text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">No employees found matching your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}

