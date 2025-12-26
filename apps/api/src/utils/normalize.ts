/**
 * Normalization utilities for employee data
 */

/**
 * Normalize employee name for matching
 * - Remove common prefixes (د/, أ/, etc.)
 * - Normalize Arabic character variations
 * - Normalize whitespace
 * - Handle name structure variations
 */
export function normalizeEmployeeName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  
  let normalized = name.trim();
  
  // Remove common Arabic prefixes with various patterns
  // Handle: "أ/", "أ/ ", "أ.", "أ. ", "د/", "د/ ", "د.", "د. "
  // Using Unicode-aware regex for Arabic characters
  normalized = normalized.replace(/^[أد]\s*[\/\.]\s*/u, ''); // Matches أ/ or أ. or د/ or د. with optional spaces
  normalized = normalized.replace(/^د\/\s*/u, '');
  normalized = normalized.replace(/^أ\/\s*/u, '');
  normalized = normalized.replace(/^د\.\s*/u, '');
  normalized = normalized.replace(/^أ\.\s*/u, '');
  
  // Also handle Latin equivalents (A/, A., D/, D.) for consistency
  normalized = normalized.replace(/^[AaDd]\s*[\/\.]\s*/u, '');
  
  // Normalize Arabic character variations
  // Normalize all alif variations (أ, ا, إ, آ) to ا (alif without hamza)
  // This ensures "إبراهيم" and "ابراهيم" are treated the same
  normalized = normalized.replace(/[أإآ]/g, 'ا');
  
  // ة (ta marbuta) -> ه (ha) for name matching
  // Handle both "منة" and "منه" as the same
  normalized = normalized.replace(/ة/g, 'ه');
  
  // Remove special characters and normalize
  normalized = normalized.replace(/[ـ_]/g, ''); // Remove tatweel and underscores
  normalized = normalized.replace(/[ـ\u200C\u200D]/g, ''); // Remove zero-width characters
  
  // Normalize all whitespace (multiple spaces, tabs, etc.) to single space
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // Remove extra spaces around special characters
  normalized = normalized.replace(/\s*ـ\s*/g, '');
  
  return normalized;
}

/**
 * Check if two names have matching first and last names
 * Returns true if first name and last name match (ignoring middle names)
 */
export function hasMatchingFirstAndLastName(name1: string, name2: string): boolean {
  const norm1 = normalizeEmployeeName(name1);
  const norm2 = normalizeEmployeeName(name2);
  
  const words1 = norm1.split(/\s+/).filter(w => w.length > 0);
  const words2 = norm2.split(/\s+/).filter(w => w.length > 0);
  
  if (words1.length === 0 || words2.length === 0) return false;
  
  // Get first and last names
  const first1 = words1[0];
  const last1 = words1[words1.length - 1];
  const first2 = words2[0];
  const last2 = words2[words2.length - 1];
  
  // Check if first name and last name match
  return first1 === first2 && last1 === last2;
}

/**
 * Advanced name matching for duplicate detection
 * Handles cases like:
 * - "إيهاب حمدى إبراهيم امام" vs "إيهاب حمدى ابراهيم" (missing last name)
 * - "أميرة محمد على شريف" vs "اميره شــريف" (abbreviated name)
 * - "حازم إبراهيم عبد الحميد" vs "حازم ابراهيم عبد الحميد محمد فتاتة" (additional middle/last names)
 * - "هند علاء الدين عبد السلام النشار" vs "هند علاء الدين عبدالسلام النجار" (similar last names)
 * - "هاني سري الدين" vs "هانی صلاح الدین محمد سري الدين" (additional middle names)
 */
