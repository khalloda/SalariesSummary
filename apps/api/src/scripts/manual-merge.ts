/**
 * Manual Merge Employees Script
 * Merges specific employees with user-selected target
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Manually merge specific employees into a target employee
 * @param targetEmployeeId - The employee ID to keep (merge into)
 * @param employeeIdsToMerge - Array of employee IDs to merge into the target
 */
export async function manualMergeEmployees(
  targetEmployeeId: string,
  employeeIdsToMerge: string[]
): Promise<{
  success: boolean;
  targetEmployee: any;
  mergedEmployees: any[];
  recordsMoved: number;
  recordsSkipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let recordsMoved = 0;
  let recordsSkipped = 0;
  
  // Get target employee
  const targetEmployee = await prisma.employee.findUnique({
    where: { id: targetEmployeeId },
    include: {
      _count: {
        select: { salaries: true }
      }
    }
  });
  
  if (!targetEmployee) {
    throw new Error(`Target employee with ID ${targetEmployeeId} not found`);
  }
  
  const mergedEmployees: any[] = [];
  
  for (const employeeId of employeeIdsToMerge) {
    if (employeeId === targetEmployeeId) {
      errors.push(`Cannot merge employee ${employeeId} into itself`);
      continue;
    }
    
    const employeeToMerge = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        _count: {
          select: { salaries: true }
        }
      }
    });
    
    if (!employeeToMerge) {
      errors.push(`Employee with ID ${employeeId} not found`);
      continue;
    }
    
    // Move all salary records to the target employee
    const salaryRecords = await prisma.salaryRecord.findMany({
      where: { employeeId: employeeId }
    });
    
    let moved = 0;
    let skipped = 0;
    
    for (const record of salaryRecords) {
      // Check if a record already exists for this employee/month/year
      const existing = await prisma.salaryRecord.findFirst({
        where: {
          employeeId: targetEmployeeId,
          year: record.year,
          month: record.month
        }
      });
      
      if (existing) {
        skipped++;
      } else {
        // Move the record
        await prisma.salaryRecord.update({
          where: { id: record.id },
          data: { employeeId: targetEmployeeId }
        });
        moved++;
      }
    }
    
    recordsMoved += moved;
    recordsSkipped += skipped;
    
    // Delete the merged employee
    await prisma.employee.delete({
      where: { id: employeeId }
    });
    
    mergedEmployees.push({
      id: employeeToMerge.id,
      name: employeeToMerge.name,
      recordCount: employeeToMerge._count.salaries,
      recordsMoved: moved,
      recordsSkipped: skipped
    });
  }
  
  // Get final record count for target employee
  const finalRecordCount = await prisma.salaryRecord.count({
    where: { employeeId: targetEmployeeId }
  });
  
  return {
    success: errors.length === 0,
    targetEmployee: {
      ...targetEmployee,
      initialRecordCount: targetEmployee._count.salaries,
      finalRecordCount
    },
    mergedEmployees,
    recordsMoved,
    recordsSkipped,
    errors
  };
}

