# Zod Validation - Quick Reference Guide

A quick reference for using Zod validation in the SalariesSummary API.

---

## Basic Usage

### Request Body Validation
```typescript
import { validateBody } from '../validation/middleware.js';
import { MySchema } from '../validation/schemas/my-schema.js';

router.post('/endpoint', 
  validateBody(MySchema),
  requireAuth,
  async (req, res) => {
    // req.body is validated and typed
    const { field1, field2 } = req.body; // TypeScript knows the types
  }
);
```

### Query Parameter Validation
```typescript
import { validateQuery } from '../validation/middleware.js';
import { MyQuerySchema } from '../validation/schemas/my-schema.js';

router.get('/endpoint',
  validateQuery(MyQuerySchema),
  requireAuth,
  async (req, res) => {
    // req.query is validated and typed
    const { year, month } = req.query; // Types are inferred
  }
);
```

### Path Parameter Validation
```typescript
import { validateParams } from '../validation/middleware.js';
import { MyParamSchema } from '../validation/schemas/my-schema.js';

router.get('/endpoint/:id',
  validateParams(MyParamSchema),
  requireAuth,
  async (req, res) => {
    // req.params.id is validated
    const { id } = req.params; // Type is CUID string
  }
);
```

---

## Common Schemas

### From `common.ts`
```typescript
import { 
  CuidSchema,           // Prisma ID format
  EmailSchema,          // Email validation
  YearSchema,           // Year (2000-2100)
  MonthSchema,          // Month (1-12)
  DateSchema,           // Date validation
  NonNegativeNumberSchema, // Number >= 0
  EmployeeCategorySchema, // Category enum
} from '../validation/schemas/common.js';
```

### Example Usage
```typescript
import { z } from 'zod';
import { CuidSchema, YearSchema, MonthSchema } from './common.js';

export const MySchema = z.object({
  employeeId: CuidSchema,
  year: YearSchema,
  month: MonthSchema,
  amount: NonNegativeNumberSchema,
});
```

---

## Schema Patterns

### Required Fields
```typescript
z.object({
  name: z.string().min(1, 'Name is required'),
  email: EmailSchema,
});
```

### Optional Fields
```typescript
z.object({
  name: z.string().min(1),
  email: EmailSchema.optional(),
  phone: z.string().max(20).optional(),
});
```

### Arrays
```typescript
z.object({
  items: z.array(CuidSchema).min(1, 'At least one item required'),
  tags: z.array(z.string()).optional(),
});
```

### Enums
```typescript
z.object({
  status: z.enum(['active', 'inactive', 'pending']),
  role: RoleNameSchema, // From rbac.ts
});
```

### Coercion (String to Number)
```typescript
z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  port: z.coerce.number().int().positive().max(65535),
});
```

### Custom Validation (Refinements)
```typescript
z.object({
  gross: z.number(),
  net: z.number(),
}).refine(
  (data) => data.gross >= data.net,
  {
    message: 'Gross must be >= Net',
    path: ['gross'],
  }
);
```

### Partial Updates (All Optional)
```typescript
export const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: EmailSchema.optional(),
  phone: z.string().max(20).optional(),
}).strict();
```

---

## Error Handling

### Automatic Error Response
Validation errors are automatically handled by the middleware:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": ["email"],
      "message": "Invalid email format"
    },
    {
      "path": ["year"],
      "message": "Year must be >= 2000"
    }
  ]
}
```

### HTTP Status Code
- Validation errors return `400 Bad Request`
- Error details include field paths and messages

---

## Type Inference

### Automatic Type Inference
```typescript
import { MySchema } from '../validation/schemas/my-schema.js';

// Type is automatically inferred
type MyType = z.infer<typeof MySchema>;

// Or export it from schema file
export type MyType = z.infer<typeof MySchema>;
```

### Using in Route Handlers
```typescript
router.post('/endpoint', 
  validateBody(MySchema),
  async (req, res) => {
    // TypeScript knows the exact type of req.body
    const data: MyType = req.body; // Type-safe!
  }
);
```

### Multiple Validation Middlewares
```typescript
router.get('/endpoint/:id',
  validateParams(IdParamSchema),      // Validate path params first
  validateQuery(QuerySchema),         // Then query params
  validateBody(BodySchema),           // Then body (for POST/PUT)
  requireAuth,                        // Then authentication
  async (req, res) => {
    const { id } = req.params;        // Validated CUID
    const { year } = req.query;       // Validated number
    const { data } = req.body;        // Validated object
  }
);
```

---

## Common Patterns

### ID Parameter
```typescript
export const IdParamSchema = z.object({
  id: CuidSchema,
});

