# Zod Validation Implementation Plan

## Overview
This document outlines the complete implementation plan for integrating Zod validation across the SalariesSummary application. The implementation will be done in phases, with each phase documented and verified before moving to the next.

## Goals
1. **Security**: Prevent injection attacks, malformed data, and invalid inputs
2. **Type Safety**: Runtime validation to complement TypeScript compile-time checks
3. **Developer Experience**: Clear error messages, better autocomplete, shared schemas
4. **Maintainability**: Single source of truth for validation rules
5. **Documentation**: Schemas serve as living documentation

## Implementation Phases

### Phase 1: Foundation & Critical Security (Priority: HIGH)
**Goal**: Establish Zod infrastructure and secure critical paths

#### Task 1.1: Install Zod and Setup Infrastructure
- [ ] Install `zod` package in API
- [ ] Create validation utilities directory structure
- [ ] Create base validation middleware
- [ ] Create error handling utilities

#### Task 1.2: Environment Variable Validation
- [ ] Create `EnvSchema` with all environment variables
- [ ] Validate on application startup
- [ ] Fail fast with clear error messages
- [ ] Document required environment variables

#### Task 1.3: JWT Payload Validation
- [ ] Create `AuthUserPayloadSchema`
- [ ] Update `verifyToken` to validate payload
- [ ] Add expiration checks
- [ ] Test with invalid tokens

**Status**: ✅ Completed  
**Estimated Time**: 2-3 hours  
**Dependencies**: None  
**Actual Time**: ~1.5 hours

---

### Phase 2: Authentication & Authorization (Priority: HIGH)
**Goal**: Secure all authentication and user management endpoints

#### Task 2.1: Authentication Endpoints
- [ ] Login request validation (`username`, `password`)
- [ ] Logout validation (if needed)
- [ ] `/me` endpoint response validation

#### Task 2.2: User Management Endpoints
- [ ] User creation schema (POST `/api/users`)
- [ ] User update schema (PUT `/api/users/:id`)
- [ ] User query parameters validation
- [ ] Role assignment validation

#### Task 2.3: RBAC Validation
- [ ] Role name enum schema
- [ ] Permission key enum schema
- [ ] Role assignment validation
- [ ] Permission assignment validation

**Status**: ⏳ Not Started  
**Estimated Time**: 3-4 hours  
**Dependencies**: Phase 1 complete

---

### Phase 3: Core API Endpoints (Priority: MEDIUM)
**Goal**: Validate all employee, salary, and contract operations

#### Task 3.1: Employee Endpoints
- [ ] Employee creation schema
- [ ] Employee update schema
- [ ] Employee query parameters (filters, pagination)
- [ ] Employee detail response validation

#### Task 3.2: Salary Endpoints
- [ ] Salary record creation schema
- [ ] Salary record update schema
- [ ] Salary query parameters (year, month, employeeId)
- [ ] Bulk salary operations validation

#### Task 3.3: Contract Endpoints
- [ ] Contract creation schema
- [ ] Contract update schema
- [ ] Contract query parameters
- [ ] Contract renewal date validation

#### Task 3.4: Bonus Endpoints
- [ ] Bonus creation schema
- [ ] Bonus update schema
- [ ] Bonus query parameters

**Status**: ⏳ Not Started  
**Estimated Time**: 4-5 hours  
**Dependencies**: Phase 2 complete

---

### Phase 4: Reports & Exports (Priority: MEDIUM)
**Goal**: Validate all report query parameters and export requests

#### Task 4.1: Report Query Parameters
- [ ] Year/month validation schemas
- [ ] Category enum validation
- [ ] Date range validation
- [ ] Filter combination validation

#### Task 4.2: Export Endpoints
- [ ] Export format validation (PDF, XLSX, CSV)
- [ ] Export query parameters
- [ ] Employee ID validation for exports

#### Task 4.3: Contract Renewals Report
- [ ] Contract renewals query schema
- [ ] Filter validation (year, month, category, hideRenewed)
- [ ] Response validation

