import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const reportsRouter = Router();

/**
 * GET /api/reports/available-years
 * Get all available years from salary records
 */
reportsRouter.get('/available-years', async (req, res) => {
  try {
    // Use groupBy for SQLite compatibility (distinct doesn't work well with SQLite)
    const salaryYearsData = await prisma.salaryRecord.groupBy({
      by: ['year']
    });
    const salaryYears = salaryYearsData.map(r => r.year);
    
    // Also get years from bonus records if they exist
    let bonusYears: number[] = [];
    try {
      const bonusYearsData = await prisma.annualBonus.groupBy({
        by: ['year']
      });
      bonusYears = bonusYearsData.map(r => r.year);
    } catch (e) {
      // AnnualBonus table might not exist in older databases, ignore
    }
    
    // Combine and deduplicate
    const allYears = new Set<number>();
    salaryYears.forEach(year => allYears.add(year));
    bonusYears.forEach(year => allYears.add(year));
    
    const yearList = Array.from(allYears).sort((a, b) => b - a);
    res.json({ years: yearList });
  } catch (error: any) {
    console.error('Error fetching available years:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/category-totals?year=YYYY
 * Get totals by category (Partners, Lawyers, Admins, Consultants)
 */
reportsRouter.get('/category-totals', async (req, res) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    
    const categories = ['Partners/شركاء', 'Lawyers/محامين', 'Admins/عاملين', 'Consultants/مستشارين'];
    const categoryTotals: Record<string, any> = {};
    
    for (const category of categories) {
      const employees = await prisma.employee.findMany({
        where: { category },
        include: {
          salaries: {
            where: { year },
            orderBy: { month: 'asc' }
          }
        }
      });
      
      // Calculate totals for this category
      const totals = employees.reduce((acc, emp) => {
        emp.salaries.forEach(s => {
          acc.basicSalary += s.basicSalary;
          acc.directAdditions += s.directAdditions;
          acc.indirectAdditions += s.indirectAdditions;
          acc.yearlyIncrease += s.yearlyIncrease;
          acc.bonuses += s.bonuses;
          acc.salaryDeductions += s.salaryDeductions;
          acc.grossDeductions += s.grossDeductions;
          acc.gross += s.gross;
          acc.net += s.net;
        });
        return acc;
      }, {
        basicSalary: 0,
        directAdditions: 0,
        indirectAdditions: 0,
        yearlyIncrease: 0,
        bonuses: 0,
        salaryDeductions: 0,
        grossDeductions: 0,
        gross: 0,
        net: 0
      });
      
      // Calculate department sub-totals within this category
      const departmentGroups: Record<string, typeof employees> = {};
      employees.forEach(emp => {
        const dept = emp.department || 'No Department';
        if (!departmentGroups[dept]) {
          departmentGroups[dept] = [];
        }
        departmentGroups[dept].push(emp);
      });
      
      const departmentTotals: Record<string, any> = {};
      Object.entries(departmentGroups).forEach(([department, deptEmployees]) => {
        const deptTotals = deptEmployees.reduce((acc, emp) => {
          emp.salaries.forEach(s => {
            acc.basicSalary += s.basicSalary;
            acc.directAdditions += s.directAdditions;
            acc.indirectAdditions += s.indirectAdditions;
            acc.yearlyIncrease += s.yearlyIncrease;
            acc.bonuses += s.bonuses;
            acc.salaryDeductions += s.salaryDeductions;
            acc.grossDeductions += s.grossDeductions;
            acc.gross += s.gross;
            acc.net += s.net;
          });
          return acc;
        }, {
          basicSalary: 0,
          directAdditions: 0,
          indirectAdditions: 0,
          yearlyIncrease: 0,
          bonuses: 0,
          salaryDeductions: 0,
          grossDeductions: 0,
          gross: 0,
          net: 0
        });
        
        departmentTotals[department] = {
          employeeCount: deptEmployees.length,
          totals: deptTotals
        };
      });
      
      categoryTotals[category] = {
        employeeCount: employees.length,
        totals,
        departments: departmentTotals
      };
    }
    
    res.json({
      year,
      categoryTotals
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/joiners-leavers?year=YYYY
 * Get joiners and leavers report
 */
reportsRouter.get('/joiners-leavers', async (req, res) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    
    // Get all employees with their salary records for current year, previous year, and next year
    const employees = await prisma.employee.findMany({
      include: {
        salaries: {
          where: {
            year: {
              in: [year - 1, year, year + 1]
            }
          },
          orderBy: [
            { year: 'asc' },
            { month: 'asc' }
          ],
          select: { 
            year: true,
            month: true 
          }
        }
      }
    });
    
    const joiners: any[] = [];
    const leavers: any[] = [];
    
    for (const employee of employees) {
      // Separate salaries by year
      const currentYearSalaries = employee.salaries.filter(s => s.year === year);
      const previousYearSalaries = employee.salaries.filter(s => s.year === year - 1);
      const nextYearSalaries = employee.salaries.filter(s => s.year === year + 1);
      
      if (currentYearSalaries.length === 0) continue;
      
      const currentYearMonths = currentYearSalaries.map(s => s.month);
      const firstMonth = Math.min(...currentYearMonths);
      const lastMonth = Math.max(...currentYearMonths);
      
      // Check if employee is a joiner
      // They're a joiner if:
      // 1. First month in current year > 1 (didn't start in January)
      // 2. AND they didn't have records in the previous year (or had records but ended before December)
      const hadPreviousYearRecords = previousYearSalaries.length > 0;
      const previousYearLastMonth = hadPreviousYearRecords 
        ? Math.max(...previousYearSalaries.map(s => s.month))
        : 0;
      
      // True joiner: First month > 1 AND (no previous year records OR previous year ended before December)
      const isTrueJoiner = firstMonth > 1 && (!hadPreviousYearRecords || previousYearLastMonth < 12);
      
      if (isTrueJoiner) {
        joiners.push({
          employee: {
            id: employee.id,
            name: employee.name,
            category: employee.category
          },
          firstMonth,
          firstMonthName: getMonthName(firstMonth)
        });
      }
      
      // Check if employee is a leaver
      // They're a leaver if:
      // 1. Last month in current year < 12 (didn't work until December)
      // 2. AND they don't have records in the next year (or next year starts after January)
      const hasNextYearRecords = nextYearSalaries.length > 0;
      const nextYearFirstMonth = hasNextYearRecords 
        ? Math.min(...nextYearSalaries.map(s => s.month))
        : 13; // Set to 13 if no next year records (meaning they left)
      
      // True leaver: Last month < 12 AND (no next year records OR next year starts after January)
      const isTrueLeaver = lastMonth < 12 && (!hasNextYearRecords || nextYearFirstMonth > 1);
      
      if (isTrueLeaver) {
        leavers.push({
          employee: {
            id: employee.id,
            name: employee.name,
            category: employee.category
          },
          lastMonth,
          lastMonthName: getMonthName(lastMonth)
        });
      }
    }
    
    res.json({
      year,
      joiners,
      leavers,
      summary: {
        totalJoiners: joiners.length,
        totalLeavers: leavers.length,
        netChange: joiners.length - leavers.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/salary-changes?year=YYYY
 * Get salary changes report
 */
reportsRouter.get('/salary-changes', async (req, res) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    
    const employees = await prisma.employee.findMany({
      include: {
        salaries: {
          where: { year },
          orderBy: { month: 'asc' }
        }
      }
    });
    
    const changes: any[] = [];
    
    for (const employee of employees) {
      const salaries = employee.salaries;
      if (salaries.length < 2) continue;
      
      for (let i = 1; i < salaries.length; i++) {
        const prev = salaries[i - 1];
        const curr = salaries[i];
        
        // Only check for changes in basic salary (صافي الاتعاب والمرتبات / Salary)
        if (prev.basicSalary !== curr.basicSalary) {
          changes.push({
            employee: {
              id: employee.id,
              name: employee.name,
              category: employee.category
            },
            month: curr.month,
            monthName: getMonthName(curr.month),
            previousBasicSalary: prev.basicSalary,
            newBasicSalary: curr.basicSalary,
            change: curr.basicSalary - prev.basicSalary
          });
        }
      }
    }
    
    // Calculate totals
    const totals = changes.reduce((acc, change) => ({
      previousBasicSalary: acc.previousBasicSalary + (change.previousBasicSalary || 0),
      newBasicSalary: acc.newBasicSalary + (change.newBasicSalary || 0),
      change: acc.change + (change.change || 0)
    }), {
      previousBasicSalary: 0,
      newBasicSalary: 0,
      change: 0
    });
    
    res.json({
      year,
      changes,
      totals
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/annual-bonus?year=YYYY&includeConsultants=true|false
 * Get annual bonus report data
 */
reportsRouter.get('/annual-bonus', async (req, res) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const includeConsultants = req.query.includeConsultants === 'true' || req.query.includeConsultants === undefined;
    
    // Fetch annual bonus records for the year
    let bonuses = [];
    try {
      bonuses = await prisma.annualBonus.findMany({
        where: { year },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        },
        orderBy: {
          employee: {
            name: 'asc'
          }
        }
      });
    } catch (queryError: any) {
      console.error('Error querying annual bonuses with orderBy, trying without:', queryError);
      // Fallback: try without orderBy if it fails
      bonuses = await prisma.annualBonus.findMany({
        where: { year },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        }
      });
    }
    
    // Filter out bonuses where employee is null (but include uncategorized employees)
    const validBonuses = bonuses.filter(b => b.employee);
    
    if (validBonuses.length === 0) {
      return res.json({
        year,
        grandTotal: {
          totalBonus: 0,
          totalFirstHalf: 0,
          totalSecondHalf: 0,
          totalPreviousYear: 0,
          employeeCount: 0,
          averageBonus: 0
        },
        totalsWithoutConsultants: {
          totalBonus: 0,
          totalFirstHalf: 0,
          totalSecondHalf: 0,
          totalPreviousYear: 0,
          employeeCount: 0,
          averageBonus: 0
        },
        categoryTotals: {},
        growthRatios: { netSalary: null, grossSalary: null }
      });
    }
    
    // Filter consultants if needed (include uncategorized employees)
    const bonusesToInclude = includeConsultants 
      ? validBonuses 
      : validBonuses.filter(b => !b.employee.category || b.employee.category !== 'Consultants/مستشارين');
    
    // Calculate grand totals
    const grandTotal = bonusesToInclude.reduce((acc, b) => {
      acc.totalBonus += b.bonusAmount || 0;
      acc.totalFirstHalf += b.bonusFirstHalf || 0;
      acc.totalSecondHalf += b.bonusSecondHalf || 0;
      acc.totalPreviousYear += b.previousYearBonus || 0;
      return acc;
    }, {
      totalBonus: 0,
      totalFirstHalf: 0,
      totalSecondHalf: 0,
      totalPreviousYear: 0,
      employeeCount: 0,
      averageBonus: 0
    });
    grandTotal.employeeCount = bonusesToInclude.length;
    grandTotal.averageBonus = grandTotal.employeeCount > 0 ? grandTotal.totalBonus / grandTotal.employeeCount : 0;
    
    // Calculate totals without consultants (include uncategorized employees)
    const bonusesWithoutConsultants = validBonuses.filter(b => !b.employee.category || b.employee.category !== 'Consultants/مستشارين');
    const totalsWithoutConsultants = bonusesWithoutConsultants.reduce((acc, b) => {
      acc.totalBonus += b.bonusAmount || 0;
      acc.totalFirstHalf += b.bonusFirstHalf || 0;
      acc.totalSecondHalf += b.bonusSecondHalf || 0;
      acc.totalPreviousYear += b.previousYearBonus || 0;
      return acc;
    }, {
      totalBonus: 0,
      totalFirstHalf: 0,
      totalSecondHalf: 0,
      totalPreviousYear: 0,
      employeeCount: 0,
      averageBonus: 0
    });
    totalsWithoutConsultants.employeeCount = bonusesWithoutConsultants.length;
    totalsWithoutConsultants.averageBonus = totalsWithoutConsultants.employeeCount > 0 
      ? totalsWithoutConsultants.totalBonus / totalsWithoutConsultants.employeeCount 
      : 0;
    
    // Calculate category totals with Department as sub-category
    // Group by Category first, then by Department within each Category
    const categoryTotals: Record<string, any> = {};
    const categoryGroups = bonusesToInclude.reduce((acc, b) => {
      const category = b.employee.category || 'Uncategorized';
      const categoryKey = category;
      
      if (!acc[categoryKey]) {
        acc[categoryKey] = {
          employees: [],
          departments: {} as Record<string, typeof bonusesToInclude>
        };
      }
      
      // Group by department within category
      const department = b.employee.department || 'No Department';
      if (!acc[categoryKey].departments[department]) {
        acc[categoryKey].departments[department] = [];
      }
      acc[categoryKey].departments[department].push(b);
      acc[categoryKey].employees.push(b);
      
      return acc;
    }, {} as Record<string, { employees: typeof bonusesToInclude, departments: Record<string, typeof bonusesToInclude> }>);
    
    // Debug: Log categories found
    console.log(`Annual Bonus Report for ${year}: Found ${bonusesToInclude.length} bonuses, ${Object.keys(categoryGroups).length} categories`);
    console.log('Categories:', Object.keys(categoryGroups));
    
    Object.entries(categoryGroups).forEach(([category, categoryData]) => {
      const { employees: categoryBonuses, departments } = categoryData;
      
      // Calculate totals for the entire category
      const totals = categoryBonuses.reduce((acc, b) => {
        acc.totalBonus += b.bonusAmount || 0;
        acc.totalFirstHalf += b.bonusFirstHalf || 0;
        acc.totalSecondHalf += b.bonusSecondHalf || 0;
        acc.totalPreviousYear += b.previousYearBonus || 0;
        return acc;
      }, {
        totalBonus: 0,
        totalFirstHalf: 0,
        totalSecondHalf: 0,
        totalPreviousYear: 0,
        employeeCount: 0,
        averageBonus: 0
      });
      
      totals.employeeCount = categoryBonuses.length;
      totals.averageBonus = totals.employeeCount > 0 ? totals.totalBonus / totals.employeeCount : 0;
      
      // Calculate department sub-totals
      const departmentTotals: Record<string, any> = {};
      Object.entries(departments).forEach(([department, deptBonuses]) => {
        const deptTotals = deptBonuses.reduce((acc, b) => {
          acc.totalBonus += b.bonusAmount || 0;
          acc.totalFirstHalf += b.bonusFirstHalf || 0;
          acc.totalSecondHalf += b.bonusSecondHalf || 0;
          acc.totalPreviousYear += b.previousYearBonus || 0;
          return acc;
        }, {
          totalBonus: 0,
          totalFirstHalf: 0,
          totalSecondHalf: 0,
          totalPreviousYear: 0,
          employeeCount: 0,
          averageBonus: 0
        });
        
        deptTotals.employeeCount = deptBonuses.length;
        deptTotals.averageBonus = deptTotals.employeeCount > 0 ? deptTotals.totalBonus / deptTotals.employeeCount : 0;
        deptTotals.employees = deptBonuses.map(b => ({
          employee: b.employee,
          bonus: b.bonusAmount || 0,
          bonusFirstHalf: b.bonusFirstHalf || 0,
          bonusSecondHalf: b.bonusSecondHalf || 0,
          previousYearBonus: b.previousYearBonus || 0,
          reflectedInMonths: b.reflectedInMonths || 0,
          reflectedInPercent: b.reflectedInPercent || 0
        }));
        
        departmentTotals[department] = deptTotals;
      });
      
      // Include individual employee records for the frontend (all employees in category)
      totals.employees = categoryBonuses.map(b => ({
        employee: b.employee,
        bonus: b.bonusAmount || 0,
        bonusFirstHalf: b.bonusFirstHalf || 0,
        bonusSecondHalf: b.bonusSecondHalf || 0,
        previousYearBonus: b.previousYearBonus || 0,
        reflectedInMonths: b.reflectedInMonths || 0,
        reflectedInPercent: b.reflectedInPercent || 0
      }));
      
      totals.departments = departmentTotals;
      categoryTotals[category] = totals;
    });
    
    // Calculate growth ratios (using annual increase data)
    const growthRatios = {
      netSalary: null as number | null,
      grossSalary: null as number | null
    };
    
    const bonusesWithSalaryData = bonusesToInclude.filter(b => 
      (b.currentYearNet && b.previousYearNet) || (b.currentYearGross && b.previousYearGross)
    );
    
    if (bonusesWithSalaryData.length > 0) {
      const totalPreviousNet = bonusesWithSalaryData.reduce((sum, b) => sum + (b.previousYearNet || 0), 0);
      const totalCurrentNet = bonusesWithSalaryData.reduce((sum, b) => sum + (b.currentYearNet || 0), 0);
      const totalPreviousGross = bonusesWithSalaryData.reduce((sum, b) => sum + (b.previousYearGross || 0), 0);
      const totalCurrentGross = bonusesWithSalaryData.reduce((sum, b) => sum + (b.currentYearGross || 0), 0);
      
      if (totalPreviousNet > 0) {
        growthRatios.netSalary = ((totalCurrentNet - totalPreviousNet) / totalPreviousNet) * 100;
      }
      if (totalPreviousGross > 0) {
        growthRatios.grossSalary = ((totalCurrentGross - totalPreviousGross) / totalPreviousGross) * 100;
      }
    }
    
    res.json({
      year,
      grandTotal,
      totalsWithoutConsultants,
      categoryTotals,
      growthRatios
    });
  } catch (error: any) {
    console.error('Error fetching annual bonus report:', error);
    res.status(500).json({ 
      error: error.message, 
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

/**
 * GET /api/reports/quick-stats?year=YYYY
 * Get quick statistics for the dashboard
 */
reportsRouter.get('/quick-stats', async (req, res) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    
    // Get total employees
    const totalEmployees = await prisma.employee.groupBy({
      by: ['id']
    });
    
    // Get total salary records for the year
    const salaryRecords = await prisma.salaryRecord.findMany({
      where: { year },
      select: { net: true, gross: true }
    });
    
    const totalNet = salaryRecords.reduce((sum, r) => sum + r.net, 0);
    const totalGross = salaryRecords.reduce((sum, r) => sum + r.gross, 0);
    
    // Get bonus records for the year
    const bonusRecords = await prisma.annualBonus.findMany({
      where: { year },
      select: { bonusAmount: true }
    });
    
    const totalBonus = bonusRecords.reduce((sum, r) => sum + r.bonusAmount, 0);
    
    // Calculate average salary
    const averageSalary = salaryRecords.length > 0 ? totalNet / salaryRecords.length : 0;
    
    // Get category distribution
    const employees = await prisma.employee.findMany({
      where: {
        salaries: {
          some: { year }
        }
      },
      select: { category: true }
    });
    
    const categoryDistribution: Record<string, number> = {};
    employees.forEach(emp => {
      if (emp.category) {
        categoryDistribution[emp.category] = (categoryDistribution[emp.category] || 0) + 1;
      }
    });
    
    res.json({
      year,
      totalEmployees: totalEmployees.length,
      totalPayroll: totalNet, // Frontend expects totalPayroll
      totalNet,
      totalGross,
      totalBonus,
      averageSalary, // Frontend expects averageSalary
      salaryRecordsCount: salaryRecords.length,
      bonusRecordsCount: bonusRecords.length,
      categoryDistribution
    });
  } catch (error: any) {
    console.error('Error fetching quick stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/bonus-incentive-analysis?year=YYYY
 * Get bonus and incentive analysis report
 */
reportsRouter.get('/bonus-incentive-analysis', async (req, res) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    
    // Get all bonus records for the year
    const bonuses = await prisma.annualBonus.findMany({
      where: { year },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            category: true
          }
        }
      }
    });
    
    // Calculate statistics
    const totalBonus = bonuses.reduce((sum, b) => sum + b.bonusAmount, 0);
    const averageBonus = bonuses.length > 0 ? totalBonus / bonuses.length : 0;
    const maxBonus = bonuses.length > 0 ? Math.max(...bonuses.map(b => b.bonusAmount)) : 0;
    const minBonus = bonuses.length > 0 ? Math.min(...bonuses.map(b => b.bonusAmount)) : 0;
    
    // Group by category
    const byCategory: Record<string, any> = {};
    bonuses.forEach(b => {
      const category = b.employee.category || 'Unknown';
      if (!byCategory[category]) {
        byCategory[category] = {
          count: 0,
          total: 0,
          average: 0,
          max: 0,
          min: Infinity
        };
      }
      byCategory[category].count++;
      byCategory[category].total += b.bonusAmount;
      byCategory[category].max = Math.max(byCategory[category].max, b.bonusAmount);
      byCategory[category].min = Math.min(byCategory[category].min, b.bonusAmount);
    });
    
    Object.keys(byCategory).forEach(cat => {
      byCategory[cat].average = byCategory[cat].total / byCategory[cat].count;
      if (byCategory[cat].min === Infinity) byCategory[cat].min = 0;
    });
    
    res.json({
      year,
      summary: {
        totalEmployees: bonuses.length,
        totalBonus,
        averageBonus,
        maxBonus,
        minBonus
      },
      byCategory
    });
  } catch (error: any) {
    console.error('Error fetching bonus incentive analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/monthly-summary?year=YYYY
 * Get monthly summary report
 */
reportsRouter.get('/monthly-summary', async (req, res) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    
    // Get all salary records for the year, grouped by month
    const salaryRecords = await prisma.salaryRecord.findMany({
      where: { year },
      orderBy: { month: 'asc' }
    });
    
    // Group by month and calculate totals
    const monthlyData: any[] = [];
    const monthTotals: Record<number, any> = {};
    
    salaryRecords.forEach(record => {
      if (!monthTotals[record.month]) {
        monthTotals[record.month] = {
          month: record.month,
          monthName: getMonthName(record.month),
          basicSalary: 0,
          gross: 0,
          net: 0,
          directAdditions: 0,
          indirectAdditions: 0,
          bonuses: 0,
          salaryDeductions: 0,
          grossDeductions: 0,
          employeeCount: new Set<string>()
        };
      }
      
      const monthData = monthTotals[record.month];
      monthData.basicSalary += record.basicSalary || 0;
      monthData.gross += record.gross || 0;
      monthData.net += record.net || 0;
      monthData.directAdditions += record.directAdditions || 0;
      monthData.indirectAdditions += record.indirectAdditions || 0;
      monthData.bonuses += record.bonuses || 0;
      monthData.salaryDeductions += record.salaryDeductions || 0;
      monthData.grossDeductions += record.grossDeductions || 0;
      monthData.employeeCount.add(record.employeeId);
    });
    
    // Convert to array and calculate employee counts
    for (let month = 1; month <= 12; month++) {
      if (monthTotals[month]) {
        monthTotals[month].employeeCount = monthTotals[month].employeeCount.size;
        monthlyData.push(monthTotals[month]);
      } else {
        monthlyData.push({
          month,
          monthName: getMonthName(month),
          basicSalary: 0,
          gross: 0,
          net: 0,
          directAdditions: 0,
          indirectAdditions: 0,
          bonuses: 0,
          salaryDeductions: 0,
          grossDeductions: 0,
          employeeCount: 0
        });
      }
    }
    
    // Calculate grand totals
    const totals = monthlyData.reduce((acc, month) => ({
      basicSalary: acc.basicSalary + month.basicSalary,
      gross: acc.gross + month.gross,
      net: acc.net + month.net,
      directAdditions: acc.directAdditions + month.directAdditions,
      indirectAdditions: acc.indirectAdditions + month.indirectAdditions,
      bonuses: acc.bonuses + month.bonuses,
      salaryDeductions: acc.salaryDeductions + month.salaryDeductions,
      grossDeductions: acc.grossDeductions + month.grossDeductions
    }), {
      basicSalary: 0,
      gross: 0,
      net: 0,
      directAdditions: 0,
      indirectAdditions: 0,
      bonuses: 0,
      salaryDeductions: 0,
      grossDeductions: 0
    });
    
    res.json({
      year,
      monthlyData,
      totals
    });
  } catch (error: any) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/additions-deductions-breakdown?year=YYYY
 * Get additions and deductions breakdown report
 */
reportsRouter.get('/additions-deductions-breakdown', async (req, res) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    
    // Get all salary records for the year with employee info
    const salaryRecords = await prisma.salaryRecord.findMany({
      where: { year },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            category: true
          }
        }
      }
    });
    
    // Calculate consolidated additions breakdown
    const additionsBreakdown: Record<string, number> = {
      'Direct Additions': 0,
      'Indirect Additions': 0,
      'Bonuses': 0,
      'Yearly Increase': 0
    };
    
    // Calculate consolidated deductions breakdown
    const deductionsBreakdown: Record<string, number> = {
      'Salary Deductions': 0,
      'Gross Deductions': 0
    };
    
    // Detailed breakdowns (by specific category from JSON)
    const additionsDetails: Record<string, number> = {};
    const deductionsDetails: Record<string, number> = {};
    const additionsByEmployee: any[] = [];
    const deductionsByEmployee: any[] = [];
    
    salaryRecords.forEach(record => {
      // Consolidated totals
      additionsBreakdown['Direct Additions'] += record.directAdditions || 0;
      additionsBreakdown['Indirect Additions'] += record.indirectAdditions || 0;
      additionsBreakdown['Bonuses'] += record.bonuses || 0;
      additionsBreakdown['Yearly Increase'] += record.yearlyIncrease || 0;
      
      deductionsBreakdown['Salary Deductions'] += record.salaryDeductions || 0;
      deductionsBreakdown['Gross Deductions'] += record.grossDeductions || 0;
      
      // Detailed breakdown from JSON fields
      if (record.additionsBreakdown) {
        try {
          const breakdown = JSON.parse(record.additionsBreakdown);
          Object.entries(breakdown).forEach(([category, amount]: [string, any]) => {
            additionsDetails[category] = (additionsDetails[category] || 0) + (amount || 0);
          });
        } catch (e) {
          // Ignore invalid JSON
        }
      }
      
      if (record.deductionsBreakdown) {
        try {
          const breakdown = JSON.parse(record.deductionsBreakdown);
          Object.entries(breakdown).forEach(([category, amount]: [string, any]) => {
            deductionsDetails[category] = (deductionsDetails[category] || 0) + (amount || 0);
          });
        } catch (e) {
          // Ignore invalid JSON
        }
      }
      
      // Employee-level details
      if (record.employee) {
        const totalAdditions = (record.directAdditions || 0) + (record.indirectAdditions || 0) + (record.bonuses || 0) + (record.yearlyIncrease || 0);
        const totalDeductions = (record.salaryDeductions || 0) + (record.grossDeductions || 0);
        
        if (totalAdditions > 0) {
          additionsByEmployee.push({
            employee: {
              id: record.employee.id,
              name: record.employee.name,
              category: record.employee.category
            },
            month: record.month,
            monthName: record.monthName,
            directAdditions: record.directAdditions || 0,
            indirectAdditions: record.indirectAdditions || 0,
            bonuses: record.bonuses || 0,
            yearlyIncrease: record.yearlyIncrease || 0,
            total: totalAdditions
          });
        }
        
        if (totalDeductions > 0) {
          deductionsByEmployee.push({
            employee: {
              id: record.employee.id,
              name: record.employee.name,
              category: record.employee.category
            },
            month: record.month,
            monthName: record.monthName,
            salaryDeductions: record.salaryDeductions || 0,
            grossDeductions: record.grossDeductions || 0,
            total: totalDeductions
          });
        }
      }
    });
    
    // Convert to arrays and calculate totals
    const additionsArray = Object.entries(additionsBreakdown)
      .filter(([_, amount]) => amount > 0)
      .map(([category, amount]) => ({ category, amount }));
    
    const deductionsArray = Object.entries(deductionsBreakdown)
      .filter(([_, amount]) => amount > 0)
      .map(([category, amount]) => ({ category, amount }));
    
    // Detailed breakdown arrays
    const additionsDetailsArray = Object.entries(additionsDetails)
      .filter(([_, amount]) => amount > 0)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    
    const deductionsDetailsArray = Object.entries(deductionsDetails)
      .filter(([_, amount]) => amount > 0)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    
    const additionsTotal = additionsArray.reduce((sum, item) => sum + item.amount, 0);
    const deductionsTotal = deductionsArray.reduce((sum, item) => sum + item.amount, 0);
    
    res.json({
      year,
      additions: {
        total: additionsTotal,
        breakdown: additionsArray,
        details: additionsDetailsArray,
        byEmployee: additionsByEmployee
      },
      deductions: {
        total: deductionsTotal,
        breakdown: deductionsArray,
        details: deductionsDetailsArray,
        byEmployee: deductionsByEmployee
      }
    });
  } catch (error: any) {
    console.error('Error fetching additions-deductions breakdown:', error);
    res.status(500).json({ error: error.message });
  }
});

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}
