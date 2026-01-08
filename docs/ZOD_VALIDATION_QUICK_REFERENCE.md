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
    ├── users.ts         # User schemas
    ├── employees.ts     # Employee schemas
    ├── salaries.ts      # Salary schemas
    ├── contracts.ts     # Contract schemas
    ├── bonuses.ts       # Bonus schemas
    ├── reports.ts       # Report schemas
    ├── exports.ts       # Export schemas
    ├── imports.ts       # Import schemas
    └── notifications.ts # Notification schemas
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

## Additional Resources

- **Full Documentation**: See `ZOD_IMPLEMENTATION_SUMMARY.md`
- **Implementation Log**: See `ZOD_IMPLEMENTATION_LOG.md`
- **Implementation Plan**: See `ZOD_IMPLEMENTATION_PLAN.md`
- **Zod Documentation**: https://zod.dev/

---

**Last Updated**: 2025-01-27