**Status**: ⏳ Not Started  
**Estimated Time**: 2-3 hours  
**Dependencies**: Phase 3 complete

---

### Phase 5: Import Operations (Priority: MEDIUM)
**Goal**: Validate file uploads and import operations

#### Task 5.1: File Upload Validation
- [ ] File type validation (Excel only)
- [ ] File size validation
- [ ] File structure validation

#### Task 5.2: Import Request Validation
- [ ] Import type validation
- [ ] Import parameters validation
- [ ] Conflict resolution request validation

**Status**: ⏳ Not Started  
**Estimated Time**: 2-3 hours  
**Dependencies**: Phase 3 complete

---

### Phase 6: Notifications (Priority: MEDIUM)
**Goal**: Validate notification settings and send requests

#### Task 6.1: Notification Settings
- [ ] Email configuration schema
- [ ] Notification settings schema
- [ ] Recipient validation
- [ ] Reminder days validation

#### Task 6.2: Notification Send Requests
- [ ] Force send request validation
- [ ] Test notification validation

**Status**: ⏳ Not Started  
**Estimated Time**: 1-2 hours  
**Dependencies**: Phase 2 complete

---

### Phase 7: Frontend Form Validation (Priority: LOW)
**Goal**: Integrate Zod with React forms

#### Task 7.1: Install Frontend Dependencies
- [ ] Install `zod` in web app
- [ ] Install `@hookform/resolvers` for react-hook-form
- [ ] Setup shared schema directory

#### Task 7.2: User Management Forms
- [ ] User creation form validation
- [ ] User edit form validation
- [ ] Role assignment validation

#### Task 7.3: Employee Management Forms
- [ ] Employee creation form validation
- [ ] Employee edit form validation

#### Task 7.4: Salary Management Forms
- [ ] Salary entry form validation
- [ ] Bulk salary form validation

**Status**: ⏳ Not Started  
**Estimated Time**: 3-4 hours  
**Dependencies**: Phases 2-3 complete

---

## File Structure

```
apps/api/src/
├── validation/
│   ├── index.ts                 # Export all schemas
│   ├── middleware.ts            # Validation middleware
│   ├── errors.ts                # Error handling utilities
│   ├── schemas/
│   │   ├── auth.ts              # Authentication schemas
│   │   ├── users.ts             # User management schemas
│   │   ├── employees.ts         # Employee schemas
│   │   ├── salaries.ts          # Salary schemas
│   │   ├── contracts.ts         # Contract schemas
│   │   ├── bonuses.ts           # Bonus schemas
│   │   ├── reports.ts           # Report query schemas
│   │   ├── exports.ts            # Export schemas
│   │   ├── imports.ts           # Import schemas
│   │   ├── notifications.ts     # Notification schemas
│   │   ├── rbac.ts              # RBAC schemas
│   │   └── common.ts            # Common/shared schemas
│   └── env.ts                   # Environment variable schema
```

## Validation Middleware Pattern

```typescript
// Example middleware usage
router.post('/users', 
  validateRequest(UserCreateSchema),
  requireAuth,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  async (req, res) => {
    // req.body is now validated and typed
  }
);
```

## Error Response Format

```typescript
{
  error: "Validation failed",
  details: [
    {
      path: ["username"],
      message: "Username must be at least 3 characters"
    }
  ]
}
```

## Testing Strategy

1. **Unit Tests**: Test each schema independently
2. **Integration Tests**: Test middleware with actual endpoints
3. **Edge Cases**: Test boundary conditions, invalid inputs
4. **Type Safety**: Ensure TypeScript types match Zod schemas

## Migration Strategy

1. **Incremental**: One endpoint at a time
2. **Backward Compatible**: Don't break existing functionality
3. **Documentation**: Update API docs as we go
4. **Rollback Plan**: Keep old validation until new is verified

## Success Criteria

- [ ] All API endpoints have request validation
- [ ] Environment variables validated on startup
- [ ] JWT payloads validated
- [ ] Clear error messages for validation failures
- [ ] Type safety maintained throughout
- [ ] No breaking changes to existing functionality
- [ ] Documentation updated

