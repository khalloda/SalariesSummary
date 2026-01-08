/**
 * RBAC Validation Schemas
 * Schemas for role-based access control validation
 */

import { z } from 'zod';

/**
 * Role name enum
 */
export const RoleNameSchema = z.enum([
  'HR_PERSONNEL',
  'OFFICE_MANAGER',
  'FINANCE',
  'VIEW_ONLY',
  'ADMIN',
  'SUPER_ADMIN',
]);

/**
 * Permission key enum
 * Based on permissions defined in seed-superadmin.ts
 */
export const PermissionKeySchema = z.enum([
  'AUTH_LOGIN',
  'USER_READ',
  'USER_WRITE',
  'ROLE_READ',
  'ROLE_WRITE',
  'EMPLOYEE_READ',
  'EMPLOYEE_WRITE',
  'SALARY_VIEW',
  'SALARY_EDIT_ADDITIONS_DEDUCTIONS',
  'SALARY_EDIT_FULL',
  'SALARY_DELETE',
  'BONUS_VIEW',
  'BONUS_EDIT',
  'BONUS_DELETE',
  'REPORT_VIEW_ALL',
  'REPORT_VIEW_HR',
  'EXPORT_FULL_SALARY',
  'EXPORT_REDACTED_SALARY',
  'PERSONNEL_READ',
  'PERSONNEL_WRITE',
  'IMPORT_DATA',
  'DB_CLEAR',
  'AUDIT_VIEW',
]);

/**
 * Array of role names
 */
export const RoleNamesArraySchema = z.array(RoleNameSchema).min(1, 'At least one role is required');

/**
 * Array of permission keys
 */
export const PermissionKeysArraySchema = z
  .array(PermissionKeySchema)
  .min(1, 'At least one permission is required');

/**
 * Role assignment schema (for user creation/update)
 */
export const RoleAssignmentSchema = z.object({
  roles: RoleNamesArraySchema,
});

