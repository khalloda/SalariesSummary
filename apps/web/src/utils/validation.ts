import { ZodError } from 'zod';

/**
 * Maps Zod validation errors to a field-level error object
 * @param error - ZodError from schema validation
 * @returns Object with field paths as keys and error messages as values
 */
export function mapZodErrorsToFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    // If multiple errors for same field, keep the first one
    if (!fieldErrors[path]) {
      fieldErrors[path] = err.message;
    }
  });
  
  return fieldErrors;
}

/**
 * Gets the first error message from a ZodError (for top-level error display)
 */
export function getFirstZodErrorMessage(error: ZodError): string {
  return error.errors[0]?.message || 'Validation error';
}

/**
 * Gets all error messages from a ZodError (for multi-error display)
 */
export function getAllZodErrorMessages(error: ZodError): string[] {
  return error.errors.map((err) => err.message);
}
