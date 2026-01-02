import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const salariesCrudRouter = Router();

/**
 * POST /api/salaries
 * Create a new salary record
 */
salariesCrudRouter.post('/', async (req, res) => {
  try {
    const {
      employeeId,
      year,
      month,
      monthName,
      basicSalary,
      directAdditions,
      indirectAdditions,
      yearlyIncrease,
      bonuses,
      salaryDeductions,
      grossDeductions,
      gross,
      net,
      additionsBreakdown,
      deductionsBreakdown,
      paymentMethod,
      accountNumber,
      notes,
      category,
      sourceFile
    } = req.body;

    if (!employeeId || !year || !month) {
      return res.status(400).json({ error: 'Employee ID, year, and month are required' });
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if salary record already exists for this employee/year/month
    const existing = await prisma.salaryRecord.findUnique({
      where: {
        employeeId_year_month: {
          employeeId,
          year: parseInt(year),
          month: parseInt(month)
        }
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Salary record already exists for this employee, year, and month' });
    }

    const salary = await prisma.salaryRecord.create({
      data: {
        employeeId,
        year: parseInt(year),
        month: parseInt(month),
        monthName: monthName || new Date(parseInt(year), parseInt(month) - 1).toLocaleString('en-US', { month: 'long' }),
        basicSalary: parseFloat(basicSalary) || 0,
        directAdditions: parseFloat(directAdditions) || 0,
        indirectAdditions: parseFloat(indirectAdditions) || 0,
        yearlyIncrease: parseFloat(yearlyIncrease) || 0,
        bonuses: parseFloat(bonuses) || 0,
        salaryDeductions: parseFloat(salaryDeductions) || 0,
        grossDeductions: parseFloat(grossDeductions) || 0,
        gross: parseFloat(gross) || 0,
        net: parseFloat(net) || 0,
        additionsBreakdown: additionsBreakdown ? JSON.stringify(additionsBreakdown) : null,
        deductionsBreakdown: deductionsBreakdown ? JSON.stringify(deductionsBreakdown) : null,
        paymentMethod: paymentMethod || null,
        accountNumber: accountNumber || null,
        notes: notes || null,
        category: category || null,
        sourceFile: sourceFile || 'Manual Entry'
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true
          }
        }
      }
    });

    res.status(201).json(salary);
  } catch (error: any) {
    console.error('Error creating salary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/salaries
 * List all salary records
 */
salariesCrudRouter.get('/', async (req, res) => {
  try {
    const { employeeId, year, month, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (employeeId) {
      where.employeeId = employeeId as string;
    }
    if (year) {
      where.year = parseInt(year as string);
    }
    if (month) {
      where.month = parseInt(month as string);
    }

    const [salaries, total] = await Promise.all([
      prisma.salaryRecord.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              employeeCode: true,
              category: true
            }
          }
        },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' }
        ],
        skip,
        take: limitNum
      }),
      prisma.salaryRecord.count({ where })
    ]);

    res.json({
      salaries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error fetching salaries:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/salaries/:id
 * Get a single salary record
 */
salariesCrudRouter.get('/:id', async (req, res) => {
  try {
    const salary = await prisma.salaryRecord.findUnique({
      where: { id: req.params.id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            category: true
          }
        }
      }
    });

    if (!salary) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    res.json(salary);
  } catch (error: any) {
    console.error('Error fetching salary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/salaries/:id
 * Update a salary record
 */
salariesCrudRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      employeeId,
      year,
      month,
      monthName,
      basicSalary,
      directAdditions,
      indirectAdditions,
      yearlyIncrease,
      bonuses,
      salaryDeductions,
      grossDeductions,
      gross,
      net,
      additionsBreakdown,
      deductionsBreakdown,
      paymentMethod,
      accountNumber,
      notes,
      category,
      sourceFile
    } = req.body;

    const existing = await prisma.salaryRecord.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    // If year or month changed, check for conflicts
    if ((year && parseInt(year) !== existing.year) || (month && parseInt(month) !== existing.month)) {
      const newYear = year ? parseInt(year) : existing.year;
      const newMonth = month ? parseInt(month) : existing.month;
      const employeeIdToCheck = employeeId || existing.employeeId;

      const conflict = await prisma.salaryRecord.findUnique({
        where: {
          employeeId_year_month: {
            employeeId: employeeIdToCheck,
            year: newYear,
            month: newMonth
          }
        }
      });

      if (conflict && conflict.id !== id) {
        return res.status(409).json({ error: 'Salary record already exists for this employee, year, and month' });
      }
    }

    const salary = await prisma.salaryRecord.update({
      where: { id },
      data: {
        ...(employeeId !== undefined && { employeeId }),
        ...(year !== undefined && { year: parseInt(year) }),
        ...(month !== undefined && { month: parseInt(month) }),
        ...(monthName !== undefined && { monthName }),
        ...(basicSalary !== undefined && { basicSalary: parseFloat(basicSalary) || 0 }),
        ...(directAdditions !== undefined && { directAdditions: parseFloat(directAdditions) || 0 }),
        ...(indirectAdditions !== undefined && { indirectAdditions: parseFloat(indirectAdditions) || 0 }),
        ...(yearlyIncrease !== undefined && { yearlyIncrease: parseFloat(yearlyIncrease) || 0 }),
        ...(bonuses !== undefined && { bonuses: parseFloat(bonuses) || 0 }),
        ...(salaryDeductions !== undefined && { salaryDeductions: parseFloat(salaryDeductions) || 0 }),
        ...(grossDeductions !== undefined && { grossDeductions: parseFloat(grossDeductions) || 0 }),
        ...(gross !== undefined && { gross: parseFloat(gross) || 0 }),
        ...(net !== undefined && { net: parseFloat(net) || 0 }),
        ...(additionsBreakdown !== undefined && { additionsBreakdown: additionsBreakdown ? JSON.stringify(additionsBreakdown) : null }),
        ...(deductionsBreakdown !== undefined && { deductionsBreakdown: deductionsBreakdown ? JSON.stringify(deductionsBreakdown) : null }),
        ...(paymentMethod !== undefined && { paymentMethod: paymentMethod || null }),
        ...(accountNumber !== undefined && { accountNumber: accountNumber || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(category !== undefined && { category: category || null }),
        ...(sourceFile !== undefined && { sourceFile: sourceFile || null })
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true
          }
        }
      }
    });

    res.json(salary);
  } catch (error: any) {
    console.error('Error updating salary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/salaries/:id
 * Delete a salary record
 */
salariesCrudRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const salary = await prisma.salaryRecord.findUnique({
      where: { id }
    });

    if (!salary) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    await prisma.salaryRecord.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Salary record deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting salary:', error);
    res.status(500).json({ error: error.message });
  }
});

