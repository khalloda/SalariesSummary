import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { readFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { importAllWorkbooks } from '../services/import-service.js';
import { parseBonusSheet, importBonusRecords } from '../services/bonus-import-service.js';
import { importSEPEmployees } from '../services/sep-employees-import-service.js';
import { importContracts } from '../services/contracts-import-service.js';
import { importPersonnel } from '../services/personnel-import-service.js';
import { importResigned } from '../services/resigned-import-service.js';
import XLSX from 'xlsx';

export const importRouter = Router();
const prisma = new PrismaClient();

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
importRouter.post('/salaries/upload', uploadMultiple.array('files', 50), async (req, res) => {
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
importRouter.post('/salaries', async (req, res) => {
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
importRouter.post('/', async (req, res) => {
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
importRouter.delete('/clear', async (req, res) => {
  try {
    console.log('Clear database request received');
    
    // Delete in correct order (foreign key constraints)
    const deletedBonuses = await prisma.annualBonus.deleteMany({});
    const deletedRecords = await prisma.salaryRecord.deleteMany({});
    const deletedEmployees = await prisma.employee.deleteMany({});
    const deletedLogs = await prisma.importLog.deleteMany({});
    
    await prisma.$disconnect();
    
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
importRouter.post('/resolve-conflicts', async (req, res) => {
  try {
    const { resolutions } = req.body;
    
    if (!resolutions || !Array.isArray(resolutions)) {
      return res.status(400).json({
        success: false,
        error: 'resolutions array is required'
      });
    }
    
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
    
    await prisma.$disconnect();
    
    res.json({
      success: errors.length === 0,
      kept,
      updated,
      skipped,
      errors
    });
  } catch (error: any) {
    console.error('Resolve conflicts error:', error);
    await prisma.$disconnect();
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
importRouter.post('/resolve-employee-conflicts', async (req, res) => {
  try {
    const { resolutions } = req.body;
    
    if (!resolutions || !Array.isArray(resolutions)) {
      return res.status(400).json({
        success: false,
        error: 'resolutions array is required'
      });
    }
    
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
    
    await prisma.$disconnect();
    
    res.json({
      success: errors.length === 0,
      kept,
      updated,
      skipped,
      errors
    });
  } catch (error: any) {
    console.error('Resolve employee conflicts error:', error);
    await prisma.$disconnect();
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
importRouter.post('/resolve-contract-conflicts', async (req, res) => {
  try {
    const { resolutions } = req.body;
    
    if (!resolutions || !Array.isArray(resolutions)) {
      return res.status(400).json({
        success: false,
        error: 'resolutions array is required'
      });
    }
    
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
    
    await prisma.$disconnect();
    
    res.json({
      success: errors.length === 0,
      kept,
      updated,
      skipped,
      errors
    });
  } catch (error: any) {
    console.error('Resolve contract conflicts error:', error);
    await prisma.$disconnect();
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
importRouter.post('/resolve-personnel-conflicts', async (req, res) => {
  try {
    const { resolutions } = req.body;
    
    if (!resolutions || !Array.isArray(resolutions)) {
      return res.status(400).json({
        success: false,
        error: 'resolutions array is required'
      });
    }
    
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
    
    await prisma.$disconnect();
    
    res.json({
      success: errors.length === 0,
      kept,
      updated,
      skipped,
      errors
    });
  } catch (error: any) {
    console.error('Resolve personnel conflicts error:', error);
    await prisma.$disconnect();
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
importRouter.post('/bonus/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { sheetName, year } = req.body;
    
    if (!sheetName) {
      return res.status(400).json({ error: 'Sheet name is required' });
    }

    const yearNum = parseInt(year || String(new Date().getFullYear()));
    if (isNaN(yearNum)) {
      return res.status(400).json({ error: 'Valid year is required' });
    }

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

