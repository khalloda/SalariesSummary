/**
 * Personnel CRUD API Routes
 * Handles Create, Read, Update, Delete operations for PersonnelRecord
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

/**
 * Parse assets from various formats (single string, JSON array, comma-separated)
 * Returns JSON array string or null
 */
function parseAssets(value: any): string | null {
  if (!value) return null;
  
  // If already a JSON array string, validate and return
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return JSON.stringify(parsed.filter(a => ['Laptop', 'PC', 'Tablet'].includes(a)));
      }
    } catch {
      // Not JSON, continue parsing
    }
    
    // Handle comma-separated values
    if (value.includes(',')) {
      const assets = value.split(',').map(a => a.trim()).filter(a => ['Laptop', 'PC', 'Tablet'].includes(a));
      return assets.length > 0 ? JSON.stringify(assets) : null;
    }
    
    // Single value - convert to array if valid
    const trimmed = value.trim();
    if (['Laptop', 'PC', 'Tablet', 'None'].includes(trimmed)) {
      if (trimmed === 'None') return null;
      return JSON.stringify([trimmed]);
    }
  }
  
  // If it's already an array
  if (Array.isArray(value)) {
    const assets = value.filter(a => ['Laptop', 'PC', 'Tablet'].includes(a));
    return assets.length > 0 ? JSON.stringify(assets) : null;
  }
  
  return null;
}

/**
 * Format assets for display (JSON array string to array or single value)
 */
function formatAssetsForDisplay(value: string | null): string[] {
  if (!value) return [];
  
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(a => ['Laptop', 'PC', 'Tablet'].includes(a));
    }
  } catch {
    // Not JSON, treat as single value
    if (['Laptop', 'PC', 'Tablet'].includes(value)) {
      return [value];
    }
  }
  
  return [];
}

const prisma = new PrismaClient();
export const personnelCrudRouter = Router();

/**
 * POST /api/personnel
 * Create a new personnel record
 */
