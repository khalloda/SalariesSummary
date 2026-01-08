import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireRole, canViewSalaryAmounts, redactSalaryArrayForRoles, type RoleName } from '../utils/auth.js';
import { logAudit } from '../utils/audit.js';

const prisma = new PrismaClient();
export const bulkSalaryRouter = Router();

/**
 * GET /api/bulk-salary/last-month/:year/:month
 * Get last month's salary data for all employees, grouped by category
 */
bulkSalaryRouter.get('/last-month/:year/:month', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    // Calculate previous month
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    // Get all employees (regardless of whether they have previous month salary)
    // Get all employees first, then filter out resigned ones
    const allEmployees = await prisma.employee.findMany({
      include: {
        salaries: {
          where: {
            year: prevYear,
            month: prevMonth
          },
          take: 1
        }
      }
    });

    console.log(`Total employees fetched from DB: ${allEmployees.length}`);
    if (allEmployees.length > 0) {
      console.log(`Sample employee: ${allEmployees[0].name}, Status: ${allEmployees[0].status}, Category: ${allEmployees[0].category}`);
    }

    // Filter out resigned employees (but include null status)
    // For now, include all employees to debug - we can filter later
    const employees = allEmployees.filter(emp => {
      // Include if status is null, undefined, 'Active', or anything except 'Resigned'
      return emp.status !== 'Resigned';
    });
    
    console.log(`Total employees in DB: ${allEmployees.length}, After filtering resigned: ${employees.length}`);
    
    if (allEmployees.length > 0) {
      const statusCounts = allEmployees.reduce((acc, emp) => {
        const status = emp.status || 'null';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('Employee status breakdown:', statusCounts);
      
      // Show sample employees with their categories
      console.log('Sample employees (first 5):', allEmployees.slice(0, 5).map(e => ({ 
        name: e.name, 
        status: e.status, 
        category: e.category,
        employeeCode: e.employeeCode
      })));
    }
    
    if (employees.length === 0 && allEmployees.length > 0) {
      console.log('WARNING: All employees are marked as Resigned or filtered out!');
      console.log('Including all employees for debugging...');
      // Temporarily include all employees for debugging
      return res.json({
        year,
        month,
        previousYear: prevYear,
        previousMonth: prevMonth,
        employees: {},
        totalEmployees: 0,
        debug: {
          totalInDB: allEmployees.length,
          statusBreakdown: allEmployees.reduce((acc, emp) => {
            const status = emp.status || 'null';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          sampleEmployees: allEmployees.slice(0, 5).map(e => ({
            name: e.name,
            status: e.status,
            category: e.category,
            employeeCode: e.employeeCode
          }))
        }
      });
    }
    
    if (employees.length === 0 && allEmployees.length > 0) {
      console.log(`All employees are marked as Resigned. Sample statuses:`, allEmployees.slice(0, 5).map(e => ({ name: e.name, status: e.status })));
    }

    // Sort employees within each category by employeeCode
    // Convert employeeCode to sortable format (e.g., "2-21" -> [2, 21])
    const sortByEmployeeCode = (a: any, b: any) => {
      const codeA = a.employeeCode || '';
      const codeB = b.employeeCode || '';
      
      // Parse codes like "2-21" into [2, 21] for proper sorting
      const parseCode = (code: string): number[] => {
        if (!code) return [999999, 999999]; // Put empty codes at the end
        const parts = code.split('-').map(p => parseInt(p.trim()) || 0);
        return parts.length > 0 ? parts : [999999, 999999];
      };
      
      const partsA = parseCode(codeA);
      const partsB = parseCode(codeB);
      
      // Compare first part, then second part
      for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const valA = partsA[i] || 0;
        const valB = partsB[i] || 0;
        if (valA !== valB) {
          return valA - valB;
        }
      }
      return 0;
    };

    // Map category names to standard format
    const categoryMap: Record<string, string> = {
      'Partner': 'Partners/شركاء',
      'Partners': 'Partners/شركاء',
      'Partners/شركاء': 'Partners/شركاء',
      'Lawyer': 'Lawyers/محامين',
      'Lawyers': 'Lawyers/محامين',
      'Lawyers/محامين': 'Lawyers/محامين',
      'Admin': 'Admins/عاملين',
      'Admins': 'Admins/عاملين',
      'Admins/عاملين': 'Admins/عاملين',
      'Consultant': 'Consultants/مستشارين',
      'Consultants': 'Consultants/مستشارين',
      'Consultants/مستشارين': 'Consultants/مستشارين'
    };
    
    // Normalize categories before sorting
    const normalizedEmployees = employees.map(emp => ({
      ...emp,
      category: categoryMap[emp.category || ''] || 'Admins/عاملين'
    }));
    
    // Sort employees by category first, then by employeeCode
    const sortedEmployees = normalizedEmployees.sort((a, b) => {
      if (a.category !== b.category) {
        const catOrder = ['Partners/شركاء', 'Lawyers/محامين', 'Admins/عاملين', 'Consultants/مستشارين'];
        const catA = catOrder.indexOf(a.category || 'Admins/عاملين');
        const catB = catOrder.indexOf(b.category || 'Admins/عاملين');
        if (catA !== catB) return catA - catB;
      }
      return sortByEmployeeCode(a, b);
    });

    // Group employees by category
    const grouped: Record<string, any[]> = {
      'Partners/شركاء': [],
      'Lawyers/محامين': [],
      'Admins/عاملين': [],
      'Consultants/مستشارين': []
    };

    console.log(`Found ${sortedEmployees.length} total employees`);
    
    sortedEmployees.forEach(emp => {
      // Category is already normalized from the mapping above
      const category = emp.category || 'Admins/عاملين';
      
      if (!grouped[category]) {
        grouped[category] = [];
      }
      
      console.log(`Processing employee: ${emp.name} (${emp.employeeCode}) - Category: ${category}, Status: ${emp.status}`);
      
      const lastSalary = emp.salaries[0];
      let additionsBreakdown: any = {};
      let deductionsBreakdown: any = {};
      
      if (lastSalary?.additionsBreakdown) {
        try {
          additionsBreakdown = JSON.parse(lastSalary.additionsBreakdown);
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      if (lastSalary?.deductionsBreakdown) {
        try {
          deductionsBreakdown = JSON.parse(lastSalary.deductionsBreakdown);
        } catch (e) {
          // Ignore parse errors
        }
      }

      grouped[category].push({
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.employeeCode || '',
        category: category, // Use the mapped category
        // Basic salary data
        basicSalary: lastSalary?.basicSalary || 0,
        // Additions breakdown
        phoneAllowance: additionsBreakdown.phoneAllowance || 0,
        transportationAllowance: additionsBreakdown.transportationAllowance || 0,
        accommodationAllowance: additionsBreakdown.accommodationAllowance || 0,
        otherAllowances: additionsBreakdown.otherAllowances || 0,
        yearlyIncrease: lastSalary?.yearlyIncrease || 0,
        annualBonus: additionsBreakdown.annualBonus || 0,
        monthlyBonus: additionsBreakdown.monthlyBonus || 0,
        socialInsurance: additionsBreakdown.socialInsurance || 0,
        taxes: additionsBreakdown.taxes || 0,
        medicalInsurance: additionsBreakdown.medicalInsurance || 0,
        // Deductions breakdown
        medicalInsuranceDeducted: deductionsBreakdown.medicalInsuranceDeducted || 0,
        lawyersTaxes: deductionsBreakdown.lawyersTaxes || 0,
        otherBankWithdrawal: deductionsBreakdown.otherBankWithdrawal || 0,
        loansDeductions: deductionsBreakdown.loansDeductions || 0,
        phoneDeduction: deductionsBreakdown.phoneDeduction || 0,
        unpaidVacation: deductionsBreakdown.unpaidVacation || 0,
        lateArrivals: deductionsBreakdown.lateArrivals || 0,
        timeSheetDeductions: deductionsBreakdown.timeSheetDeductions || 0,
        otherDeductions: deductionsBreakdown.otherDeductions || 0,
        // Metadata
        paymentMethod: lastSalary?.paymentMethod || null,
        accountNumber: lastSalary?.accountNumber || null,
        notes: lastSalary?.notes || null
      });
    });

    // Log summary
    const totalEmployees = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`Returning ${totalEmployees} employees grouped by category:`);
    Object.keys(grouped).forEach(cat => {
      console.log(`  ${cat}: ${grouped[cat].length} employees`);
    });

    const response = {
      year,
      month,
      previousYear: prevYear,
      previousMonth: prevMonth,
      employees: grouped,
      totalEmployees
    };
    
    // Add debug info if no employees found
    if (totalEmployees === 0) {
      (response as any).debug = {
        totalInDB: allEmployees.length,
        afterFilter: employees.length,
        statusBreakdown: allEmployees.reduce((acc, emp) => {
          const status = emp.status || 'null';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        sampleEmployees: allEmployees.slice(0, 5).map(e => ({
          name: e.name,
          status: e.status,
          category: e.category,
          employeeCode: e.employeeCode
        }))
      };
    }
    
    // Apply salary redaction based on user roles
    const roles = (req.user?.roles ?? []) as RoleName[];
    const canView = canViewSalaryAmounts(roles);
    
    if (!canView) {
      // Redact salary amounts for restricted roles
      Object.keys(response.employees).forEach(category => {
        response.employees[category] = response.employees[category].map((emp: any) => ({
          ...emp,
          basicSalary: 'RESTRICTED',
          phoneAllowance: 'RESTRICTED',
          transportationAllowance: 'RESTRICTED',
          accommodationAllowance: 'RESTRICTED',
          otherAllowances: 'RESTRICTED',
          yearlyIncrease: 'RESTRICTED',
          annualBonus: 'RESTRICTED',
          monthlyBonus: 'RESTRICTED',
          socialInsurance: 'RESTRICTED',
          taxes: 'RESTRICTED',
          medicalInsurance: 'RESTRICTED',
          medicalInsuranceDeducted: 'RESTRICTED',
          lawyersTaxes: 'RESTRICTED',
          otherBankWithdrawal: 'RESTRICTED',
          loansDeductions: 'RESTRICTED',
          phoneDeduction: 'RESTRICTED',
          unpaidVacation: 'RESTRICTED',
          lateArrivals: 'RESTRICTED',
          timeSheetDeductions: 'RESTRICTED',
          otherDeductions: 'RESTRICTED',
        }));
      });
    }
    
    await logAudit(req.user, 'BULK_SALARY_VIEW', 'bulk-salary', null, { year, month, canView });
    
    res.json(response);
  } catch (error: any) {
    console.error('Error fetching last month salaries:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bulk-salary/create
 * Create salary records for multiple employees at once
 */
bulkSalaryRouter.post('/create', requireRole('OFFICE_MANAGER', 'FINANCE', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { year, month, employees } = req.body;

    if (!year || !month || !employees || !Array.isArray(employees)) {
      return res.status(400).json({ error: 'Year, month, and employees array are required' });
    }

    const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long' });
    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[]
    };

    for (const emp of employees) {
      try {
        if (!emp.employeeId) {
          results.errors.push(`Missing employeeId for ${emp.employeeName}`);
          continue;
        }

        // Calculate totals
        const directAdditions = (emp.phoneAllowance || 0) + 
                                (emp.transportationAllowance || 0) + 
                                (emp.accommodationAllowance || 0) + 
                                (emp.otherAllowances || 0);
        
        const indirectAdditions = (emp.socialInsurance || 0) + 
                                  (emp.taxes || 0) + 
                                  (emp.medicalInsurance || 0);
        
        const bonuses = (emp.annualBonus || 0) + (emp.monthlyBonus || 0);
        
        const grossDeductions = (emp.medicalInsuranceDeducted || 0) + 
                               (emp.lawyersTaxes || 0);
        
        const salaryDeductions = (emp.otherBankWithdrawal || 0) + 
                                (emp.loansDeductions || 0) + 
                                (emp.phoneDeduction || 0) + 
                                (emp.unpaidVacation || 0) + 
                                (emp.lateArrivals || 0) + 
                                (emp.timeSheetDeductions || 0) + 
                                (emp.otherDeductions || 0);
        
        const gross = (emp.basicSalary || 0) + indirectAdditions + directAdditions + 
                     (emp.yearlyIncrease || 0) + bonuses;
        
        const net = gross - salaryDeductions - grossDeductions;

        // Build breakdown objects
        const additionsBreakdown: any = {};
        if (emp.phoneAllowance > 0) additionsBreakdown.phoneAllowance = emp.phoneAllowance;
        if (emp.transportationAllowance > 0) additionsBreakdown.transportationAllowance = emp.transportationAllowance;
        if (emp.accommodationAllowance > 0) additionsBreakdown.accommodationAllowance = emp.accommodationAllowance;
        if (emp.yearlyIncrease > 0) additionsBreakdown.yearlyIncrease = emp.yearlyIncrease;
        if (emp.annualBonus > 0) additionsBreakdown.annualBonus = emp.annualBonus;
        if (emp.monthlyBonus > 0) additionsBreakdown.monthlyBonus = emp.monthlyBonus;
        if (emp.socialInsurance > 0) additionsBreakdown.socialInsurance = emp.socialInsurance;
        if (emp.taxes > 0) additionsBreakdown.taxes = emp.taxes;
        if (emp.medicalInsurance > 0) additionsBreakdown.medicalInsurance = emp.medicalInsurance;
        if (emp.otherAllowances > 0) additionsBreakdown.otherAllowances = emp.otherAllowances;

        const deductionsBreakdown: any = {};
        if (emp.medicalInsuranceDeducted > 0) deductionsBreakdown.medicalInsuranceDeducted = emp.medicalInsuranceDeducted;
        if (emp.lawyersTaxes > 0) deductionsBreakdown.lawyersTaxes = emp.lawyersTaxes;
        if (emp.otherBankWithdrawal > 0) deductionsBreakdown.otherBankWithdrawal = emp.otherBankWithdrawal;
        if (emp.loansDeductions > 0) deductionsBreakdown.loansDeductions = emp.loansDeductions;
        if (emp.phoneDeduction > 0) deductionsBreakdown.phoneDeduction = emp.phoneDeduction;
        if (emp.unpaidVacation > 0) deductionsBreakdown.unpaidVacation = emp.unpaidVacation;
        if (emp.lateArrivals > 0) deductionsBreakdown.lateArrivals = emp.lateArrivals;
        if (emp.timeSheetDeductions > 0) deductionsBreakdown.timeSheetDeductions = emp.timeSheetDeductions;
        if (emp.otherDeductions > 0) deductionsBreakdown.otherDeductions = emp.otherDeductions;

        // Check if record exists
        const existing = await prisma.salaryRecord.findUnique({
          where: {
            employeeId_year_month: {
              employeeId: emp.employeeId,
              year: parseInt(year),
              month: parseInt(month)
            }
          }
        });

        const data = {
          employeeId: emp.employeeId,
          year: parseInt(year),
          month: parseInt(month),
          monthName,
          basicSalary: parseFloat(emp.basicSalary) || 0,
          directAdditions,
          indirectAdditions,
          yearlyIncrease: parseFloat(emp.yearlyIncrease) || 0,
          bonuses,
          salaryDeductions,
          grossDeductions,
          gross,
          net,
          additionsBreakdown: Object.keys(additionsBreakdown).length > 0 ? JSON.stringify(additionsBreakdown) : null,
          deductionsBreakdown: Object.keys(deductionsBreakdown).length > 0 ? JSON.stringify(deductionsBreakdown) : null,
          paymentMethod: emp.paymentMethod || null,
          accountNumber: emp.accountNumber || null,
          notes: emp.notes || null,
          category: emp.category || null,
          sourceFile: 'Bulk Entry'
        };

        if (existing) {
          await prisma.salaryRecord.update({
            where: { id: existing.id },
            data
          });
          results.updated++;
        } else {
          await prisma.salaryRecord.create({ data });
          results.created++;
        }
      } catch (error: any) {
        results.errors.push(`${emp.employeeName}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      ...results
    });
  } catch (error: any) {
    console.error('Error creating bulk salaries:', error);
    res.status(500).json({ error: error.message });
  }
});

