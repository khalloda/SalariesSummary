/**
 * Environment Variable Validation
 * Validates all environment variables on application startup
 */

import { z } from 'zod';

/**
 * Environment variable schema
 */
export const EnvSchema = z.object({
  // Server configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL').optional(),

  // JWT Configuration
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security')
    .default('CHANGE_ME_IN_PRODUCTION'),

  // CORS Configuration
  CORS_ORIGIN: z.string().url('CORS_ORIGIN must be a valid URL').optional(),

  // File upload limits
  MAX_FILE_SIZE: z.coerce.number().int().positive().optional(),

  // Email configuration (optional, can be set via API)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_SECURE: z.coerce.boolean().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
});

/**
 * Validated environment variables
 * This will throw an error on import if validation fails
 */
export function validateEnv(): z.infer<typeof EnvSchema> {
  try {
    return EnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment variable validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\nPlease check your environment variables and try again.');
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Validated environment variables (cached)
 */
export const env = validateEnv();

