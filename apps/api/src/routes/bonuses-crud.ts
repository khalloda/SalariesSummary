import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { canViewSalaryAmounts, type RoleName } from '../utils/auth.js';
import { logAudit } from '../utils/audit.js';
import { validateBody, validateParams } from '../validation/middleware.js';
import { BonusCreateSchema, BonusUpdateSchema, BonusIdParamSchema } from '../validation/schemas/bonuses.js';

const prisma = new PrismaClient();
export const bonusesCrudRouter = Router();

/**
 * POST /api/bonuses
 * Create a new annual bonus record
 */
bonusesCrudRouter.post('/', 
  validateBody(BonusCreateSchema),
  async (req, res) => {
  try {
    const {
      employeeId,
      year,
      previousYearNet,
      previousYearGross,
      currentYearNet,
      currentYearGross,
      annualIncreaseNet,
      annualIncreaseGross,
      amount: bonusAmount,
      firstHalf: bonusFirstHalf,
      secondHalf: bonusSecondHalf,
      previousYearBonus,
      reflectedInMonths,
      reflectedInPercent,
      remainingFromPrevious,
      yearComparison,
      notes,
      sourceFile
    } = req.body;

    const roles = (req.user?.roles ?? []) as RoleName[];
    const canSee = canViewSalaryAmounts(roles);
    if (!canSee) {
      return res.status(403).json({ error: 'Creating bonus records is restricted for this role' });
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if bonus record already exists for this employee/year
    const existing = await prisma.annualBonus.findUnique({
      where: {
        employeeId_year: {
          employeeId,
          year: parseInt(year)
        }
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Bonus record already exists for this employee and year' });
    }

    const bonus = await prisma.annualBonus.create({
      data: {
        employeeId,
        year: parseInt(year),
        previousYearNet: parseFloat(previousYearNet) || 0,
        previousYearGross: parseFloat(previousYearGross) || 0,
        currentYearNet: parseFloat(currentYearNet) || 0,
        currentYearGross: parseFloat(currentYearGross) || 0,
        annualIncreaseNet: parseFloat(annualIncreaseNet) || 0,
        annualIncreaseGross: parseFloat(annualIncreaseGross) || 0,
        netSalary: parseFloat(currentYearNet) || 0, // Legacy field
        grossSalary: parseFloat(currentYearGross) || 0, // Legacy field
        bonusAmount: parseFloat(bonusAmount) || 0,
        bonusFirstHalf: bonusFirstHalf ? parseFloat(bonusFirstHalf) : null,
        bonusSecondHalf: bonusSecondHalf ? parseFloat(bonusSecondHalf) : null,
        previousYearBonus: previousYearBonus ? parseFloat(previousYearBonus) : null,
        reflectedInMonths: reflectedInMonths ? parseFloat(reflectedInMonths) : null,
        reflectedInPercent: reflectedInPercent ? parseFloat(reflectedInPercent) : null,
        remainingFromPrevious: remainingFromPrevious ? parseFloat(remainingFromPrevious) : null,
        yearComparison: yearComparison ? parseFloat(yearComparison) : null,
        notes: notes || null,
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

    await logAudit(req.user, 'BONUS_CREATE', 'annualBonus', bonus.id, { employeeId, year });
    res.status(201).json(bonus);
  } catch (error: any) {
    console.error('Error creating bonus:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/bonuses
 * List all bonus records
 */
bonusesCrudRouter.get('/', async (req, res) => {
  try {
    const { employeeId, year, page = '1', limit = '50' } = req.query;
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

    const [bonuses, total] = await Promise.all([
      prisma.annualBonus.findMany({
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
          { employee: { name: 'asc' } }
        ],
        skip,
        take: limitNum
      }),
      prisma.annualBonus.count({ where })
    ]);

    const roles = (req.user?.roles ?? []) as RoleName[];
    const canSee = canViewSalaryAmounts(roles);

    const safeBonuses = canSee
      ? bonuses
      : bonuses.map((b) => ({
          ...b,
          bonusAmount: 'RESTRICTED',
          bonusFirstHalf: 'RESTRICTED',
          bonusSecondHalf: 'RESTRICTED',
          previousYearBonus: 'RESTRICTED',
        }));

    await logAudit(req.user, 'BONUS_LIST', 'annualBonus', undefined, { employeeId, year, total });

    res.json({
      bonuses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error fetching bonuses:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/bonuses/:id
 * Get a single bonus record
 */
bonusesCrudRouter.get('/:id', 
  validateParams(BonusIdParamSchema),
  async (req, res) => {
  try {
    const bonus = await prisma.annualBonus.findUnique({
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

    if (!bonus) {
      return res.status(404).json({ error: 'Bonus record not found' });
    }

    const roles = (req.user?.roles ?? []) as RoleName[];
    const canSee = canViewSalaryAmounts(roles);
    const safeBonus = canSee
      ? bonus
      : {
          ...bonus,
          bonusAmount: 'RESTRICTED',
          bonusFirstHalf: 'RESTRICTED',
          bonusSecondHalf: 'RESTRICTED',
          previousYearBonus: 'RESTRICTED',
        };

    await logAudit(req.user, 'BONUS_VIEW', 'annualBonus', bonus.id, undefined);

    res.json(safeBonus);
  } catch (error: any) {
    console.error('Error fetching bonus:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/bonuses/:id
 * Update a bonus record
 */
bonusesCrudRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      employeeId,
      year,
      previousYearNet,
      previousYearGross,
      currentYearNet,
      currentYearGross,
      annualIncreaseNet,
      annualIncreaseGross,
      bonusAmount,
      bonusFirstHalf,
      bonusSecondHalf,
      previousYearBonus,
      reflectedInMonths,
      reflectedInPercent,
      remainingFromPrevious,
      yearComparison,
      notes,
      sourceFile
    } = req.body;

    const existing = await prisma.annualBonus.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Bonus record not found' });
    }

    const roles = (req.user?.roles ?? []) as RoleName[];
    const canSee = canViewSalaryAmounts(roles);
    if (!canSee) {
      return res.status(403).json({ error: 'Updating bonus records is restricted for this role' });
    }

    // If year changed, check for conflicts
    if (year && parseInt(year) !== existing.year) {
      const newYear = parseInt(year);
      const employeeIdToCheck = employeeId || existing.employeeId;

      const conflict = await prisma.annualBonus.findUnique({
        where: {
          employeeId_year: {
            employeeId: employeeIdToCheck,
            year: newYear
          }
        }
      });

      if (conflict && conflict.id !== id) {
        return res.status(409).json({ error: 'Bonus record already exists for this employee and year' });
      }
    }

    const bonus = await prisma.annualBonus.update({
      where: { id },
      data: {
        ...(employeeId !== undefined && { employeeId }),
        ...(year !== undefined && { year: parseInt(year) }),
        ...(previousYearNet !== undefined && { previousYearNet: parseFloat(previousYearNet) || 0 }),
        ...(previousYearGross !== undefined && { previousYearGross: parseFloat(previousYearGross) || 0 }),
        ...(currentYearNet !== undefined && { 
          currentYearNet: parseFloat(currentYearNet) || 0,
          netSalary: parseFloat(currentYearNet) || 0 // Update legacy field
        }),
        ...(currentYearGross !== undefined && { 
          currentYearGross: parseFloat(currentYearGross) || 0,
          grossSalary: parseFloat(currentYearGross) || 0 // Update legacy field
        }),
        ...(annualIncreaseNet !== undefined && { annualIncreaseNet: parseFloat(annualIncreaseNet) || 0 }),
        ...(annualIncreaseGross !== undefined && { annualIncreaseGross: parseFloat(annualIncreaseGross) || 0 }),
        ...(bonusAmount !== undefined && { bonusAmount: parseFloat(bonusAmount) || 0 }),
        ...(bonusFirstHalf !== undefined && { bonusFirstHalf: bonusFirstHalf ? parseFloat(bonusFirstHalf) : null }),
        ...(bonusSecondHalf !== undefined && { bonusSecondHalf: bonusSecondHalf ? parseFloat(bonusSecondHalf) : null }),
        ...(previousYearBonus !== undefined && { previousYearBonus: previousYearBonus ? parseFloat(previousYearBonus) : null }),
        ...(reflectedInMonths !== undefined && { reflectedInMonths: reflectedInMonths ? parseFloat(reflectedInMonths) : null }),
        ...(reflectedInPercent !== undefined && { reflectedInPercent: reflectedInPercent ? parseFloat(reflectedInPercent) : null }),
        ...(remainingFromPrevious !== undefined && { remainingFromPrevious: remainingFromPrevious ? parseFloat(remainingFromPrevious) : null }),
        ...(yearComparison !== undefined && { yearComparison: yearComparison ? parseFloat(yearComparison) : null }),
        ...(notes !== undefined && { notes: notes || null }),
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

    await logAudit(req.user, 'BONUS_UPDATE', 'annualBonus', bonus.id, { previous: existing });
    res.json(bonus);
  } catch (error: any) {
    console.error('Error updating bonus:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/bonuses/:id
 * Delete a bonus record
 */
bonusesCrudRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const bonus = await prisma.annualBonus.findUnique({
      where: { id }
    });

    if (!bonus) {
      return res.status(404).json({ error: 'Bonus record not found' });
    }

    await prisma.annualBonus.delete({
      where: { id }
    });

    await logAudit(req.user, 'BONUS_DELETE', 'annualBonus', id, undefined);

    res.json({ success: true, message: 'Bonus record deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting bonus:', error);
    res.status(500).json({ error: error.message });
  }
});

