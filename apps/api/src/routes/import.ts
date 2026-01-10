import { Router } from 'express';
import multer from 'multer';
import { readFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { prisma } from '../db/prisma.js';
import { importAllWorkbooks } from '../services/import-service.js';
import { parseBonusSheet, importBonusRecords } from '../services/bonus-import-service.js';
import { importSEPEmployees } from '../services/sep-employees-import-service.js';
import { importContracts } from '../services/contracts-import-service.js';
import { importPersonnel } from '../services/personnel-import-service.js';
import { importResigned } from '../services/resigned-import-service.js';
import XLSX from 'xlsx';
import { requireRole } from '../utils/auth.js';
import { logAudit } from '../utils/audit.js';
import { validateBody } from '../validation/middleware.js';
import {
  SalaryConflictResolutionsSchema,
  EmployeeConflictResolutionsSchema,
  ContractConflictResolutionsSchema,
  PersonnelConflictResolutionsSchema,
  ResignedConflictResolutionsSchema,
  MergeDuplicatesSchema,
  ManualMergeSchema,
  CreateResignedCandidatesSchema,
  BonusImportBodySchema,
} from '../validation/schemas/imports.js';

export const importRouter = Router();

// Configure multer for file uploads
const uploadDir = join(process.cwd(), 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// For multiple file uploads
const uploadMultiple = multer({
  dest: uploadDir,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 50 // Maximum 50 files
  }
});

/**
 * POST /api/import/salaries/upload
 * Import salary workbooks from uploaded files
 */
importRouter.post('/salaries/upload', requireRole('OFFICE_MANAGER', 'ADMIN', 'SUPER_ADMIN'), uploadMultiple.array('files', 50), async (req, res) => {
  try {
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const files = Array.isArray(req.files) ? req.files : [req.files];
    console.log(`Salary import request received with ${files.length} file(s)`);

    // Import uploaded files
    const { importUploadedFiles } = await import('../services/import-service.js');
    const result = await importUploadedFiles(files.map(f => ({
      path: f.path,
      originalName: f.originalname
    })));

    // Clean up uploaded files
    files.forEach(file => {
      try {
        if (existsSync(file.path)) {
          unlinkSync(file.path);
        }
      } catch (cleanupError) {
        console.warn(`Could not delete temporary file ${file.path}:`, cleanupError);
      }
    });

    console.log(`Import completed: ${result.recordsImported} records, ${result.errors.length} errors`);
    res.json(result);
  } catch (error: any) {
    console.error('Import error:', error);
    console.error('Error stack:', error.stack);
    
    // Clean up files on error
    if (req.files) {
      const files = Array.isArray(req.files) ? req.files : [req.files];
      files.forEach(file => {
        try {
          if (existsSync(file.path)) {
            unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.warn(`Could not delete temporary file ${file.path}:`, cleanupError);
        }
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/import/salaries
 * Import all salary workbooks from the Sheets directory (legacy method)
 */
importRouter.post('/salaries', requireRole('OFFICE_MANAGER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    console.log('Salary import request received (server-side Sheets directory)');
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
 * POST /api/import
 * Legacy endpoint - redirects to salaries import
 */
importRouter.post('/', requireRole('OFFICE_MANAGER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    console.log('Import request received (legacy endpoint, redirecting to salaries)');
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
importRouter.delete('/clear', requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    console.log('Clear database request received');
    
    // Delete in correct order (foreign key constraints)
    const deletedBonuses = await prisma.annualBonus.deleteMany({});
    const deletedRecords = await prisma.salaryRecord.deleteMany({});
    const deletedEmployees = await prisma.employee.deleteMany({});
    const deletedLogs = await prisma.importLog.deleteMany({});
    
    res.json({
      success: true,
      message: 'Database cleared successfully',
      deleted: {
        annualBonuses: deletedBonuses.count,
        salaryRecords: deletedRecords.count,
        employees: deletedEmployees.count,
        importLogs: deletedLogs.count
      }
    });
  } catch (error: any) {
    console.error('Clear database error:', error);
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
importRouter.get('/preview-duplicates', requireRole('HR_PERSONNEL', 'OFFICE_MANAGER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
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
importRouter.post('/merge-duplicates', requireRole('HR_PERSONNEL', 'OFFICE_MANAGER', 'ADMIN', 'SUPER_ADMIN'), validateBody(MergeDuplicatesSchema), async (req, res) => {
  try {
    const { selectedPairs } = req.body;
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
 * POST /api/import/resolve-conflicts
 * Resolve salary import conflicts by choosing to keep existing, update with incoming, or skip
 * Body: { 
 *   resolutions: Array<{
 *     employeeId: string,
 *     year: number,
 *     month: number,
 *     action: 'keep' | 'update' | 'skip'
 *     incomingRecord?: any
 *   }>
 * }
 */
importRouter.post('/resolve-conflicts', validateBody(SalaryConflictResolutionsSchema), async (req, res) => {
  try {
    const { resolutions } = req.body;
    
    console.log(`Resolving ${resolutions.length} conflicts`);
    
    let kept = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    for (const resolution of resolutions) {
      try {
        const { employeeId, year, month, action, incomingRecord } = resolution;
        
        if (!employeeId || !year || !month || !action) {
          errors.push(`Invalid resolution: missing required fields`);
          continue;
        }
        
        const existingRecord = await prisma.salaryRecord.findFirst({
          where: {
            employeeId,
            year,
            month
          }
        });
        
        if (!existingRecord) {
          errors.push(`Record not found for employee ${employeeId}, ${year}-${month}`);
          continue;
        }
        
        if (action === 'keep') {
          // Keep existing record - do nothing
          kept++;
        } else if (action === 'update' && incomingRecord) {
          // Update with incoming data
          await prisma.salaryRecord.update({
            where: { id: existingRecord.id },
            data: {
              basicSalary: incomingRecord.basicSalary,
              directAdditions: incomingRecord.directAdditions,
              indirectAdditions: incomingRecord.indirectAdditions,
              yearlyIncrease: incomingRecord.yearlyIncrease,
              bonuses: incomingRecord.bonuses,
              salaryDeductions: incomingRecord.salaryDeductions,
              grossDeductions: incomingRecord.grossDeductions,
              gross: incomingRecord.gross,
              net: incomingRecord.net,
              additionsBreakdown: incomingRecord.additionsBreakdown ? JSON.stringify(incomingRecord.additionsBreakdown) : null,
              deductionsBreakdown: incomingRecord.deductionsBreakdown ? JSON.stringify(incomingRecord.deductionsBreakdown) : null,
              paymentMethod: incomingRecord.paymentMethod,
              accountNumber: incomingRecord.accountNumber,
              notes: incomingRecord.notes,
              category: incomingRecord.category,
              sourceFile: incomingRecord.sourceFile || existingRecord.sourceFile
            }
          });
          updated++;
        } else if (action === 'skip') {
          // Skip - delete the existing record (or do nothing if you want to keep it)
          // For now, we'll just skip without deleting
          skipped++;
        }
      } catch (error: any) {
        errors.push(`Error resolving conflict: ${error.message}`);
      }
    }
    
    res.json({
      success: errors.length === 0,
      kept,
      updated,
      skipped,
      errors
    });
  } catch (error: any) {
    console.error('Resolve conflicts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/import/resolve-employee-conflicts
 * Resolve employee import conflicts
 * Body: { 
 *   resolutions: Array<{
 *     employeeId: string,
 *     action: 'keep' | 'update' | 'skip'
 *     incomingRecord?: any
 *   }>
 * }
 */
importRouter.post('/resolve-employee-conflicts', validateBody(EmployeeConflictResolutionsSchema), async (req, res) => {
  try {
    const { resolutions } = req.body;
    
    console.log(`Resolving ${resolutions.length} employee conflicts`);
    
    let kept = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    for (const resolution of resolutions) {
      try {
        const { employeeId, action, incomingRecord } = resolution;
        
        if (!employeeId || !action) {
          errors.push(`Invalid resolution: missing required fields`);
          continue;
        }
        
        const existingEmployee = await prisma.employee.findUnique({
          where: { id: employeeId }
        });
        
        if (!existingEmployee) {
          errors.push(`Employee not found: ${employeeId}`);
          continue;
        }
        
        if (action === 'keep') {
          kept++;
        } else if (action === 'update' && incomingRecord) {
          await prisma.employee.update({
            where: { id: employeeId },
            data: incomingRecord
          });
          updated++;
        } else if (action === 'skip') {
          skipped++;
        }
      } catch (error: any) {
        errors.push(`Error resolving conflict: ${error.message}`);
      }
    }
    
    res.json({
      success: errors.length === 0,
      kept,
      updated,
      skipped,
      errors
    });
  } catch (error: any) {
    console.error('Resolve employee conflicts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/import/resolve-contract-conflicts
 * Resolve contract import conflicts
 * Body: { 
 *   resolutions: Array<{
 *     contractId?: string,
 *     employeeId: string | null,
 *     employeeCode: string | null,
 *     contractDate: Date | null,
 *     action: 'keep' | 'update' | 'skip'
 *     incomingRecord?: any
 *   }>
 * }
 */
importRouter.post('/resolve-contract-conflicts', validateBody(ContractConflictResolutionsSchema), async (req, res) => {
  try {
    const { resolutions } = req.body;
    
    console.log(`Resolving ${resolutions.length} contract conflicts`);
    
    let kept = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    for (const resolution of resolutions) {
      try {
        const { contractId, employeeId, contractDate, contractDuration, action, incomingRecord } = resolution;
        
        if (!action) {
          errors.push(`Invalid resolution: missing action`);
          continue;
        }
        
        let existingContract = null;
        if (contractId) {
          existingContract = await prisma.contractRecord.findUnique({
            where: { id: contractId }
          });
        } else if (employeeId && contractDate) {
          existingContract = await prisma.contractRecord.findFirst({
            where: {
              employeeId,
              contractDate,
              contractDuration: contractDuration || null
            }
          });
        }
        
        if (!existingContract) {
          errors.push(`Contract not found`);
          continue;
        }
        
        if (action === 'keep') {
          kept++;
        } else if (action === 'update' && incomingRecord) {
          await prisma.contractRecord.update({
            where: { id: existingContract.id },
            data: {
              contractDate: incomingRecord.contractDate,
              contractDuration: incomingRecord.contractDuration,
              comments: incomingRecord.comments,
              sourceFile: incomingRecord.sourceFile || existingContract.sourceFile
            }
          });
          updated++;
        } else if (action === 'skip') {
          skipped++;
        }
      } catch (error: any) {
        errors.push(`Error resolving conflict: ${error.message}`);
      }
    }
    
    res.json({
      success: errors.length === 0,
      kept,
      updated,
      skipped,
      errors
    });
  } catch (error: any) {
    console.error('Resolve contract conflicts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/import/resolve-personnel-conflicts
 * Resolve personnel import conflicts
 * Body: { 
 *   resolutions: Array<{
 *     employeeId: string,
 *     action: 'keep' | 'update' | 'skip'
 *     incomingRecord?: any
 *   }>
 * }
 */
importRouter.post('/resolve-personnel-conflicts', validateBody(PersonnelConflictResolutionsSchema), async (req, res) => {
  try {
    const { resolutions } = req.body;
    
    console.log(`Resolving ${resolutions.length} personnel conflicts`);
    
    let kept = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    for (const resolution of resolutions) {
      try {
        const { employeeId, action, incomingRecord } = resolution;
        
        if (!employeeId || !action) {
          errors.push(`Invalid resolution: missing required fields`);
          continue;
        }
        
        const existingPersonnel = await prisma.personnelRecord.findUnique({
          where: { employeeId }
        });
        
        if (!existingPersonnel) {
          errors.push(`Personnel record not found for employee: ${employeeId}`);
          continue;
        }
        
        if (action === 'keep') {
          kept++;
        } else if (action === 'update' && incomingRecord) {
          await prisma.personnelRecord.update({
            where: { employeeId },
            data: {
              criminalRecord: incomingRecord.criminalRecord,
              militaryCertificate: incomingRecord.militaryCertificate,
              idCopy: incomingRecord.idCopy,
              educationCertificate: incomingRecord.educationCertificate,
              birthCertificate: incomingRecord.birthCertificate,
              recommendationLetter: incomingRecord.recommendationLetter,
              personalPhotos: incomingRecord.personalPhotos,
              taxCard: incomingRecord.taxCard,
              associationId: incomingRecord.associationId,
              form6: incomingRecord.form6,
              laptopPcTablet: incomingRecord.laptopPcTablet,
              workStub: incomingRecord.workStub,
              insuranceStartDate: incomingRecord.insuranceStartDate,
              sourceFile: incomingRecord.sourceFile || existingPersonnel.sourceFile
            }
          });
          
          // Update employee status if provided
          if (incomingRecord.status) {
            await prisma.employee.update({
              where: { id: employeeId },
              data: { status: incomingRecord.status }
            });
          }
          
          updated++;
        } else if (action === 'skip') {
          skipped++;
        }
      } catch (error: any) {
        errors.push(`Error resolving conflict: ${error.message}`);
      }
    }
    
    res.json({
      success: errors.length === 0,
      kept,
      updated,
      skipped,
      errors
    });
  } catch (error: any) {
    console.error('Resolve personnel conflicts error:', error);
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
importRouter.post('/manual-merge', validateBody(ManualMergeSchema), async (req, res) => {
  try {
    const { targetEmployeeId, employeeIdsToMerge } = req.body;
    
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

/**
 * POST /api/import/bonus/upload
 * Upload a bonus workbook and return available sheets
 */
importRouter.post('/bonus/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    try {
      // Read workbook to get sheet names
      const data = readFileSync(filePath);
      const workbook = XLSX.read(data, {
        type: 'buffer',
        cellDates: true,
        cellFormulas: true
      });

      const sheets = workbook.SheetNames.map(name => ({
        name,
        index: workbook.SheetNames.indexOf(name)
      }));

      // Clean up uploaded file after reading
      try {
        unlinkSync(filePath);
      } catch (cleanupError) {
        console.warn('Could not delete temporary file:', cleanupError);
      }

      res.json({
        success: true,
        fileName,
        sheets,
        totalSheets: sheets.length
      });
    } catch (error: any) {
      // Clean up on error
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn('Could not delete temporary file:', cleanupError);
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * POST /api/import/employees
 * Import employees from SEPEmployees.xlsx (from server Sheets directory)
 */
importRouter.post('/employees', async (req, res) => {
  try {
    console.log('SEP Employees import request received (server-side Sheets directory)');
    const result = await importSEPEmployees();
    console.log(`Import completed: ${result.recordsImported} created, ${result.recordsUpdated} updated, ${result.errors.length} errors`);
    res.json(result);
  } catch (error: any) {
    console.error('SEP Employees import error:', error);
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
 * POST /api/import/contracts
 * Import contracts from SEPEmployees.xlsx (from server Sheets directory)
 */
importRouter.post('/contracts', async (req, res) => {
  try {
    console.log('Contracts import request received (server-side Sheets directory)');
    const result = await importContracts();
    console.log(`Import completed: ${result.recordsImported} created, ${result.recordsLinked} linked, ${result.errors.length} errors`);
    res.json(result);
  } catch (error: any) {
    console.error('Contracts import error:', error);
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
 * POST /api/import/contracts/upload
 * Import contracts from uploaded SEPEmployees.xlsx file
 */
importRouter.post('/contracts/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    console.log(`Contracts import request received with file: ${fileName}`);

    try {
      const result = await importContracts(filePath);

      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn(`Could not delete temporary file ${filePath}:`, cleanupError);
      }

      console.log(`Import completed: ${result.recordsImported} created, ${result.recordsLinked} linked, ${result.errors.length} errors`);
      res.json(result);
    } catch (error: any) {
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn(`Could not delete temporary file ${filePath}:`, cleanupError);
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Contracts import error:', error);
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
 * POST /api/import/personnel
 * Import personnel data from SEPEmployees.xlsx (from server Sheets directory)
 */
importRouter.post('/personnel', async (req, res) => {
  try {
    console.log('Personnel import request received (server-side Sheets directory)');
    const result = await importPersonnel();
    console.log(`Import completed: ${result.recordsUpdated} updated, ${result.errors.length} errors`);
    res.json(result);
  } catch (error: any) {
    console.error('Personnel import error:', error);
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
 * POST /api/import/personnel/upload
 * Import personnel data from uploaded SEPEmployees.xlsx file
 */
importRouter.post('/personnel/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    console.log(`Personnel import request received with file: ${fileName}`);

    try {
      const result = await importPersonnel(filePath);

      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn(`Could not delete temporary file ${filePath}:`, cleanupError);
      }

      console.log(`Import completed: ${result.recordsUpdated} updated, ${result.errors.length} errors`);
      res.json(result);
    } catch (error: any) {
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn(`Could not delete temporary file ${filePath}:`, cleanupError);
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Personnel import error:', error);
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
 * POST /api/import/resigned
 * Import resigned employees from SEPEmployees.xlsx (from server Sheets directory)
 */
importRouter.post('/resigned', async (req, res) => {
  try {
    console.log('Resigned import request received (server-side Sheets directory)');
    const result = await importResigned();
    console.log(`Import completed: ${result.recordsUpdated} updated, ${result.recordsNotFound} not found, ${result.errors.length} errors`);
    res.json(result);
  } catch (error: any) {
    console.error('Resigned import error:', error);
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
 * POST /api/import/resigned/upload
 * Import resigned employees from uploaded SEPEmployees.xlsx file
 */
importRouter.post('/resigned/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    console.log(`Resigned import request received with file: ${fileName}`);

    try {
      const result = await importResigned(filePath);

      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn(`Could not delete temporary file ${filePath}:`, cleanupError);
      }

      console.log(`Import completed: ${result.recordsUpdated} updated, ${result.recordsNotFound} not found, ${result.errors.length} errors`);
      res.json(result);
    } catch (error: any) {
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn(`Could not delete temporary file ${filePath}:`, cleanupError);
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Resigned import error:', error);
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
 * POST /api/import/resigned/create-candidates
 * Create selected candidate employees from the Resigned sheet
 * Body: { 
 *   candidates: Array<{
 *     rowIndex: number,
 *     name: string,
 *     nationalId?: string | null,
 *     classification?: string | null,
 *     jobTitle?: string | null,
 *     department?: string | null,
 *     dateOfBirth?: Date | null,
 *     nationalIdValidTill?: Date | null,
 *     barAssociation?: string | null,
 *     barAssociationDegree?: string | null,
 *     joiningDate?: Date | null,
 *     resignationDate: Date
 *   }>
 * }
 */
importRouter.post('/resigned/create-candidates', validateBody(CreateResignedCandidatesSchema), async (req, res) => {
  try {
    const { candidates } = req.body;

    console.log(`Creating ${candidates.length} candidate employees from Resigned sheet`);

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const candidate of candidates) {
      try {
        const { name, resignationDate, classification, jobTitle, department, dateOfBirth, 
                nationalId, nationalIdValidTill, barAssociation, barAssociationDegree, joiningDate } = candidate;

        if (!name || !resignationDate) {
          errors.push(`Row ${candidate.rowIndex}: Missing required fields (name or resignation date)`);
          skipped++;
          continue;
        }

        // Normalize name for uniqueness check
        const { normalizeEmployeeName } = await import('../utils/normalize.js');
        const normalizedName = normalizeEmployeeName(name);

        // Check if employee already exists (might have been created between import and creation)
        const existing = await prisma.employee.findUnique({
          where: { normalizedName }
        });

        if (existing) {
          // Employee now exists - update instead of create
          await prisma.employee.update({
            where: { id: existing.id },
            data: {
              status: 'Resigned',
              resignationDate: new Date(resignationDate),
              category: classification || existing.category,
              jobTitle: jobTitle || existing.jobTitle,
              department: department || existing.department,
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : existing.dateOfBirth,
              nationalId: nationalId || existing.nationalId,
              nationalIdValidTill: nationalIdValidTill ? new Date(nationalIdValidTill) : existing.nationalIdValidTill,
              barAssociation: barAssociation || existing.barAssociation,
              barAssociationDegree: barAssociationDegree || existing.barAssociationDegree,
              joiningDate: joiningDate ? new Date(joiningDate) : existing.joiningDate,
            }
          });

          // Create resignation record (Phase 3)
          await prisma.resignationRecord.create({
            data: {
              employeeId: existing.id,
              resignationDate: new Date(resignationDate),
              jobTitle: jobTitle || existing.jobTitle || null,
              department: department || existing.department || null,
              category: classification || existing.category || null,
              reason: null,
              importedFrom: 'Resigned sheet (candidate creation)',
              notes: `Updated from candidate, row ${candidate.rowIndex}`
            }
          });

          created++;
          console.log(`  ✅ Updated (now exists): ${name}`);
        } else {
          // Create new employee
          const newEmployee = await prisma.employee.create({
            data: {
              name,
              normalizedName,
              status: 'Resigned',
              resignationDate: new Date(resignationDate),
              category: classification || null,
              jobTitle: jobTitle || null,
              department: department || null,
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
              nationalId: nationalId || null,
              nationalIdValidTill: nationalIdValidTill ? new Date(nationalIdValidTill) : null,
              barAssociation: barAssociation || null,
              barAssociationDegree: barAssociationDegree || null,
              joiningDate: joiningDate ? new Date(joiningDate) : null,
            }
          });
          created++;
          console.log(`  ✅ Created: ${newEmployee.name} (Status: Resigned)`);
        }
      } catch (error: any) {
        const errorMsg = error.message || 'Unknown error';
        errors.push(`Row ${candidate.rowIndex} (${candidate.name}): ${errorMsg}`);
        skipped++;
        console.error(`  ❌ Error creating candidate ${candidate.name}:`, errorMsg);
      }
    }

    res.json({
      success: errors.length === 0,
      created,
      skipped,
      errors
    });
  } catch (error: any) {
    console.error('Create candidates error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/import/resigned/resolve-conflicts
 * Resolve resigned import conflicts (multiple matches)
 * Body: { 
 *   resolutions: Array<{
 *     rowIndex: number,
 *     employeeId: string,
 *     action: 'update' | 'skip',
 *     incomingData: {
 *       name: string,
 *       nationalId?: string | null,
 *       classification?: string | null,
 *       jobTitle?: string | null,
 *       department?: string | null,
 *       resignationDate: Date,
 *       dateOfBirth?: Date | null,
 *       nationalIdValidTill?: Date | null,
 *       barAssociation?: string | null,
 *       barAssociationDegree?: string | null,
 *       joiningDate?: Date | null,
 *     }
 *   }>
 * }
 */
importRouter.post('/resigned/resolve-conflicts', validateBody(ResignedConflictResolutionsSchema), async (req, res) => {
  try {
    const { resolutions } = req.body;

    console.log(`Resolving ${resolutions.length} resigned import conflicts`);

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const resolution of resolutions) {
      try {
        const { employeeId, action, incomingData } = resolution;
        
        if (!employeeId || !action) {
          errors.push('Invalid resolution: missing required fields');
          continue;
        }

        const employee = await prisma.employee.findUnique({
          where: { id: employeeId }
        });

        if (!employee) {
          errors.push(`Employee not found: ${employeeId}`);
          continue;
        }

        if (action === 'skip') {
          skipped++;
          console.log(`  ⏭️  Skipped: ${employee.name}`);
        } else if (action === 'update') {
          const updateData: any = {
            status: 'Resigned',
            resignationDate: new Date(incomingData.resignationDate),
          };

          // Update category if provided
          if (incomingData.classification) {
            updateData.category = incomingData.classification;
          }

          // Update other fields if missing in employee record
          if (!employee.jobTitle && incomingData.jobTitle) {
            updateData.jobTitle = incomingData.jobTitle;
          }
          if (!employee.department && incomingData.department) {
            updateData.department = incomingData.department;
          }
          if (!employee.dateOfBirth && incomingData.dateOfBirth) {
            updateData.dateOfBirth = new Date(incomingData.dateOfBirth);
          }
          if (!employee.nationalId && incomingData.nationalId) {
            updateData.nationalId = incomingData.nationalId;
          }
          if (!employee.nationalIdValidTill && incomingData.nationalIdValidTill) {
            updateData.nationalIdValidTill = new Date(incomingData.nationalIdValidTill);
          }
          if (!employee.barAssociation && incomingData.barAssociation && incomingData.barAssociation !== 'N/A') {
            updateData.barAssociation = incomingData.barAssociation;
          }
          if (!employee.barAssociationDegree && incomingData.barAssociationDegree && incomingData.barAssociationDegree !== 'N/A') {
            updateData.barAssociationDegree = incomingData.barAssociationDegree;
          }

          await prisma.employee.update({
            where: { id: employeeId },
            data: updateData
          });

          // Create resignation record (Phase 3)
          await prisma.resignationRecord.create({
            data: {
              employeeId: employee.id,
              resignationDate: new Date(incomingData.resignationDate),
              jobTitle: incomingData.jobTitle || employee.jobTitle || null,
              department: incomingData.department || employee.department || null,
              category: incomingData.classification || employee.category || null,
              reason: null,
              importedFrom: 'Resigned sheet (conflict resolution)',
              notes: `Resolved conflict from row ${resolution.rowIndex}`
            }
          });

          updated++;
          console.log(`  ✅ Updated: ${employee.name} (Status: Resigned)`);
        }
      } catch (error: any) {
        const errorMsg = error.message || 'Unknown error';
        errors.push(`Row ${resolution.rowIndex} (${incomingData.name}): ${errorMsg}`);
        console.error(`  ❌ Error resolving conflict:`, errorMsg);
      }
    }

    res.json({
      success: errors.length === 0,
      updated,
      skipped,
      errors
    });
  } catch (error: any) {
    console.error('Resolve conflicts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/import/employees/upload
 * Import employees from uploaded SEPEmployees.xlsx file
 */
importRouter.post('/employees/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    console.log(`SEP Employees import request received with file: ${fileName}`);

    try {
      // Import from uploaded file
      const result = await importSEPEmployees(filePath);

      // Clean up uploaded file
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn(`Could not delete temporary file ${filePath}:`, cleanupError);
      }

      console.log(`Import completed: ${result.recordsImported} created, ${result.recordsUpdated} updated, ${result.errors.length} errors`);
      res.json(result);
    } catch (error: any) {
      // Clean up on error
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn(`Could not delete temporary file ${filePath}:`, cleanupError);
      }
      throw error;
    }
  } catch (error: any) {
    console.error('SEP Employees import error:', error);
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
 * POST /api/import/bonus/import
 * Import bonus data from uploaded file and selected sheet
 */
importRouter.post('/bonus/import', upload.single('file'), validateBody(BonusImportBodySchema), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { sheetName, year } = req.body;
    
    const yearNum = year || new Date().getFullYear();

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    try {
      // Parse the bonus sheet
      console.log(`Parsing bonus sheet "${sheetName}" from "${fileName}" for year ${yearNum}`);
      const parsed = await parseBonusSheet(filePath, sheetName, yearNum);

      if (parsed.errors.length > 0) {
        console.warn('Parsing errors:', parsed.errors);
      }

      // Import records into database
      const importResult = await importBonusRecords(parsed.records, fileName);

      // Clean up uploaded file
      try {
        unlinkSync(filePath);
      } catch (cleanupError) {
        console.warn('Could not delete temporary file:', cleanupError);
      }

      res.json({
        success: importResult.success,
        recordsImported: importResult.imported,
        recordsParsed: parsed.records.length,
        errors: [...parsed.errors, ...importResult.errors],
        fileName,
        sheetName,
        year: yearNum
      });
    } catch (error: any) {
      // Clean up on error
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn('Could not delete temporary file:', cleanupError);
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Bonus import error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

