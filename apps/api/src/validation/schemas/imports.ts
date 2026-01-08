/**
 * Import Validation Schemas
 * Schemas for import operations, conflict resolution, and merge operations
 */

import { z } from 'zod';
import { CuidSchema, YearSchema, MonthSchema } from './common.js';

/**
 * Conflict resolution action enum
 */
export const ConflictActionSchema = z.enum(['keep', 'update', 'skip']);

/**
 * Salary conflict resolution schema
 */
export const SalaryConflictResolutionSchema = z.object({
  employeeId: CuidSchema,
  year: YearSchema,
  month: MonthSchema,
  action: ConflictActionSchema,
  incomingRecord: z.record(z.any()).optional(), // Optional salary record data
}).strict();

/**
 * Salary conflict resolutions request schema
 */
export const SalaryConflictResolutionsSchema = z.object({
  resolutions: z.array(SalaryConflictResolutionSchema).min(1, 'At least one resolution is required'),
}).strict();

/**
 * Employee conflict resolution schema
 */
export const EmployeeConflictResolutionSchema = z.object({
  employeeId: CuidSchema,
  action: ConflictActionSchema,
  incomingRecord: z.record(z.any()).optional(), // Optional employee record data
}).strict();

/**
 * Employee conflict resolutions request schema
 */
export const EmployeeConflictResolutionsSchema = z.object({
  resolutions: z.array(EmployeeConflictResolutionSchema).min(1, 'At least one resolution is required'),
}).strict();

/**
 * Contract conflict resolution schema
 */
export const ContractConflictResolutionSchema = z.object({
  contractId: CuidSchema.optional(),
  employeeId: CuidSchema.nullable().optional(),
  employeeCode: z.string().max(100).nullable().optional(),
  contractDate: z.coerce.date().nullable().optional(),
  contractDuration: z.string().max(100).nullable().optional(),
  action: ConflictActionSchema,
  incomingRecord: z.record(z.any()).optional(), // Optional contract record data
}).strict();

/**
 * Contract conflict resolutions request schema
 */
export const ContractConflictResolutionsSchema = z.object({
  resolutions: z.array(ContractConflictResolutionSchema).min(1, 'At least one resolution is required'),
}).strict();

/**
 * Personnel conflict resolution schema
 */
export const PersonnelConflictResolutionSchema = z.object({
  employeeId: CuidSchema,
  action: ConflictActionSchema,
  incomingRecord: z.record(z.any()).optional(), // Optional personnel record data
}).strict();

/**
 * Personnel conflict resolutions request schema
 */
export const PersonnelConflictResolutionsSchema = z.object({
  resolutions: z.array(PersonnelConflictResolutionSchema).min(1, 'At least one resolution is required'),
}).strict();

/**
 * Resigned conflict resolution schema
 */
export const ResignedConflictResolutionSchema = z.object({
  rowIndex: z.number().int().positive(),
  employeeId: CuidSchema,
  action: z.enum(['update', 'skip']), // Resigned conflicts only support update or skip
  incomingData: z.object({
    name: z.string().min(1),
    nationalId: z.string().max(100).nullable().optional(),
    classification: z.string().max(100).nullable().optional(),
    jobTitle: z.string().max(200).nullable().optional(),
    department: z.string().max(200).nullable().optional(),
    resignationDate: z.coerce.date(),
    dateOfBirth: z.coerce.date().nullable().optional(),
    nationalIdValidTill: z.coerce.date().nullable().optional(),
    barAssociation: z.string().max(200).nullable().optional(),
    barAssociationDegree: z.string().max(200).nullable().optional(),
    joiningDate: z.coerce.date().nullable().optional(),
  }).strict(),
}).strict();

/**
 * Resigned conflict resolutions request schema
 */
export const ResignedConflictResolutionsSchema = z.object({
  resolutions: z.array(ResignedConflictResolutionSchema).min(1, 'At least one resolution is required'),
}).strict();

/**
 * Duplicate merge pair schema
 */
export const DuplicateMergePairSchema = z.object({
  employee1Id: CuidSchema,
  employee2Id: CuidSchema,
}).strict();

/**
 * Merge duplicates request schema
 */
export const MergeDuplicatesSchema = z.object({
  selectedPairs: z.array(DuplicateMergePairSchema).optional(), // If provided, merge only selected pairs
}).strict();

/**
 * Manual merge request schema
 */
export const ManualMergeSchema = z.object({
  targetEmployeeId: CuidSchema,
  employeeIdsToMerge: z.array(CuidSchema).min(1, 'At least one employee ID to merge is required'),
}).strict();

/**
 * Resigned candidate schema
 */
export const ResignedCandidateSchema = z.object({
  rowIndex: z.number().int().positive(),
  name: z.string().min(1),
  nationalId: z.string().max(100).nullable().optional(),
  classification: z.string().max(100).nullable().optional(),
  jobTitle: z.string().max(200).nullable().optional(),
  department: z.string().max(200).nullable().optional(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  nationalIdValidTill: z.coerce.date().nullable().optional(),
  barAssociation: z.string().max(200).nullable().optional(),
  barAssociationDegree: z.string().max(200).nullable().optional(),
  joiningDate: z.coerce.date().nullable().optional(),
  resignationDate: z.coerce.date(),
}).strict();

/**
 * Create resigned candidates request schema
 */
export const CreateResignedCandidatesSchema = z.object({
  candidates: z.array(ResignedCandidateSchema).min(1, 'At least one candidate is required'),
}).strict();

/**
 * Bonus import request schema (for form data after multer)
 */
export const BonusImportBodySchema = z.object({
  sheetName: z.string().min(1, 'Sheet name is required'),
  year: z.coerce.number().int().positive().optional(), // Will default to current year if not provided
}).strict();

/**
 * Type exports
 */
export type ConflictAction = z.infer<typeof ConflictActionSchema>;
export type SalaryConflictResolution = z.infer<typeof SalaryConflictResolutionSchema>;
export type SalaryConflictResolutions = z.infer<typeof SalaryConflictResolutionsSchema>;
export type EmployeeConflictResolution = z.infer<typeof EmployeeConflictResolutionSchema>;
export type EmployeeConflictResolutions = z.infer<typeof EmployeeConflictResolutionsSchema>;
export type ContractConflictResolution = z.infer<typeof ContractConflictResolutionSchema>;
export type ContractConflictResolutions = z.infer<typeof ContractConflictResolutionsSchema>;
export type PersonnelConflictResolution = z.infer<typeof PersonnelConflictResolutionSchema>;
export type PersonnelConflictResolutions = z.infer<typeof PersonnelConflictResolutionsSchema>;
export type ResignedConflictResolution = z.infer<typeof ResignedConflictResolutionSchema>;
export type ResignedConflictResolutions = z.infer<typeof ResignedConflictResolutionsSchema>;
export type DuplicateMergePair = z.infer<typeof DuplicateMergePairSchema>;
export type MergeDuplicates = z.infer<typeof MergeDuplicatesSchema>;
export type ManualMerge = z.infer<typeof ManualMergeSchema>;
export type ResignedCandidate = z.infer<typeof ResignedCandidateSchema>;
export type CreateResignedCandidates = z.infer<typeof CreateResignedCandidatesSchema>;
export type BonusImportBody = z.infer<typeof BonusImportBodySchema>;

