/**
 * Shared utilities for employee-related operations across reports
 */

/**
 * Get category priority for sorting
 * Partners → Lawyers → Admins → Consultants → Others
 */
export function getCategoryPriority(category: string | undefined): number {
  if (!category) return 999;
  const lowerCaseCategory = category.toLowerCase();
  if (lowerCaseCategory.includes('partner')) return 1;
  if (lowerCaseCategory.includes('lawyer')) return 2;
  if (lowerCaseCategory.includes('admin')) return 3;
  if (lowerCaseCategory.includes('consultant')) return 4;
  return 999;
}

/**
 * Sort categories: Partners first, then Lawyers, Admins, Consultants, then others
 */
export function sortCategories(a: string, b: string): number {
  const priorityA = getCategoryPriority(a);
  const priorityB = getCategoryPriority(b);
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }
  return a.localeCompare(b);
}

/**
 * Compare employee codes numerically (e.g., "2-1", "2-2", "2-14")
 */
export function compareEmployeeCodes(codeA: string | undefined, codeB: string | undefined): number {
  if (!codeA && !codeB) return 0;
  if (!codeA) return 1;
  if (!codeB) return -1;

  const partsA = codeA.split('-').map(Number);
  const partsB = codeB.split('-').map(Number);

  for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
    if (partsA[i] !== partsB[i]) {
      return partsA[i] - partsB[i];
    }
  }
  return partsA.length - partsB.length;
}

/**
 * Normalize text for robust search matching
 * Handles both English and Arabic characters
 */
export function normalizeForSearch(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  let normalized = text.trim();
  
  // Normalize Arabic character variations
  // Normalize all alif variations (أ, ا, إ, آ) to ا
  normalized = normalized.replace(/[أإآ]/g, 'ا');
  
  // ة (ta marbuta) -> ه (ha)
  normalized = normalized.replace(/ة/g, 'ه');
  
  // Remove special characters
  normalized = normalized.replace(/[ـ_]/g, '');
  
  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Convert to lowercase for English
  normalized = normalized.toLowerCase();
  
  // Normalize Unicode (for English diacritics)
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Remove non-word characters (but keep Arabic and English letters/numbers)
  normalized = normalized.replace(/[^\w\s\u0600-\u06FF]/g, '');
  
  return normalized.trim();
}

/**
 * Group and sort employees by category
 */
export function groupAndSortEmployeesByCategory<T extends { category?: string; employeeCode?: string }>(
  employees: T[]
): Record<string, T[]> {
  const employeesByCategory: Record<string, T[]> = {};
  
  employees.forEach(emp => {
    const category = emp.category || 'Uncategorized';
    if (!employeesByCategory[category]) {
      employeesByCategory[category] = [];
    }
    employeesByCategory[category].push(emp);
  });

  // Sort categories
  const sortedCategories = Object.keys(employeesByCategory).sort(sortCategories);

  // Sort employees within each category by employee code
  sortedCategories.forEach(category => {
    employeesByCategory[category].sort((a, b) => compareEmployeeCodes(a.employeeCode, b.employeeCode));
  });

  return employeesByCategory;
}

