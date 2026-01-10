/**
 * Merge Duplicate Employees Script
 * Finds and merges duplicate employees based on normalized names
 */

import { prisma } from '../db/prisma.js';
import { normalizeEmployeeName, areNamesSimilar } from '../utils/normalize.js';

/**
 * Special case matching for known duplicate patterns
 */
export function isSpecialCaseMatch(name1: string, name2: string): boolean {
  const norm1 = normalizeEmployeeName(name1).toLowerCase();
  const norm2 = normalizeEmployeeName(name2).toLowerCase();
  
  // Special case 1: "أ/ أميرة محمد على شريف" vs "أ / اميره شريف"
  // After normalization, both "أميرة" and "اميره" become "اميره" (ة -> ه)
  // So we check if both normalized names contain "اميره" and "شريف"
  if (norm1.includes('اميره') && norm1.includes('شريف') && 
      norm2.includes('اميره') && norm2.includes('شريف')) {
    return true;
  }
  
  // Special case 2: "أ/ حازم إبراهيم عبد الحميد" vs "أ/ حازم ابراهيم عبد الحميد محمد فتاتة"
  if ((norm1.includes('حازم') && norm1.includes('ابراهيم') && norm1.includes('عبد') && norm1.includes('الحميد') &&
       norm2.includes('حازم') && norm2.includes('ابراهيم') && norm2.includes('عبد') && norm2.includes('الحميد')) ||
      (norm2.includes('حازم') && norm2.includes('ابراهيم') && norm2.includes('عبد') && norm2.includes('الحميد') &&
       norm1.includes('حازم') && norm1.includes('ابراهيم') && norm1.includes('عبد') && norm1.includes('الحميد'))) {
    // This is a match - both have the core name "حازم ابراهيم عبد الحميد"
    // One may have additional names like "محمد فتاتة"
    return true;
  }
  
  // Special case 3: "د/ هاني سري الدين" vs "د/هانی صلاح الدین محمد سري الدين"
  // After normalization, both "هاني" and "هانی" become "هاني" (أ -> ا)
  // So we check if both normalized names contain "هاني", "سري", and "الدين"
  if (norm1.includes('هاني') && norm1.includes('سري') && norm1.includes('الدين') &&
      norm2.includes('هاني') && norm2.includes('سري') && norm2.includes('الدين')) {
    // This is a match - both have the core name "هاني سري الدين"
    // One may have additional names like "صلاح الدین محمد"
    return true;
  }
  
  return false;
}

/**
 * Find and merge duplicate employees based on normalized names
 */
