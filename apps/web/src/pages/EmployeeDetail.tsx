import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  if (!dateString) return 'Not Specified';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return 'Not Specified';
  }
}

function formatLargeNumber(value: string | null | undefined): string {
  if (!value) return 'N/A';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return value;
  // Return number without commas for ID numbers
  return num.toString();
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

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchEmployee();
    }
  }, [id]);

  const fetchEmployee = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/employees/${id}/details`);
      setEmployee(response.data);
    } catch (err: any) {
      console.error('Error fetching employee:', err);
      setError(err.response?.data?.error || 'Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

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

  if (error || !employee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'Employee not found'}</p>
          <button
            onClick={() => navigate('/employees')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Employees
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/employees')}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Employees
          </button>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {employee.name}
                </h1>
                {employee.nameArabic && (
                  <p className="text-xl text-gray-600 mb-4">{employee.nameArabic}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {employee.employeeCode && (
                    <span><strong>System ID:</strong> {employee.employeeCode}</span>
                  )}
                  {employee.category && (
                    <span><strong>Category:</strong> {employee.category}</span>
                  )}
                  {employee.status && (
                    <span className={`font-medium ${employee.status === 'Resigned' ? 'text-red-600' : 'text-green-600'}`}>
                      <strong>Status:</strong> {employee.status}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/employees/${employee.id}/annual?year=${new Date().getFullYear()}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Annual Report
                </button>
                <button
                  onClick={() => navigate(`/employees/${employee.id}/bonus?year=${new Date().getFullYear()}`)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Bonus Report
                </button>
                <button
                  onClick={() => navigate(`/reports/employee-card?employeeId=${employee.id}`)}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Employee Card
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Basic Information
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">System ID:</span>
                <span className="font-medium text-gray-900">{employee.employeeCode || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Category:</span>
                <span className="font-medium text-gray-900">{employee.category || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Job Title:</span>
                <span className="font-medium text-gray-900">{employee.jobTitle || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Department:</span>
                <span className="font-medium text-gray-900">{employee.department || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Date of Birth:</span>
                <span className="font-medium text-gray-900">{formatDate(employee.dateOfBirth)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Joining Date:</span>
                <span className="font-medium text-gray-900">{formatDate(employee.joiningDate)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Work Duration:</span>
                <span className="font-medium text-blue-600">{calculateWorkDuration(employee.joiningDate)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${employee.status === 'Resigned' ? 'text-red-600' : 'text-green-600'}`}>
                  {employee.status || 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Education */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Education
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Certificate:</span>
                <span className="font-medium text-gray-900">{employee.graduationCertificate || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Section:</span>
                <span className="font-medium text-gray-900">{employee.graduationSection || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">University:</span>
                <span className="font-medium text-gray-900">{employee.graduationUniversity || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Graduation Year:</span>
                <span className="font-medium text-gray-900">{employee.graduationYear || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Identification */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Identification
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">National ID:</span>
                <span className="font-medium text-gray-900">{formatLargeNumber(employee.nationalId)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Valid Till:</span>
                <span className="font-medium text-gray-900">{formatDate(employee.nationalIdValidTill)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Bar Association:</span>
                <span className="font-medium text-gray-900">{formatLargeNumber(employee.barAssociation)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">درجة القيد:</span>
                <span className="font-medium text-gray-900">{employee.barAssociationDegree || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Tax Card:</span>
                <span className="font-medium text-gray-900">{employee.taxCard || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Social Insurance:</span>
                <span className="font-medium text-gray-900">{formatLargeNumber(employee.socialInsurance)}</span>
              </div>
            </div>
          </div>

          {/* Contact & Address */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Contact & Address
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Mobile Number:</span>
                <span className="font-medium text-gray-900">{employee.mobileNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Extension:</span>
                <span className="font-medium text-gray-900">{employee.extension || 'N/A'}</span>
              </div>
              <div className="py-2 border-b border-gray-100">
                <span className="text-gray-600 block mb-1">Address:</span>
                <span className="font-medium text-gray-900">
                  {employee.address || 'N/A'}
                  {employee.addressRegion && `, ${employee.addressRegion}`}
                  {employee.addressGovernorate && `, ${employee.addressGovernorate}`}
                </span>
              </div>
            </div>
          </div>

          {/* Current Contract */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Current Contract
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Contract Type:</span>
                <span className="font-medium text-gray-900">{employee.contractType || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium text-gray-900">{employee.contractDuration || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Next Renewal:</span>
                <span className="font-medium text-green-700">{formatDate(employee.contractRenewalDate)}</span>
              </div>
            </div>
          </div>

          {/* Experience */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Experience
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">In (Years/Months):</span>
                <span className="font-medium text-gray-900">
                  {employee.experienceInYears || 0}Y {employee.experienceInMonths || 0}M
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Out (Years/Months):</span>
                <span className="font-medium text-gray-900">
                  {employee.experienceOutYears || 0}Y {employee.experienceOutMonths || 0}M
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Renewals History */}
        {employee.contractRecords && employee.contractRecords.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Contract Renewals History ({employee.contractRecords.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comments
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employee.contractRecords.map((contract, idx) => (
                    <tr key={contract.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatDate(contract.contractDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {contract.contractDuration || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {contract.comments || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Resignation Information */}
        {employee.resignationDate && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-800 mb-4">Resignation Information</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-red-700 font-medium">Resignation Date:</span>
                <span className="font-bold text-red-900">{formatDate(employee.resignationDate)}</span>
              </div>
              {employee.resignationReason && (
                <div>
                  <span className="text-red-700 font-medium">Reason:</span>
                  <span className="font-bold text-red-900 ml-2">{employee.resignationReason}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Salary Records</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{employee._count.salaries}</p>
              </div>
              <div className="text-blue-400">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Contract Records</p>
                <p className="text-3xl font-bold text-green-900 mt-2">{employee._count.contractRecords}</p>
              </div>
              <div className="text-green-400">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