router.get('/:id',
  validateParams(IdParamSchema),
  async (req, res) => {
    const { id } = req.params; // Validated CUID
  }
);
```

### Year Query
```typescript
export const YearQuerySchema = z.object({
  year: YearSchema.optional(),
});

router.get('/endpoint',
  validateQuery(YearQuerySchema),
  async (req, res) => {
    const year = req.query.year || new Date().getFullYear();
  }
);
```

### Pagination
```typescript
import { PaginationSchema } from './common.js';

router.get('/endpoint',
  validateQuery(PaginationSchema),
  async (req, res) => {
    const { page, limit } = req.query;
  }
);
```

### Complex Nested Data Structures
For routes that receive complex nested data from the frontend (e.g., export routes), use `.passthrough()` to allow flexible structures while validating required fields:

```typescript
export const ComplexExportBodySchema = z.object({
  year: YearSchema,                    // Validate required simple fields
  data: z.object({
    employees: z.array(z.any()),       // Validate array exists
    totals: z.any(),                   // Allow flexible nested structure
  }).passthrough(),                    // Allow additional properties
});

router.post('/export/pdf',
  validateBody(ComplexExportBodySchema),
  async (req, res) => {
    const { year, data } = req.body;   // year is validated, data is flexible
    // ... handler logic
  }
);
```

### Validating Required Fields in Flexible Structures
```typescript
// Validate that required structure exists, but allow flexible content
export const ReportDataSchema = z.object({
  year: YearSchema,
  detailView: z.string().optional(),
  data: z.object({
    additions: z.any(),      // Must exist, but structure can vary
    deductions: z.any(),     // Must exist, but structure can vary
  }).passthrough(),          // Allow additional top-level fields
});
```

---

## Best Practices

### 1. Use Common Schemas
Reuse schemas from `common.ts` instead of redefining:
```typescript
// ✅ Good
import { CuidSchema, YearSchema } from './common.js';

// ❌ Bad
z.string().cuid() // Redefines CuidSchema
```

### 2. Export Types
Always export TypeScript types from schema files:
```typescript
export const MySchema = z.object({ ... });
export type MyType = z.infer<typeof MySchema>;
```

### 3. Use `.strict()`
Prevent extra fields in objects:
```typescript
z.object({ ... }).strict();
```

### 4. Clear Error Messages
Provide helpful error messages:
```typescript
z.string().min(1, 'Name is required')
z.number().positive('Amount must be positive')
```

### 5. Validate Early
Apply validation middleware before other middleware:
```typescript
// ✅ Good - validation first
router.post('/endpoint',
  validateBody(MySchema),
  requireAuth,
  requireRole('ADMIN'),
  handler
);

// ❌ Bad - validation after auth
router.post('/endpoint',
  requireAuth,
  validateBody(MySchema), // Too late
  handler
);
```

---

## Troubleshooting

### Error: "Cannot read property of undefined"
**Cause**: Validation failed, but handler still executed  
**Fix**: Ensure validation middleware is applied correctly

### Error: "Type mismatch"
**Cause**: Schema type doesn't match actual data  
**Fix**: Check schema definition, use `.coerce` if needed

### Error: "Extra fields not allowed"
**Cause**: Object has fields not in schema  
**Fix**: Add `.passthrough()` or add missing fields to schema

### Error: "Invalid date format"
**Cause**: Date string not in expected format  
**Fix**: Use `z.coerce.date()` or `DateSchema` from common.ts

---

## File Organization

```
apps/api/src/validation/
├── index.ts              # Central exports
├── middleware.ts         # Validation middleware
├── errors.ts            # Custom error classes
├── env.ts               # Environment variable schema
└── schemas/
    ├── common.ts        # Shared schemas
    ├── auth.ts          # Authentication schemas
    ├── rbac.ts          # RBAC schemas
    ├── users.ts         # User schemas
    ├── employees.ts     # Employee schemas
    ├── salaries.ts      # Salary schemas
    ├── contracts.ts     # Contract schemas
    ├── bonuses.ts       # Bonus schemas
    ├── reports.ts       # Report schemas (query params)
    ├── exports.ts       # Export schemas (params, query, body)
    ├── imports.ts       # Import/merge schemas
    ├── notifications.ts # Notification schemas
    ├── bulk.ts          # Bulk operations schemas (NEW)
    └── personnel.ts     # Personnel routes schemas (NEW)
