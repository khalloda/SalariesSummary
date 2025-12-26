import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const reportsRouter = Router();

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

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}
