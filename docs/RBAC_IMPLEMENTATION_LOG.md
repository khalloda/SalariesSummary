## RBAC & Authentication Implementation Log

This document tracks the design decisions, planned steps, and completed work for adding **proper users + RBAC + sessions/JWT** to the Salaries Summary system.

### High-Level Goals

- Introduce a **User** model with local accounts (username, password) and roles.
- Implement **role-based access control (RBAC)** with a configurable permission matrix.
- Enforce **field-level access** for salary data (Basic/Gross/Net/bonuses) based on role.
- Provide **HTTP-only cookie-based authentication** using a server-validated token (session/JWT hybrid).
- Add a detailed **AuditLog** for auth events, data modifications, and salary/bonus views/exports.
- Seed an initial **SuperAdmin** user:
  - Name: `Khaled Mohamed Helmy Mohamed Yousry Abd Rabo`
  - System ID: `3-2`
  - Username: `khelmy`
  - Email: `khelmy@sarieldin.com`
  - Initial password: `P@ssw0rd`

### Role Semantics (Decided)

- `HR_PERSONNEL`
  - View & edit HR/personnel, contracts, resigned, diagnostics.
  - View & edit **Additions and Deductions**.
  - **Cannot** see `Basic`, `Gross`, `Net`, or bonus amounts.
  - Can access salary-related reports/exports only in **redacted** form.

- `OFFICE_MANAGER`
  - Full read/write across HR + salary + bonus + exports (current behavior).

- `FINANCE`
  - Full **salary/bonus visibility**.
  - Access to **all salary/bonus reports and exports**.
  - Read-only for other HR data (no edits), **except** can edit **Additions and Deductions**.

- `VIEW_ONLY`
  - Read-only equivalent of `OFFICE_MANAGER` (full visibility, no edits).

- `ADMIN`
  - Manages users, roles, system config.
  - **No salary/bonus visibility** by default.

- `SUPER_ADMIN`
  - Seeded user with all capabilities, including salary visibility and administrative powers.

### Redaction Rules (Decided)

- For roles that **cannot view salary amounts** (`HR_PERSONNEL`, `ADMIN`):
  - Replace:
    - `basicSalary`, `gross`, `net`, `yearlyIncrease`, `bonuses`, and bonus amounts
  - With the literal string: **`"RESTRICTED"`**.
  - Keep **Additions and Deductions** numeric and visible.

### Audit Trail Scope (Decided)

- Log entries in `AuditLog` for:
  - **Auth events**: login success/failure, logout.
  - **Data modifications**: create/update/delete of Employees, Salaries, Bonuses, Personnel, Contracts, Users, Roles.
  - **Salary/bonus views & exports**: accessing endpoints or exports that expose salary/bonus information.
- Retain audit logs for **1 year**, with a background job to delete older entries.

---

## Phase Plan & Status

### Phase 1: Schema & Dependencies

- **Planned**
  - Add Prisma models: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `AuditLog`.
  - Run Prisma migration to update the SQLite schema.
  - Add API dependencies for auth:
    - Password hashing (`bcrypt`).
    - Token signing/verification (`jsonwebtoken`).
    - Cookie parsing for HTTP-only session cookies (`cookie-parser`).
