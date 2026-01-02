import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const contractsCrudRouter = Router();

/**
 * POST /api/contracts
 * Create a new contract record
 */
contractsCrudRouter.post('/', async (req, res) => {
  try {
    const {
      employeeId,
      employeeName,
      employeeCode,
      contractDate,
      contractDuration,
      comments,
      sourceFile
    } = req.body;

    if (!contractDate && !contractDuration) {
      return res.status(400).json({ error: 'Contract date or duration is required' });
    }

    const contract = await prisma.contractRecord.create({
      data: {
        employeeId: employeeId || null,
        employeeName: employeeName || null,
        employeeCode: employeeCode || null,
        contractDate: contractDate ? new Date(contractDate) : null,
        contractDuration: contractDuration || null,
        comments: comments || null,
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

    // If contract is linked to an employee, update their latest renewal date
    if (contract.employeeId && contract.contractDate) {
      const latestContract = await prisma.contractRecord.findFirst({
        where: { employeeId: contract.employeeId },
        orderBy: { contractDate: 'desc' }
      });

      if (latestContract && latestContract.contractDate) {
        await prisma.employee.update({
          where: { id: contract.employeeId },
          data: {
            contractRenewalDate: latestContract.contractDate,
            contractDuration: latestContract.contractDuration
          }
        });
      }
    }

    res.status(201).json(contract);
  } catch (error: any) {
    console.error('Error creating contract:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/contracts
 * List all contract records
 */
contractsCrudRouter.get('/', async (req, res) => {
  try {
    const { employeeId, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (employeeId) {
      where.employeeId = employeeId as string;
    }

    const [contracts, total] = await Promise.all([
      prisma.contractRecord.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              employeeCode: true
            }
          }
        },
        orderBy: {
          contractDate: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.contractRecord.count({ where })
    ]);

    res.json({
      contracts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/contracts/:id
 * Get a single contract record
 */
contractsCrudRouter.get('/:id', async (req, res) => {
  try {
    const contract = await prisma.contractRecord.findUnique({
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

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json(contract);
  } catch (error: any) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/contracts/:id
 * Update a contract record
 */
contractsCrudRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      employeeId,
      employeeName,
      employeeCode,
      contractDate,
      contractDuration,
      comments,
      sourceFile
    } = req.body;

    const existing = await prisma.contractRecord.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const contract = await prisma.contractRecord.update({
      where: { id },
      data: {
        ...(employeeId !== undefined && { employeeId: employeeId || null }),
        ...(employeeName !== undefined && { employeeName: employeeName || null }),
        ...(employeeCode !== undefined && { employeeCode: employeeCode || null }),
        ...(contractDate !== undefined && { contractDate: contractDate ? new Date(contractDate) : null }),
        ...(contractDuration !== undefined && { contractDuration: contractDuration || null }),
        ...(comments !== undefined && { comments: comments || null }),
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

    // Update employee's latest renewal date if linked
    if (contract.employeeId) {
      const latestContract = await prisma.contractRecord.findFirst({
        where: { employeeId: contract.employeeId },
        orderBy: { contractDate: 'desc' }
      });

      if (latestContract && latestContract.contractDate) {
        await prisma.employee.update({
          where: { id: contract.employeeId },
          data: {
            contractRenewalDate: latestContract.contractDate,
            contractDuration: latestContract.contractDuration
          }
        });
      }
    }

    res.json(contract);
  } catch (error: any) {
    console.error('Error updating contract:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/contracts/:id
 * Delete a contract record
 */
contractsCrudRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const contract = await prisma.contractRecord.findUnique({
      where: { id }
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    await prisma.contractRecord.delete({
      where: { id }
    });

    // Update employee's latest renewal date if contract was linked
    if (contract.employeeId) {
      const latestContract = await prisma.contractRecord.findFirst({
        where: { employeeId: contract.employeeId },
        orderBy: { contractDate: 'desc' }
      });

      if (latestContract && latestContract.contractDate) {
        await prisma.employee.update({
          where: { id: contract.employeeId },
          data: {
            contractRenewalDate: latestContract.contractDate,
            contractDuration: latestContract.contractDuration
          }
        });
      } else {
        // No more contracts, clear renewal date
        await prisma.employee.update({
          where: { id: contract.employeeId },
          data: {
            contractRenewalDate: null,
            contractDuration: null
          }
        });
      }
    }

    res.json({ success: true, message: 'Contract deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting contract:', error);
    res.status(500).json({ error: error.message });
  }
});

