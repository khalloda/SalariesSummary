import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const employeesRouter = Router();

/**
 * GET /api/employees
 * List all employees
 */
employeesRouter.get('/', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        _count: {
          select: { salaries: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    console.log(`Returning ${employees.length} employees`);
    res.json(employees);
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/employees/:id
 * Get employee details
 */
employeesRouter.get('/:id', async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: {
        salaries: {
          orderBy: [
            { year: 'asc' },
            { month: 'asc' }
          ]
        }
      }
    });
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(employee);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/employees/:id/all-years
 * Get all salary records for an employee across all years
 */
employeesRouter.get('/:id/all-years', async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id }
    });
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const salaries = await prisma.salaryRecord.findMany({
      where: {
        employeeId: employee.id
      },
      orderBy: [
        { year: 'asc' },
        { month: 'asc' }
      ]
    });
    
    // Group by year
    const byYear: Record<number, any[]> = {};
    salaries.forEach(s => {
      if (!byYear[s.year]) {
        byYear[s.year] = [];
      }
      byYear[s.year].push(s);
    });
    
    // Calculate totals per year
    const yearTotals: Record<number, any> = {};
    Object.keys(byYear).forEach(yearStr => {
      const year = parseInt(yearStr);
      const yearSalaries = byYear[year];
      yearTotals[year] = yearSalaries.reduce((acc, s) => ({
        basicSalary: acc.basicSalary + s.basicSalary,
        gross: acc.gross + s.gross,
        net: acc.net + s.net,
        directAdditions: acc.directAdditions + s.directAdditions,
        indirectAdditions: acc.indirectAdditions + s.indirectAdditions,
        bonuses: acc.bonuses + s.bonuses,
        salaryDeductions: acc.salaryDeductions + s.salaryDeductions,
        grossDeductions: acc.grossDeductions + s.grossDeductions
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
    });
    
    // Get available years
    const years = Object.keys(byYear).map(y => parseInt(y)).sort();
    
    res.json({
      employee,
      years,
      byYear,
      yearTotals,
      allRecords: salaries
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/employees/:id/annual?year=YYYY
 * Get employee annual report
 */
employeesRouter.get('/:id/annual', async (req, res) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id }
    });
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const salaries = await prisma.salaryRecord.findMany({
      where: {
        employeeId: employee.id,
        year
      },
      orderBy: { month: 'asc' }
    });
    
    // Calculate totals
    const totals = salaries.reduce((acc, s) => ({
      basicSalary: acc.basicSalary + s.basicSalary,
      directAdditions: acc.directAdditions + s.directAdditions,
      indirectAdditions: acc.indirectAdditions + s.indirectAdditions,
      yearlyIncrease: acc.yearlyIncrease + s.yearlyIncrease,
      bonuses: acc.bonuses + s.bonuses,
      salaryDeductions: acc.salaryDeductions + s.salaryDeductions,
      grossDeductions: acc.grossDeductions + s.grossDeductions,
      gross: acc.gross + s.gross,
      net: acc.net + s.net
    }), {
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
    
    // Aggregate additions and deductions by category
    const additionsByCategory: Record<string, number> = {};
    const deductionsByCategory: Record<string, number> = {};
    
    salaries.forEach(s => {
      if (s.additionsBreakdown) {
        const breakdown = JSON.parse(s.additionsBreakdown as string) as Record<string, number>;
        Object.entries(breakdown).forEach(([key, value]) => {
          additionsByCategory[key] = (additionsByCategory[key] || 0) + value;
        });
      }
      if (s.deductionsBreakdown) {
        const breakdown = JSON.parse(s.deductionsBreakdown as string) as Record<string, number>;
        Object.entries(breakdown).forEach(([key, value]) => {
          deductionsByCategory[key] = (deductionsByCategory[key] || 0) + value;
        });
      }
    });
    
    res.json({
      employee,
      year,
      monthlyData: salaries,
      totals,
      additionsByCategory,
      deductionsByCategory,
      missingMonths: Array.from({ length: 12 }, (_, i) => i + 1)
        .filter(m => !salaries.some(s => s.month === m))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

