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
      
      categoryTotals[category] = {
        employeeCount: employees.length,
        totals
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
    
    // Filter out bonuses where employee is null or category is missing
    const validBonuses = bonuses.filter(b => b.employee && b.employee.category);
    
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
    
    // Filter consultants if needed
    const bonusesToInclude = includeConsultants 
      ? validBonuses 
      : validBonuses.filter(b => b.employee.category !== 'Consultants/مستشارين');
    
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
    
    // Calculate totals without consultants
    const bonusesWithoutConsultants = validBonuses.filter(b => b.employee.category !== 'Consultants/مستشارين');
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
    
    // Calculate category totals
    const categoryTotals: Record<string, any> = {};
    const categoryGroups = bonusesToInclude.reduce((acc, b) => {
      const category = b.employee.category || 'Unknown';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(b);
      return acc;
    }, {} as Record<string, typeof bonusesToInclude>);
    
    Object.entries(categoryGroups).forEach(([category, categoryBonuses]) => {
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

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}
