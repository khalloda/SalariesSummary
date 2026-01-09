import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { SalaryFormSchema } from '../validation/salaries';

interface Salary {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  monthName: string;
  basicSalary: number;
  directAdditions: number;
  indirectAdditions: number;
  yearlyIncrease: number;
  bonuses: number;
  salaryDeductions: number;
  grossDeductions: number;
  gross: number;
  net: number;
  additionsBreakdown: string | null;
  deductionsBreakdown: string | null;
  paymentMethod: string | null;
  accountNumber: string | null;
  notes: string | null;
  category: string | null;
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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function SalaryManagement() {
  const { t } = useTranslation();
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingSalary, setEditingSalary] = useState<Salary | null>(null);
  const [formData, setFormData] = useState<Partial<Salary & {
    // Additions breakdown fields
    phoneAllowance: number;
    transportationAllowance: number;
    accommodationAllowance: number;
    annualBonus: number;
    monthlyBonus: number;
    socialInsurance: number;
    taxes: number;
    medicalInsurance: number;
    otherAllowances: number;
    // Deductions breakdown fields
    medicalInsuranceDeducted: number;
    lawyersTaxes: number;
    otherBankWithdrawal: number;
    loansDeductions: number;
    phoneDeduction: number;
    unpaidVacation: number;
    lateArrivals: number;
    timeSheetDeductions: number;
    otherDeductions: number;
  }>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchSalaries();
    fetchEmployees();
  }, []);

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/salaries`);
      setSalaries(response.data.salaries || []);
    } catch (error) {
      console.error('Error fetching salaries:', error);
      alert(t('failedToLoad') + ' ' + t('salary').toLowerCase());
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
    setEditingSalary(null);
    setFormData({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      basicSalary: 0,
      directAdditions: 0,
      indirectAdditions: 0,
      yearlyIncrease: 0,
      bonuses: 0,
      salaryDeductions: 0,
      grossDeductions: 0,
      gross: 0,
      net: 0,
      // Initialize breakdown fields
      phoneAllowance: 0,
      transportationAllowance: 0,
      accommodationAllowance: 0,
      annualBonus: 0,
      monthlyBonus: 0,
      socialInsurance: 0,
      taxes: 0,
      medicalInsurance: 0,
      otherAllowances: 0,
      medicalInsuranceDeducted: 0,
      lawyersTaxes: 0,
      otherBankWithdrawal: 0,
      loansDeductions: 0,
      phoneDeduction: 0,
      unpaidVacation: 0,
      lateArrivals: 0,
      timeSheetDeductions: 0,
      otherDeductions: 0
    });
    setShowForm(true);
  };

  const handleEdit = (salary: Salary) => {
    setEditingSalary(salary);
    // Parse breakdown JSON if exists
    let additionsBreakdown: any = {};
    let deductionsBreakdown: any = {};
    
    if (salary.additionsBreakdown) {
      try {
        additionsBreakdown = JSON.parse(salary.additionsBreakdown);
      } catch (e) {
        console.error('Error parsing additions breakdown:', e);
      }
    }
    
    if (salary.deductionsBreakdown) {
      try {
        deductionsBreakdown = JSON.parse(salary.deductionsBreakdown);
      } catch (e) {
        console.error('Error parsing deductions breakdown:', e);
      }
    }
    
    setFormData({
      ...salary,
      // Map breakdown fields
      phoneAllowance: additionsBreakdown.phoneAllowance || 0,
      transportationAllowance: additionsBreakdown.transportationAllowance || 0,
      accommodationAllowance: additionsBreakdown.accommodationAllowance || 0,
      annualBonus: additionsBreakdown.annualBonus || 0,
      monthlyBonus: additionsBreakdown.monthlyBonus || 0,
      socialInsurance: additionsBreakdown.socialInsurance || 0,
      taxes: additionsBreakdown.taxes || 0,
      medicalInsurance: additionsBreakdown.medicalInsurance || 0,
      otherAllowances: additionsBreakdown.otherAllowances || 0,
      medicalInsuranceDeducted: deductionsBreakdown.medicalInsuranceDeducted || 0,
      lawyersTaxes: deductionsBreakdown.lawyersTaxes || 0,
      otherBankWithdrawal: deductionsBreakdown.otherBankWithdrawal || 0,
      loansDeductions: deductionsBreakdown.loansDeductions || 0,
      phoneDeduction: deductionsBreakdown.phoneDeduction || 0,
      unpaidVacation: deductionsBreakdown.unpaidVacation || 0,
      lateArrivals: deductionsBreakdown.lateArrivals || 0,
      timeSheetDeductions: deductionsBreakdown.timeSheetDeductions || 0,
      otherDeductions: deductionsBreakdown.otherDeductions || 0
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteSalaryConfirm'))) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/salaries/${id}`);
      alert(t('salaryDeleted'));
      fetchSalaries();
    } catch (error: any) {
      alert(`${t('failedToDelete')} ${t('salary').toLowerCase()}: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const parseResult = SalaryFormSchema.safeParse({
        employeeId: formData.employeeId ?? '',
        year: formData.year ?? '',
        month: formData.month ?? '',
        category: formData.category ?? '',
        basicSalary: formData.basicSalary ?? 0,
        phoneAllowance: formData.phoneAllowance ?? 0,
        transportationAllowance: formData.transportationAllowance ?? 0,
        accommodationAllowance: formData.accommodationAllowance ?? 0,
        otherAllowances: formData.otherAllowances ?? 0,
        yearlyIncrease: formData.yearlyIncrease ?? 0,
        socialInsurance: formData.socialInsurance ?? 0,
        taxes: formData.taxes ?? 0,
        medicalInsurance: formData.medicalInsurance ?? 0,
        annualBonus: formData.annualBonus ?? 0,
        monthlyBonus: formData.monthlyBonus ?? 0,
        medicalInsuranceDeducted: formData.medicalInsuranceDeducted ?? 0,
        lawyersTaxes: formData.lawyersTaxes ?? 0,
        otherBankWithdrawal: formData.otherBankWithdrawal ?? 0,
        loansDeductions: formData.loansDeductions ?? 0,
        phoneDeduction: formData.phoneDeduction ?? 0,
        unpaidVacation: formData.unpaidVacation ?? 0,
        lateArrivals: formData.lateArrivals ?? 0,
        timeSheetDeductions: formData.timeSheetDeductions ?? 0,
        otherDeductions: formData.otherDeductions ?? 0,
      });

      if (!parseResult.success) {
        const message =
          parseResult.error.errors
            .map((err) => err.message)
            .join('\n') || 'Validation error';
        setFormError(message);
        setSaving(false);
        return;
      }

      const data = parseResult.data;

      // Extract breakdown values
      const phoneAllowance = data.phoneAllowance ?? 0;
      const transportationAllowance = data.transportationAllowance ?? 0;
      const accommodationAllowance = data.accommodationAllowance ?? 0;
      const annualBonus = data.annualBonus ?? 0;
      const monthlyBonus = data.monthlyBonus ?? 0;
      const socialInsurance = data.socialInsurance ?? 0;
      const taxes = data.taxes ?? 0;
      const medicalInsurance = data.medicalInsurance ?? 0;
      const otherAllowances = data.otherAllowances ?? 0;
      
      const medicalInsuranceDeducted = data.medicalInsuranceDeducted ?? 0;
      const lawyersTaxes = data.lawyersTaxes ?? 0;
      const otherBankWithdrawal = data.otherBankWithdrawal ?? 0;
      const loansDeductions = data.loansDeductions ?? 0;
      const phoneDeduction = data.phoneDeduction ?? 0;
      const unpaidVacation = data.unpaidVacation ?? 0;
      const lateArrivals = data.lateArrivals ?? 0;
      const timeSheetDeductions = data.timeSheetDeductions ?? 0;
      const otherDeductions = data.otherDeductions ?? 0;

      // Calculate totals using formulas from Excel sheets
      // Direct Additions = Phone Allowance + Transportation + Accommodation + Other Allowances
      const directAdditions = phoneAllowance + transportationAllowance + accommodationAllowance + otherAllowances;
      
      // Indirect Additions = Social Insurance + Taxes + Medical Insurance
      const indirectAdditions = socialInsurance + taxes + medicalInsurance;
      
      // Bonuses = Annual Bonus + Monthly Bonus
      const bonuses = annualBonus + monthlyBonus;
      
      // Yearly Increase (from additions sheet)
      const yearlyIncrease = data.yearlyIncrease ?? 0;
      
      // Gross Deductions = Medical Insurance Deducted + Lawyers Taxes
      const grossDeductions = medicalInsuranceDeducted + lawyersTaxes;
      
      // Salary Deductions = Other Bank + Loans + Phone Deduction + Unpaid Vacation + Late + Time Sheet + Other Deductions
      const salaryDeductions = otherBankWithdrawal + loansDeductions + phoneDeduction + unpaidVacation + lateArrivals + timeSheetDeductions + otherDeductions;
      
      // Basic Salary
      const basicSalary = data.basicSalary ?? 0;
      
      // Gross = Basic Salary + Indirect Additions + Direct Additions + Yearly Increase + Bonuses
      const gross = basicSalary + indirectAdditions + directAdditions + yearlyIncrease + bonuses;
      
      // Net = Gross - Salary Deductions - Gross Deductions
      const net = gross - salaryDeductions - grossDeductions;

      // Build breakdown objects
      const additionsBreakdown: any = {};
      if (phoneAllowance > 0) additionsBreakdown.phoneAllowance = phoneAllowance;
      if (transportationAllowance > 0) additionsBreakdown.transportationAllowance = transportationAllowance;
      if (accommodationAllowance > 0) additionsBreakdown.accommodationAllowance = accommodationAllowance;
      if (yearlyIncrease > 0) additionsBreakdown.yearlyIncrease = yearlyIncrease;
      if (annualBonus > 0) additionsBreakdown.annualBonus = annualBonus;
      if (monthlyBonus > 0) additionsBreakdown.monthlyBonus = monthlyBonus;
      if (socialInsurance > 0) additionsBreakdown.socialInsurance = socialInsurance;
      if (taxes > 0) additionsBreakdown.taxes = taxes;
      if (medicalInsurance > 0) additionsBreakdown.medicalInsurance = medicalInsurance;
      if (otherAllowances > 0) additionsBreakdown.otherAllowances = otherAllowances;

      const deductionsBreakdown: any = {};
      if (medicalInsuranceDeducted > 0) deductionsBreakdown.medicalInsuranceDeducted = medicalInsuranceDeducted;
      if (lawyersTaxes > 0) deductionsBreakdown.lawyersTaxes = lawyersTaxes;
      if (otherBankWithdrawal > 0) deductionsBreakdown.otherBankWithdrawal = otherBankWithdrawal;
      if (loansDeductions > 0) deductionsBreakdown.loansDeductions = loansDeductions;
      if (phoneDeduction > 0) deductionsBreakdown.phoneDeduction = phoneDeduction;
      if (unpaidVacation > 0) deductionsBreakdown.unpaidVacation = unpaidVacation;
      if (lateArrivals > 0) deductionsBreakdown.lateArrivals = lateArrivals;
      if (timeSheetDeductions > 0) deductionsBreakdown.timeSheetDeductions = timeSheetDeductions;
      if (otherDeductions > 0) deductionsBreakdown.otherDeductions = otherDeductions;

      const submitData = {
        employeeId: data.employeeId,
        year: data.year,
        month: data.month,
        monthName: MONTHS[(data.month || 1) - 1],
        basicSalary,
        directAdditions,
        indirectAdditions,
        yearlyIncrease,
        bonuses,
        salaryDeductions,
        grossDeductions,
        gross,
        net,
        additionsBreakdown: Object.keys(additionsBreakdown).length > 0 ? additionsBreakdown : null,
        deductionsBreakdown: Object.keys(deductionsBreakdown).length > 0 ? deductionsBreakdown : null,
        paymentMethod: formData.paymentMethod,
        accountNumber: formData.accountNumber,
        notes: formData.notes,
        category: data.category,
        sourceFile: formData.sourceFile || 'Manual Entry'
      };

      if (editingSalary) {
        await axios.put(`${API_BASE_URL}/salaries/${editingSalary.id}`, submitData);
        alert(t('salaryUpdated'));
      } else {
        await axios.post(`${API_BASE_URL}/salaries`, submitData);
        alert(t('salaryCreated'));
      }
      setShowForm(false);
      setFormData({});
      fetchSalaries();
    } catch (error: any) {
      alert(`${t('failedToSave')} ${t('salary').toLowerCase()}: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filtered = salaries.filter(s => {
    const matchesSearch = 
      (s.employee?.name && s.employee.name.toLowerCase().includes(search.toLowerCase())) ||
      (s.employee?.employeeCode && s.employee.employeeCode.toLowerCase().includes(search.toLowerCase()));
    const matchesEmployee = employeeFilter === 'all' || s.employeeId === employeeFilter;
    const matchesYear = yearFilter === 'all' || s.year.toString() === yearFilter;
    return matchesSearch && matchesEmployee && matchesYear;
  });

  const availableYears = Array.from(new Set(salaries.map(s => s.year))).sort((a, b) => b - a);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading salaries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Salary Management</h1>
            <p className="text-gray-600">Manage employee salary records</p>
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + New Salary Record
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

        {/* Salary List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Basic</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(salary => (
                  <tr key={salary.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {salary.employee?.name || 'Unknown'}
                      </div>
                      {salary.employee?.employeeCode && (
                        <div className="text-sm text-gray-500">{salary.employee.employeeCode}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{salary.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{salary.monthName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {salary.basicSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {salary.gross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-blue-600">
                      {salary.net.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(salary)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(salary.id)}
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
              <p className="text-gray-500">No salary records found</p>
            </div>
          )}
        </div>

        {/* Create/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingSalary ? 'Edit Salary Record' : 'Create New Salary Record'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setFormData({});
                    setEditingSalary(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                {formError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded whitespace-pre-line">
                    {formError}
                  </div>
                )}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Month *</label>
                    <select
                      required
                      value={formData.month || ''}
                      onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {MONTHS.map((month, idx) => (
                        <option key={idx + 1} value={idx + 1}>{month}</option>
                      ))}
                    </select>
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

                  {/* Basic Salary from مرتبات sheet */}
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Salary (from مرتبات sheet)</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.basicSalary || 0}
                      onChange={(e) => setFormData({ ...formData, basicSalary: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Additions from اضافات sheet */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Additions (from اضافات sheet)</h3>
                  </div>
                  <div className="md:col-span-2">
                    <h4 className="text-md font-medium text-gray-700 mb-2">Direct Additions (affect salary)</h4>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Allowance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.phoneAllowance || 0}
                      onChange={(e) => setFormData({ ...formData, phoneAllowance: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transportation</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.transportationAllowance || 0}
                      onChange={(e) => setFormData({ ...formData, transportationAllowance: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Accommodation</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.accommodationAllowance || 0}
                      onChange={(e) => setFormData({ ...formData, accommodationAllowance: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Allowances</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.otherAllowances || 0}
                      onChange={(e) => setFormData({ ...formData, otherAllowances: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Increase</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.yearlyIncrease || 0}
                      onChange={(e) => setFormData({ ...formData, yearlyIncrease: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Direct Additions Total (Auto)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={(() => {
                        const phone = parseFloat(String(formData.phoneAllowance || 0));
                        const transport = parseFloat(String(formData.transportationAllowance || 0));
                        const accommodation = parseFloat(String(formData.accommodationAllowance || 0));
                        const other = parseFloat(String(formData.otherAllowances || 0));
                        return phone + transport + accommodation + other;
                      })()}
                      readOnly
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 font-semibold"
                    />
                  </div>

                  <div className="md:col-span-2 mt-4">
                    <h4 className="text-md font-medium text-gray-700 mb-2">Indirect Additions (affect gross only)</h4>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Social Insurance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.socialInsurance || 0}
                      onChange={(e) => setFormData({ ...formData, socialInsurance: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Taxes</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.taxes || 0}
                      onChange={(e) => setFormData({ ...formData, taxes: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medical Insurance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.medicalInsurance || 0}
                      onChange={(e) => setFormData({ ...formData, medicalInsurance: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Indirect Additions Total (Auto)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={(() => {
                        const social = parseFloat(String(formData.socialInsurance || 0));
                        const tax = parseFloat(String(formData.taxes || 0));
                        const medical = parseFloat(String(formData.medicalInsurance || 0));
                        return social + tax + medical;
                      })()}
                      readOnly
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 font-semibold"
                    />
                  </div>

                  <div className="md:col-span-2 mt-4">
                    <h4 className="text-md font-medium text-gray-700 mb-2">Bonuses</h4>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Annual Bonus</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.annualBonus || 0}
                      onChange={(e) => setFormData({ ...formData, annualBonus: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Bonus</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.monthlyBonus || 0}
                      onChange={(e) => setFormData({ ...formData, monthlyBonus: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bonuses Total (Auto)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={(() => {
                        const annual = parseFloat(String(formData.annualBonus || 0));
                        const monthly = parseFloat(String(formData.monthlyBonus || 0));
                        return annual + monthly;
                      })()}
                      readOnly
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 font-semibold"
                    />
                  </div>

                  {/* Deductions from خصومات sheet */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Deductions (from خصومات sheet)</h3>
                  </div>
                  <div className="md:col-span-2">
                    <h4 className="text-md font-medium text-gray-700 mb-2">Gross Deductions (from gross only)</h4>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medical Insurance Deducted</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.medicalInsuranceDeducted || 0}
                      onChange={(e) => setFormData({ ...formData, medicalInsuranceDeducted: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lawyers Taxes</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.lawyersTaxes || 0}
                      onChange={(e) => setFormData({ ...formData, lawyersTaxes: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gross Deductions Total (Auto)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={(() => {
                        const medical = parseFloat(String(formData.medicalInsuranceDeducted || 0));
                        const lawyers = parseFloat(String(formData.lawyersTaxes || 0));
                        return medical + lawyers;
                      })()}
                      readOnly
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 font-semibold"
                    />
                  </div>

                  <div className="md:col-span-2 mt-4">
                    <h4 className="text-md font-medium text-gray-700 mb-2">Salary Deductions (from salary)</h4>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Bank Withdrawal</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.otherBankWithdrawal || 0}
                      onChange={(e) => setFormData({ ...formData, otherBankWithdrawal: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loans / Deductions</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.loansDeductions || 0}
                      onChange={(e) => setFormData({ ...formData, loansDeductions: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Deduction</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.phoneDeduction || 0}
                      onChange={(e) => setFormData({ ...formData, phoneDeduction: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unpaid Vacation</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.unpaidVacation || 0}
                      onChange={(e) => setFormData({ ...formData, unpaidVacation: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Late Arrivals</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.lateArrivals || 0}
                      onChange={(e) => setFormData({ ...formData, lateArrivals: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Sheet Deductions</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.timeSheetDeductions || 0}
                      onChange={(e) => setFormData({ ...formData, timeSheetDeductions: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Deductions</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.otherDeductions || 0}
                      onChange={(e) => setFormData({ ...formData, otherDeductions: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salary Deductions Total (Auto)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={(() => {
                        const otherBank = parseFloat(String(formData.otherBankWithdrawal || 0));
                        const loans = parseFloat(String(formData.loansDeductions || 0));
                        const phone = parseFloat(String(formData.phoneDeduction || 0));
                        const vacation = parseFloat(String(formData.unpaidVacation || 0));
                        const late = parseFloat(String(formData.lateArrivals || 0));
                        const timesheet = parseFloat(String(formData.timeSheetDeductions || 0));
                        const other = parseFloat(String(formData.otherDeductions || 0));
                        return otherBank + loans + phone + vacation + late + timesheet + other;
                      })()}
                      readOnly
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 font-semibold"
                    />
                  </div>

                  {/* Calculated Totals */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Calculated Totals</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gross (Auto-calculated)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={(() => {
                        const basic = parseFloat(String(formData.basicSalary || 0));
                        const phone = parseFloat(String(formData.phoneAllowance || 0));
                        const transport = parseFloat(String(formData.transportationAllowance || 0));
                        const accommodation = parseFloat(String(formData.accommodationAllowance || 0));
                        const other = parseFloat(String(formData.otherAllowances || 0));
                        const direct = phone + transport + accommodation + other;
                        const social = parseFloat(String(formData.socialInsurance || 0));
                        const tax = parseFloat(String(formData.taxes || 0));
                        const medical = parseFloat(String(formData.medicalInsurance || 0));
                        const indirect = social + tax + medical;
                        const yearly = parseFloat(String(formData.yearlyIncrease || 0));
                        const annual = parseFloat(String(formData.annualBonus || 0));
                        const monthly = parseFloat(String(formData.monthlyBonus || 0));
                        const bonuses = annual + monthly;
                        return basic + indirect + direct + yearly + bonuses;
                      })()}
                      readOnly
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-blue-50 font-bold text-blue-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Net (Auto-calculated)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={(() => {
                        const basic = parseFloat(String(formData.basicSalary || 0));
                        const phone = parseFloat(String(formData.phoneAllowance || 0));
                        const transport = parseFloat(String(formData.transportationAllowance || 0));
                        const accommodation = parseFloat(String(formData.accommodationAllowance || 0));
                        const other = parseFloat(String(formData.otherAllowances || 0));
                        const direct = phone + transport + accommodation + other;
                        const social = parseFloat(String(formData.socialInsurance || 0));
                        const tax = parseFloat(String(formData.taxes || 0));
                        const medical = parseFloat(String(formData.medicalInsurance || 0));
                        const indirect = social + tax + medical;
                        const yearly = parseFloat(String(formData.yearlyIncrease || 0));
                        const annual = parseFloat(String(formData.annualBonus || 0));
                        const monthly = parseFloat(String(formData.monthlyBonus || 0));
                        const bonuses = annual + monthly;
                        const gross = basic + indirect + direct + yearly + bonuses;
                        const medicalDed = parseFloat(String(formData.medicalInsuranceDeducted || 0));
                        const lawyers = parseFloat(String(formData.lawyersTaxes || 0));
                        const grossDed = medicalDed + lawyers;
                        const otherBank = parseFloat(String(formData.otherBankWithdrawal || 0));
                        const loans = parseFloat(String(formData.loansDeductions || 0));
                        const phoneDed = parseFloat(String(formData.phoneDeduction || 0));
                        const vacation = parseFloat(String(formData.unpaidVacation || 0));
                        const late = parseFloat(String(formData.lateArrivals || 0));
                        const timesheet = parseFloat(String(formData.timeSheetDeductions || 0));
                        const otherDed = parseFloat(String(formData.otherDeductions || 0));
                        const salaryDed = otherBank + loans + phoneDed + vacation + late + timesheet + otherDed;
                        return gross - salaryDed - grossDed;
                      })()}
                      readOnly
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-green-50 font-bold text-green-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <input
                      type="text"
                      value={formData.paymentMethod || ''}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={formData.accountNumber || ''}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
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
                      setEditingSalary(null);
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
                    {saving ? 'Saving...' : editingSalary ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}