export function areNamesSimilar(name1: string, name2: string): boolean {
  // First check: if first and last names match, they're similar (regardless of middle names)
  if (hasMatchingFirstAndLastName(name1, name2)) {
    return true;
  }
  const norm1 = normalizeEmployeeName(name1);
  const norm2 = normalizeEmployeeName(name2);
  
  // Exact match after normalization
  if (norm1 === norm2) return true;
  
  // Split into words
  const words1 = norm1.split(/\s+/).filter(w => w.length > 0);
  const words2 = norm2.split(/\s+/).filter(w => w.length > 0);
  
  if (words1.length === 0 || words2.length === 0) return false;
  
  // Check if one name is a subset of the other (handles abbreviated names)
  // For example: "أميرة محمد على شريف" vs "اميره شريف"
  const shorter = words1.length <= words2.length ? words1 : words2;
  const longer = words1.length > words2.length ? words1 : words2;
  const longerSet = new Set(longer);
  
  // All words in shorter name must be in longer name
  const allWordsMatch = shorter.every(word => longerSet.has(word));
  
  if (allWordsMatch && shorter.length >= 2) {
    // Additional check: first and last words should match
    const shorterFirst = shorter[0];
    const shorterLast = shorter[shorter.length - 1];
    const longerFirst = longer[0];
    const longerLast = longer[longer.length - 1];
    
    if (shorterFirst === longerFirst && shorterLast === longerLast) {
      return true;
    }
  }
  
  // Check for common patterns:
  // "إيهاب حمدى إبراهيم امام" vs "إيهاب حمدى ابراهيم"
  // "حازم إبراهيم عبد الحميد" vs "حازم ابراهيم عبد الحميد محمد فتاتة"
  // First 2-3 words should match
  const minWords = Math.min(words1.length, words2.length);
  if (minWords >= 2) {
    // Check first 2 words match
    const first2Words1 = words1.slice(0, 2).join(' ');
    const first2Words2 = words2.slice(0, 2).join(' ');
    if (first2Words1 === first2Words2) {
      // Check if remaining words are similar or one is a subset
      const remaining1 = words1.slice(2);
      const remaining2 = words2.slice(2);
      
      // If one has no remaining words, it's a match (abbreviated name)
      if (remaining1.length === 0 || remaining2.length === 0) {
        return true;
      }
      
      // Check if all words from shorter remaining list are in longer
      const shorterRemaining = remaining1.length <= remaining2.length ? remaining1 : remaining2;
      const longerRemaining = remaining1.length > remaining2.length ? remaining1 : remaining2;
      const longerRemainingSet = new Set(longerRemaining);
      
      if (shorterRemaining.every(word => longerRemainingSet.has(word))) {
        return true;
      }
    }
    
    // Check first 3 words match (for cases like "هند علاء الدين")
    if (minWords >= 3) {
      const first3Words1 = words1.slice(0, 3).join(' ');
      const first3Words2 = words2.slice(0, 3).join(' ');
      if (first3Words1 === first3Words2) {
        // Check last words - they might be similar (e.g., "النشار" vs "النجار")
        const last1 = words1[words1.length - 1];
        const last2 = words2[words2.length - 1];
        
        // If last words are very similar (differ by 1-2 characters), consider match
        if (last1 && last2 && last1.length >= 3 && last2.length >= 3) {
          const similarity = calculateSimilarity(last1, last2);
          if (similarity >= 0.7) { // 70% similar
            return true;
          }
        }
        
        // Or if one is a subset of the other
        const remaining1 = words1.slice(3);
        const remaining2 = words2.slice(3);
        if (remaining1.length === 0 || remaining2.length === 0) {
          return true;
        }
      }
    }
    
    // Special case: Handle names where one has additional middle names
    // Example: "هاني سري الدين" vs "هانی صلاح الدین محمد سري الدين"
    // Check if first word matches and last 2 words match
    if (words1.length >= 3 && words2.length >= 3) {
      const first1 = words1[0];
      const first2 = words2[0];
      const last2Words1 = words1.slice(-2).join(' ');
      const last2Words2 = words2.slice(-2).join(' ');
      
      if (first1 === first2 && last2Words1 === last2Words2) {
        // Check if all words from shorter name appear in longer name
        const shorter = words1.length <= words2.length ? words1 : words2;
        const longer = words1.length > words2.length ? words1 : words2;
        const longerSet = new Set(longer);
        
        // All words from shorter should be in longer
        if (shorter.every(word => longerSet.has(word))) {
          return true;
        }
      }
    }
  }
  
  // Special case: "هاني سري الدين" vs "هانی صلاح الدین محمد سري الدين"
  // Check if first word and last 2 words match
  if (words1.length >= 3 && words2.length >= 3) {
    const first1 = words1[0];
    const first2 = words2[0];
    const last2Words1 = words1.slice(-2).join(' ');
    const last2Words2 = words2.slice(-2).join(' ');
    
    if (first1 === first2 && last2Words1 === last2Words2) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate similarity between two strings (0-1)
 * Simple Levenshtein distance-based similarity
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
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