```

---

## Quick Examples

### Create Schema
```typescript
// validation/schemas/my-feature.ts
import { z } from 'zod';
import { CuidSchema, EmailSchema } from './common.js';

export const CreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: EmailSchema,
  userId: CuidSchema,
}).strict();

export type CreateType = z.infer<typeof CreateSchema>;
```

### Use in Route
```typescript
// routes/my-feature.ts
import { validateBody } from '../validation/middleware.js';
import { CreateSchema } from '../validation/schemas/my-feature.js';

router.post('/my-feature',
  validateBody(CreateSchema),
  requireAuth,
  async (req, res) => {
    // req.body is validated and typed
    const data = req.body; // Type: CreateType
    // ... handler logic
  }
);
```

### Export from Index
```typescript
// validation/index.ts
export * from './schemas/my-feature.js';
```

---

## Available Schemas Reference

### Path Parameter Schemas

#### Employee ID
```typescript
import { EmployeeIdParamSchema } from './schemas/employees.js';
// Validates: { id: CUID }

import { ExportEmployeeParamsSchema } from './schemas/exports.js';
// Validates: { id: CUID }

import { PersonnelParamsSchema } from './schemas/personnel.js';
// Validates: { employeeId: CUID }

import { BulkSalaryParamsSchema } from './schemas/bulk.js';
// Validates: { year: number, month: number }
```

### Query Parameter Schemas

#### Reports
```typescript
import {
  CategoryTotalsQuerySchema,
  MonthlySummaryQuerySchema,
  SalaryChangesQuerySchema,
  AnnualBonusQuerySchema,
  JoinersLeaversQuerySchema,
  QuickStatsQuerySchema,
  BonusIncentiveAnalysisQuerySchema,
  EmployeeTenureQuerySchema,
  ContractRenewalsQuerySchema,
  AdditionsDeductionsQuerySchema,
  AvailableYearsQuerySchema,
} from './schemas/reports.js';
```

#### Employees
```typescript
import {
  EmployeeAnnualQuerySchema,        // { year?: number }
  EmployeeBonusComparisonQuerySchema, // { fromYear?: number, toYear?: number }
} from './schemas/employees.js';
```

#### Personnel
```typescript
import {
  PersonnelComplianceQuerySchema,   // { category?: string, minCompliance?: number }
  PersonnelAssetsQuerySchema,       // { category?: string }
  PersonnelDiagnosticsQuerySchema,  // { filePath?: string }
} from './schemas/personnel.js';
```

#### Exports
```typescript
import {
  EmployeeAnnualExportQuerySchema,  // { year?: number, format?: 'csv' | 'xlsx' | 'pdf' }
  SalaryChangesExportQuerySchema,   // { year?: number, format?: 'pdf' }
} from './schemas/exports.js';
```

### Body Schemas

#### Bulk Operations
```typescript
import { BulkSalaryCreateBodySchema } from './schemas/bulk.js';
// Validates: { year: number, month: number, employees: BulkSalaryRecord[] }
```

#### Exports (Complex Nested Data)
```typescript
import {
  EmployeeCardBodySchema,                  // { employeeId: CUID }
  AdditionsDeductionsExportBodySchema,     // { year, detailView?, data: { additions, deductions } }
  AnnualBonusExportBodySchema,             // { year?, includeConsultants?, viewMode?, exportMode?, showHalves?, data }
  MonthlySummaryExportBodySchema,          // { year, data: { monthlyData } }
  DocumentComplianceExportBodySchema,      // { data: { employees }, categoryFilter?, minComplianceFilter? }
  AssetInventoryExportBodySchema,          // { data: { employees }, categoryFilter?, assetFilter? }
  PersonnelDashboardExportBodySchema,      // { data: any }
  EmployeeTenureExportBodySchema,          // { year?, summary?, tenureRanges?, categoryAverages?, employees: array }
} from './schemas/exports.js';
```

#### Config
```typescript
// In route file
const BonusHalvesBodySchema = z.object({
  showHalves: z.boolean(),
});
```

## Real-World Examples

### Example 1: Export Route with Complex Data
```typescript
// schemas/exports.ts
export const AdditionsDeductionsExportBodySchema = z.object({
  year: YearSchema,
  detailView: z.string().optional(),
  data: z.object({
    additions: z.any(),      // Flexible nested structure
    deductions: z.any(),     // Flexible nested structure
  }).passthrough(),
});