personnelCrudRouter.post('/', async (req, res) => {
  try {
    const {
      employeeId,
      criminalRecord,
      militaryCertificate,
      idCopy,
      educationCertificate,
      birthCertificate,
      recommendationLetter,
      personalPhotos,
      taxCard,
      associationId,
      form6,
      laptopPcTablet,
      workStub,
      insuranceStartDate
    } = req.body;

    // Validate required fields
    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId is required' });
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if personnel record already exists
    const existing = await prisma.personnelRecord.findUnique({
      where: { employeeId }
    });

    if (existing) {
      return res.status(400).json({ error: 'Personnel record already exists for this employee. Use PUT to update.' });
    }

    // Create personnel record
    const personnelRecord = await prisma.personnelRecord.create({
      data: {
        employeeId,
        criminalRecord: criminalRecord || null,
        militaryCertificate: militaryCertificate || null,
        idCopy: idCopy ?? null,
        educationCertificate: educationCertificate || null,
        birthCertificate: birthCertificate || null,
        recommendationLetter: recommendationLetter ?? null,
        personalPhotos: personalPhotos ?? null,
        taxCard: taxCard ?? null,
        associationId: associationId ?? null,
        form6: form6 || 'N/A',
        laptopPcTablet: parseAssets(laptopPcTablet),
        workStub: workStub || 'N/A',
        insuranceStartDate: insuranceStartDate ? new Date(insuranceStartDate) : null,
        sourceFile: 'Manual Entry'
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

    res.status(201).json(personnelRecord);
  } catch (error: any) {
    console.error('Error creating personnel record:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/personnel
 * Get all personnel records (with optional filters)
 */
personnelCrudRouter.get('/', async (req, res) => {
  try {
    const { employeeId, category, status } = req.query;

    const where: any = {};
    
    if (employeeId) {
      where.employeeId = employeeId as string;
    }

    if (category || status) {
      where.employee = {};
      if (category) {
        where.employee.category = category as string;
      }
      if (status) {
        where.employee.status = status as string;
      }
    }

    const personnelRecords = await prisma.personnelRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            nameArabic: true,
            employeeCode: true,
            category: true,
            department: true,
            status: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json(personnelRecords);
  } catch (error: any) {
    console.error('Error fetching personnel records:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/personnel/:id
 * Get a single personnel record by ID
 */
personnelCrudRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const personnelRecord = await prisma.personnelRecord.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            nameArabic: true,
            employeeCode: true,
            category: true,
            department: true,
            status: true
          }
        }
      }
    });

    if (!personnelRecord) {
      return res.status(404).json({ error: 'Personnel record not found' });
    }

    res.json(personnelRecord);
  } catch (error: any) {
    console.error('Error fetching personnel record:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/personnel/:id
 * Update a personnel record
 */
personnelCrudRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      criminalRecord,
      militaryCertificate,
      idCopy,
      educationCertificate,
      birthCertificate,
      recommendationLetter,
      personalPhotos,
      taxCard,
      associationId,
      form6,
      laptopPcTablet,
      workStub,
      insuranceStartDate
    } = req.body;

    // Check if record exists
    const existing = await prisma.personnelRecord.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Personnel record not found' });
    }

    // Update personnel record
    const personnelRecord = await prisma.personnelRecord.update({
      where: { id },
      data: {
        ...(criminalRecord !== undefined && { criminalRecord: criminalRecord || null }),
        ...(militaryCertificate !== undefined && { militaryCertificate: militaryCertificate || null }),
        ...(idCopy !== undefined && { idCopy: idCopy ?? null }),
        ...(educationCertificate !== undefined && { educationCertificate: educationCertificate || null }),
        ...(birthCertificate !== undefined && { birthCertificate: birthCertificate || null }),
        ...(recommendationLetter !== undefined && { recommendationLetter: recommendationLetter ?? null }),
        ...(personalPhotos !== undefined && { personalPhotos: personalPhotos ?? null }),
        ...(taxCard !== undefined && { taxCard: taxCard ?? null }),
        ...(associationId !== undefined && { associationId: associationId ?? null }),
        ...(form6 !== undefined && { form6: form6 || 'N/A' }),
        ...(laptopPcTablet !== undefined && { laptopPcTablet: parseAssets(laptopPcTablet) }),
        ...(workStub !== undefined && { workStub: workStub || 'N/A' }),
        ...(insuranceStartDate !== undefined && { 
          insuranceStartDate: insuranceStartDate ? new Date(insuranceStartDate) : null 
        })
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

    res.json(personnelRecord);
  } catch (error: any) {
    console.error('Error updating personnel record:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/personnel/employee/:employeeId
 * Update or create personnel record by employeeId (upsert)
 */
personnelCrudRouter.put('/employee/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const {
      criminalRecord,
      militaryCertificate,
      idCopy,
      educationCertificate,
      birthCertificate,
      recommendationLetter,
      personalPhotos,
      taxCard,
      associationId,
      form6,
      laptopPcTablet,
      workStub,
      insuranceStartDate
    } = req.body;

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Upsert personnel record
    const personnelRecord = await prisma.personnelRecord.upsert({
      where: { employeeId },
      update: {
        ...(criminalRecord !== undefined && { criminalRecord: criminalRecord || null }),
        ...(militaryCertificate !== undefined && { militaryCertificate: militaryCertificate || null }),
        ...(idCopy !== undefined && { idCopy: idCopy ?? null }),
        ...(educationCertificate !== undefined && { educationCertificate: educationCertificate || null }),
        ...(birthCertificate !== undefined && { birthCertificate: birthCertificate || null }),
        ...(recommendationLetter !== undefined && { recommendationLetter: recommendationLetter ?? null }),
        ...(personalPhotos !== undefined && { personalPhotos: personalPhotos ?? null }),
        ...(taxCard !== undefined && { taxCard: taxCard ?? null }),
        ...(associationId !== undefined && { associationId: associationId ?? null }),
        ...(form6 !== undefined && { form6: form6 || 'N/A' }),
        ...(laptopPcTablet !== undefined && { laptopPcTablet: parseAssets(laptopPcTablet) }),
        ...(workStub !== undefined && { workStub: workStub || 'N/A' }),
        ...(insuranceStartDate !== undefined && { 
          insuranceStartDate: insuranceStartDate ? new Date(insuranceStartDate) : null 
        })
      },
      create: {
        employeeId,
        criminalRecord: criminalRecord || null,
        militaryCertificate: militaryCertificate || null,
        idCopy: idCopy ?? null,
        educationCertificate: educationCertificate || null,
        birthCertificate: birthCertificate || null,
        recommendationLetter: recommendationLetter ?? null,
        personalPhotos: personalPhotos ?? null,
        taxCard: taxCard ?? null,
        associationId: associationId ?? null,
        form6: form6 || 'N/A',
        laptopPcTablet: parseAssets(laptopPcTablet),
        workStub: workStub || 'N/A',
        insuranceStartDate: insuranceStartDate ? new Date(insuranceStartDate) : null,
        sourceFile: 'Manual Entry'
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

    res.json(personnelRecord);
  } catch (error: any) {
    console.error('Error upserting personnel record:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/personnel/:id
 * Delete a personnel record
 */
personnelCrudRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.personnelRecord.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Personnel record not found' });
    }

    await prisma.personnelRecord.delete({
      where: { id }
    });

    res.json({ message: 'Personnel record deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting personnel record:', error);
    res.status(500).json({ error: error.message });
  }
});