## Notes

- Start with high-priority security-critical paths
- Test thoroughly before moving to next phase
- Document any deviations from plan
- Update this document as implementation progresses

---

**Last Updated**: 2025-01-27  
**Current Phase**: ✅ **Backend Validation Complete** (Phases 1-6)  
**Overall Progress**: 86% (6/7 phases complete)  
**Status**: ✅ **Production Ready**

**Phase 6 Status**: ✅ All notification endpoints now have request body validation. Schemas created for email configuration and notification settings.

**Final Status**: All backend API endpoints validated. Phase 7 (Frontend Form Validation) is optional and can be implemented later if needed. See `ZOD_IMPLEMENTATION_SUMMARY.md` for complete details.

## Phase 6 Completion Summary

✅ **Task 6.1**: Notification endpoints validated
- Email configuration endpoint validated (host, port, secure, auth)
- Notification settings endpoint validated (enabled, days, recipients, baseUrl, language)
- Email validation for recipients
- Port validation (1-65535)
- Reminder days validation (1-365)
- Language enum validation (en, ar)
- URL validation for baseUrl

## Phase 5 Completion Summary

✅ **Task 5.1**: Import endpoints validated
- All conflict resolution endpoints have request body validation
- Salary, employee, contract, personnel, and resigned conflict resolutions validated
- Merge duplicates and manual merge endpoints validated
- Create resigned candidates endpoint validated
- Bonus import endpoint validated
- Comprehensive schemas for all conflict resolution types

## Phase 4 Completion Summary

✅ **Task 4.1**: Report query parameters validated
- All report endpoints have query parameter validation
- Year/month/category filters validated
- Required vs optional parameters clearly defined

✅ **Task 4.2**: Export endpoints validated
- All export POST endpoints have request body validation
- Export format enum validation
- Employee card export validates params and query

✅ **Task 4.3**: Contract renewals report validated
- Query parameters validated
- Boolean hideRenewed parameter handled correctly

## Phase 3 Completion Summary

✅ **Task 3.1**: Employee endpoints validated
- Comprehensive schemas covering all 30+ employee fields
- Category enum validation
- Date and numeric field validation
- All CRUD operations validated

✅ **Task 3.2**: Salary endpoints validated
- Salary amount validation with business logic (gross >= net)
- Year/month validation
- All optional fields validated
- All CRUD operations validated

✅ **Task 3.3**: Contract endpoints validated
- Support for linked and unlinked contracts
- Date validation
- All CRUD operations validated

✅ **Task 3.4**: Bonus endpoints validated
- Comprehensive bonus calculation fields
- Business logic validation (firstHalf + secondHalf = amount)
- All CRUD operations validated

## Phase 2 Completion Summary

✅ **Task 2.1**: Authentication endpoints validated
- Login endpoint has request validation
- Removed manual validation checks
- Type safety improved

✅ **Task 2.2**: User management endpoints validated
- All CRUD operations have validation
- Password complexity enforced
- CUID validation for IDs
- Username format validation

✅ **Task 2.3**: RBAC validation complete
- Role names validated via enum
- Permission keys validated via enum
- Role assignments validated
- Prevents invalid role/permission assignments

**Next Steps**: Begin Phase 3 - Core API Endpoints (Employees, Salaries, Contracts, Bonuses)

## Phase 1 Completion Summary

✅ **Task 1.1**: Infrastructure setup complete
- Zod installed and configured
- Validation middleware created
- Error handling utilities in place
- Common and RBAC schemas defined

✅ **Task 1.2**: Environment variable validation complete
- EnvSchema created and integrated
- Application fails fast on invalid env vars
- Clear error messages for debugging

✅ **Task 1.3**: JWT payload validation complete
- AuthUserPayloadSchema validates all JWT tokens
- requireAuth middleware updated
- Security improved with runtime validation

**Next Steps**: Begin Phase 2 - Authentication & Authorization endpoints