- **Status**
  - Completed.
  - Notes:
    - Updated `schema.prisma` with `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, and `AuditLog` models.
    - Ran `npx prisma migrate dev --name add-auth-rbac` to apply schema changes.
    - Installed `bcrypt`, `jsonwebtoken`, and `cookie-parser` in `apps/api`.

### Phase 2: SuperAdmin Seeding

- **Planned**
  - Implement a small script that:
    - Upserts the `SUPER_ADMIN` role.
    - Upserts required permissions and RolePermission entries.
    - Creates or updates the SuperAdmin user with the specified credentials and assigns roles.
  - Run the seed script once in development.
- **Status**
  - Completed.
  - Notes:
    - Added `src/scripts/seed-superadmin.ts` in `apps/api` to:
      - Upsert core roles: `HR_PERSONNEL`, `OFFICE_MANAGER`, `FINANCE`, `VIEW_ONLY`, `ADMIN`, `SUPER_ADMIN`.
      - Upsert a minimal set of permissions and attach all of them to `SUPER_ADMIN`.
      - Create/update the SuperAdmin user:
        - Name: `Khaled Mohamed Helmy Mohamed Yousry Abd Rabo`
        - System ID: `3-2`
        - Username: `khelmy`
        - Email: `khelmy@sarieldin.com`
        - Password: `P@ssw0rd` (hashed with bcrypt)
      - Attach `SUPER_ADMIN` and `ADMIN` roles to the seeded user.
    - Ran the seed script via `npx tsx src/scripts/seed-superadmin.ts` from `apps/api`.

### Phase 3: Auth Routes & Middleware

- **Planned**
  - Implement:
    - `POST /api/auth/login` (local username/password).
    - `POST /api/auth/logout`.
    - `GET /api/auth/me` (current user and roles).
  - Use HTTP-only cookies with a signed token or session identifier.
  - Add middleware:
    - `requireAuth` – rejects unauthenticated requests with 401.
    - `requireRole` / `requirePermission` – enforces role/permission checks on routes.
  - Wire middleware into existing routers:
    - Lock down all sensitive endpoints so anonymous users get 401/403.
- **Status**
  - Completed (core scaffolding).
  - Notes:
    - Added `src/utils/auth.ts` with:
      - JWT-based auth token signing/verification.
      - HTTP-only cookie helpers (`setAuthCookie`, `clearAuthCookie`).
      - `requireAuth` and `requireRole` middleware.
      - `canViewSalaryAmounts` and salary redaction helpers.
    - Added `src/routes/auth.ts` with:
      - `POST /api/auth/login` – username/password login, sets JWT cookie.
      - `POST /api/auth/logout` – clears auth cookie.
      - `GET /api/auth/me` – returns current user and roles.
    - Updated `src/index.ts` to:
      - Use `cookie-parser`.
      - Mount `authRouter` at `/api/auth`.

### Phase 4: RBAC Enforcement & Redaction

- **Planned**
  - Implement helper functions to:
    - Determine if a user can view salary amounts (`canViewSalaryAmounts(roles)`).
    - Redact salary fields (`basicSalary`, `gross`, `net`, etc.) to `"RESTRICTED"` for disallowed roles.
  - Apply RBAC and redaction in:
    - Employee endpoints (details, annual, all-years).
    - Salary/bonus reports (`reports.ts`).
    - Employee Card export and other exports.
  - Enforce role-based access for:
    - Editing salary records vs only additions/deductions.
    - Managing users and roles.
- **Status**
  - Completed (first-pass enforcement on backend).
  - Notes:
    - Employee routes (`employees.ts`):
      - All endpoints now require `requireAuth`.
      - Annual/all-years endpoints and card data use `canViewSalaryAmounts` and `redactSalaryArrayForRoles` to replace salary fields with `"RESTRICTED"` for `HR_PERSONNEL` and `ADMIN`.
      - Audit events recorded for key views (details, annual, all-years, bonus, bonus-comparison, card).
    - Employee Card export (`employee-card-export.ts`):
      - Export endpoints now require auth and use role-aware behavior:
        - For roles without salary access, the salary section is omitted from PDF/XLSX and filenames are suffixed with `hr` vs `manager`.
      - Audit events logged for PDF/XLSX exports with role context.
    - Reports (`reports.ts`):
      - All report endpoints now require auth and log audit entries.
      - Salary-sensitive reports (category totals, monthly summary, annual bonus, quick-stats, bonus incentive analysis) redact Basic/Gross/Net/bonus aggregates for restricted roles using `"RESTRICTED"` while leaving additions/deductions visible.
      - Joiners/leavers, salary changes, additions-deductions breakdown, employee tenure remain structurally unchanged but are auth-protected and audited.
    - Exports (`exports.ts`, `annual-bonus-export.ts`, `monthly-summary-export.ts`, `additions-deductions-export.ts`):
      - Employee annual and salary-changes exports:
        - Require auth and `canViewSalaryAmounts`; restricted roles receive 403 (no salary exports).
        - Audit events logged for each export.
      - Annual bonus and monthly summary exports:
        - Require auth and `canViewSalaryAmounts`; restricted roles receive 403.
      - Additions/Deductions exports:
        - Require auth but are allowed for all roles; audited.

### Phase 5: Audit Logging & Retention

- **Planned**
  - Add utility to write `AuditLog` entries from controllers and middleware.
  - Integrate into:
    - Auth routes.
    - CRUD endpoints (create/update/delete).
    - Export & salary/bonus viewing endpoints.
  - Add a scheduled job (cron or similar) to:
    - Delete `AuditLog` entries older than 1 year.
- **Status**
  - Completed.
  - Notes:
    - Added `utils/audit.ts` with a `logAudit` helper to create `AuditLog` entries without affecting main request flow.
    - Integrated audit logging into:
      - Auth routes (`auth.ts`): `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`.
      - Employee routes for salary- and bonus-related views.
      - Salary and bonus CRUD routes (`salaries-crud.ts`, `bonuses-crud.ts`) for create/update/delete and list/view operations.
      - Report routes (`reports.ts`) for all report views, including whether salary amounts were visible or redacted.
      - Export routes (`exports.ts`, `employee-card-export.ts`, `annual-bonus-export.ts`, `monthly-summary-export.ts`, `additions-deductions-export.ts`) for PDF/XLSX/CSV outputs.
    - Extended `cron-scheduler.ts`:
      - Daily retention job at 02:30 AM Africa/Cairo timezone deletes `AuditLog` entries older than 1 year based on `timestamp`.

### Phase 6: Additional Route Protection ✅

- **Planned**
  - Add RBAC protection to remaining routes:
    - Import routes (`import.ts`): Require `OFFICE_MANAGER`, `ADMIN`, or `SUPER_ADMIN` for salary imports; `SUPER_ADMIN` only for database clear.
    - Employee CRUD routes (`employees-crud.ts`): Require `HR_PERSONNEL`, `OFFICE_MANAGER`, `ADMIN`, or `SUPER_ADMIN` for create/update; `OFFICE_MANAGER`, `ADMIN`, or `SUPER_ADMIN` for delete.
    - Bulk salary routes (`bulk-salary.ts`): Require authentication for view; `OFFICE_MANAGER`, `FINANCE`, or `SUPER_ADMIN` for create; apply salary redaction for restricted roles.
    - Personnel routes (`personnel.ts`): Require authentication for all endpoints.
    - Config routes (`config.ts`): Require authentication for view; `ADMIN` or `SUPER_ADMIN` for modification.
- **Status**
  - Completed.
  - Notes:
    - All import routes now require appropriate role-based access.
    - Employee CRUD operations are protected with role checks.
    - Bulk salary view endpoint applies salary redaction for `HR_PERSONNEL` and `ADMIN` roles.
    - Personnel and config routes are protected.
    - Audit logging added to bulk salary operations.

### Phase 7: Final Route Protection ✅

- **Planned**
  - Add RBAC protection to remaining CRUD and utility routes:
    - Contracts CRUD routes (`contracts-crud.ts`): Require authentication for all; `HR_PERSONNEL` or higher for create/update; `OFFICE_MANAGER` or higher for delete.
    - Personnel CRUD routes (`personnel-crud.ts`): Require authentication for all; `HR_PERSONNEL` or higher for create/update; `OFFICE_MANAGER` or higher for delete.
    - Personnel diagnostics routes (`personnel-diagnostics.ts`): Require `HR_PERSONNEL` or higher for diagnostic operations.
    - Personnel export routes (`personnel-export.ts`): Require authentication for all export endpoints.
    - Notification routes (`notifications.ts`): Require authentication for view; `ADMIN` or `SUPER_ADMIN` for configuration and sending.
- **Status**
  - Completed.
  - Notes:
    - All API routes are now protected with appropriate role-based access control.
    - Read operations require authentication only (unless salary data is involved, which requires role checks).
    - Write operations require appropriate roles based on the data type (HR data: `HR_PERSONNEL`+, salary data: `OFFICE_MANAGER`/`FINANCE`+, admin operations: `ADMIN`+).
    - System configuration and notification management restricted to `ADMIN` and `SUPER_ADMIN`.

### Phase 8: Documentation Updates

- **Planned**
  - Update `SYSTEM_AUDIT.md` to:
    - Reflect the new auth, roles, and RBAC behavior.
    - Describe the audit logging and redaction semantics.
  - Optionally add a short **User & Role Guide** for operators.
- **Status**
  - Completed.
  - Notes:
    - Updated `SYSTEM_AUDIT.md` section 4 "Authentication & Authorization" with:
      - JWT-based authentication details.
      - Complete role model and permissions structure.
      - Enforcement points (middleware, frontend protection).
      - Data redaction rules for restricted roles.
      - Route protection summary.
      - Audit trail implementation.
      - SuperAdmin seeding information.
    - Updated `SYSTEM_AUDIT.md` section 10 "Security Considerations" with:
      - Current authentication/authorization status.
      - Improved sensitive data handling (salary redaction).
      - Updated vulnerability assessment.
    - Updated `SYSTEM_AUDIT.md` section 1 "System Overview" to reflect explicit user roles.


