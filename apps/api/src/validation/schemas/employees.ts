/**
 * Employee Validation Schemas
 * Schemas for employee CRUD operations
 */

import { z } from 'zod';
import { CuidSchema, DateSchema } from './common.js';

/**
 * Employee category enum
 */
export const EmployeeCategorySchema = z.enum([
  'Partners/شركاء',
  'Lawyers/محامين',
  'Admins/عاملين',
  'Consultants/مستشارين',
]);

/**
 * Employee status enum
 */
export const EmployeeStatusSchema = z.enum(['Active', 'Resigned']).optional().nullable();

/**
 * Employee creation schema
 * Includes all fields from Employee model
 */
export const EmployeeCreateSchema = z
  .object({
    name: z.string().min(1, 'Employee name is required').max(200, 'Name too long'),
    nameArabic: z.string().max(200, 'Arabic name too long').optional().nullable(),
    employeeCode: z.string().max(50, 'Employee code too long').optional().nullable(),
    category: EmployeeCategorySchema.optional().nullable(),
    jobTitle: z.string().max(200, 'Job title too long').optional().nullable(),
    department: z.string().max(200, 'Department too long').optional().nullable(),
    status: EmployeeStatusSchema,
    dateOfBirth: DateSchema.optional().nullable(),
    joiningDate: DateSchema.optional().nullable(),
    graduationCertificate: z.string().max(200).optional().nullable(),
    graduationSection: z.string().max(200).optional().nullable(),
    graduationUniversity: z.string().max(200).optional().nullable(),
    graduationYear: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
    socialInsurance: z.string().max(100).optional().nullable(),
    barAssociation: z.string().max(100).optional().nullable(),
    barAssociationValidTill: DateSchema.optional().nullable(),
    barAssociationDegree: z.string().max(100).optional().nullable(),
    taxCard: z.string().max(100).optional().nullable(),
    nationalId: z.string().max(100).optional().nullable(),
    nationalIdValidTill: DateSchema.optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    addressRegion: z.string().max(100).optional().nullable(),
    addressGovernorate: z.string().max(100).optional().nullable(),
    extension: z.string().max(50).optional().nullable(),
    mobileNumber: z.string().max(50).optional().nullable(),
    contractType: z.string().max(100).optional().nullable(),
    contractDuration: z.string().max(200).optional().nullable(),
    contractRenewalDate: DateSchema.optional().nullable(),
    experienceInYears: z.coerce.number().int().min(0).max(100).optional().nullable(),
    experienceInMonths: z.coerce.number().int().min(0).max(11).optional().nullable(),
    experienceOutYears: z.coerce.number().int().min(0).max(100).optional().nullable(),
    experienceOutMonths: z.coerce.number().int().min(0).max(11).optional().nullable(),
    notes: z.string().max(1000, 'Notes too long').optional().nullable(),
    personnelData: z.record(z.any()).optional().nullable(), // JSON object
    resignationDate: DateSchema.optional().nullable(),
    resignationReason: z.string().max(500).optional().nullable(),
  })
  .strict();

/**
 * Employee update schema
 * All fields optional for partial updates
 */
export const EmployeeUpdateSchema = z
  .object({
    name: z.string().min(1, 'Employee name is required').max(200, 'Name too long').optional(),
    nameArabic: z.string().max(200, 'Arabic name too long').optional().nullable(),
    employeeCode: z.string().max(50, 'Employee code too long').optional().nullable(),
    category: EmployeeCategorySchema.optional().nullable(),
    jobTitle: z.string().max(200, 'Job title too long').optional().nullable(),
    department: z.string().max(200, 'Department too long').optional().nullable(),
    status: EmployeeStatusSchema,
    dateOfBirth: DateSchema.optional().nullable(),
    joiningDate: DateSchema.optional().nullable(),
    graduationCertificate: z.string().max(200).optional().nullable(),
    graduationSection: z.string().max(200).optional().nullable(),
    graduationUniversity: z.string().max(200).optional().nullable(),
    graduationYear: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
    socialInsurance: z.string().max(100).optional().nullable(),
    barAssociation: z.string().max(100).optional().nullable(),
    barAssociationValidTill: DateSchema.optional().nullable(),
    barAssociationDegree: z.string().max(100).optional().nullable(),
    taxCard: z.string().max(100).optional().nullable(),
    nationalId: z.string().max(100).optional().nullable(),
    nationalIdValidTill: DateSchema.optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    addressRegion: z.string().max(100).optional().nullable(),
    addressGovernorate: z.string().max(100).optional().nullable(),
    extension: z.string().max(50).optional().nullable(),
    mobileNumber: z.string().max(50).optional().nullable(),
    contractType: z.string().max(100).optional().nullable(),
    contractDuration: z.string().max(200).optional().nullable(),
    contractRenewalDate: DateSchema.optional().nullable(),
    experienceInYears: z.coerce.number().int().min(0).max(100).optional().nullable(),
    experienceInMonths: z.coerce.number().int().min(0).max(11).optional().nullable(),
    experienceOutYears: z.coerce.number().int().min(0).max(100).optional().nullable(),
    experienceOutMonths: z.coerce.number().int().min(0).max(11).optional().nullable(),
    notes: z.string().max(1000, 'Notes too long').optional().nullable(),
    personnelData: z.record(z.any()).optional().nullable(),
    resignationDate: DateSchema.optional().nullable(),
    resignationReason: z.string().max(500).optional().nullable(),
  })
  .strict();

/**
 * Employee ID parameter schema
 */
export const EmployeeIdParamSchema = z.object({
  id: CuidSchema,
});

/**
 * Employee query parameters schema (for filtering)
 */
export const EmployeeQuerySchema = z.object({
  category: EmployeeCategorySchema.optional(),
  status: EmployeeStatusSchema,
  department: z.string().optional(),
  search: z.string().optional(),
});

