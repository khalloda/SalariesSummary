/**
 * Validation Error Utilities
 * Provides standardized error formatting for Zod validation errors
 */

import { z } from 'zod';
import type { Response } from 'express';

/**
 * Format Zod validation errors for API responses
 */
export function formatValidationError(error: z.ZodError): {
  error: string;
  details: Array<{ path: string[]; message: string }>;
} {
  return {
    error: 'Validation failed',
    details: error.errors.map((err) => ({
      path: err.path.map(String),
      message: err.message,
    })),
  };
}

/**
 * Send validation error response
 */
export function sendValidationError(res: Response, error: z.ZodError): void {
  const formatted = formatValidationError(error);
  res.status(400).json(formatted);
}

/**
 * Check if error is a Zod validation error
 */
export function isZodError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError;
}

