/**
 * Preview Duplicate Employees Script
 * Finds potential duplicates without merging them
 */

import { prisma } from '../db/prisma.js';
import { normalizeEmployeeName, areNamesSimilar } from '../utils/normalize.js';
import { isSpecialCaseMatch } from './merge-duplicate-employees.js';

/**
 * Find potential duplicate employees without merging
 * Returns pairs of employees that might be duplicates
 */
export async function previewDuplicateEmployees() {
  console.log('🔍 Previewing potential duplicate employees...');
  
  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: {
        select: { salaries: true }
      }
    }
  });
  
  // First, group by exact normalized name match
  const normalizedGroups: Record<string, any[]> = {};
  
  for (const emp of employees) {
    const reNormalized = normalizeEmployeeName(emp.name);
    if (!normalizedGroups[reNormalized]) {
      normalizedGroups[reNormalized] = [];
    }
    normalizedGroups[reNormalized].push(emp);
  }
  
  // Get exact duplicates
  const exactDuplicates = Object.entries(normalizedGroups).filter(([_, emps]) => emps.length > 1);
  
  // Also check for similar names
  const processed = new Set<string>();
  const similarPairs: Array<{ employee1: any; employee2: any; reason: string }> = [];
  
  // Mark employees already in exact duplicate groups
  exactDuplicates.forEach(([_, emps]) => {
    emps.forEach(emp => processed.add(emp.id));
  });
  
  // Find similar names among remaining employees
  const remainingEmployees = employees.filter(emp => !processed.has(emp.id));
  
  for (let i = 0; i < remainingEmployees.length; i++) {
    const currentEmp = remainingEmployees[i];
    if (processed.has(currentEmp.id)) continue;
    
    for (let j = i + 1; j < remainingEmployees.length; j++) {
      const otherEmp = remainingEmployees[j];
      if (processed.has(otherEmp.id)) continue;
      
      let reason = '';
      if (isSpecialCaseMatch(currentEmp.name, otherEmp.name)) {
        reason = 'Special case match';
      } else if (areNamesSimilar(currentEmp.name, otherEmp.name)) {
        reason = 'Similar name match';
      }
      
      if (reason) {
        similarPairs.push({
          employee1: currentEmp,
          employee2: otherEmp,
          reason
        });
        processed.add(otherEmp.id);
      }
    }
  }
  
  // Format results
  const preview: Array<{
    employee1: { id: string; name: string; recordCount: number };
    employee2: { id: string; name: string; recordCount: number };
    reason: string;
  }> = [];
  
  // Add exact duplicates
  exactDuplicates.forEach(([normName, emps]) => {
    for (let i = 0; i < emps.length; i++) {
      for (let j = i + 1; j < emps.length; j++) {
        preview.push({
          employee1: {
            id: emps[i].id,
            name: emps[i].name,
            recordCount: emps[i]._count.salaries
          },
          employee2: {
            id: emps[j].id,
            name: emps[j].name,
            recordCount: emps[j]._count.salaries
          },
          reason: 'Exact normalized name match'
        });
      }
    }
  });
  
  // Add similar pairs
  similarPairs.forEach(pair => {
    preview.push({
      employee1: {
        id: pair.employee1.id,
        name: pair.employee1.name,
        recordCount: pair.employee1._count.salaries
      },
      employee2: {
        id: pair.employee2.id,
        name: pair.employee2.name,
        recordCount: pair.employee2._count.salaries
      },
      reason: pair.reason
    });
  });
  
  return {
    totalPairs: preview.length,
    pairs: preview
  };
}


