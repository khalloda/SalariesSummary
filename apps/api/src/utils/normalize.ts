/**
 * Normalization utilities for employee data
 */

/**
 * Normalize employee name for matching
 * - Remove common prefixes (د/, أ/, etc.)
 * - Normalize whitespace
 * - Remove diacritics (simplified)
 */
export function normalizeEmployeeName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  
  let normalized = name.trim();
  
  // Remove common Arabic prefixes
  normalized = normalized.replace(/^د\/\s*/i, '');
  normalized = normalized.replace(/^أ\.?\s*/i, '');
  normalized = normalized.replace(/^د\.?\s*/i, '');
  
  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // Basic diacritic removal (can be enhanced)
  // For now, just normalize spacing
  
  return normalized;
}

/**
 * Parse numeric value from string
 * Handles Arabic numerals, commas, and various formats
 */
export function parseNumeric(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const str = String(value).trim();
  if (!str || str === '' || str === '-') return 0;
  
  // Remove commas and spaces
  const cleaned = str.replace(/,/g, '').replace(/\s/g, '');
  
  // Convert Arabic numerals to Western (0-9)
  const arabicToWestern: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  
  let converted = cleaned;
  for (const [arabic, western] of Object.entries(arabicToWestern)) {
    converted = converted.replace(new RegExp(arabic, 'g'), western);
  }
  
  const parsed = parseFloat(converted);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extract month and year from filename
 */
export function parseMonthYearFromFilename(filename: string): { month: number; year: number } | null {
  // Pattern: "NN - MonthName Salaries YYYY.xlsx" or "NN- MonthName Salaries YYYY.xlsx"
  // Also handles: "NN- MonthName Salaries YYYY.xlsx" (no space after dash)
  const match = filename.match(/^(\d{1,2})\s*-\s*[A-Za-z]+\s+Salaries\s+(\d{4})/i);
  
  if (match) {
    const month = parseInt(match[1], 10);
    const year = parseInt(match[2], 10);
    
    if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
      return { month, year };
    } else {
      console.warn(`Invalid month/year parsed: month=${month}, year=${year} from ${filename}`);
    }
  } else {
    console.warn(`No match found for filename pattern: ${filename}`);
  }
  
  return null;
}

/**
 * Get month name in English
 */
export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}

/**
 * Get month name in Arabic
 */
export function getMonthNameArabic(month: number): string {
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  return months[month - 1] || 'غير معروف';
}

