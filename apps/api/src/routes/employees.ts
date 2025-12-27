import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  calculateReflectedInMonths,
  calculateReflectedInPercent,
  calculateRemainingFromPrevious,
  calculateYearComparison,
  calculateGrowthRatio
} from '../utils/bonus-calculations.js';

const prisma = new PrismaClient();
export const employeesRouter = Router();

/**
 * GET /api/employees
 * List all employees
 * Category is taken from the latest salary record
 */
employeesRouter.get('/', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        _count: {
          select: { salaries: true }
        },
        salaries: {
          orderBy: [
            { year: 'desc' },
            { month: 'desc' }
          ],
          take: 1, // Get only the latest record
          select: {
            category: true,
            year: true,
            month: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    // Map employees to include category from latest salary record
    const employeesWithLatestCategory = employees.map(emp => {
      const latestSalary = emp.salaries[0];
      return {
        ...emp,
        category: latestSalary?.category || emp.category, // Use category from latest record, fallback to employee.category
        salaries: undefined // Remove salaries from response
      };
    });
    
    console.log(`Returning ${employeesWithLatestCategory.length} employees`);
    res.json(employeesWithLatestCategory);
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
    
    // Track category changes across all records (not just this year)
    const allSalaries = await prisma.salaryRecord.findMany({
      where: { employeeId: employee.id },
      orderBy: [
        { year: 'asc' },
        { month: 'asc' }
      ],
      select: {
        year: true,
        month: true,
        monthName: true,
        category: true
      }
    });
    
    const categoryChanges: Array<{
      fromCategory: string | null;
      toCategory: string;
      year: number;
      month: number;
      monthName: string;
    }> = [];
    
    let previousCategory: string | null = null;
    for (const salary of allSalaries) {
      if (salary.category && salary.category !== previousCategory) {
        categoryChanges.push({
          fromCategory: previousCategory,
          toCategory: salary.category,
          year: salary.year,
          month: salary.month,
          monthName: salary.monthName
        });
        previousCategory = salary.category;
      } else if (!salary.category && previousCategory) {
        // Category was removed
        previousCategory = null;
      } else if (salary.category && !previousCategory) {
        // Category was added
        categoryChanges.push({
          fromCategory: null,
          toCategory: salary.category,
          year: salary.year,
          month: salary.month,
          monthName: salary.monthName
        });
        previousCategory = salary.category;
      }
    }
    
    res.json({
      employee,
      year,
      monthlyData: salaries,
      totals,
      additionsByCategory,
      deductionsByCategory,
      categoryChanges, // Include category change history
      missingMonths: Array.from({ length: 12 }, (_, i) => i + 1)
        .filter(m => !salaries.some(s => s.month === m))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/employees/:id/bonus?year=YYYY
 * Get annual bonus details for a specific employee for a given year, including historical data.
 */
employeesRouter.get('/:id/bonus', async (req, res) => {
  try {
    const employeeId = req.params.id;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, category: true, normalizedName: true }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Fetch bonus for the requested year
    const currentYearBonus = await prisma.annualBonus.findUnique({
      where: {
        employeeId_year: {
          employeeId: employeeId,
          year: year
        }
      }
    });

    // If no bonus for current year, check if there are any bonuses for this employee
    if (!currentYearBonus) {
      const anyBonus = await prisma.annualBonus.findFirst({
        where: { employeeId: employeeId }
      });
      
      if (!anyBonus) {
        return res.status(404).json({ 
          error: 'No bonus data found for this employee',
          employee: {
            id: employee.id,
            name: employee.name,
            normalizedName: employee.normalizedName
          }
        });
      }
    }

    // Fetch historical bonuses (e.g., last 5 years)
    const historicalBonuses = await prisma.annualBonus.findMany({
      where: {
        employeeId: employeeId,
        year: {
          gte: year - 4 // Last 5 years including current
        }
      },
      orderBy: { year: 'asc' }
    });

    // Calculate average salary from salary records for context
    const salaryRecords = await prisma.salaryRecord.findMany({
      where: {
        employeeId: employeeId,
        year: year
      },
      select: {
        net: true,
        gross: true
      }
    });

    const averageSalary = salaryRecords.length > 0
      ? salaryRecords.reduce((sum, r) => sum + r.net, 0) / salaryRecords.length
      : 0;

    // Calculate growth if we have previous year bonus
    const previousYearBonus = await prisma.annualBonus.findUnique({
      where: {
        employeeId_year: {
          employeeId: employeeId,
          year: year - 1
        }
      }
    });

    const growth = previousYearBonus && currentYearBonus
      ? {
          absolute: currentYearBonus.bonusAmount - previousYearBonus.bonusAmount,
          percent: previousYearBonus.bonusAmount > 0
            ? ((currentYearBonus.bonusAmount - previousYearBonus.bonusAmount) / previousYearBonus.bonusAmount) * 100
            : 0
        }
      : null;

    res.json({
      employee,
      year,
      bonus: currentYearBonus,
      previousBonus: previousYearBonus,
      historicalBonuses,
      averageSalary,
      growth
    });
  } catch (error: any) {
    console.error('Error fetching employee bonus:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/employees/:id/bonus-comparison?fromYear=YYYY&toYear=YYYY
 * Get bonus and annual increase comparison data for an employee across a year range
 */
employeesRouter.get('/:id/bonus-comparison', async (req, res) => {
  try {
    const employeeId = req.params.id;
    const fromYear = parseInt(req.query.fromYear as string) || new Date().getFullYear() - 4;
    const toYear = parseInt(req.query.toYear as string) || new Date().getFullYear();

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, category: true }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Fetch all bonuses in the range
    const bonuses = await prisma.annualBonus.findMany({
      where: {
        employeeId: employeeId,
        year: {
          gte: fromYear,
          lte: toYear
        }
      },
      orderBy: { year: 'asc' }
    });

    // Use bonus data for annual increases (unified source, year-agnostic)
    // Annual increase comes from annualIncreaseNet field in AnnualBonus
    const annualIncreasesByYear: Record<number, {
      total: number; // annualIncreaseNet (annual increase amount)
      average: number; // Same as total (one record per year)
      count: number;
      previousYearNet: number;
      currentYearNet: number;
      previousYearGross: number;
      currentYearGross: number;
      annualIncreaseNet: number;
      annualIncreaseGross: number;
    }> = {};

    // Extract annual increase data from bonus records
    bonuses.forEach(bonus => {
      if (!annualIncreasesByYear[bonus.year]) {
        annualIncreasesByYear[bonus.year] = {
          total: bonus.annualIncreaseNet || 0,
          average: bonus.annualIncreaseNet || 0,
          count: 1,
          previousYearNet: bonus.previousYearNet || 0,
          currentYearNet: bonus.currentYearNet || 0,
          previousYearGross: bonus.previousYearGross || 0,
          currentYearGross: bonus.currentYearGross || 0,
          annualIncreaseNet: bonus.annualIncreaseNet || 0,
          annualIncreaseGross: bonus.annualIncreaseGross || 0
        };
      } else {
        // If multiple records exist for same year, aggregate (shouldn't happen but handle it)
        const data = annualIncreasesByYear[bonus.year];
        data.total += bonus.annualIncreaseNet || 0;
        data.count++;
        data.average = data.total / data.count;
        // Use latest values
        data.previousYearNet = bonus.previousYearNet || data.previousYearNet;
        data.currentYearNet = bonus.currentYearNet || data.currentYearNet;
        data.previousYearGross = bonus.previousYearGross || data.previousYearGross;
        data.currentYearGross = bonus.currentYearGross || data.currentYearGross;
        data.annualIncreaseNet = bonus.annualIncreaseNet || data.annualIncreaseNet;
        data.annualIncreaseGross = bonus.annualIncreaseGross || data.annualIncreaseGross;
      }
    });

    // Prepare comparison data
    const comparisonData = [];
    const allYears = new Set<number>();
    bonuses.forEach(b => allYears.add(b.year));
    Object.keys(annualIncreasesByYear).forEach(y => allYears.add(parseInt(y)));

    Array.from(allYears).sort().forEach(year => {
      const bonus = bonuses.find(b => b.year === year);
      const annualIncrease = annualIncreasesByYear[year];

      comparisonData.push({
        year,
        bonus: bonus?.bonusAmount || 0,
        bonusFirstHalf: bonus?.bonusFirstHalf || 0,
        bonusSecondHalf: bonus?.bonusSecondHalf || 0,
        // Unified annual increase data from bonus import (year-agnostic)
        annualIncreaseTotal: annualIncrease?.annualIncreaseNet || annualIncrease?.total || 0,
        annualIncreaseAverage: annualIncrease?.annualIncreaseNet || annualIncrease?.average || 0,
        annualIncreaseCount: annualIncrease?.count || 0,
        previousYearNet: annualIncrease?.previousYearNet || 0,
        currentYearNet: annualIncrease?.currentYearNet || 0,
        previousYearGross: annualIncrease?.previousYearGross || 0,
        currentYearGross: annualIncrease?.currentYearGross || 0,
        annualIncreaseNet: annualIncrease?.annualIncreaseNet || 0,
        annualIncreaseGross: annualIncrease?.annualIncreaseGross || 0,
        // Legacy fields for backward compatibility
        averageBasicSalary: annualIncrease?.currentYearNet || 0,
        averageNet: annualIncrease?.currentYearNet || 0,
        averageGross: annualIncrease?.currentYearGross || 0,
        reflectedInMonths: bonus?.reflectedInMonths || 0,
        reflectedInPercent: bonus?.reflectedInPercent || 0
      });
    });

    res.json({
      employee,
      fromYear,
      toYear,
      comparisonData,
      summary: {
        totalBonuses: bonuses.reduce((sum, b) => sum + b.bonusAmount, 0),
        averageBonus: bonuses.length > 0 ? bonuses.reduce((sum, b) => sum + b.bonusAmount, 0) / bonuses.length : 0,
        totalAnnualIncreases: Object.values(annualIncreasesByYear).reduce((sum, d) => sum + d.annualIncreaseNet, 0),
        averageAnnualIncrease: Object.values(annualIncreasesByYear).length > 0 
          ? Object.values(annualIncreasesByYear).reduce((sum, d) => sum + d.annualIncreaseNet, 0) / Object.values(annualIncreasesByYear).length 
          : 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching bonus comparison:', error);
    res.status(500).json({ error: error.message });
  }
});

