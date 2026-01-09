/**
 * Formatting utilities for numbers, currency, dates, and phone numbers
 */

/**
 * Format a number with thousand separators
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "1,234.56")
 */
export function formatNumber(value: number | string | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || value === '') return '';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Parse a formatted number string back to a number
 * Removes thousand separators and converts to number
 * @param value - The formatted string (e.g., "1,234.56")
 * @returns The numeric value
 */
export function parseFormattedNumber(value: string): number {
  if (!value) return 0;
  // Remove all non-digit characters except decimal point
  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format a number as EGP currency
 * @param value - The number to format
 * @returns Formatted string (e.g., "1,234.56 EGP")
 */
export function formatCurrencyEGP(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  
  return `${formatNumber(num, 2)} EGP`;
}

/**
 * Format a date for display (DD/MM/YYYY)
 * @param date - Date string (ISO) or Date object
 * @returns Formatted string (e.g., "25/12/2024")
 */
export function formatDateDisplay(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Parse a DD/MM/YYYY date string to ISO format
 * @param dateString - Date string in DD/MM/YYYY format
 * @returns ISO date string (YYYY-MM-DD)
 */
export function parseDateInput(dateString: string): string {
  if (!dateString) return '';
  
  // Handle DD/MM/YYYY format
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  
  // If already in ISO format, return as is
  return dateString;
}

/**
 * Format a phone number (Egyptian format)
 * @param phone - Phone number string
 * @returns Formatted string (e.g., "+20 123 456 7890")
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format Egyptian phone numbers
  if (cleaned.length === 11 && cleaned.startsWith('01')) {
    return `+20 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  if (cleaned.length === 10) {
    return `+20 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  // Return as is if doesn't match expected format
  return phone;
}

/**
 * Get current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Get current month (1-12)
 */
export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

/**
 * Get month name from number (1-12)
 */
export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}
