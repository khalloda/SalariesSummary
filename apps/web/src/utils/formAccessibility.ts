import { FieldErrors } from 'react-hook-form';

/**
 * Get the first invalid field name from form errors
 */
export function getFirstInvalidField<T extends Record<string, any>>(
  errors: FieldErrors<T>
): string | null {
  if (!errors || Object.keys(errors).length === 0) return null;
  
  // Return the first error field name
  return Object.keys(errors)[0] as string;
}

/**
 * Focus the first invalid field in a form
 */
export function focusFirstInvalidField(formId: string, fieldName: string | null) {
  if (!fieldName) return;
  
  // Try to find the input by name attribute
  const field = document.querySelector(`[name="${fieldName}"]`) as HTMLElement;
  if (field) {
    field.focus();
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  
  // Fallback: try to find by ID
  const fieldById = document.getElementById(`${formId}-${fieldName}`);
  if (fieldById) {
    fieldById.focus();
    fieldById.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Generate a unique ID for error message element
 */
export function getErrorId(fieldName: string): string {
  return `${fieldName}-error`;
}

/**
 * Generate a unique ID for field description/help text
 */
export function getDescriptionId(fieldName: string): string {
  return `${fieldName}-description`;
}
