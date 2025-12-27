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
 * GET /api/import/preview-duplicates
 * Preview potential duplicate employees without merging
 */
importRouter.get('/preview-duplicates', async (req, res) => {
  try {
    console.log('Preview duplicates request received');
    const { previewDuplicateEmployees } = await import('../scripts/preview-duplicates.js');
    const result = await previewDuplicateEmployees();
    res.json({ 
      success: true, 
      ...result
    });
  } catch (error: any) {
    console.error('Preview duplicates error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

/**
 * POST /api/import/merge-duplicates
 * Merge duplicate employees based on normalized names
 * Body (optional): { selectedPairs: Array<{employee1Id: string, employee2Id: string}> }
 */
importRouter.post('/merge-duplicates', async (req, res) => {
  try {
    const { selectedPairs } = req.body || {};
    console.log('Merge duplicates request received', selectedPairs ? `with ${selectedPairs.length} selected pairs` : 'all pairs');
    
    if (selectedPairs && Array.isArray(selectedPairs) && selectedPairs.length > 0) {
      // Merge only selected pairs
      const { manualMergeEmployees } = await import('../scripts/manual-merge.js');
      const results = [];
      let totalMoved = 0;
      let totalSkipped = 0;
      
      for (const pair of selectedPairs) {
        try {
          // For each pair, merge employee2 into employee1
          const result = await manualMergeEmployees(pair.employee1Id, [pair.employee2Id]);
          results.push(result);
          totalMoved += result.recordsMoved;
          totalSkipped += result.recordsSkipped;
        } catch (error: any) {
          results.push({ success: false, error: error.message });
        }
      }
      
      res.json({
        success: true,
        message: `Merged ${selectedPairs.length} selected pair(s)`,
        merged: selectedPairs.length,
        duplicates: selectedPairs.length,
        recordsMoved: totalMoved,
        recordsSkipped: totalSkipped,
        report: results.map(r => ({
          keptEmployee: r.targetEmployee,
          mergedEmployees: r.mergedEmployees || []
        }))
      });
    } else {
      // Merge all duplicates automatically
      const { mergeDuplicateEmployees } = await import('../scripts/merge-duplicate-employees.js');
      const result = await mergeDuplicateEmployees();
      res.json({ 
        success: true, 
        message: 'Duplicate employees merged successfully',
        merged: result.merged,
        duplicates: result.duplicates,
        report: result.report || []
      });
    }
  } catch (error: any) {
    console.error('Merge duplicates error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

/**
 * POST /api/import/manual-merge
 * Manually merge specific employees into a target employee
 * Body: { targetEmployeeId: string, employeeIdsToMerge: string[] }
 */
importRouter.post('/manual-merge', async (req, res) => {
  try {
    const { targetEmployeeId, employeeIdsToMerge } = req.body;
    
    if (!targetEmployeeId || !employeeIdsToMerge || !Array.isArray(employeeIdsToMerge)) {
      return res.status(400).json({
        success: false,
        error: 'targetEmployeeId and employeeIdsToMerge (array) are required'
      });
    }
    
    console.log(`Manual merge request: merging ${employeeIdsToMerge.length} employees into ${targetEmployeeId}`);
    const { manualMergeEmployees } = await import('../scripts/manual-merge.js');
    const result = await manualMergeEmployees(targetEmployeeId, employeeIdsToMerge);
    
    res.json({ 
      success: result.success, 
      message: result.success ? 'Employees merged successfully' : 'Merge completed with errors',
      ...result
    });
  } catch (error: any) {
    console.error('Manual merge error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

