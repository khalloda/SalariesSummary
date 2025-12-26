import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { importAllWorkbooks } from '../services/import-service.js';

export const importRouter = Router();
const prisma = new PrismaClient();

/**
 * POST /api/import
 * Import all workbooks from the Sheets directory
 */
importRouter.post('/', async (req, res) => {
  try {
    console.log('Import request received');
    const result = await importAllWorkbooks();
    console.log(`Import completed: ${result.recordsImported} records, ${result.errors.length} errors`);
    res.json(result);
  } catch (error: any) {
    console.error('Import error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * DELETE /api/import/clear
 * Clear all imported data (employees, salary records, import logs)
 * Use with caution - this deletes all data!
 */
importRouter.delete('/clear', async (req, res) => {
  try {
    console.log('Clear database request received');
    
    // Delete in correct order (foreign key constraints)
    const deletedRecords = await prisma.salaryRecord.deleteMany({});
    const deletedEmployees = await prisma.employee.deleteMany({});
    const deletedLogs = await prisma.importLog.deleteMany({});
    
    await prisma.$disconnect();
    
    res.json({
      success: true,
      message: 'Database cleared successfully',
      deleted: {
        salaryRecords: deletedRecords.count,
        employees: deletedEmployees.count,
        importLogs: deletedLogs.count
      }
    });
  } catch (error: any) {
    console.error('Clear database error:', error);
    await prisma.$disconnect();
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

/**
 * POST /api/import/merge-duplicates
 * Merge duplicate employees based on normalized names
 */
importRouter.post('/merge-duplicates', async (req, res) => {
  try {
    console.log('Merge duplicates request received');
    const { mergeDuplicateEmployees } = await import('../scripts/merge-duplicate-employees.js');
    const result = await mergeDuplicateEmployees();
    res.json({ 
      success: true, 
      message: 'Duplicate employees merged successfully',
      merged: result.merged,
      duplicates: result.duplicates,
      report: result.report || []
    });
  } catch (error: any) {
    console.error('Merge duplicates error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

