import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const reportsRouter = Router();

/**
 * GET /api/reports/joiners-leavers?year=YYYY
 * Get joiners and leavers report
 */
reportsRouter.get('/joiners-leavers', async (req, res) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    
    // Get all employees with their first and last appearance
    const employees = await prisma.employee.findMany({
      include: {
        salaries: {
          where: { year },
          orderBy: { month: 'asc' },
          select: { month: true }
        }
      }
    });
    
    const joiners: any[] = [];
    const leavers: any[] = [];
    
    for (const employee of employees) {
      const months = employee.salaries.map(s => s.month);
      if (months.length === 0) continue;
      
      const firstMonth = Math.min(...months);
      const lastMonth = Math.max(...months);
      
      if (firstMonth > 1) {
        // Joined after January
        joiners.push({
          employee: {
            id: employee.id,
            name: employee.name
          },
          firstMonth,
          firstMonthName: getMonthName(firstMonth)
        });
      }
      
      if (lastMonth < 12) {
        // Left before December
        leavers.push({
          employee: {
            id: employee.id,
            name: employee.name
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
      joinersCount: joiners.length,
      leaversCount: leavers.length
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
              name: employee.name
            },
            month: curr.month,
            monthName: getMonthName(curr.month),
            previousValue: prev.basicSalary,
            newValue: curr.basicSalary,
            delta: curr.basicSalary - prev.basicSalary
          });
        }
      }
    }
    
    // Calculate totals
    const totals = changes.reduce((acc, change) => ({
      previousValue: acc.previousValue + (change.previousValue || 0),
      newValue: acc.newValue + (change.newValue || 0),
      delta: acc.delta + (change.delta || 0)
    }), {
      previousValue: 0,
      newValue: 0,
      delta: 0
    });
    
    res.json({
      year,
      changes,
      totalChanges: changes.length,
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