// routes/additions-deductions-export.ts
router.post('/additions-deductions/pdf',
  validateBody(AdditionsDeductionsExportBodySchema),
  async (req, res) => {
    const { year, detailView, data } = req.body;
    // year is validated number
    // detailView is optional string
    // data.additions and data.deductions exist but structure is flexible
  }
);
```

### Example 2: Report Route with Query Params
```typescript
// schemas/reports.ts
export const JoinersLeaversQuerySchema = z.object({
  year: YearSchema.optional(),
});

// routes/reports.ts
router.get('/joiners-leavers',
  validateQuery(JoinersLeaversQuerySchema),
  async (req, res) => {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    // year is validated if provided, or defaults to current year
  }
);
```

### Example 3: Bulk Operation with Array Validation
```typescript
// schemas/bulk.ts
export const BulkSalaryRecordSchema = z.object({
  employeeId: CuidSchema,
  employeeName: z.string().min(1),
  basicSalary: z.number().nonnegative(),
  // ... other fields
});

export const BulkSalaryCreateBodySchema = z.object({
  year: YearSchema,
  month: MonthSchema,
  employees: z.array(BulkSalaryRecordSchema).min(1, 'At least one employee is required'),
});

// routes/bulk-salary.ts
router.post('/create',
  validateBody(BulkSalaryCreateBodySchema),
  async (req, res) => {
    const { year, month, employees } = req.body;
    // All employees validated, at least one required
  }
);
```

### Example 4: Path + Query Validation
```typescript
// schemas/employees.ts
export const EmployeeIdParamSchema = z.object({
  id: CuidSchema,
});

export const EmployeeAnnualQuerySchema = z.object({
  year: YearSchema.optional(),
});

// routes/employees.ts
router.get('/:id/annual',
  validateParams(EmployeeIdParamSchema),
  validateQuery(EmployeeAnnualQuerySchema),
  async (req, res) => {
    const { id } = req.params;  // Validated CUID
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  }
);
```

## Validation Best Practices (Updated)

### 6. Use `.passthrough()` for Complex Nested Data
When validating complex data structures from the frontend (like export report data), validate required fields but allow flexible nested structures:

```typescript
// ✅ Good - Validates structure while allowing flexibility
export const ExportSchema = z.object({
  year: YearSchema,                    // Validate required fields
  data: z.object({
    employees: z.array(z.any()),       // Ensure array exists
  }).passthrough(),                    // Allow additional properties
});

// ❌ Bad - Too strict for complex nested data
export const ExportSchema = z.object({
  year: YearSchema,
  data: z.object({
    employees: z.array(z.object({
      // Defining exact structure would be brittle
    })),
  }).strict(),
});
```

### 7. Validate Path Params for All Dynamic Routes
Always validate path parameters, even if Prisma will validate them:

```typescript
// ✅ Good
router.get('/:id',
  validateParams(EmployeeIdParamSchema),
  async (req, res) => {
    const { id } = req.params; // Validated CUID
  }
);

// ❌ Bad - Unvalidated path param
router.get('/:id', async (req, res) => {
  const { id } = req.params; // Could be anything!
});
```

### 8. Use Type Coercion for Query Parameters
Query parameters come as strings, so use `.coerce`:

```typescript
// ✅ Good - Coerces string to number
export const YearSchema = z.coerce
  .number()
  .int('Year must be an integer')
  .min(2000, 'Year must be >= 2000')
  .max(2100, 'Year must be <= 2100');

// ❌ Bad - Won't work, query params are strings
export const YearSchema = z.number().int().min(2000).max(2100);
```

### 9. Provide Defaults for Optional Query Params
Use `.optional().default()` for query parameters that should have defaults:

```typescript
// ✅ Good - Has default
export const ExportQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx', 'pdf']).optional().default('csv'),
  year: YearSchema.optional(),
});

// ❌ Bad - No default, must handle undefined
export const ExportQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx', 'pdf']).optional(),
});
```

## Additional Resources

- **Full Documentation**: See `ZOD_IMPLEMENTATION_SUMMARY.md`
- **Implementation Log**: See `ZOD_IMPLEMENTATION_LOG.md`
- **Implementation Plan**: See `ZOD_IMPLEMENTATION_PLAN.md`
- **Comprehensive Validation Plan**: See `COMPREHENSIVE_ZOD_VALIDATION_PLAN.md`
- **Zod Documentation**: https://zod.dev/

---

**Last Updated**: 2026-01-10  
**Version**: 2.0 (Comprehensive Validation Implementation Complete)

