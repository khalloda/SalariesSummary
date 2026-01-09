import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { BulkSalaryMetaSchema } from '../validation/salaries';

interface EmployeeSalaryData {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  category: string;
  basicSalary: number;
  phoneAllowance: number;
  transportationAllowance: number;
  accommodationAllowance: number;
  otherAllowances: number;
  yearlyIncrease: number;
  annualBonus: number;
  monthlyBonus: number;
  socialInsurance: number;
  taxes: number;
  medicalInsurance: number;
  medicalInsuranceDeducted: number;
  lawyersTaxes: number;
  otherBankWithdrawal: number;
  loansDeductions: number;
  phoneDeduction: number;
  unpaidVacation: number;
  lateArrivals: number;
  timeSheetDeductions: number;
  otherDeductions: number;
  paymentMethod: string | null;
  accountNumber: string | null;
  notes: string | null;
}

const CATEGORIES = ['Partners/شركاء', 'Lawyers/محامين', 'Admins/عاملين', 'Consultants/مستشارين'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function BulkSalaryEntry() {
  const { t } = useTranslation();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [activeTab, setActiveTab] = useState<'salaries' | 'additions' | 'deductions'>('salaries');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Record<string, EmployeeSalaryData[]>>({});
  const [previousYear, setPreviousYear] = useState<number | null>(null);
  const [previousMonth, setPreviousMonth] = useState<number | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  const loadLastMonthData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/bulk-salary/last-month/${year}/${month}`);
      console.log('API Response:', response.data);
      
      // Ensure we have the employees object with all categories initialized
      const employeesData = response.data.employees || {};
      const initializedEmployees: Record<string, EmployeeSalaryData[]> = {
        'Partners/شركاء': employeesData['Partners/شركاء'] || [],
        'Lawyers/محامين': employeesData['Lawyers/محامين'] || [],
        'Admins/عاملين': employeesData['Admins/عاملين'] || [],
        'Consultants/مستشارين': employeesData['Consultants/مستشارين'] || []
      };
      
      const totalEmployees = Object.values(initializedEmployees).flat().length;
      console.log('Initialized employees:', initializedEmployees);
      console.log(`Total employees across all categories: ${totalEmployees}`);
      Object.keys(initializedEmployees).forEach(cat => {
        console.log(`${cat}: ${initializedEmployees[cat].length} employees`);
        if (initializedEmployees[cat].length > 0) {
          console.log(`  Sample: ${initializedEmployees[cat][0].employeeName} (${initializedEmployees[cat][0].employeeCode})`);
        }
      });
      
      if (totalEmployees === 0) {
        console.error('No employees found in API response!');
        console.error('Full API response:', JSON.stringify(response.data, null, 2));
        
        // Show debug info if available
        if (response.data.debug) {
          const debug = response.data.debug;
          const message = `No employees found.\n\n` +
            `Total in DB: ${debug.totalInDB}\n` +
            `After filter: ${debug.afterFilter}\n` +
            `Status breakdown: ${JSON.stringify(debug.statusBreakdown, null, 2)}\n\n` +
            `Sample employees:\n${debug.sampleEmployees.map((e: any) => 
              `- ${e.name} (${e.employeeCode}): Status="${e.status}", Category="${e.category}"`
            ).join('\n')}`;
          toast.success(message);
        } else {
          toast.error(t('noEmployeesFoundMessage'));
        }
      }
      
      setEmployees(initializedEmployees);
      setPreviousYear(response.data.previousYear);
      setPreviousMonth(response.data.previousMonth);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error(`${t('failedToLoad')}: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (
    category: string,
    index: number,
    field: keyof EmployeeSalaryData,
    value: number | string
  ) => {
    const updated = { ...employees };
    if (updated[category] && updated[category][index]) {
      updated[category][index] = {
        ...updated[category][index],
        [field]: value
      };
      setEmployees(updated);
    }
  };

  const handleSave = async () => {
    setMetaError(null);

    const parseResult = BulkSalaryMetaSchema.safeParse({ year, month });
    if (!parseResult.success) {
      const message =
        parseResult.error.errors
          .map((err) => err.message)
          .join('\n') || 'Validation error';
      setMetaError(message);
      return;
    }

    if (!confirm(`Create salary records for ${MONTHS[month - 1]} ${year}?`)) {
      return;
    }

    setSaving(true);
    try {
      // Flatten all employees into a single array
      const allEmployees = Object.values(employees).flat();
      
      const response = await axios.post(`${API_BASE_URL}/bulk-salary/create`, {
        year,
        month,
        employees: allEmployees
      });

      if (response.data.success) {
        toast.success(`${t('successfullyCreated')} ${response.data.created} ${t('records')} ${t('recordsAndUpdated')} ${response.data.updated} ${t('records')}.${response.data.errors.length > 0 ? `\n\n${t('errors')}: ${response.data.errors.slice(0, 5).join('\n')}` : ''}`);
        // Reload data to show updated records
        await loadLastMonthData();
      } else {
        toast.error(`${t('failedToSave')}: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      toast.error(`${t('failedToSave')}: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const calculateTotals = (category: string, field: keyof EmployeeSalaryData): number => {
    if (!employees[category]) return 0;
    return employees[category].reduce((sum, emp) => sum + (Number(emp[field]) || 0), 0);
  };

  const calculateAllTotals = (field: keyof EmployeeSalaryData, excludeConsultants: boolean = false): number => {
    let total = 0;
    CATEGORIES.forEach(cat => {
      if (excludeConsultants && cat === 'Consultants/مستشارين') return;
      total += calculateTotals(cat, field);
    });
    return total;
  };

  const renderSalariesTable = () => {
    return (
      <div className="w-full">
        {metaError && (
          <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 text-xs rounded whitespace-pre-line">
            {metaError}
          </div>
        )}
        <table className="w-full divide-y divide-gray-200 table-auto">
          <thead className="bg-gray-200 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase">Employee</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Basic Salary</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Direct Additions</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Indirect Additions</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Yearly Increase</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">{t('bonuses')}</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Gross</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Salary Deductions</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Gross Deductions</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Net</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {CATEGORIES.map(category => {
              const categoryEmployees = employees[category] || [];

              return (
                <React.Fragment key={category}>
                  {categoryEmployees.length > 0 && categoryEmployees.map((emp, idx) => {
                    const directAdditions = (emp.phoneAllowance || 0) + (emp.transportationAllowance || 0) + 
                                          (emp.accommodationAllowance || 0) + (emp.otherAllowances || 0);
                    const indirectAdditions = (emp.socialInsurance || 0) + (emp.taxes || 0) + (emp.medicalInsurance || 0);
                    const bonuses = (emp.annualBonus || 0) + (emp.monthlyBonus || 0);
                    const gross = (emp.basicSalary || 0) + indirectAdditions + directAdditions + (emp.yearlyIncrease || 0) + bonuses;
                    const salaryDeductions = (emp.otherBankWithdrawal || 0) + (emp.loansDeductions || 0) + 
                                             (emp.phoneDeduction || 0) + (emp.unpaidVacation || 0) + 
                                             (emp.lateArrivals || 0) + (emp.timeSheetDeductions || 0) + (emp.otherDeductions || 0);
                    const grossDeductions = (emp.medicalInsuranceDeducted || 0) + (emp.lawyersTaxes || 0);
                    const net = gross - salaryDeductions - grossDeductions;

                    return (
                      <tr key={emp.employeeId} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-200'} hover:bg-blue-200 transition-colors border-b border-gray-300`}>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <div className="text-xs font-medium text-gray-900">{emp.employeeName}</div>
                          <div className="text-xs text-gray-500">{emp.employeeCode}</div>
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.basicSalary || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'basicSalary', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-right text-gray-700">
                          {directAdditions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-right text-gray-700">
                          {indirectAdditions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.yearlyIncrease || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'yearlyIncrease', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-right text-gray-700">
                          {bonuses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-right font-semibold text-blue-600">
                          {gross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-right text-gray-700">
                          {salaryDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-right text-gray-700">
                          {grossDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-right font-bold text-green-600">
                          {net.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                  {categoryEmployees.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-2 py-2 text-center text-xs text-gray-500">
                        No employees in this category
                      </td>
                    </tr>
                  )}
                  {/* Category Total */}
                  <tr className="bg-green-100 font-semibold border-t-2 border-green-300">
                    <td className="px-2 py-2 text-xs text-gray-900 font-bold">{category} Total</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'basicSalary').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">
                      {categoryEmployees.reduce((sum, emp) => {
                        const direct = (emp.phoneAllowance || 0) + (emp.transportationAllowance || 0) + 
                                      (emp.accommodationAllowance || 0) + (emp.otherAllowances || 0);
                        return sum + direct;
                      }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 text-xs text-right">
                      {categoryEmployees.reduce((sum, emp) => {
                        const indirect = (emp.socialInsurance || 0) + (emp.taxes || 0) + (emp.medicalInsurance || 0);
                        return sum + indirect;
                      }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'yearlyIncrease').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">
                      {categoryEmployees.reduce((sum, emp) => sum + (emp.annualBonus || 0) + (emp.monthlyBonus || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 text-xs text-right text-blue-600">
                      {categoryEmployees.reduce((sum, emp) => {
                        const direct = (emp.phoneAllowance || 0) + (emp.transportationAllowance || 0) + 
                                      (emp.accommodationAllowance || 0) + (emp.otherAllowances || 0);
                        const indirect = (emp.socialInsurance || 0) + (emp.taxes || 0) + (emp.medicalInsurance || 0);
                        const bonuses = (emp.annualBonus || 0) + (emp.monthlyBonus || 0);
                        return sum + (emp.basicSalary || 0) + indirect + direct + (emp.yearlyIncrease || 0) + bonuses;
                      }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 text-xs text-right">
                      {categoryEmployees.reduce((sum, emp) => {
                        return sum + (emp.otherBankWithdrawal || 0) + (emp.loansDeductions || 0) + 
                               (emp.phoneDeduction || 0) + (emp.unpaidVacation || 0) + 
                               (emp.lateArrivals || 0) + (emp.timeSheetDeductions || 0) + (emp.otherDeductions || 0);
                      }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 text-xs text-right">
                      {categoryEmployees.reduce((sum, emp) => sum + (emp.medicalInsuranceDeducted || 0) + (emp.lawyersTaxes || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 text-xs text-right text-green-600">
                      {categoryEmployees.reduce((sum, emp) => {
                        const direct = (emp.phoneAllowance || 0) + (emp.transportationAllowance || 0) + 
                                      (emp.accommodationAllowance || 0) + (emp.otherAllowances || 0);
                        const indirect = (emp.socialInsurance || 0) + (emp.taxes || 0) + (emp.medicalInsurance || 0);
                        const bonuses = (emp.annualBonus || 0) + (emp.monthlyBonus || 0);
                        const gross = (emp.basicSalary || 0) + indirect + direct + (emp.yearlyIncrease || 0) + bonuses;
                        const salaryDed = (emp.otherBankWithdrawal || 0) + (emp.loansDeductions || 0) + 
                                         (emp.phoneDeduction || 0) + (emp.unpaidVacation || 0) + 
                                         (emp.lateArrivals || 0) + (emp.timeSheetDeductions || 0) + (emp.otherDeductions || 0);
                        const grossDed = (emp.medicalInsuranceDeducted || 0) + (emp.lawyersTaxes || 0);
                        return sum + (gross - salaryDed - grossDed);
                      }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
            {/* Grand Totals */}
            <tr className="bg-blue-100 font-bold border-t-2 border-blue-300">
              <td className="px-2 py-2 text-xs text-gray-900">All Employees Total</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('basicSalary').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">
                {Object.values(employees).flat().reduce((sum, emp) => {
                  const direct = (emp.phoneAllowance || 0) + (emp.transportationAllowance || 0) + 
                                (emp.accommodationAllowance || 0) + (emp.otherAllowances || 0);
                  return sum + direct;
                }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right">
                {Object.values(employees).flat().reduce((sum, emp) => {
                  const indirect = (emp.socialInsurance || 0) + (emp.taxes || 0) + (emp.medicalInsurance || 0);
                  return sum + indirect;
                }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('yearlyIncrease').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">
                {Object.values(employees).flat().reduce((sum, emp) => sum + (emp.annualBonus || 0) + (emp.monthlyBonus || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right text-blue-700">
                {Object.values(employees).flat().reduce((sum, emp) => {
                  const direct = (emp.phoneAllowance || 0) + (emp.transportationAllowance || 0) + 
                                (emp.accommodationAllowance || 0) + (emp.otherAllowances || 0);
                  const indirect = (emp.socialInsurance || 0) + (emp.taxes || 0) + (emp.medicalInsurance || 0);
                  const bonuses = (emp.annualBonus || 0) + (emp.monthlyBonus || 0);
                  return sum + (emp.basicSalary || 0) + indirect + direct + (emp.yearlyIncrease || 0) + bonuses;
                }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right">
                {Object.values(employees).flat().reduce((sum, emp) => {
                  return sum + (emp.otherBankWithdrawal || 0) + (emp.loansDeductions || 0) + 
                         (emp.phoneDeduction || 0) + (emp.unpaidVacation || 0) + 
                         (emp.lateArrivals || 0) + (emp.timeSheetDeductions || 0) + (emp.otherDeductions || 0);
                }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right">
                {Object.values(employees).flat().reduce((sum, emp) => sum + (emp.medicalInsuranceDeducted || 0) + (emp.lawyersTaxes || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right text-green-700">
                {Object.values(employees).flat().reduce((sum, emp) => {
                  const direct = (emp.phoneAllowance || 0) + (emp.transportationAllowance || 0) + 
                                (emp.accommodationAllowance || 0) + (emp.otherAllowances || 0);
                  const indirect = (emp.socialInsurance || 0) + (emp.taxes || 0) + (emp.medicalInsurance || 0);
                  const bonuses = (emp.annualBonus || 0) + (emp.monthlyBonus || 0);
                  const gross = (emp.basicSalary || 0) + indirect + direct + (emp.yearlyIncrease || 0) + bonuses;
                  const salaryDed = (emp.otherBankWithdrawal || 0) + (emp.loansDeductions || 0) + 
                                   (emp.phoneDeduction || 0) + (emp.unpaidVacation || 0) + 
                                   (emp.lateArrivals || 0) + (emp.timeSheetDeductions || 0) + (emp.otherDeductions || 0);
                  const grossDed = (emp.medicalInsuranceDeducted || 0) + (emp.lawyersTaxes || 0);
                  return sum + (gross - salaryDed - grossDed);
                }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
            </tr>
            {/* All Employees Except Consultants Total */}
            <tr className="bg-green-100 font-bold border-t-2 border-green-300">
              <td className="px-2 py-2 text-xs text-gray-900">All Employees (Except Consultants) Total</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('basicSalary', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">
                {Object.values(employees).filter((_, idx) => CATEGORIES[idx] !== 'Consultants/مستشارين').flat().reduce((sum, emp) => {
                  const direct = (emp.phoneAllowance || 0) + (emp.transportationAllowance || 0) + 
                                (emp.accommodationAllowance || 0) + (emp.otherAllowances || 0);
                  return sum + direct;
                }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right">
                {Object.values(employees).filter((_, idx) => CATEGORIES[idx] !== 'Consultants/مستشارين').flat().reduce((sum, emp) => {
                  const indirect = (emp.socialInsurance || 0) + (emp.taxes || 0) + (emp.medicalInsurance || 0);
                  return sum + indirect;
                }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('yearlyIncrease', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">
                {Object.values(employees).filter((_, idx) => CATEGORIES[idx] !== 'Consultants/مستشارين').flat().reduce((sum, emp) => sum + (emp.annualBonus || 0) + (emp.monthlyBonus || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right text-green-700">
                {Object.values(employees).filter((_, idx) => CATEGORIES[idx] !== 'Consultants/مستشارين').flat().reduce((sum, emp) => {
                  const direct = (emp.phoneAllowance || 0) + (emp.transportationAllowance || 0) + 
                                (emp.accommodationAllowance || 0) + (emp.otherAllowances || 0);
                  const indirect = (emp.socialInsurance || 0) + (emp.taxes || 0) + (emp.medicalInsurance || 0);
                  const bonuses = (emp.annualBonus || 0) + (emp.monthlyBonus || 0);
                  return sum + (emp.basicSalary || 0) + indirect + direct + (emp.yearlyIncrease || 0) + bonuses;
                }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right">
                {Object.values(employees).filter((_, idx) => CATEGORIES[idx] !== 'Consultants/مستشارين').flat().reduce((sum, emp) => {
                  return sum + (emp.otherBankWithdrawal || 0) + (emp.loansDeductions || 0) + 
                         (emp.phoneDeduction || 0) + (emp.unpaidVacation || 0) + 
                         (emp.lateArrivals || 0) + (emp.timeSheetDeductions || 0) + (emp.otherDeductions || 0);
                }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right">
                {Object.values(employees).filter((_, idx) => CATEGORIES[idx] !== 'Consultants/مستشارين').flat().reduce((sum, emp) => sum + (emp.medicalInsuranceDeducted || 0) + (emp.lawyersTaxes || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right text-green-800">
                {Object.values(employees).filter((_, idx) => CATEGORIES[idx] !== 'Consultants/مستشارين').flat().reduce((sum, emp) => {
                  const direct = (emp.phoneAllowance || 0) + (emp.transportationAllowance || 0) + 
                                (emp.accommodationAllowance || 0) + (emp.otherAllowances || 0);
                  const indirect = (emp.socialInsurance || 0) + (emp.taxes || 0) + (emp.medicalInsurance || 0);
                  const bonuses = (emp.annualBonus || 0) + (emp.monthlyBonus || 0);
                  const gross = (emp.basicSalary || 0) + indirect + direct + (emp.yearlyIncrease || 0) + bonuses;
                  const salaryDed = (emp.otherBankWithdrawal || 0) + (emp.loansDeductions || 0) + 
                                   (emp.phoneDeduction || 0) + (emp.unpaidVacation || 0) + 
                                   (emp.lateArrivals || 0) + (emp.timeSheetDeductions || 0) + (emp.otherDeductions || 0);
                  const grossDed = (emp.medicalInsuranceDeducted || 0) + (emp.lawyersTaxes || 0);
                  return sum + (gross - salaryDed - grossDed);
                }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderAdditionsTable = () => {
    return (
      <div className="w-full">
        <table className="w-full divide-y divide-gray-200 table-auto">
          <thead className="bg-gray-200 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase">Employee</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Phone Allowance</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Transportation</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Accommodation</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Other Allowances</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Yearly Increase</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">{t('annualBonus')}</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">{t('monthlyBonus')}</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Social Insurance</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Taxes</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Medical Insurance</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Direct Total</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Indirect Total</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">{t('bonusesTotal')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {CATEGORIES.map(category => {
              const categoryEmployees = employees[category] || [];

              return (
                <React.Fragment key={category}>
                  {categoryEmployees.length > 0 && categoryEmployees.map((emp, idx) => {
                    const directTotal = (emp.phoneAllowance || 0) + (emp.transportationAllowance || 0) + 
                                       (emp.accommodationAllowance || 0) + (emp.otherAllowances || 0);
                    const indirectTotal = (emp.socialInsurance || 0) + (emp.taxes || 0) + (emp.medicalInsurance || 0);
                    const bonusesTotal = (emp.annualBonus || 0) + (emp.monthlyBonus || 0);

                    return (
                      <tr key={emp.employeeId} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-200'} hover:bg-blue-200 transition-colors border-b border-gray-300`}>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <div className="text-xs font-medium text-gray-900">{emp.employeeName}</div>
                          <div className="text-xs text-gray-500">{emp.employeeCode}</div>
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.phoneAllowance || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'phoneAllowance', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.transportationAllowance || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'transportationAllowance', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.accommodationAllowance || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'accommodationAllowance', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.otherAllowances || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'otherAllowances', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.yearlyIncrease || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'yearlyIncrease', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.annualBonus || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'annualBonus', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.monthlyBonus || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'monthlyBonus', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.socialInsurance || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'socialInsurance', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.taxes || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'taxes', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.medicalInsurance || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'medicalInsurance', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap text-xs text-right font-semibold text-blue-600">
                          {directTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap text-xs text-right font-semibold text-purple-600">
                          {indirectTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap text-xs text-right font-semibold text-green-600">
                          {bonusesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                  {categoryEmployees.length === 0 && (
                    <tr>
                      <td colSpan={14} className="px-2 py-2 text-center text-xs text-gray-500">
                        No employees in this category
                      </td>
                    </tr>
                  )}
                  {/* Category Total */}
                  <tr className="bg-green-100 font-semibold border-t-2 border-green-300">
                    <td className="px-2 py-2 text-xs text-gray-900 font-bold">{category} Total</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'phoneAllowance').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'transportationAllowance').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'accommodationAllowance').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'otherAllowances').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'yearlyIncrease').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'annualBonus').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'monthlyBonus').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'socialInsurance').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'taxes').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'medicalInsurance').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right text-blue-600">
                      {categoryEmployees.reduce((sum, emp) => {
                        return sum + (emp.phoneAllowance || 0) + (emp.transportationAllowance || 0) + 
                               (emp.accommodationAllowance || 0) + (emp.otherAllowances || 0);
                      }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 text-xs text-right text-purple-600">
                      {categoryEmployees.reduce((sum, emp) => {
                        return sum + (emp.socialInsurance || 0) + (emp.taxes || 0) + (emp.medicalInsurance || 0);
                      }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 text-xs text-right text-green-600">
                      {categoryEmployees.reduce((sum, emp) => sum + (emp.annualBonus || 0) + (emp.monthlyBonus || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
            {/* Grand Totals */}
            <tr className="bg-blue-100 font-bold border-t-2 border-blue-300">
              <td className="px-2 py-2 text-xs text-gray-900">All Employees Total</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('phoneAllowance').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('transportationAllowance').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('accommodationAllowance').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('otherAllowances').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('yearlyIncrease').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('annualBonus').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('monthlyBonus').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('socialInsurance').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('taxes').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('medicalInsurance').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right text-blue-700">
                {Object.values(employees).flat().reduce((sum, emp) => {
                  return sum + (emp.phoneAllowance || 0) + (emp.transportationAllowance || 0) + 
                         (emp.accommodationAllowance || 0) + (emp.otherAllowances || 0);
                }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right text-purple-700">
                {Object.values(employees).flat().reduce((sum, emp) => {
                  return sum + (emp.socialInsurance || 0) + (emp.taxes || 0) + (emp.medicalInsurance || 0);
                }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right text-green-700">
                {Object.values(employees).flat().reduce((sum, emp) => sum + (emp.annualBonus || 0) + (emp.monthlyBonus || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
            </tr>
            {/* All Employees Except Consultants Total */}
            <tr className="bg-green-100 font-bold border-t-2 border-green-300">
              <td className="px-2 py-2 text-xs text-gray-900">All Employees (Except Consultants) Total</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('phoneAllowance', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('transportationAllowance', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('accommodationAllowance', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('otherAllowances', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('yearlyIncrease', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('annualBonus', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('monthlyBonus', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('socialInsurance', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('taxes', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('medicalInsurance', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right text-green-700">
                {Object.values(employees).filter((_, idx) => CATEGORIES[idx] !== 'Consultants/مستشارين').flat().reduce((sum, emp) => {
                  return sum + (emp.phoneAllowance || 0) + (emp.transportationAllowance || 0) + 
                         (emp.accommodationAllowance || 0) + (emp.otherAllowances || 0);
                }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right text-green-700">
                {Object.values(employees).filter((_, idx) => CATEGORIES[idx] !== 'Consultants/مستشارين').flat().reduce((sum, emp) => {
                  return sum + (emp.socialInsurance || 0) + (emp.taxes || 0) + (emp.medicalInsurance || 0);
                }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right text-green-700">
                {Object.values(employees).filter((_, idx) => CATEGORIES[idx] !== 'Consultants/مستشارين').flat().reduce((sum, emp) => sum + (emp.annualBonus || 0) + (emp.monthlyBonus || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderDeductionsTable = () => {
    return (
      <div className="w-full">
        <table className="w-full divide-y divide-gray-200 table-auto">
          <thead className="bg-gray-200 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase">Employee</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Medical Insurance Deducted</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Lawyers Taxes</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Other Bank Withdrawal</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Loans / Deductions</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Phone Deduction</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Unpaid Vacation</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Late Arrivals</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Time Sheet Deductions</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Other Deductions</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Gross Deductions Total</th>
              <th className="px-1.5 py-1.5 text-right text-xs font-semibold text-gray-700 uppercase">Salary Deductions Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {CATEGORIES.map(category => {
              const categoryEmployees = employees[category] || [];

              return (
                <React.Fragment key={category}>
                  {categoryEmployees.length > 0 && categoryEmployees.map((emp, idx) => {
                    const grossDeductionsTotal = (emp.medicalInsuranceDeducted || 0) + (emp.lawyersTaxes || 0);
                    const salaryDeductionsTotal = (emp.otherBankWithdrawal || 0) + (emp.loansDeductions || 0) + 
                                                 (emp.phoneDeduction || 0) + (emp.unpaidVacation || 0) + 
                                                 (emp.lateArrivals || 0) + (emp.timeSheetDeductions || 0) + (emp.otherDeductions || 0);

                    return (
                      <tr key={emp.employeeId} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-200'} hover:bg-blue-200 transition-colors border-b border-gray-300`}>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <div className="text-xs font-medium text-gray-900">{emp.employeeName}</div>
                          <div className="text-xs text-gray-500">{emp.employeeCode}</div>
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.medicalInsuranceDeducted || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'medicalInsuranceDeducted', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.lawyersTaxes || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'lawyersTaxes', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.otherBankWithdrawal || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'otherBankWithdrawal', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.loansDeductions || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'loansDeductions', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.phoneDeduction || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'phoneDeduction', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.unpaidVacation || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'unpaidVacation', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.lateArrivals || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'lateArrivals', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.timeSheetDeductions || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'timeSheetDeductions', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={emp.otherDeductions || 0}
                            onChange={(e) => handleFieldChange(category, idx, 'otherDeductions', parseFloat(e.target.value) || 0)}
                            className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap text-xs text-right font-semibold text-red-600">
                          {grossDeductionsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-1.5 py-1.5 whitespace-nowrap text-xs text-right font-semibold text-orange-600">
                          {salaryDeductionsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                  {categoryEmployees.length === 0 && (
                    <tr>
                      <td colSpan={12} className="px-1.5 py-1.5 text-center text-xs text-gray-500">
                        No employees in this category
                      </td>
                    </tr>
                  )}
                  {/* Category Total */}
                  <tr className="bg-green-100 font-semibold border-t-2 border-green-300">
                    <td className="px-2 py-2 text-xs text-gray-900 font-bold">{category} Total</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'medicalInsuranceDeducted').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'lawyersTaxes').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'otherBankWithdrawal').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'loansDeductions').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'phoneDeduction').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'unpaidVacation').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'lateArrivals').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'timeSheetDeductions').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right">{calculateTotals(category, 'otherDeductions').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-right text-red-600">
                      {categoryEmployees.reduce((sum, emp) => sum + (emp.medicalInsuranceDeducted || 0) + (emp.lawyersTaxes || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 text-xs text-right text-orange-600">
                      {categoryEmployees.reduce((sum, emp) => {
                        return sum + (emp.otherBankWithdrawal || 0) + (emp.loansDeductions || 0) + 
                               (emp.phoneDeduction || 0) + (emp.unpaidVacation || 0) + 
                               (emp.lateArrivals || 0) + (emp.timeSheetDeductions || 0) + (emp.otherDeductions || 0);
                      }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
            {/* Grand Totals */}
            <tr className="bg-blue-100 font-bold border-t-2 border-blue-300">
              <td className="px-2 py-2 text-xs text-gray-900">All Employees Total</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('medicalInsuranceDeducted').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('lawyersTaxes').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('otherBankWithdrawal').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('loansDeductions').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('phoneDeduction').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('unpaidVacation').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('lateArrivals').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('timeSheetDeductions').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('otherDeductions').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right text-red-700">
                {Object.values(employees).flat().reduce((sum, emp) => sum + (emp.medicalInsuranceDeducted || 0) + (emp.lawyersTaxes || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right text-orange-700">
                {Object.values(employees).flat().reduce((sum, emp) => {
                  return sum + (emp.otherBankWithdrawal || 0) + (emp.loansDeductions || 0) + 
                         (emp.phoneDeduction || 0) + (emp.unpaidVacation || 0) + 
                         (emp.lateArrivals || 0) + (emp.timeSheetDeductions || 0) + (emp.otherDeductions || 0);
                }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
            </tr>
            {/* All Employees Except Consultants Total */}
            <tr className="bg-green-100 font-bold border-t-2 border-green-300">
              <td className="px-2 py-2 text-xs text-gray-900">All Employees (Except Consultants) Total</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('medicalInsuranceDeducted', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('lawyersTaxes', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('otherBankWithdrawal', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('loansDeductions', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('phoneDeduction', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('unpaidVacation', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('lateArrivals', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('timeSheetDeductions', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right">{calculateAllTotals('otherDeductions', true).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="px-2 py-2 text-xs text-right text-green-700">
                {Object.values(employees).filter((_, idx) => CATEGORIES[idx] !== 'Consultants/مستشارين').flat().reduce((sum, emp) => sum + (emp.medicalInsuranceDeducted || 0) + (emp.lawyersTaxes || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2 text-xs text-right text-green-700">
                {Object.values(employees).filter((_, idx) => CATEGORIES[idx] !== 'Consultants/مستشارين').flat().reduce((sum, emp) => {
                  return sum + (emp.otherBankWithdrawal || 0) + (emp.loansDeductions || 0) + 
                         (emp.phoneDeduction || 0) + (emp.unpaidVacation || 0) + 
                         (emp.lateArrivals || 0) + (emp.timeSheetDeductions || 0) + (emp.otherDeductions || 0);
                }, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4">
      <div className="w-full mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bulk Salary Entry</h1>
          <p className="text-gray-600">Create salary records for all employees for a specific month</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium text-gray-700">Year:</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-20 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              min="2000"
              max="2100"
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium text-gray-700">Month:</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              {MONTHS.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>
          <button
            onClick={loadLastMonthData}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('loading') : t('loadLastMonthData')}
          </button>
          {previousYear && previousMonth && (
            <span className="text-sm text-gray-600">
              Last month: {MONTHS[previousMonth - 1]} {previousYear}
            </span>
          )}
        </div>
      </div>

      {Object.keys(employees).length > 0 && Object.values(employees).flat().length > 0 && (
        <>
          {/* Tabs */}
          <div className="mb-4 border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('salaries')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'salaries'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Salaries
              </button>
              <button
                onClick={() => setActiveTab('additions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'additions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Additions
              </button>
              <button
                onClick={() => setActiveTab('deductions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'deductions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Deductions
              </button>
            </nav>
          </div>

          {/* Table Content */}
          <div className="bg-white rounded-lg shadow-sm p-2 overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
            {activeTab === 'salaries' && renderSalariesTable()}
            {activeTab === 'additions' && renderAdditionsTable()}
            {activeTab === 'deductions' && renderDeductionsTable()}
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
            >
              {saving ? t('saving') : t('createSalaryRecordsFor', { month: MONTHS[month - 1], year })}
            </button>
          </div>
        </>
      )}

      {(!Object.keys(employees).length || Object.values(employees).flat().length === 0) && !loading && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">{t('clickLoadLastMonthData')}</p>
          <p className="text-sm text-gray-400">This will load all active employees and copy their last month's salary data (or set to 0 if no previous data exists)</p>
        </div>
      )}
      </div>
    </div>
  );
}

