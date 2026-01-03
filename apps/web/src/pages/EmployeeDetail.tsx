import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import PersonnelEditModal from '../components/PersonnelEditModal';

interface ContractRecord {
  id: string;
  contractDate: string | null;
  contractDuration: string | null;
  comments: string | null;
  employeeName: string | null;
  employeeCode: string | null;
}

export interface PersonnelRecord {
  id: string;
  criminalRecord: string | null;
  militaryCertificate: string | null;
  idCopy: boolean | null;
  educationCertificate: string | null;
  birthCertificate: string | null;
  recommendationLetter: boolean | null;
  personalPhotos: boolean | null;
  taxCard: boolean | null;
  associationId: boolean | null;
  form6: string | null;
  laptopPcTablet: string | null; // JSON array string: ["Laptop", "PC", "Tablet"]
  workStub: string | null;
  insuranceStartDate: string | null;
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
  personnelRecord: PersonnelRecord | null;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'personnel'>('overview');
  const [editingPersonnel, setEditingPersonnel] = useState(false);
  const [personnelFormData, setPersonnelFormData] = useState<Partial<PersonnelRecord>>({});
  const [savingPersonnel, setSavingPersonnel] = useState(false);

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

  const handleSavePersonnel = async () => {
    if (!employee) return;
    
    setSavingPersonnel(true);
    try {
      await axios.put(`${API_BASE_URL}/personnel/employee/${employee.id}`, personnelFormData);
      alert('Personnel data updated successfully');
      setEditingPersonnel(false);
      fetchEmployee(); // Refresh employee data
    } catch (err: any) {
      console.error('Error saving personnel data:', err);
      alert(`Failed to save personnel data: ${err.response?.data?.error || err.message}`);
    } finally {
      setSavingPersonnel(false);
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
                  onClick={() => navigate(`/manage/employees?editId=${employee.id}`)}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Employee
                </button>
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

        {/* Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('personnel')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'personnel'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Personnel
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
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
      </>
        )}

        {activeTab === 'personnel' && employee.personnelRecord && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Personnel Information</h2>
              <button
                onClick={() => {
                  setPersonnelFormData(employee.personnelRecord!);
                  setEditingPersonnel(true);
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Personnel Data
              </button>
            </div>
            
            {/* Document Checklist */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Document Checklist</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Criminal Record', value: employee.personnelRecord.criminalRecord, type: 'status' },
                  { label: 'Military Certificate', value: employee.personnelRecord.militaryCertificate, type: 'document' },
                  { label: 'ID Copy', value: employee.personnelRecord.idCopy ? 'Present' : 'Missing', type: 'status' },
                  { label: 'Education Certificate', value: employee.personnelRecord.educationCertificate, type: 'document' },
                  { label: 'Birth Certificate', value: employee.personnelRecord.birthCertificate, type: 'document' },
                  { label: 'Recommendation Letter', value: employee.personnelRecord.recommendationLetter ? 'Present' : 'Missing', type: 'status' },
                  { label: 'Personal Photos', value: employee.personnelRecord.personalPhotos ? 'Present' : 'Missing', type: 'status' },
                  { label: 'Tax Card', value: employee.personnelRecord.taxCard ? 'Present' : 'Missing', type: 'status' },
                  { label: 'Association ID', value: employee.personnelRecord.associationId ? 'Present' : 'Missing', type: 'status' },
                  { label: 'Form 6', value: employee.personnelRecord.form6 || 'N/A', type: 'text' },
                  { label: 'Work Stub', value: employee.personnelRecord.workStub || 'N/A', type: 'text' }
                ].map((doc, idx) => {
                  const getStatusColor = (value: string | null) => {
                    if (!value || value === 'N/A') return 'text-gray-500';
                    if (value === 'Present' || value === 'Copy' || value === 'Original') return 'text-green-600';
                    if (value === 'Missing') return 'text-red-600';
                    return 'text-gray-600';
                  };

                  const getStatusIcon = (value: string | null) => {
                    if (!value || value === 'N/A') return '−';
                    if (value === 'Present' || value === 'Copy' || value === 'Original') return '✓';
                    if (value === 'Missing') return '✗';
                    return '';
                  };

                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-gray-700 font-medium">{doc.label}:</span>
                      <span className={`font-semibold ${getStatusColor(doc.value)}`}>
                        {getStatusIcon(doc.value)} {doc.value || 'N/A'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Asset Information */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Asset Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex flex-col gap-2">
                    <span className="text-gray-700 font-medium">Laptop / PC / Tablet:</span>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        try {
                          const assets = employee.personnelRecord.laptopPcTablet 
                            ? JSON.parse(employee.personnelRecord.laptopPcTablet)
                            : [];
                          if (Array.isArray(assets) && assets.length > 0) {
                            return assets.map((asset: string, idx: number) => (
                              <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                                {asset}
                              </span>
                            ));
                          }
                        } catch {
                          // If not JSON, treat as single value
                          if (employee.personnelRecord.laptopPcTablet && employee.personnelRecord.laptopPcTablet !== 'None') {
                            return (
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                                {employee.personnelRecord.laptopPcTablet}
                              </span>
                            );
                          }
                        }
                        return <span className="text-gray-500 italic">None</span>;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Insurance Start Date:</span>
                    <span className="font-semibold text-blue-700">
                      {formatDate(employee.personnelRecord.insuranceStartDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Summary */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Compliance Summary</h3>
              {(() => {
                const pr = employee.personnelRecord;
                const documents = [
                  { name: 'Criminal Record', status: pr.criminalRecord },
                  { name: 'Military Certificate', status: pr.militaryCertificate },
                  { name: 'ID Copy', status: pr.idCopy ? 'Present' : 'Missing' },
                  { name: 'Education Certificate', status: pr.educationCertificate },
                  { name: 'Birth Certificate', status: pr.birthCertificate },
                  { name: 'Recommendation Letter', status: pr.recommendationLetter ? 'Present' : 'Missing' },
                  { name: 'Personal Photos', status: pr.personalPhotos ? 'Present' : 'Missing' },
                  { name: 'Tax Card', status: pr.taxCard ? 'Present' : 'Missing' },
                  { name: 'Association ID', status: pr.associationId ? 'Present' : 'Missing' }
                ];

                const completed = documents.filter(doc => {
                  const status = doc.status;
                  return status === 'Present' || status === 'Copy' || status === 'Original';
                }).length;

                const applicable = documents.filter(doc => {
                  const status = doc.status;
                  return status !== 'N/A' && status !== null;
                }).length;

                const compliancePercentage = applicable > 0 ? Math.round((completed / applicable) * 100) : 0;
                const missingDocuments = documents
                  .filter(doc => doc.status === 'Missing' || doc.status === null)
                  .map(doc => doc.name);

                const getComplianceColor = (percentage: number) => {
                  if (percentage >= 90) return 'bg-green-100 border-green-300 text-green-800';
                  if (percentage >= 70) return 'bg-yellow-100 border-yellow-300 text-yellow-800';
                  return 'bg-red-100 border-red-300 text-red-800';
                };

                return (
                  <div className={`p-6 rounded-lg border-2 ${getComplianceColor(compliancePercentage)}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-semibold">Compliance Percentage:</span>
                      <span className="text-3xl font-bold">{compliancePercentage}%</span>
                    </div>
                    <div className="text-sm">
                      <p className="mb-2">
                        <strong>Completed:</strong> {completed} of {applicable} applicable documents
                      </p>
                      {missingDocuments.length > 0 && (
                        <div>
                          <strong>Missing Documents:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {missingDocuments.map((doc, idx) => (
                              <li key={idx}>{doc}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'personnel' && !employee.personnelRecord && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-gray-500 text-lg">No personnel record found for this employee.</p>
            <p className="text-gray-400 text-sm mt-2">Please import personnel data from the Personnel sheet.</p>
          </div>
        )}

        {/* Personnel Edit Modal */}
        {employee && (
          <PersonnelEditModal
            employee={employee}
            personnelFormData={personnelFormData}
            setPersonnelFormData={setPersonnelFormData}
            editingPersonnel={editingPersonnel}
            setEditingPersonnel={setEditingPersonnel}
            savingPersonnel={savingPersonnel}
            handleSavePersonnel={handleSavePersonnel}
          />
        )}
      </div>
    </div>
  );
}

