import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import Tooltip from '../components/Tooltip';
import { tooltips } from '../utils/tooltips';

const logo = '/logo.png';

interface Employee {
  id: string;
  name: string;
  nameArabic?: string;
  category?: string;
  employeeCode?: string;
  jobTitle?: string;
  department?: string;
  dateOfBirth?: string;
  joiningDate?: string;
  mobileNumber?: string;
  graduationCertificate?: string;
  graduationSection?: string;
  graduationUniversity?: string;
  graduationYear?: number;
  barAssociation?: string;
  barAssociationDegree?: string;
  taxCard?: string;
  socialInsurance?: string;
  nationalId?: string;
  nationalIdValidTill?: string;
  address?: string;
  addressRegion?: string;
  addressGovernorate?: string;
  contractType?: string;
  contractDuration?: string;
  contractRenewalDate?: string;
  salaries?: Array<{
    year: number;
    month: number;
    monthName: string;
    basicSalary: number;
    gross: number;
    net: number;
  }>;
  personnelRecord?: {
    criminalRecord?: string | null;
    militaryCertificate?: string | null;
    idCopy?: boolean | null;
    educationCertificate?: string | null;
    birthCertificate?: string | null;
    recommendationLetter?: boolean | null;
    personalPhotos?: boolean | null;
    taxCard?: boolean | null;
    associationId?: boolean | null;
    form6?: string | null;
    laptopPcTablet?: string | null;
    workStub?: string | null;
    insuranceStartDate?: string | null;
  } | null;
}