export async function mergeDuplicateEmployees() {
  console.log('🔍 Searching for duplicate employees...');
  
  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: 'asc' }
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
  
  // Also check for similar names that might not have exact normalized match
  // This handles cases like "منة" vs "منه", "إيهاب حمدى إبراهيم امام" vs "إيهاب حمدى ابراهيم"
  const processed = new Set<string>();
  const similarGroups: any[][] = [];
  
  // Mark employees already in exact duplicate groups
  exactDuplicates.forEach(([_, emps]) => {
    emps.forEach(emp => processed.add(emp.id));
  });
  
  // First, handle special cases explicitly
  // Also use areNamesSimilar to catch first+last name matches
  const specialCaseGroups: any[][] = [];
  const specialCaseProcessed = new Set<string>();
  
  for (let i = 0; i < employees.length; i++) {
    if (specialCaseProcessed.has(employees[i].id)) continue;
    
    const group = [employees[i]];
    
    for (let j = i + 1; j < employees.length; j++) {
      if (specialCaseProcessed.has(employees[j].id)) continue;
      
      // Check both special case matching and areNamesSimilar (which includes first+last name matching)
      if (isSpecialCaseMatch(employees[i].name, employees[j].name) || 
          areNamesSimilar(employees[i].name, employees[j].name)) {
        console.log(`  ⭐ Found match: "${employees[i].name}" <-> "${employees[j].name}"`);
        group.push(employees[j]);
        specialCaseProcessed.add(employees[j].id);
      }
    }
    
    if (group.length > 1) {
      specialCaseGroups.push(group);
      group.forEach(emp => specialCaseProcessed.add(emp.id));
      group.forEach(emp => processed.add(emp.id));
    }
  }
  
  // Find similar names among remaining employees
  // Use a more comprehensive approach: check all pairs
  const remainingEmployees = employees.filter(emp => !processed.has(emp.id));
  
  for (let i = 0; i < remainingEmployees.length; i++) {
    const currentEmp = remainingEmployees[i];
    if (processed.has(currentEmp.id)) continue;
    
    const group = [currentEmp];
    
    // Check against all other remaining employees
    for (let j = i + 1; j < remainingEmployees.length; j++) {
      const otherEmp = remainingEmployees[j];
      if (processed.has(otherEmp.id)) continue;
      
      if (areNamesSimilar(currentEmp.name, otherEmp.name)) {
        console.log(`  🔗 Found similar: "${currentEmp.name}" <-> "${otherEmp.name}"`);
        group.push(otherEmp);
        processed.add(otherEmp.id);
      }
    }
    
    if (group.length > 1) {
      similarGroups.push(group);
      // Mark all in group as processed
      group.forEach(emp => processed.add(emp.id));
    }
  }
  
  // Combine exact matches, special cases, and similar matches
  const allDuplicates = [
    ...exactDuplicates.map(([normName, emps]) => [normName, emps] as [string, any[]]),
    ...specialCaseGroups.map(group => ['[SPECIAL CASE]', group] as [string, any[]]),
    ...similarGroups.map(group => ['', group] as [string, any[]])
  ];
  
  const duplicates = allDuplicates;
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    return { merged: 0, duplicates: 0 };
  }
  
  console.log(`⚠️  Found ${duplicates.length} groups of duplicates:`);
  
  let totalMerged = 0;
  let totalDuplicates = 0;
  const mergeReport: any[] = [];
  
  for (const [normalizedName, emps] of duplicates) {
    console.log(`\n📋 "${normalizedName}" (${emps.length} duplicates):`);
    
    // Get record counts for each employee
    const empsWithCounts = await Promise.all(emps.map(async (emp) => {
      const count = await prisma.salaryRecord.count({
        where: { employeeId: emp.id }
      });
      return { ...emp, recordCount: count };
    }));
    
    empsWithCounts.forEach(emp => console.log(`   - ${emp.name} (ID: ${emp.id}, Records: ${emp.recordCount}, Created: ${emp.createdAt})`));
    
    // Determine which employee to keep
    // For special cases, prefer the one with the longer/more complete name
    // Otherwise, keep the oldest employee (first created)
    let keep: any;
    let merge: any[];
    
    if (normalizedName === '[SPECIAL CASE]') {
      // For special cases, prefer the employee with the longer normalized name
      // This ensures we keep the more complete name (e.g., "حازم ابراهيم عبد الحميد محمد فتاتة" vs "حازم ابراهيم عبد الحميد")
      const sortedByLength = [...empsWithCounts].sort((a, b) => {
        const normA = normalizeEmployeeName(a.name);
        const normB = normalizeEmployeeName(b.name);
        // Prefer longer name, or if same length, prefer the one with more words
        if (normB.length !== normA.length) {
          return normB.length - normA.length;
        }
        const wordsA = normA.split(/\s+/).length;
        const wordsB = normB.split(/\s+/).length;
        if (wordsB !== wordsA) {
          return wordsB - wordsA;
        }
        // If still same, prefer the one with "محمد فتاتة" or similar additional names
        if (normB.includes('محمد') && normB.includes('فتاتة') && !normA.includes('محمد')) {
          return 1;
        }
        if (normA.includes('محمد') && normA.includes('فتاتة') && !normB.includes('محمد')) {
          return -1;
        }
        // Prefer names with "صلاح" and "محمد" (for هاني case: "هانی صلاح الدین محمد سري الدين")
        if (normB.includes('صلاح') && normB.includes('محمد') && !normA.includes('صلاح')) {
          return 1;
        }
        if (normA.includes('صلاح') && normA.includes('محمد') && !normB.includes('صلاح')) {
          return -1;
        }
        // Prefer names with "محمد" and "على" and "شريف" (for أميرة case: "أميرة محمد على شريف" vs "اميره شريف")
        if (normB.includes('محمد') && normB.includes('على') && normB.includes('شريف') && 
            !(normA.includes('محمد') && normA.includes('على'))) {
          return 1;
        }
        if (normA.includes('محمد') && normA.includes('على') && normA.includes('شريف') && 
            !(normB.includes('محمد') && normB.includes('على'))) {
          return -1;
        }
        // Otherwise, keep the oldest
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      keep = sortedByLength[0];
      merge = sortedByLength.slice(1);
    } else {
      // For regular duplicates, keep the oldest employee (first created)
      keep = empsWithCounts[0];
      merge = empsWithCounts.slice(1);
    }
    
    const keepRecordCount = keep.recordCount || 0;
    const mergeDetails: any[] = [];
    
    console.log(`   ✅ Keeping: ${keep.name} (ID: ${keep.id}, Records: ${keepRecordCount})`);
    totalDuplicates += empsWithCounts.length - 1;
    
    for (const empToMerge of merge) {
      const mergeRecordCount = empToMerge.recordCount || 0;
      console.log(`   🔄 Merging: ${empToMerge.name} (ID: ${empToMerge.id}, Records: ${mergeRecordCount})`);
      
      // Move all salary records to the kept employee
      const salaryRecords = await prisma.salaryRecord.findMany({
        where: { employeeId: empToMerge.id }
      });
      
      let recordsMoved = 0;
      let recordsSkipped = 0;
      
      for (const record of salaryRecords) {
        // Check if a record already exists for this employee/month/year
        const existing = await prisma.salaryRecord.findFirst({
          where: {
            employeeId: keep.id,
            year: record.year,
            month: record.month
          }
        });
        
        if (existing) {
          // Update existing record (keep the one from the kept employee, or merge data)
          console.log(`     ⚠️  Record for ${record.year}-${record.month} already exists, skipping...`);
          recordsSkipped++;
        } else {
          // Move the record
          await prisma.salaryRecord.update({
            where: { id: record.id },
            data: { employeeId: keep.id }
          });
          console.log(`     ✅ Moved record ${record.year}-${record.month}`);
          recordsMoved++;
        }
      }
      
      // Delete the duplicate employee
      await prisma.employee.delete({
        where: { id: empToMerge.id }
      });
      console.log(`   🗑️  Deleted duplicate employee: ${empToMerge.name}`);
      totalMerged++;
      
      mergeDetails.push({
        fromName: empToMerge.name,
        fromId: empToMerge.id,
        fromRecords: mergeRecordCount,
        recordsMoved,
        recordsSkipped
      });
    }
    
    // Get final record count for kept employee
    const finalRecordCount = await prisma.salaryRecord.count({
      where: { employeeId: keep.id }
    });
    
    mergeReport.push({
      keptEmployee: {
        name: keep.name,
        id: keep.id,
        initialRecords: keepRecordCount,
        finalRecords: finalRecordCount
      },
      mergedEmployees: mergeDetails
    });
  }
  
  console.log(`\n✅ Duplicate merge completed! Merged ${totalMerged} employees, found ${totalDuplicates} total duplicates.`);
  
  return { 
    merged: totalMerged, 
    duplicates: totalDuplicates,
    report: mergeReport
  };
}

// Run if called directly (check if this is the main module)
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/')) || process.argv[1]?.includes('merge-duplicate-employees')) {
  mergeDuplicateEmployees()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