export default function EmployeeCard() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = employees.filter(emp => {
        const name = (emp.name || '').toLowerCase();
        const nameArabic = (emp.nameArabic || '').toLowerCase();
        const employeeCode = (emp.employeeCode || '').toLowerCase();
        const id = (emp.id || '').toLowerCase();
        return name.includes(term) || 
               nameArabic.includes(term) || 
               employeeCode.includes(term) ||
               id.includes(term);
      });
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/employees`);
      setEmployees(response.data);
      setFilteredEmployees(response.data);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      alert('Failed to load employees: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeDetails = async (employeeId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/employees/${employeeId}/card`);
      setSelectedEmployee(response.data);
    } catch (error: any) {
      console.error('Error fetching employee details:', error);
      alert('Failed to load employee details: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(null);
    fetchEmployeeDetails(employee.id);
  };

  const handleExportPDF = async () => {
    if (!selectedEmployee) return;
    
    setExporting(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/exports/employee-card/pdf`,
        { employeeId: selectedEmployee.id },
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeName = (selectedEmployee.name || 'Employee').replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '_').substring(0, 50);
      link.setAttribute('download', `Employee_Card_${safeName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF: ' + (error.response?.data?.error || error.message));
    } finally {
      setExporting(false);
    }
  };

  const handleExportXLSX = async () => {
    if (!selectedEmployee) return;
    
    setExporting(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/exports/employee-card/xlsx`,
        { employeeId: selectedEmployee.id },
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeName = (selectedEmployee.name || 'Employee').replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '_').substring(0, 50);
      link.setAttribute('download', `Employee_Card_${safeName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      console.error('XLSX export error:', error);
      alert('Failed to export XLSX: ' + (error.response?.data?.error || error.message));
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatDateOrNotSpecified = (date: string | null | undefined) => {
    if (!date) return t('notSpecified');
    const parsedDate = new Date(date);
    // Reject placeholder dates like January 1, 2000
    if (parsedDate.getFullYear() === 2000 && parsedDate.getMonth() === 0 && parsedDate.getDate() === 1) {
      return t('notSpecified');
    }
    if (isNaN(parsedDate.getTime())) return t('notSpecified');
    return parsedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '0.00';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatLargeNumber = (value: string | number | null | undefined) => {
    // Format ID numbers without commas
    if (!value && value !== 0) return 'N/A';
    
    // Convert to number if it's a string
    let num: number;
    if (typeof value === 'number') {
      num = value;
    } else {
      // Remove any existing commas from string
      const cleanStr = String(value).replace(/,/g, '');
      num = parseFloat(cleanStr);
      if (isNaN(num)) {
        // If it's not a valid number, return the original string without commas
        return cleanStr;
      }
    }
    
    // Always format without commas (useGrouping: false)
    return num.toLocaleString('en-US', { maximumFractionDigits: 0, useGrouping: false });
  };

  const calculateWorkDuration = (joiningDate: string | null | undefined) => {
    if (!joiningDate) return 'N/A';
    
    const start = new Date(joiningDate);
    const end = new Date();
    
    if (isNaN(start.getTime())) return 'N/A';
    
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();
    
    if (days < 0) {
      months--;
      const lastMonth = new Date(end.getFullYear(), end.getMonth(), 0);
      days += lastMonth.getDate();
    }
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    const parts: string[] = [];
    if (years > 0) parts.push(`${years} Year${years !== 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} Month${months !== 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} Day${days !== 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : 'Less than 1 day';
  };

  return (
    <div className="p-6">
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          nav {
            display: none !important;
          }
          header {
            display: none !important;
          }
        }
        .employee-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 1.5rem;
        }
        .employee-card-header.rtl {
          flex-direction: row-reverse;
        }
        .employee-card-header .logo-container {
          flex-shrink: 0;
        }
        .employee-card-header .title-container {
          flex: 1;
          text-align: center;
        }
      `}</style>
      
      {/* Custom Header */}
      <div className={`employee-card-header ${isRTL ? 'rtl' : ''}`}>
        <div className="logo-container">
          <img 
            src={logo} 
            alt="Logo" 
            className="h-10 w-auto"
          />
        </div>
        <div className="title-container">
          <h1 className="text-2xl font-bold text-gray-900">{t('employeeCard')}</h1>
        </div>
        <div className="logo-container">
          <div className="text-sm text-gray-600 text-right" style={isRTL ? { textAlign: 'left' } : { textAlign: 'right' }}>
            <div className="font-semibold">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div className="text-xs">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        
        {/* Search/Filter Section */}
        <div className="bg-white p-4 rounded-lg shadow mb-4 no-print">
          <label className="block text-sm font-medium mb-2">
            {t('searchEmployee')}
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('typeToSearch')}
            className="w-full border rounded px-3 py-2 mb-3"
          />
          
          {loading ? (
            <p className="text-gray-500">{t('loadingEmployees')}</p>
          ) : (
            <div className="max-h-60 overflow-y-auto border rounded">
              {filteredEmployees.length === 0 ? (
                <p className="p-3 text-gray-500 text-center">{t('noEmployeesFoundList')}</p>
              ) : (
                <ul className="divide-y">
                  {filteredEmployees.map(emp => (
                    <li
                      key={emp.id}
                      onClick={() => handleEmployeeSelect(emp)}
                      className={`p-3 cursor-pointer hover:bg-blue-50 ${
                        selectedEmployee?.id === emp.id ? 'bg-blue-100' : ''
                      }`}
                    >
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-sm text-gray-600">
                        {emp.employeeCode && `ID: ${emp.employeeCode} | `}
                        {emp.category && `Category: ${emp.category}`}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Export Buttons */}
        {selectedEmployee && (
          <div className="flex gap-2 mb-4 no-print">
            <Tooltip content={tooltips.reports.exportPDF}>
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {exporting ? t('loading') : t('exportPDF')}
              </button>
            </Tooltip>
            <Tooltip content={tooltips.reports.exportXLSX}>
              <button
                onClick={handleExportXLSX}
                disabled={exporting}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {exporting ? t('loading') : t('exportXLSX')}
              </button>
            </Tooltip>
            <Tooltip content={tooltips.reports.print}>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {t('print')}
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Employee Card Display */}
      {selectedEmployee ? (
        <div className="bg-white p-6 rounded-lg shadow print-container">
          {/* Top Box */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 rounded-lg mb-6 print-top-box">
            <div className="flex justify-between items-center mb-3">
              <div>
                <div className="text-xs opacity-90 mb-1 uppercase tracking-wide">{t('systemId')}</div>
                <div className="text-lg font-bold">{selectedEmployee.employeeCode || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs opacity-90 mb-1 uppercase tracking-wide">{t('category')}</div>
                <div className="text-lg font-bold">{selectedEmployee.category || 'N/A'}</div>
              </div>
            </div>
            <div className="text-center border-t border-purple-400 pt-3 mt-3">
              <div className="text-3xl font-bold">{selectedEmployee.name || 'N/A'}</div>
              {selectedEmployee.nameArabic && (
                <div className="text-xl mt-1 opacity-95">{selectedEmployee.nameArabic}</div>
              )}
            </div>
          </div>

          {/* Info Table */}
          <table className="w-full border-collapse mb-4 print-table">
            <tbody>
              {/* Basic Info */}
              <tr>
                <td className="w-48 p-3 border bg-gray-50 font-bold text-sm align-top">{t('basicInfo')}</td>
                <td className="p-3 border">
                  <div className="space-y-2">
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('name')}:</span> {selectedEmployee.name || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('nameArabic')}:</span> {selectedEmployee.nameArabic || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('joiningDate')}:</span> {formatDate(selectedEmployee.joiningDate)}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('jobTitle')}:</span> {selectedEmployee.jobTitle || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('department')}:</span> {selectedEmployee.department || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('dateOfBirth')}:</span> {formatDate(selectedEmployee.dateOfBirth)}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('mobileNumber')}:</span> {selectedEmployee.mobileNumber || 'N/A'}</div>
                  </div>
                </td>
              </tr>

              {/* Education */}
              <tr>
                <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('education')}</td>
                <td className="p-3 border">
                  <div className="space-y-2">
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('certificate')}:</span> {selectedEmployee.graduationCertificate || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('section')}:</span> {selectedEmployee.graduationSection || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('university')}:</span> {selectedEmployee.graduationUniversity || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('graduationYear')}:</span> {selectedEmployee.graduationYear || 'N/A'}</div>
                  </div>
                </td>
              </tr>

              {/* IDs */}
              <tr>
                <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('ids')}</td>
                <td className="p-3 border">
                  <div className="space-y-2">
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('nationalId')}:</span> {formatLargeNumber(selectedEmployee.nationalId)}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('nationalIdValidTill')}:</span> {formatDateOrNotSpecified(selectedEmployee.nationalIdValidTill)}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('barAssociationNo')}:</span> {formatLargeNumber(selectedEmployee.barAssociation)}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('barAssociationDegree')}:</span> {selectedEmployee.barAssociationDegree || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('taxCardNo')}:</span> {selectedEmployee.taxCard || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('socialInsurance')}:</span> {formatLargeNumber(selectedEmployee.socialInsurance)}</div>
                  </div>
                </td>
              </tr>

              {/* Address */}
              <tr>
                <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('address')}</td>
                <td className="p-3 border">
                  <div className="space-y-2">
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('addressDetails')}:</span> {selectedEmployee.address || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('regionCity')}:</span> {selectedEmployee.addressRegion || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('governorate')}:</span> {selectedEmployee.addressGovernorate || 'N/A'}</div>
                  </div>
                </td>
              </tr>

              {/* Contract */}
              <tr>
                <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('contract')}</td>
                <td className="p-3 border">
                  <div className="space-y-2">
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('contractType')}:</span> {selectedEmployee.contractType || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('workDuration')}:</span> {calculateWorkDuration(selectedEmployee.joiningDate)}</div>
                    <div><span className="font-semibold text-gray-600 w-32 inline-block">{t('nextRenewalDate')}:</span> {formatDateOrNotSpecified(selectedEmployee.contractRenewalDate)}</div>
                  </div>
                </td>
              </tr>

              {/* Salary */}
              <tr>
                <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('salary')}</td>
                <td className="p-3 border">
                  {selectedEmployee.salaries && selectedEmployee.salaries.length > 0 ? (
                    <table className="w-full border-collapse mt-2">
                      <thead>
                        <tr className="bg-purple-600 text-white">
                          <th className="p-2 text-left text-xs border">{t('month')}</th>
                          <th className="p-2 text-left text-xs border">{t('year')}</th>
                          <th className="p-2 text-left text-xs border">{t('basicSalary')}</th>
                          <th className="p-2 text-left text-xs border">{t('gross')}</th>
                          <th className="p-2 text-left text-xs border">{t('net')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEmployee.salaries.map((salary, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                            <td className="p-2 text-xs border">{salary.monthName || `${salary.month}/${salary.year}`}</td>
                            <td className="p-2 text-xs border">{salary.year}</td>
                            <td className="p-2 text-xs border">{formatCurrency(salary.basicSalary)}</td>
                            <td className="p-2 text-xs border">{formatCurrency(salary.gross)}</td>
                            <td className="p-2 text-xs border">{formatCurrency(salary.net)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <span className="text-gray-500 italic">{t('noData')}</span>
                  )}
                </td>
              </tr>

              {/* Personnel */}
              {selectedEmployee.personnelRecord && (
                <tr>
                  <td className="p-3 border bg-gray-50 font-bold text-sm align-top">{t('personnel')}</td>
                  <td className="p-3 border">
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="font-semibold text-gray-600">Criminal Record:</span> {selectedEmployee.personnelRecord.criminalRecord || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600">Military Certificate:</span> {selectedEmployee.personnelRecord.militaryCertificate || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600">ID Copy:</span> {selectedEmployee.personnelRecord.idCopy ? 'Present' : 'Missing'}</div>
                        <div><span className="font-semibold text-gray-600">Education Certificate:</span> {selectedEmployee.personnelRecord.educationCertificate || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600">Birth Certificate:</span> {selectedEmployee.personnelRecord.birthCertificate || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600">Recommendation Letter:</span> {selectedEmployee.personnelRecord.recommendationLetter ? 'Present' : 'Missing'}</div>
                        <div><span className="font-semibold text-gray-600">Personal Photos:</span> {selectedEmployee.personnelRecord.personalPhotos ? 'Present' : 'Missing'}</div>
                        <div><span className="font-semibold text-gray-600">Tax Card:</span> {selectedEmployee.personnelRecord.taxCard === null ? 'N/A' : (selectedEmployee.personnelRecord.taxCard ? 'Present' : 'Missing')}</div>
                        <div><span className="font-semibold text-gray-600">Association ID:</span> {selectedEmployee.personnelRecord.associationId === null ? 'N/A' : (selectedEmployee.personnelRecord.associationId ? 'Present' : 'Missing')}</div>
                        <div><span className="font-semibold text-gray-600">Form 6:</span> {selectedEmployee.personnelRecord.form6 || 'N/A'}</div>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div><span className="font-semibold text-gray-600 text-xs">Asset (Laptop/PC/Tablet):</span> 
                          {selectedEmployee.personnelRecord.laptopPcTablet ? (
                            (() => {
                              try {
                                const assets = JSON.parse(selectedEmployee.personnelRecord.laptopPcTablet);
                                return Array.isArray(assets) ? assets.join(', ') : selectedEmployee.personnelRecord.laptopPcTablet;
                              } catch {
                                return selectedEmployee.personnelRecord.laptopPcTablet;
                              }
                            })()
                          ) : t('none')}
                        </div>
                        <div><span className="font-semibold text-gray-600 text-xs">Work Stub:</span> {selectedEmployee.personnelRecord.workStub || 'N/A'}</div>
                        <div><span className="font-semibold text-gray-600 text-xs">Insurance Start Date:</span> {formatDateOrNotSpecified(selectedEmployee.personnelRecord.insuranceStartDate)}</div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
          Please select an employee from the list above
        </div>
      )}
    </div>
  );
}

