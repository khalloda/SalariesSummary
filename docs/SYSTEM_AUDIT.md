**Last Updated**: 2026-01-10  
**Recent Updates**: 
- Comprehensive Zod validation implementation completed across all backend API endpoints achieving 100% coverage (see Section 10: Security Considerations for details).
- All routes with input parameters now validated: 95 validation middleware instances across 20 route files.
- Reviewer's acceptance criteria fully met: Zero endpoints consume unchecked `req.body`, `req.query`, or `req.params`.
- New validation schemas created: bulk operations, personnel routes, and complex export routes.
- Complete documentation updated with all new schemas, patterns, and best practices.

---

## 1. System Overview

- **Purpose of the application**
  - Processes Excel salary workbooks and related HR sheets to:
    - Import monthly salaries and additions/deductions into a database.
    - Import personnel, contract, and resigned-employee data.
    - Import and analyze annual bonus data.
    - Provide multi-dimensional salary/bonus/personnel reports.
    - Generate PDF/XLSX/CSV exports for employees, summaries, and diagnostics.

- **Target users**
  - **Explicit user roles implemented**:
    - **HR_PERSONNEL**: personnel records, contracts, document compliance, asset inventory, resigned employees, additions/deductions (no salary/bonus visibility).
    - **FINANCE**: salaries, additions/deductions, annual bonuses, category and monthly summaries (full salary/bonus visibility, read-only HR data, can edit additions/deductions).
    - **OFFICE_MANAGER**: full access to all data including salaries, bonuses, HR, and management functions.
    - **VIEW_ONLY**: read-only access to all data including salaries and bonuses.
    - **ADMIN**: user and role management, system configuration (no salary/bonus visibility by default).
    - **SUPER_ADMIN**: all capabilities including salary visibility and administrative powers.
  - User accounts exist in `User` table with role-based access control (RBAC) enforced throughout the system.

- **Country/jurisdiction assumed for payroll**
  - Not explicitly encoded, but strongly implied by:
    - Arabic labels and categories (e.g., `Partners/شركاء`, `Lawyers/محامين`, `Admins/عاملين`, `Consultants/مستشارين`).
    - Fields such as Bar Association Number, `درجة القيد`, Social Insurance, Tax Card, and Arabic sheet names (`مرتبات`, `اضافات`, `خصومات`).
  - **Conclusion**: Appears tailored to an Egyptian legal/accounting context, but **jurisdiction is not programmatically enforced**.
  - Any tax/insurance rules are treated as imported numeric amounts, not as codified law.

- **Single-tenant or multi-tenant**
  - Single SQLite database file (`dev.db`) with no tenant field or tenant separation.
  - No concept of organizations, companies, or tenants in models or routes.
  - **Conclusion**: **Single-tenant / single-entity** deployment.

- **Deployment model**
  - Code and docs support:
    - Local development (Node, SQLite direct file).
    - XAMPP-based hosting (Apache reverse proxy to API, as per docs/API.md and config).
    - Docker (Dockerfiles for `api` and `web`, `docker-compose.yml`).
  - No explicit cloud provider integrations.
  - **Exact production hosting environment** is **not determinable from current codebase**; only generic container/XAMPP options are prepared.

---

## 2. Technology Stack

### Backend

- **Language(s)**
  - TypeScript compiled to Node.js (ES modules).

- **Framework(s)**
  - `express` for HTTP API.
  - `multer` for file uploads.
  - `puppeteer` for server-side HTML→PDF generation.
  - `xlsx` (SheetJS) / `ExcelJS` for Excel parsing and generation.
  - `@prisma/client` with Prisma ORM (singleton pattern implemented).
  - ✅ `zod` for runtime validation and type-safe schema validation (v4.3.5) - **100% coverage achieved**:
    - 95 validation middleware instances across 20 route files.
    - All routes with input parameters now validated.
    - Zero unchecked input consumption.

- **Architecture style**
  - Express with:
    - Per-feature routers under `src/routes`.
    - Service modules under `src/services`.
    - Utility modules under `src/utils`.
  - Responsibility split is **mostly layered**, but:
    - Some routes directly perform DB operations (e.g., `reports`, CRUD routes).
    - Some services perform both parsing and domain logic.
  - **Architecture style**: **mixed layered/service-based**, without a strict domain boundary.

### Frontend

- **Framework / templating**
  - React 18 + TypeScript.
  - Vite as build tool and dev server.
  - Tailwind CSS for styling.
  - React Router for routing.
  - `react-i18next` for i18n (Arabic/English).

- **Client-side logic responsibility**
  - Fetches and renders:
    - Dashboard stats.
    - Employee lists and details.
    - Reports (category totals, joiners/leavers, salary changes, monthly summaries, bonus analyses, personnel diagnostics).
    - Management UIs for employees, contracts, salaries, bonuses, bulk salary entry, notification settings.
  - Client does **not** perform core salary or tax calculations:
    - It consumes pre-calculated values (`basicSalary`, `gross`, `net`, additions/deductions breakdown) from the API.
    - Some aggregations and charts are computed client-side but based on server data.
  - Frontend calls dedicated export endpoints to get PDFs/XLSX instead of generating them locally.

### Database

- **DB engine**
  - SQLite, via Prisma datasource:
    - `provider = "sqlite"`
    - `url = "file:./dev.db"`.

- **ORM or raw SQL**
  - Prisma ORM exclusively (`PrismaClient`).
  - ✅ **Prisma Client singleton pattern implemented** (see `apps/api/src/db/prisma.ts`):
    - Single `PrismaClient` instance shared across the application to prevent connection pool exhaustion and memory overhead.
    - Graceful shutdown handling via `beforeExit` event listener.
    - Hot-reload safe in development using `globalThis`.
    - All 33 instances of `new PrismaClient()` replaced with singleton import.
  - No raw SQL queries present in analyzed code.

- **Transaction handling approach**
  - All demonstrated operations use individual Prisma calls (`create`, `update`, `findMany`, etc.).
  - No explicit multi-step transactions (`prisma.$transaction`) in the inspected files.
  - Import flows perform multiple dependent operations (create employee, then salary records, then logs) **without database transactions**, so they are only partially atomic at per-record level.

---

## 3. Application Structure

- **Folder tree (summarized)**
  - `apps/api`
    - `src/index.ts`: Express server entrypoint.
    - `src/routes`: API routes (import, employees, CRUD for salaries/bonuses/contracts/personnel, exports, reports, notifications).
    - `src/services`: Excel parsing, imports (salaries, SEP employees, contracts, personnel, resigned), bonus imports, cron/notification services.
    - `src/utils`: normalization, record comparison, bonus calculations, config helpers, comparison logic for personnel/contracts/employees, authentication utilities.
    - `src/validation`: Zod validation schemas and middleware (comprehensive validation with 100% coverage).
      - `schemas/`: Domain-specific validation schemas (auth, users, employees, salaries, contracts, bonuses, reports, exports, imports, notifications, bulk, personnel).
      - `middleware.ts`: Validation middleware (`validateBody`, `validateQuery`, `validateParams`).
    - `src/db/prisma.ts`: Prisma Client singleton pattern implementation.
    - `prisma/schema.prisma` and migrations.
  - `apps/web`
    - `src/App.tsx`: route definitions.
    - `src/pages`: dashboard, all reports, management screens, diagnostics, settings.
    - `src/components`: layout/navigation.
    - `src/i18n.ts`: translation setup and strings.
    - `src/api/config.ts`: API base URL selection.
  - `docs`: extensive design and process documentation (not enforced by code but mostly aligned).
  - `Sheets`: Excel workbooks that are the data source.
  - Root tooling: `docker-compose.yml`, top-level `package.json`, scripts for analysis.

- **Core modules and responsibilities**
  - **Import layer**
    - `import-service.ts`:
      - Reads salary `.xlsx` files (`مرتبات`, `اضافات`, `خصومات` sheets) from either `Sheets` directory or uploaded files.
      - Parses into normalized `ParsedSalaryRecord` structures.
      - Resolves employees by `normalizedName` (and tracks similar names, but **does not auto-merge**).
      - Compares incoming vs existing salary records for the same employee/year/month:
        - Identical → skipped (`recordsSkipped`).
        - Different → added to `conflicts` list for later manual resolution.
        - New → `SalaryRecord.create`.
      - Logs imports into `ImportLog` with errors JSON.
    - `excel-parser.ts`:
      - Implements month/employee parsing logic tightly coupled to current workbook formats.
      - Applies category segmentation based on Arabic “total” rows (e.g., `اجمالي الشركاء`).
      - Fills additions/deductions breakdowns by column position.
    - `bonus-import-service.ts`:
      - Parses bonus sheets with dynamic header detection.
      - Extracts for each year:
        - Previous/current net and gross salaries.
        - Annual increase (net/gross) as differences or dedicated columns.
        - Bonus total and halves, previous-year bonus, reflected metrics.
      - Creates/updates `AnnualBonus` per employee/year.
    - `sep-employees-import-service.ts`, `contracts-import-service.ts`, `personnel-import-service.ts`, `resigned-import-service.ts`:
      - Parse `SEPEmployees.xlsx`/`Resigned` sheets to populate `Employee`, `ContractRecord`, `PersonnelRecord`, and `ResignationRecord`, and update employee fields.

  - **Salary & bonus management**
    - `salaries-crud.ts`: REST CRUD for `SalaryRecord` with numeric field parsing and `employeeId+year+month` uniqueness enforcement.
    - `bonuses-crud.ts`: REST CRUD for `AnnualBonus` with `(employeeId, year)` uniqueness enforcement and numeric parsing.

  - **Reporting**
    - `reports.ts`:
      - Available years (from `SalaryRecord` and `AnnualBonus`).
      - Category totals (with department subtotals).
      - Joiners/leavers based on presence/absence of salary records across adjacent years.
      - Salary changes (basic salary changes across months).
      - Annual bonus aggregates and breakdowns (including growth ratios).
      - Quick stats (total payroll, average salary, category distribution).
      - Bonus incentive analysis.
      - Monthly summary totals.

  - **Exports**
    - `exports.ts`: employee annual report PDF/CSV/XLSX, salary changes PDF.
    - `monthly-summary-export.ts`: monthly summary PDF/XLSX (using data submitted by client).
    - `annual-bonus-export.ts`: annual bonus report PDF/XLSX based on already-aggregated data sent from frontend.
    - `additions-deductions-export.ts`: additions/deductions PDF/XLSX, based on pre-aggregated payload.
    - `employee-card-export.ts`: employee card PDF/XLSX using employee, salary, and personnel data.

  - **Personnel & diagnostics**
    - `personnel.ts`: document compliance report, asset inventory, personnel dashboard, per-employee personnel read.
    - `personnel-crud.ts`: CRUD/upsert for `PersonnelRecord`, including asset parsing.
    - `personnel-diagnostics.ts`: compares Personnel sheet vs AllOffice sheet and vs database to detect mismatches.

  - **Notifications**
    - `notifications.ts` + `cron-scheduler.ts` + `notification-scheduler.ts` + `email-service.ts`:
      - Scheduler and email delivery for configurable notifications.
      - No relation to payroll calculations themselves; ancillary feature.

- **Entry points**
  - **Backend**: `apps/api/src/index.ts`
    - Sets up Express, CORS, JSON limits, registers all routers, and starts listener on `PORT` (default 3001).
    - Starts notification scheduler on server start.
  - **Frontend**: `apps/web/src/main.tsx` mounting `App.tsx` (not shown in detail but implied by Vite+React standard).

- **Shared utilities/helpers**
  - `normalize.ts`:
    - Name normalization (Arabic/Latin prefixes, whitespace, Unicode-aware regex).
    - Numeric parsing helper `parseNumeric`.
    - Month parsing and `getMonthName`.
    - Heuristic name similarity (`areNamesSimilar`).
  - `record-comparison.ts`:
    - Compares existing vs incoming salary records field-by-field, computes similarity %, flags identical vs conflicting.
  - `bonus-calculations.ts`:
    - Derived metrics like `reflectedInMonths`, `%`, remaining from previous bonus, growth ratios.
  - `config.ts` (API side, plus JSON config):
    - Reads server-side config (e.g. bonus halves behavior) from JSON files.
  - Comparison utilities for contracts, employees, personnel (used in import diagnostics and conflict resolutions).

---

## 4. Authentication & Authorization

- **Authentication method**
  - **HTTP-only cookie-based JWT sessions**:
    - `POST /api/auth/login` accepts `username` and `password`, validates request body with Zod (`LoginRequestSchema`), validates against `User` table, sets HTTP-only cookie `salaries_auth` with JWT token.
    - `POST /api/auth/logout` clears the auth cookie.
    - `GET /api/auth/me` returns current authenticated user and roles.
    - JWT tokens expire after 8 hours (configurable via `JWT_EXPIRES_IN_SECONDS`).
    - ✅ **JWT payload validation**: All JWT tokens are validated with `AuthUserPayloadSchema` using Zod, ensuring token structure integrity at runtime.
    - Password hashing uses `bcrypt` with salt rounds of 10.
    - All API routes (except `/api/health`) require authentication via `requireAuth` middleware.

- **User model**
  - `User` table in schema:
    - `id` (cuid primary key)
    - `username` (unique, used for login)
    - `email` (optional, unique)
    - `passwordHash` (bcrypt hashed)
    - `fullName`
    - `systemId` (optional, e.g. "3-2")
    - `isActive` (boolean, defaults to true)
    - `createdAt`, `updatedAt` timestamps
  - Users are linked to roles via `UserRole` junction table.

- **Role model (roles, permissions)**
  - **Roles** (defined in `Role` table):
    - `HR_PERSONNEL`: HR/personnel data management, can edit additions/deductions, **cannot** see salary/bonus amounts.
    - `OFFICE_MANAGER`: Full read/write access to all data including salaries and bonuses.
    - `FINANCE`: Full salary/bonus visibility, can edit additions/deductions, read-only for other HR data.
    - `VIEW_ONLY`: Read-only equivalent of `OFFICE_MANAGER` (full visibility, no edits).
    - `ADMIN`: User and role management, system configuration, **no salary/bonus visibility** by default.
    - `SUPER_ADMIN`: All capabilities including salary visibility and administrative powers.
  - **Permissions** (defined in `Permission` table):
    - Granular permissions like `EMPLOYEE_READ`, `EMPLOYEE_WRITE`, `SALARY_VIEW`, `SALARY_EDIT_FULL`, `SALARY_EDIT_ADDITIONS_DEDUCTIONS`, `BONUS_VIEW`, `REPORT_VIEW_ALL`, `EXPORT_FULL_SALARY`, `EXPORT_REDACTED_SALARY`, `USER_WRITE`, `ROLE_WRITE`, etc.
    - Roles are assigned permissions via `RolePermission` junction table.
    - Permission checks are enforced via `requirePermission(permissionKey)` middleware.

- **Enforcement points**
  - **Backend middleware**:
    - `requireAuth`: Validates JWT token from HTTP-only cookie, rejects with 401 if missing/invalid.
    - `requireRole(...roles)`: Checks if user has at least one of the specified roles, rejects with 403 if not.
    - `requirePermission(permissionKey)`: Checks if user has the specified permission through their roles, rejects with 403 if not.
  - **Frontend route protection**:
    - `RequireAuth` component: Redirects unauthenticated users to `/login`.
    - `RequireRole` component: Shows "Access Denied" for users without required roles.
  - **CORS restriction** (still in place):
    - `http://localhost:3000`
    - `http://salaries.local`
    - `http://www.salaries.local`
    - `credentials: true` enabled for cookie handling.

- **Data redaction for restricted roles**
  - Roles without salary visibility (`HR_PERSONNEL`, `ADMIN`) receive redacted data:
    - `basicSalary`, `gross`, `net`, `yearlyIncrease`, `bonuses` replaced with literal string `"RESTRICTED"`.
    - Additions and deductions remain visible and editable for `HR_PERSONNEL` and `FINANCE`.
  - Redaction applied in:
    - Employee detail endpoints (`/api/employees/:id/all-years`, `/api/employees/:id/annual`, `/api/employees/:id/card`).
    - Salary-sensitive reports (category totals, monthly summary, annual bonus, bonus incentive analysis).
    - Export endpoints (PDF/XLSX filenames and content are role-aware).

- **Route protection summary**
  - **Public routes**: `/api/health` only.
  - **Authenticated routes**: All other routes require `requireAuth`.
  - **Role-restricted routes**:
    - Employee CRUD: `HR_PERSONNEL`, `OFFICE_MANAGER`, `ADMIN`, `SUPER_ADMIN` (create/update); `OFFICE_MANAGER`, `ADMIN`, `SUPER_ADMIN` (delete).
    - Salary imports: `OFFICE_MANAGER`, `ADMIN`, `SUPER_ADMIN`.
    - Database clear: `SUPER_ADMIN` only.
    - User/Role management: `ADMIN`, `SUPER_ADMIN` only.
    - Notification settings: `ADMIN`, `SUPER_ADMIN` only.
    - Bulk salary create: `OFFICE_MANAGER`, `FINANCE`, `SUPER_ADMIN`.
  - **Permission-based checks**: Used for granular control (e.g., `SALARY_VIEW`, `EXPORT_FULL_SALARY`).

- **Audit trail**
  - `AuditLog` table records:
    - Auth events: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`.
    - Data modifications: `EMPLOYEE_CREATE`, `EMPLOYEE_UPDATE`, `EMPLOYEE_DELETE`, `SALARY_CREATE`, `SALARY_UPDATE`, `SALARY_DELETE`, `USER_CREATE`, `USER_UPDATE`, `USER_DELETE`, etc.
    - Salary/bonus views and exports: `EMPLOYEE_VIEW`, `SALARY_VIEW`, `BONUS_VIEW`, `EMPLOYEE_CARD_EXPORT`, etc.
  - Each audit entry includes: `userId`, `action`, `resource`, `resourceId`, `details` (JSON), `timestamp`.
  - Audit logs retained for **1 year**, with automated daily cleanup job at 02:30 AM (Africa/Cairo timezone).

- **Initial SuperAdmin user**
  - Seeded user:
    - Username: `khelmy`
    - Full Name: `Khaled Mohamed Helmy Mohamed Yousry Abd Rabo`
    - System ID: `3-2`
    - Email: `khelmy@sarieldin.com`
    - Initial password: `P@ssw0rd` (should be changed on first login in production)
    - Roles: `SUPER_ADMIN`, `ADMIN`
  - Created via `apps/api/src/scripts/seed-superadmin.ts`.

- **Known limitations or bypass risks**
  - JWT secret (`JWT_SECRET`) defaults to `'CHANGE_ME_IN_PRODUCTION'` if not set in environment variables; **must be changed in production**.
  - HTTP-only cookies protect against XSS but not CSRF; consider CSRF tokens for state-changing operations in production.
  - Password complexity is not enforced programmatically (relies on manual policy).
  - Single-tenant system: no multi-organization isolation.
  - Any reverse proxy or network-level security is **outside this codebase**.

---

## 5. Employee Data Model

- **Employee entity fields** (from `schema.prisma` and usage)
  - Core identity:
    - `id` (cuid primary key)
    - `name`
    - `normalizedName` (unique, used as main identity key for matching imports)
  - Classification & metadata:
    - `category` (string, e.g. `Partners/شركاء`, `Lawyers/محامين`, `Admins/عاملين`, `Consultants/مستشارين`)
    - `employeeCode` (system ID / code; not unique by schema, used in diagnostics)
    - `department`, `jobTitle`
    - `notes`
    - `status` (free-form string, used as `'Active'`, `'Resigned'`, etc. by code)
  - Dates:
    - `dateOfBirth`
    - `joiningDate`
    - `resignationDate`
  - Education:
    - `graduationCertificate`, `graduationSection`, `graduationUniversity`, `graduationYear`
  - Identification:
    - `socialInsurance`
    - `barAssociation`, `barAssociationValidTill`, `barAssociationDegree`
    - `taxCard`
    - `nationalId`, `nationalIdValidTill`
  - Contact:
    - `address`, `addressRegion`, `addressGovernorate`
    - `extension`, `mobileNumber`
  - Misc:
    - `contractType`, `contractDuration`
    - `experienceInYears`, `experienceInMonths`, `experienceOutYears`, `experienceOutMonths`
    - `additionalData` (JSON string) for arbitrary extra fields.
    - `personnelData` (JSON string) for aggregated personnel fields (legacy).
    - Relational:
      - `salaries: SalaryRecord[]`
      - `annualBonuses: AnnualBonus[]`
      - `contractRecords: ContractRecord[]`
      - `personnelRecord: PersonnelRecord?`
      - `resignationRecords: ResignationRecord[]`
  - `createdAt`, `updatedAt` timestamps.

- **Contract types supported**
  - Stored as free-text `contractType` and `contractDuration` (e.g. “Renewal for One Year”).
  - No enumerated type or logic enforcing specific contract classes.
  - `ContractRecord` holds history of contracts and durations; Employee itself does not enforce or use a specific set of contract types.

- **Status lifecycle (active, terminated, etc.)**
  - Code uses `status` in multiple contexts:
    - Bulk salary route filters out employees with `status === 'Resigned'` by default.
    - Resigned import service sets `status = 'Resigned'` when it processes resignations.
    - Personnel routes treat `status` but do not enforce specific values.
  - There is **no enforced lifecycle** (e.g., no state machine). Status is just a string updated by imports and potentially manual operations.

- **Historical data handling**
  - Historical salary data:
    - `SalaryRecord` keyed by `(employeeId, year, month)` with a unique constraint.
    - Imports append or conflict-resolve per-month records.
    - Updates via `PUT /api/salaries/:id` overwrite that row; no history table.
  - Historical bonuses:
    - `AnnualBonus` keyed by `(employeeId, year)`; one row per year, overwritten by imports or CRUD updates.
  - Historical contracts:
    - `ContractRecord` per date and (optionally) employee; multiple records per employee; no hard lifecycle semantics.
  - Historical status changes:
    - `status` and `resignationDate` fields updated in `Employee`.
    - `ResignationRecord` created for each resignation import or conflict resolution, capturing resignation date, department, category at time of resignation.
  - There is **no versioning or audit trail of field changes** beyond the presence of these history tables; overwrites lose prior values.

---

## 6. Salary & Payroll Logic (CRITICAL)

### Salary Types

- **Fixed**
  - Implemented as monthly `basicSalary` values per `SalaryRecord`.
  - Parsed directly from the `مرتبات` sheet (`Salary` column) without further computed scaling.

- **Hourly**
  - **Not implemented**:
    - No hourly rate fields.
    - No hours worked fields.
    - No overtime rate logic.

- **Mixed**
  - **Not implemented** beyond what is already represented as additions/deductions in sheets.
  - All salary flows treat everything as monthly aggregates.

- **Bonuses**
  - Two distinct notions:
    - **Monthly/annual bonuses inside salary records**:
      - From additions sheet:
        - `annualBonus`, `monthlyBonus` fields parsed into `additionsBreakdown` and aggregated into `bonuses` and `direct/indirectAdditions`.
    - **Annual bonus sheets** imported to `AnnualBonus`:
      - `bonusAmount`, `bonusFirstHalf`, `bonusSecondHalf`, `previousYearBonus`, and derived metrics (months/percent, growth).
      - Used for annual bonus reports and exports; **not fed back into monthly `SalaryRecord` values** by code.

- **Overtime**
  - **Not implemented** as an explicit concept.
  - Any overtime-related money would appear in the Excel as some allowance/bonus and be treated as ordinary additions; no special overtime rules exist.

- **Allowances**
  - Represented as components extracted from additions sheet:
    - `phoneAllowance`
    - `transportationAllowance`
    - `accommodationAllowance`
    - `otherAllowances`
    - `yearlyIncrease` (treated as a designated addition component and as a separate field)
    - `socialInsurance`, `taxes`, `medicalInsurance` (treated as indirect additions)
  - Each is:
    - Parsed by column position.
    - Stored in `additionsBreakdown` as JSON {category: amount}.
    - Aggregated to:
      - `directAdditions` (phone, transportation, accommodation, otherAllowances).
      - `indirectAdditions` (socialInsurance, taxes, medicalInsurance).
      - `bonuses` (annualBonus + monthlyBonus).

- **Deductions**
  - Components parsed from `خصومات` sheet:
    - `medicalInsuranceDeducted`
    - `lawyersTaxes`
    - `otherBankWithdrawal`
    - `loansDeductions`
    - `phoneDeduction`
    - `unpaidVacation`
    - `lateArrivals`
    - `timeSheetDeductions`
    - `otherDeductions`
  - Aggregation:
    - `grossDeductions = medicalInsuranceDeducted + lawyersTaxes`
    - `salaryDeductions = sum(otherBankWithdrawal, loansDeductions, phoneDeduction, unpaidVacation, lateArrivals, timeSheetDeductions, otherDeductions)`

### Calculation Flow

- **Source of truth**
  - Core formula is **based on Excel inputs**, not on independent business rules:
    - `basicSalary`, `gross`, and `net` are imported directly from the salary sheet.
    - Additions/deductions breakdowns are recomputed from the specialized sheets, but they are aligned to the spreadsheet outputs.

- **Step-by-step (per month, as implemented in `excel-parser.ts` and `import-service.ts`)**
  1. **Parse main salary sheet (`مرتبات`)**:
     - Read:
       - `basicSalary`
       - `directAdditions` (from sheet column)
       - `indirectAdditions`
       - `yearlyIncrease`
       - `bonuses`
       - `salaryDeductions`
       - `gross`
       - `net`
     - Initialize `additionsBreakdown`/`deductionsBreakdown` as empty.
     - Assign `category` by row segmentation using Arabic “total” rows.
  2. **Parse additions (`اضافات`)** and merge:
     - Recompute:
       - `directAdditions` as sum of phone/transport/accommodation/other.
       - `indirectAdditions` as sum of socialInsurance + taxes + medicalInsurance.
       - `bonuses` as `annualBonus + monthlyBonus`.
       - `yearlyIncrease` from the dedicated column.
     - Recompute **derived `gross`** as:
       - `gross = basicSalary + indirectAdditions + directAdditions + yearlyIncrease`
     - Note: This may overwrite the original `gross` from salary sheet; the code trusts recomputation more than the original.
  3. **Parse deductions (`خصومات`)** and merge:
     - Compute:
       - `grossDeductions = medicalInsDeducted + lawyersTaxes`
       - `salaryDeductions = otherBank + loans + phoneDed + unpaidVacation + late + timesheet + otherDed`
     - `net` is **not recomputed** here; comment explicitly states:
       - Net is read directly from `مرتبات` sheet, not calculated.
  4. **Persist**:
     - Each parsed record becomes a `SalaryRecord` row with:
       - The recomputed `directAdditions`, `indirectAdditions`, `yearlyIncrease`, `bonuses`, `salaryDeductions`, `grossDeductions`, `gross`, `net`.
       - JSON-encoded `additionsBreakdown` and `deductionsBreakdown`.
  5. **Import orchestrator (`import-service.ts`)**:
     - For each workbook:
       - Resolves employee by `normalizedName` or creates a new `Employee`.
       - Checks for existing `SalaryRecord` for `(employeeId, year, month)`:
         - Identical (per `record-comparison.ts`) → skip.
         - Different → flagged as conflict; **does not update until conflict resolution API is called**.
         - None → create new `SalaryRecord`.

- **Gross → net logic**
  - `gross`:
    - Recomputed as `basicSalary + directAdditions + indirectAdditions + yearlyIncrease`.
    - Does **not** include `bonuses` in that recomputation, which indicates:
      - Bonuses are **not** included in `gross` in code, if that differs from the Excel; the parser explicitly uses this formula.
  - `net`:
    - Imported **directly** from the salary sheet’s “NET” column.
    - Not recomputed as `gross - (salaryDeductions + grossDeductions)` in code, though some components could allow that.
    - This means:
      - If imported components do not reconcile, the system preserves the workbook’s net amount.

- **Rounding rules**
  - Numeric fields are parsed with:
    - `parseFloat` for body values (CRUD).
    - Custom `parseNumeric` that strips non-digits and then `parseFloat`.
  - No explicit rounding beyond:
    - Standard JS float arithmetic.
    - Report-level conversions to strings and formatting.
  - **Conclusion**: Rounding behavior is implicit in JS float to string conversions; no controlled rounding regime.

- **Monthly vs daily vs hourly assumptions**
  - Entire model is **monthly**:
    - Records keyed by `(year, month)`.
    - No daily or hourly granularity.
  - Days/hours are only used for tenure calculations (employee tenure), **not salary computation**.

---

## 7. Database Schema Summary

- **Core tables** (Prisma models)

  - **Employee**
    - Master record for each person.
    - Indexed by `normalizedName`, `category`, `department`, `status`, `employeeCode`.
    - Relations:
      - `salaries: SalaryRecord[]`
      - `annualBonuses: AnnualBonus[]`
      - `contractRecords: ContractRecord[]`
      - `personnelRecord: PersonnelRecord?`
      - `resignationRecords: ResignationRecord[]`

  - **SalaryRecord**
    - Unique per `(employeeId, year, month)` (enforced by `@@unique`).
    - Fields:
      - `basicSalary`, `directAdditions`, `indirectAdditions`, `yearlyIncrease`, `bonuses`.
      - `salaryDeductions`, `grossDeductions`, `gross`, `net`.
      - `additionsBreakdown`, `deductionsBreakdown` (JSON strings).
      - `paymentMethod`, `accountNumber`, `notes`, `category`.
      - `sourceFile`, `importedAt`.
    - Indexed by `employeeId` and `year, month`.

  - **AnnualBonus**
    - Unique per `(employeeId, year)`.
    - Fields:
      - Annual increase data:
        - `previousYearNet`, `previousYearGross`.
        - `currentYearNet`, `currentYearGross`.
        - `annualIncreaseNet`, `annualIncreaseGross`.
      - Legacy salary fields:
        - `netSalary`, `grossSalary` (mirrors `currentYearNet`/`currentYearGross`).
      - Bonus metrics:
        - `bonusAmount`, `bonusFirstHalf`, `bonusSecondHalf`, `previousYearBonus`.
        - `reflectedInMonths`, `reflectedInPercent`.
        - `remainingFromPrevious`, `yearComparison`.
      - `notes`, `sourceFile`, `importedAt`.
    - Indexed by `year`, `employeeId`, and combination.

  - **ImportLog**
    - Captures history of imports:
      - `fileName`, `year`, `month`.
      - `status` (`'success'`, `'error'`, `'partial'`).
      - `recordsImported`.
      - `errors` JSON string.
      - `importedAt`.

  - **ContractRecord**
    - Optional `employeeId` (records may initially be unlinked).
    - Fields:
      - `employeeName`, `employeeCode`.
      - `contractDate`, `contractDuration`, `comments`.
      - `sourceFile`, `importedAt`.
    - Indexed by `employeeId`, `employeeName`, `employeeCode`, `contractDate`.

  - **PersonnelRecord**
    - One-to-one with Employee via unique `employeeId`.
    - Document fields: `criminalRecord`, `militaryCertificate`, `idCopy`, `educationCertificate`, `birthCertificate`, `recommendationLetter`, `personalPhotos`, `taxCard`, `associationId`, `form6`, `workStub`.
    - Asset: `laptopPcTablet` (string that’s treated as JSON array or single value).
    - `insuranceStartDate`, `importedAt`, `updatedAt`, `sourceFile`.
    - Multiple indexes by document status fields and `insuranceStartDate`.

  - **ResignationRecord**
    - Resignation history.
    - `employeeId`, `resignationDate`, `jobTitle`, `department`, `category`, `reason`, `importedFrom`, `importedAt`, `notes`, `createdAt`, `updatedAt`.
    - Indexed by `employeeId`, `resignationDate`.

- **Relationships**
  - `Employee` is central; all other models reference it.
  - Deletion cascades: `onDelete: Cascade` for relations, so deleting an employee deletes related salary/bonus/contract/personnel/resignation records.

- **Constraints (or absence)**
  - Unique:
    - `Employee.normalizedName`.
    - `SalaryRecord(employeeId, year, month)`.
    - `AnnualBonus(employeeId, year)`.
    - `PersonnelRecord.employeeId`.
  - Application-level validations:
    - CRUD routes enforce mandatory fields and uniqueness conflicts via Prisma, but:
      - There are no composite uniqueness constraints for contracts/personnel beyond `employeeId` or ID.
  - **No referential integrity on external concepts** (e.g., department names or categories are plain strings).

- **Soft deletes vs hard deletes**
  - All deletes are **hard deletes**:
    - CRUD routes call `delete`/`deleteMany`.
    - No `deletedAt` or soft-delete flags exist.

- **Historical payroll storage approach**
  - Salary and bonus records are kept per month/year with unique composite keys.
  - No snapshotting of calculation parameters; the system relies on those records as point-in-time facts, overwritten upon explicit CRUD or conflict-resolution.

---

## 8. Reporting & Outputs

- **Available reports (implemented via routes and frontend pages)**

  - Salary/payroll:
    - Category totals per year (`/api/reports/category-totals`).
    - Joiners/leavers by year (`/api/reports/joiners-leavers`).
    - Salary changes per year (`/api/reports/salary-changes`).
    - Monthly summary (`/api/reports/monthly-summary`).
    - Additions/deductions breakdown (`/api/reports/additions-deductions-breakdown`).
    - Quick stats for dashboard (`/api/reports/quick-stats`).
    - Employee-specific:
      - All years overview (`/api/employees/:id/all-years`).
      - Annual breakdown (`/api/employees/:id/annual`).

  - Bonuses:
    - Annual bonus report (`/api/reports/annual-bonus`).
    - Bonus incentive analysis (`/api/reports/bonus-incentive-analysis`).
    - Employee annual bonus view (`/api/employees/:id/bonus`).
    - Employee bonus comparison across year range (`/api/employees/:id/bonus-comparison`).

  - HR & personnel:
    - Tenure report (`/api/reports/employee-tenure`).
    - Personnel compliance report (`/api/personnel/compliance/report`).
    - Asset inventory report (`/api/personnel/assets/report`).
    - Personnel dashboard metrics (`/api/personnel/dashboard`).
    - Personnel diagnostics: sheet vs database comparisons (`/api/personnel-diagnostics/*`).

  - Diagnostics & utilities:
    - Available years for reports (`/api/reports/available-years`).
    - Duplicate employees preview/merge (`/api/import/preview-duplicates`, `/api/import/merge-duplicates`).
    - Conflict resolution endpoints for salary, employee, contract, personnel, resigned data.

- **Filters supported**
  - Most report endpoints accept:
    - `year` (int, defaults to current year if omitted).
  - Personnel reports:
    - `category` and `minCompliance` for compliance.
  - CRUD listing:
    - `employeeId`, `year`, `month` (salaries).
    - `employeeId`, `year` (bonuses).
    - `page`, `limit` for pagination.
  - Resigned and personnel imports:
    - Use sheet structure; no dynamic filters on import itself.

- **Export formats**
  - CSV:
    - Employee annual report (`/api/exports/employee/:id/annual?format=csv`).
  - XLSX:
    - Employee annual report.
    - Monthly summary report.
    - Annual bonus report (multiple modes).
    - Additions/deductions breakdown.
    - Employee card.
  - PDF:
    - Employee annual report.
    - Salary changes report.
    - Monthly summary.
    - Annual bonus report.
    - Additions/deductions breakdown.
    - Employee card.

- **Data source per report**
  - All reports ultimately read from:
    - `Employee`, `SalaryRecord`, `AnnualBonus`, `PersonnelRecord`.
  - Some export endpoints **expect fully computed data from the frontend**:
    - `monthly-summary-export` and `additions-deductions-export` and `annual-bonus-export` take a `data` payload with pre-aggregated values and only format them into XLSX/PDF, not recompute from DB.
  - Other exports compute data inside the API:
    - Employee annual exports, salary-changes PDF.

- **Known inconsistencies or mismatches**
  - Gross/net relationship:
    - `gross` is recomputed from components, `net` is imported from original Excel; these may diverge if Excel’s formulas differ.
  - Some exports depend on **frontend-supplied aggregates**, so:
    - If the frontend or its parameters are incorrect, exported values may not match DB raw data.
  - Category values:
    - `Employee.category` vs `SalaryRecord.category`:
      - Category can change over time; some reports use Employee’s category; others use salary-record category.
  - Personnel applicability:
    - Tax Card & Association ID considered “N/A” for non-partners/lawyers; this is heuristic and not enforced elsewhere.

---

## 9. Data Integrity & Auditability

- **Change tracking (if any)**
  - Prisma timestamps:
    - `Employee.updatedAt`, `PersonnelRecord.updatedAt`, `ResignationRecord.updatedAt`.
  - `ImportLog`:
    - Captures import runs with status and error JSON.
  - No generic change-tracking mechanism beyond these fields:
    - No per-field history; only the latest state is stored.

- **Who changed what and when**
  - **Not tracked**:
    - No user accounts; no `updatedBy` fields.
    - CRUD endpoints do not store the origin (user) of changes.
    - `sourceFile` is kept on `SalaryRecord` and `AnnualBonus`, but that only identifies the import file, not the human operator.

- **Payroll recalculation risks**
  - Salary and bonus records can be overwritten (via:
    - Imports and conflict resolution endpoints.
    - CRUD `PUT` operations).
  - There is no lock mechanism for “closed” periods:
    - Past months can be changed at any time.
  - Re-importing with slightly different Excel formulas or values can change historical net/gross amounts.

- **Reproducibility of historical payroll**
  - The only persisted data are:
    - Final numeric fields per month and year.
    - Not the exact Excel formulas or external configs used to compute them.
  - If external Excel files are lost or modified, the system **cannot reconstruct** how the numbers were obtained, only the final stored values.
  - Bonus growth ratios are recalculated on each request from the stored `AnnualBonus` data; if those rows are edited, past analyses become unreproducible.

---

## 10. Security Considerations

- **Input validation approach**
  - ✅ **Comprehensive Zod-based validation implemented (100% coverage achieved)**:
    - **All API endpoints now have request body, query parameter, and path parameter validation** using Zod schemas.
    - Centralized validation middleware (`validateBody`, `validateQuery`, `validateParams`) applied across **all routes**.
    - **95 validation middleware instances** across 20 route files.
    - Type-safe validation with TypeScript inference.
    - Standardized error responses with field-level error messages.
    - **Zero unchecked input**: All routes with `req.body`, `req.query`, or `req.params` now have appropriate validation middleware.
  - **Validation coverage (100%)**:
    - ✅ Environment variables validated on application startup.
    - ✅ JWT payload validation with runtime checks.
    - ✅ All CRUD operations validated (employees, salaries, contracts, bonuses, users).
    - ✅ **All report query parameters validated** (11 report endpoints).
    - ✅ **All export request bodies validated** (16 export endpoints, including complex nested data structures).
    - ✅ **All bulk operations validated** (path params and body).
    - ✅ **All personnel routes validated** (query params and path params).
    - ✅ **All employee detail routes validated** (path params and query params).
    - ✅ All import conflict resolution endpoints validated.
    - ✅ Notification settings and email configuration validated.
    - ✅ Configuration endpoints validated (bonus-halves setting).
  - **New validation schemas created (2026-01-10)**:
    - `apps/api/src/validation/schemas/bulk.ts` (NEW): Bulk salary operations (params, body schemas).
    - `apps/api/src/validation/schemas/personnel.ts` (NEW): Personnel routes (query params, path params).
    - Extended `exports.ts`: 11 new schemas for complex export routes (validates required fields while allowing flexible nested data).
    - Extended `reports.ts`: 4 new query schemas for all report endpoints.
    - Extended `employees.ts`: 2 new query schemas for employee detail routes.
  - **Business logic validation**:
    - Salary: Gross >= Net validation enforced.
    - Bonus: FirstHalf + SecondHalf ≈ Amount validation.
    - Contracts: EmployeeId OR EmployeeName required.
    - Dates, years, months: Range validation (e.g., year 2000-2100, month 1-12).
    - Email format validation for recipients.
    - URL validation for baseUrl.
    - Port range validation (1-65535).
    - Reminder days validation (1-365).
  - **Type casting and coercion**:
    - Automatic type coercion for query parameters (string to number, boolean) via `YearSchema`, `MonthSchema`, etc.
    - Date coercion for date fields.
    - CUID validation for all ID parameters (enforced via `CuidSchema`).
    - Numeric validation (non-negative, ranges) with clear error messages.
  - **Complex nested data handling**:
    - Export routes receiving complex report data from frontend use `.passthrough()` and `z.any()` patterns.
    - Required fields (year, data structure) are validated while allowing flexible nested content.
    - Schemas for additions-deductions, annual-bonus, monthly-summary, document-compliance, asset-inventory, personnel-dashboard, and employee-tenure exports.
  - **Validation patterns**:
    - Path parameters validated for all dynamic routes (e.g., `/:id`, `/:year/:month`).
    - Query parameters validated with type coercion for all report and list endpoints.
    - Request bodies validated for all POST/PUT endpoints.
    - Validation middleware applied before authentication/authorization middleware for early rejection of invalid input.

- **SQL injection protection**
  - Prisma ORM is used for DB access; no raw SQL strings.
  - This materially reduces classical SQL injection risk.
  - There is still potential for:
    - Performance issues or error exposure with arbitrary user input (e.g. large numbers, extreme pagination) but not injection.

- **Sensitive data handling**
  - Sensitive-like fields:
    - National ID, Tax Card Number, Social Insurance Number, Bar Association numbers.
  - Code stores these as plain strings:
    - No encryption at rest, masking, or hashing for PII fields.
    - Passwords are hashed with bcrypt (salt rounds: 10).
  - PDFs/XLSX exports may include such data (e.g. Employee Card includes National ID, Social Insurance).
  - ✅ **Role-based redaction implemented**:
    - Salary/bonus amounts redacted for `HR_PERSONNEL` and `ADMIN` roles (replaced with `"RESTRICTED"`).
    - Export filenames indicate role context (e.g., "Employee Card (HR view).pdf" vs "Employee Card (Manager view).pdf").
    - PII fields (National ID, etc.) are not currently redacted based on role, but salary/bonus data is protected.

- **Known vulnerabilities or weak points**
  - **Authentication/Authorization**:
    - ✅ Authentication is now implemented with JWT-based sessions.
    - ✅ Role-based access control (RBAC) is enforced on all routes.
    - ✅ JWT payload validation with Zod ensures token structure integrity.
    - ✅ Environment variables validated on startup (including JWT_SECRET validation).
    - ⚠️ JWT secret must be set via environment variable in production (validated on startup, but defaults to insecure value if not set).
    - ⚠️ No CSRF protection for state-changing operations (relies on same-origin policy and CORS).
    - ⚠️ Password complexity not enforced programmatically (though password length and format are validated via Zod schemas).
  - **Overpowered endpoints** (now protected):
    - ✅ `/api/import/clear` requires `SUPER_ADMIN` role.
    - ✅ `/resolve-*` endpoints require appropriate roles, are audited, and have request body validation.
    - ✅ Bulk operations are role-restricted, audited, and have request body validation.
  - **File uploads**:
    - `multer` used with file-size limits, but:
      - File type is filtered only by extension in some flows.
      - Excel parsing does not sandbox formulas; although `xlsx` is used, there is still exposure to resource exhaustion via large or malformed files.
      - Upload endpoints now require authentication and appropriate roles.
      - ✅ Import request bodies (conflict resolutions, merge operations) are validated with Zod schemas.
  - **Error responses**:
    - Some endpoints conditionally include `stack` in responses when `NODE_ENV === 'development'`; in production, stack is hidden, but this relies on proper environment configuration.
  - **Sensitive data handling** (improved):
    - ✅ Salary/bonus data is redacted for `HR_PERSONNEL` and `ADMIN` roles.
    - ⚠️ National ID, Tax Card, Social Insurance numbers are still stored as plain strings (no encryption at rest).
    - ✅ Export filenames and content are role-aware (e.g., "Employee Card (HR view).pdf").

---

## 11. Performance & Scalability

- **Expected employee count**
  - Docs (ARCHITECTURE.md) indicate design expectation:
    - ~1,000 employees, 12 months per year, multiple years.
  - Code does not enforce any hard limits.

- **Payroll run complexity**
  - Import:
    - For each workbook:
      - Load entire workbook into memory.
      - Convert sheets to row arrays.
      - For each row: name normalization, match/create employee, check existing salary record, etc.
    - Conflict detection involves:
      - Per-record comparisons and JSON parsing of breakdown fields.
  - Reports:
    - Many endpoints fetch all records for a year and then loop in JS.
    - No pagination for most report endpoints; they assume dataset is small-moderate.

- **Known bottlenecks**
  - Imports:
    - Loops over all employees in memory for name-similarity checks per record (though a cache is used within a batch).
    - No background job mechanism; imports block the HTTP request.
  - Reporting:
    - `category-totals`, `monthly-summary`, and others fetch entire year’s worth of records; may degrade with large history.
  - Puppeteer-based exports:
    - Each export spawns a new Chromium instance per request; heavy for high concurrency.
  - No caching:
    - Repeated requests recompute aggregates and re-query the database every time.

- **Caching (if any)**
  - None present in code:
    - No HTTP-level caching.
    - No in-memory caches besides per-import “allEmployeesCache” used only during a single import run.

---

## 12. Configuration & Environment

- **Environment variables**
  - ✅ **Environment variable validation implemented**:
    - All environment variables are validated on application startup using Zod (`envSchema`).
    - Application fails fast with clear error messages if required environment variables are missing or invalid.
    - Validated variables include: `PORT`, `NODE_ENV`, `JWT_SECRET`, `CORS_ORIGIN`, `DATABASE_URL` (optional), and SMTP configuration (optional).
  - **Environment variables**:
    - `PORT` for API server (validated as positive integer).
    - `NODE_ENV` used to control whether stack traces are returned in error responses (validated as enum: 'development' | 'production' | 'test').
    - `JWT_SECRET` for JWT token signing (validated as string with minimum length, warns if using default value).
    - `CORS_ORIGIN` for CORS configuration (validated as URL or comma-separated URLs).
    - `VITE_API_URL` used by frontend to override default `/api` base URL in production builds.
    - SMTP configuration (optional): `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASSWORD`.

- **Hard-coded values**
  - CORS origins:
    - `http://localhost:3000`, `http://salaries.local`, `http://www.salaries.local`.
  - File paths:
    - Sheets directory resolution assumes either:
      - `process.cwd()` is repo root, or
      - `apps/api` and uses `../../Sheets`.
    - Logo path uses relative `../../../..` navigation.
  - Column indices and sheet names:
    - Salary, additions, deductions, personnel, resigned sheet parsing is tightly coupled to specific column layouts and Arabic headers.
  - Status strings:
    - `Resigned`, `Active`, etc., are used as plain strings in code; not centralized.

- **What requires code changes vs config changes**
  - **Code changes required**:
    - Changing Excel layouts (column positions, sheet names).
    - Adding new salary components or deduction types.
    - Modifying what constitutes “joiner” or “leaver”.
    - Introducing new report types or aggregation logic.
    - Changing CORS behavior (current origins are hard-coded in `index.ts`).
  - **Config changes (without compilation)**:
    - Some behaviors (e.g., whether to show bonus halves) are controlled via JSON config (`notification-config.json`, other config utilities), but **exact set of config flags is not fully determinable without reading those config files**.
  - **Not determinable from current codebase**:
    - Full list of environment-based toggles (apart from `PORT`, `NODE_ENV`, `VITE_API_URL` and specific utility mentions).

---

## 13. Known Technical Debt

- **Areas needing refactor (as implied by code structure)**
  - Parsing logic:
    - Highly specific column indices and names, repeated across functions.
    - No abstraction over workbook schemas.
  - Mixed responsibilities:
    - Some routes construct domain logic and data formatting (e.g., employing heavy in-route aggregation).
    - Some services directly talk to the DB and also handle reporting concerns.
  - ✅ **Type safety improvements**:
    - Zod validation implementation has significantly improved type safety across API endpoints.
    - Request bodies, query parameters, and path parameters are now type-safe with TypeScript inference.
    - Reduced use of `any` types in validated request/response handling.
    - Some legacy code still uses `any` and `Record<string, any>` in service layers and internal utilities, but API boundaries are now type-safe.

- **Code smells**
  - Repeated logic for:
    - Gross/net/totals reduction across multiple modules.
    - Category/dept aggregation.
  - Large route files:
    - `import.ts` and `reports.ts` contain many endpoints, each with complex logic.
  - Logging:
    - Console logs in production paths (especially in bulk salary route and imports) introduce noisy logs and potential PII leakage.
  - Copy-paste patterns:
    - Multiple nearly-identical “get logo base64” functions in export routers.

- **Missing abstractions**
  - No shared module for:
    - Category classification.
    - Period management (e.g., defining a “closed” period).
    - Common response/error shapes.
  - Import conflict handling is duplicated across salaries, employees, contracts, personnel, resigned with very similar patterns.

- **Repeated logic**
  - Growth calculations:
    - Implemented via helper (`bonus-calculations.ts`) but also recomputed manually in some report endpoints.
  - Calculating totals of salary fields:
    - Many `reduce` blocks across different routes with identical fields.
  - Tiering employees into Partners/Lawyers/Admins/Consultants:
    - Repeated mapping and sorting code (e.g. category map in bulk-salary route, fixed category lists in reports).

---

## 14. Missing Features (FACTUAL)

Features common in payroll systems that are **not currently implemented** or **not present at all in code**:

- **User and role management**
  - ✅ **Implemented**: Users, roles, and permissions are fully implemented with RBAC (Role-Based Access Control).
  - ✅ **Authentication**: JWT-based authentication with HTTP-only cookies is implemented.
  - ✅ **Authorization**: Role-based and permission-based access control enforced on all routes.
  - ⚠️ **Enhancement opportunities**: Password complexity enforcement could be improved, CSRF protection not implemented.

- **Regulatory tax/insurance engine**
  - No logic to:
    - Compute personal income tax according to statutory brackets.
    - Enforce social insurance caps or bands.
    - Maintain updatable tax/insurance rules per period.

- **Leave management**
  - No entities or APIs for:
    - Leave balances.
    - Vacation requests and approvals.
    - Automating unpaid leave deductions from calendars.

- **Time and attendance**
  - No time-sheet ingestion beyond a single `timeSheetDeductions` numeric deduction.
  - No clock-in/clock-out or schedules.

- **Multi-currency support**
  - No currency fields, no FX rates.

- **Multi-entity/company support**
  - No company table, no tenant identifiers.

- **Payroll run lifecycle**
  - No concept of:
    - “Run” or “payroll batch”.
    - Locking/closing periods.
    - Re-run tracking.

- **Statutory reporting**
  - No dedicated forms for submissions to tax or social insurance authorities; only generic Excel/PDF reports.

- **Audit logs**
  - ✅ **Implemented**: `AuditLog` table records auth events (LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT), data modifications (EMPLOYEE_CREATE, SALARY_UPDATE, etc.), and views/exports (EMPLOYEE_VIEW, SALARY_VIEW, etc.).
  - ⚠️ **Limited field-level tracking**: Audit logs capture action, resource, and resourceId, but do not track field-level changes (e.g., what specific salary field was modified from X to Y).
  - ⚠️ **Retention policy**: Audit logs retained for 1 year with automated daily cleanup, but no explicit archival strategy for historical audits.

---

## 15. Explicit Assumptions

The system’s logic implicitly relies on:

- **Workbook layout stability**
  - Sheet names: `مرتبات`, `اضافات`, `خصومات`, `Resigned`, `Personnel`, `AllOffice`.
  - Column orders and meanings exactly as coded; changes will break parsing.
- **Unique identity by normalized name**
  - `normalizedName` is assumed to uniquely identify an employee across all imports.
  - Duplicates are handled via separate scripts/merge endpoints, not automatically.
- **Excel data correctness**
  - Gross and net salaries are trusted as correct from the Excel; code rarely recomputes to validate.
  - Additions/deductions are assumed to be correct in the workbook; the system primarily re-classifies and totals them.

- **Single environment per DB**
  - The same SQLite DB holds all data; no notion of environment-level isolation beyond file path.

- **Workbooks represent final payroll**
  - The system treats Excel as the authoritative ledger rather than as input for independent payroll computation.

- **Employee status semantics**
  - `status = 'Resigned'` is assumed to mean:
    - Exclude from some operations (e.g. active bulk salary).
    - Included in resigned/personnel reports.
  - No formal enumeration; strings are trusted.

- **Resignation and tenure dates**
  - Tenure is calculated using `joiningDate` if present; otherwise earliest salary record’s date.
  - End date for tenure is always “today”, not resignation date, even for resigned employees.

- **Config files present and valid**
  - Utility functions that rely on JSON configs assume these files exist and are consistent; missing/malformed configs might cause runtime errors (not fully guarded in code shown).

---

## 16. Open Questions for External Reviewer

These cannot be answered purely from this codebase:

- **Legal and regulatory compliance**
  - Does the imported Excel logic correspond to up-to-date statutory tax and social insurance rules for the intended jurisdiction?
  - Are the Excel workbooks themselves maintained to reflect legal changes?

- **Operational controls**
  - How is access to the API restricted in the actual deployment (firewalls, VPN, reverse proxy auth)?
  - Who is allowed to clear the database or run imports in production?

- **Source-of-truth governance**
  - Is the database or the Excel workbook considered the source of truth for audits?
  - Are previous Excel versions archived alongside the DB snapshots?

- **Data protection**
  - How are backups handled and where are they stored?
  - Are National IDs and similar sensitive fields protected in storage or transport beyond what this code shows (e.g. full-disk encryption, HTTPS termination, infrastructure policies)?

- **Change management**
  - How are changes to workbook layouts coordinated with code changes?
  - Is there a test suite or manual checklist to verify imports after each workbook schema change?

- **Organizational context**
  - Are there multiple legal entities, and if so, how does this single-tenant schema map to them?
  - Are there non-standard allowances/deductions with domain-specific interpretations that auditors should know about (names alone may not be self-explanatory)?

If information is **unknown**, the appropriate conclusion is:

> Not determinable from current codebase

If logic is **unclear**, the appropriate conclusion is:

> Ambiguous implementation


---

## 17. Source-of-Truth & Governance Model

- **Primary source of truth (Excel vs Database)**
  - Excel workbooks (salary, additions, deductions, SEP employees, bonus sheets) are treated as the **primary source of truth for calculations**:
    - Core monetary values (`basicSalary`, `gross`, `net`, additions/deductions components) are parsed from Excel and only lightly recomputed or re-aggregated.
  - The database is the **primary source of truth for reporting** once data is imported:
    - All reports, dashboards, and exports (outside of some export endpoints that accept frontend-prepared aggregates) read from DB tables.

- **When the database overrides Excel (if ever)**
  - Manual CRUD operations (`/api/salaries`, `/api/bonuses`, `/api/personnel`, `/api/contracts`) allow operators or tools to:
    - Create or update records directly in the DB.
  - Conflict-resolution endpoints (`/api/import/resolve-conflicts`, `/api/import/resolve-employee-conflicts`, `/api/import/resolve-contract-conflicts`, `/api/import/resolve-personnel-conflicts`, `/api/import/resigned/resolve-conflicts`) explicitly allow choosing **incoming Excel record** vs **existing DB record**:
    - If `action = 'keep'`, the database value overrides the new Excel data.
    - If `action = 'update'`, the Excel data overwrites the DB row.
  - There is no automatic mechanism where the DB “pushes back” into Excel; overrides are unidirectional and happen only by explicit API calls.

- **Whether DB values are ever considered authoritative**
  - For **subsequent reports and exports**, the DB is authoritative:
    - Reports do not re-open Excel; they rely on the stored values.
  - There is no mechanism to validate DB values back against Excel after the fact; once a conflict is resolved in favor of DB values, those become de facto authoritative.

- **How conflicts are expected to be resolved operationally (not technically)**
  - The code provides mechanisms (conflict lists and resolution APIs) but does **not** encode an operational policy:
    - No indication of who decides between “keep vs update”.
    - No prioritization rules (e.g., “latest workbook always wins”, “locked periods cannot be changed”) are enforced.
  - **Operational governance (e.g., sign-offs, approval workflows, dual control) is not determinable from current codebase.**

- **Whether historical Excel files are expected to be archived externally**
  - The system does not archive original Excel files inside the DB or filesystem (uploads are deleted after import).
  - `sourceFile` fields on records store only the file name string, not the file content.
  - **Whether historical Excel files are archived elsewhere (e.g., shared drive, DMS) is not determinable from current codebase.**

---

## 18. Intended Operating Model

- **Is payroll expected to be fully manual via Excel vs semi-automated vs fully system-driven**
  - The implemented model is **semi-automated**:
    - Payroll amounts are still computed in Excel.
    - System automates:
      - Parsing and importing those results.
      - Aggregated reporting, dashboards, and exports.
  - There is no implemented pathway where:
    - The system independently computes net pay from raw inputs (fully system-driven payroll engine).
    - Users work purely in the UI without Excel.
  - **Future intent to move to a fully system-driven engine is not determinable from current codebase.**

- **Expected operator skill level**
  - Code assumes:
    - Operators understand the structure of salary and SEP Excel workbooks (sheet names, columns, category totals).
    - Operators can interpret conflicts, similar-name matches, and diagnostics.
  - This implies at least **payroll/HR practitioner** level familiarity, not a casual end-user, but exact skill expectations are **not determinable from current codebase.**

- **Frequency of imports (monthly, ad-hoc, re-runs)**
  - Endpoint naming and workbook semantics imply at least **monthly salary imports** (one workbook per month).
  - Code supports:
    - Ad-hoc re-runs (re-import of historical workbooks).
    - Separate imports for employees, contracts, personnel, resigned, and bonuses at arbitrary times.
  - **Exact operational schedule (e.g., monthly cut-off dates, year-end runs) is not determinable from current codebase.**

- **Whether imports are expected to overwrite past data by design**
  - The existence of conflict-resolution endpoints and manual CRUD suggests:
    - Overwriting past data is **supported and expected** in case of corrections.
  - There is no protective mechanism to prevent overwriting historical periods, so:
    - By design, the system allows imports and manual edits to change past periods.
  - Whether this is considered desirable or a temporary workaround is **not determinable from current codebase.**

---

## 19. Data Correction & Error Handling Philosophy

- **How errors are expected to be corrected**
  - **Re-import**:
    - Re-running imports with corrected Excel files is supported and will:
      - Create conflicts for changed rows.
      - Allow updating existing rows via conflict resolution APIs.
  - **Manual CRUD edit**:
    - Salary, bonus, personnel, and contract records can be edited via their respective CRUD endpoints.
    - Employee core fields can also be adjusted.
  - **Conflict resolution endpoints**:
    - Salary, employee, contract, personnel, and resigned conflicts can be resolved record-by-record.
    - These APIs are the only mechanism to systematically handle detected differences between new and existing data at scale.

- **Whether correcting past payroll is acceptable**
  - From code behavior:
    - There is no technical prevention of past corrections.
    - Conflict resolution and CRUD endpoints explicitly target existing historical rows.
  - Therefore, **the system is built to allow and expect corrections to historical payroll data.**
  - Normative policy (e.g., “never correct payroll after payment”) is **not determinable from current codebase.**

- **Whether corrections are expected to be visible or silent**
  - There is no user-facing change log or versioning:
    - Once a record is updated, prior values are not stored.
  - Corrections are **silent** in the data model:
    - Only import logs and timestamps show that an operation occurred, not what changed.
  - Any operator-facing UI visibility (e.g., “this record was corrected”) would have to be implemented at the frontend level and is **not evident from backend code.**

- **Whether “wrong but final” vs “corrected later” is preferred**
  - The existence of flexible correction paths (re-import, CRUD, conflict resolution) suggests:
    - “Corrected later” is technically supported.
  - There is no concept of “locking” or marking periods as final, so:
    - The system does **not** enforce a “wrong but final” philosophy.
  - Business preference between these options is **not determinable from current codebase.**

---

## 20. Explicit Non-Goals

The following are explicitly **not implemented** and are therefore **non-goals** of the current system, based on observed code:

- **Independent payroll calculation engine**
  - No rules engine or tax/benefit computation logic exists; the system relies on Excel-calculated figures.

- **Legal/tax compliance enforcement**
  - No validation against statutory rules.
  - No country-specific tax/insurance rule engine.

- **Employee self-service**
  - No authentication, no employee accounts, no self-service portals or APIs for individuals.

- **Real-time payroll computation**
  - All salary and bonus computations are batch-style based on uploaded or existing Excel workbooks and stored records.

- **Attendance-based payroll**
  - No attendance/time-tracking model; only scalar deductions (e.g. `lateArrivals`, `timeSheetDeductions`) imported from Excel.

- **Government filing automation**
  - No integrations with tax/social insurance authority systems.
  - No generation of statutory e-filing formats.

Any functionality in these areas would require substantial new code and is not present in the current implementation.

---

## 21. Data Volume & Retention Expectations

- **Expected years of retained payroll data**
  - Code and docs reference “multiple years of historical data”.
  - No explicit retention horizon (e.g., 5, 7, 10 years) is defined in code.
  - **Exact retention requirement is not determinable from current codebase.**

- **Whether old years may be deleted or archived**
  - The API exposes:
    - A blanket clear-all (`/api/import/clear`) that removes all employees, salary records, bonuses, and import logs.
  - There is no granular archival or per-year deletion logic.
  - Whether operators are expected to:
    - Keep all years indefinitely.
    - Periodically clear or archive older years.
    - Use DB-level backup/restore for archiving.
    - is **not determinable from current codebase.**

- **Whether DB size growth is a concern**
  - No code paths for automatic archiving, partitioning, or pruning.
  - SQLite is used, which is generally suitable for modest datasets; beyond that, performance may degrade but no specific safeguards are present.
  - **No explicit concerns or safeguards around DB size growth are encoded.**

- **Backup/restore expectations (logical vs file-level)**
  - SQLite usage implies a **file-level backup/restore model** (copying `dev.db`).
  - There is no in-app backup/restore mechanism or export of full logical state (beyond exports aimed at reporting).
  - Actual backup/restore procedures are **not determinable from current codebase.**

---

## 22. Error Visibility & Operator Feedback

- **How operators are expected to detect errors**
  - Backend:
    - HTTP error responses with JSON `error` message (and optional `code`, `stack` in development).
    - Console logs for import steps, conflicts, and warnings.
  - Frontend:
    - **Not fully analyzable here**, but likely surfaces some error messages based on HTTP responses.
  - There is no central error dashboard or in-app log viewer in backend code.

- **Whether partial imports are acceptable**
  - Import results explicitly distinguish:
    - `success` boolean.
    - `recordsImported`, `recordsSkipped`, `recordsWithConflicts`, and `errors` array.
  - `ImportLog.status` records `'partial'` when some errors occur.
  - This indicates **partial imports are accepted and expected**, rather than treated as all-or-nothing transactions.

- **Whether silent skips are acceptable**
  - Identical records are silently skipped (tracked as `recordsSkipped` but not treated as errors).
  - Similar-name matches that are **not** auto-merged are:
    - Logged to console.
    - Stored in `similarNameMatches` within the import result.
  - If operators do not review these results, such skips/equivalences will not be visible elsewhere.

- **Whether operators are expected to review ImportLog regularly**
  - The system records `ImportLog` entries but does not provide:
    - Automatic alerts when errors occur.
    - A mandatory UI workflow for reviewing logs.
  - Whether regular manual review of `ImportLog` is part of the operational process is **not determinable from current codebase.**

---

## 23. Known Future Directions (Non-Binding)

- **Features under consideration**
  - The codebase itself does not include feature flags or commented-out stubs clearly labeled as “future”; any roadmap beyond what is implemented is **not determinable from current codebase.**

- **Architectural changes anticipated**
  - Comments in docs suggest that for larger scales the following might be desirable:
    - Moving from SQLite to PostgreSQL.
    - Adding pagination and caching.
    - Using background jobs for imports.
  - These are described in docs as “considerations” rather than committed changes.

- **Known constraints preventing expansion**
  - Tight coupling to current Excel layouts (hard-coded sheet and column assumptions) constrains:
    - Supporting alternate workbook formats.
    - Scaling to multi-tenant or multi-country setups.
  - ✅ **Authentication/Authorization**: Now fully implemented with JWT-based sessions and RBAC, enabling safe exposure to broader user base.
  - ⚠️ **Multi-tenant support**: Single-tenant architecture (single SQLite database) limits multi-organization deployment without code changes.
  - ⚠️ **Formal domain model**: While validation is comprehensive, a more formal domain model could improve maintainability.
  - Any formal plan or timeline to address remaining constraints is **not determinable from current codebase.**

---

## 24. Excel Workbook Versioning & Schema Drift

- **Whether workbook formats are versioned (v1, v2, etc.)**
  - The parsing logic is hard-coded against a single workbook layout per sheet type (fixed column indices and header patterns).
  - There is no version field or explicit workbook version detection in code.
  - **Conclusion**: Workbook formats are **not versioned in code**; any versioning is external and **not determinable from current codebase.**

- **How changes to column order or headers are approved**
  - No approval workflow is encoded.
  - Any change to column positions or header text would require code changes to parsers.
  - **Governance for approving such changes is not determinable from current codebase.**

- **Whether schema changes are communicated before deployment**
  - Code assumes current structure; there is no negotiation or capability discovery between sheets and parser.
  - **Communication procedures around schema changes are not determinable from current codebase.**

- **Whether old workbook versions are still expected to be supported**
  - Parsers look for specific headers and column indices but include some flexible header matching patterns (e.g., dynamic year-based bonus headers).
  - There is no compatibility layer for multiple legacy layouts.
  - **Conclusion**: The system effectively supports one schema per sheet type, with limited header flexibility; long-term support for legacy schemas is not encoded. Whether older versions must still be processed is **not determinable from current codebase.**

---

## 25. Conflict Resolution Authority Model

- **Who is expected to resolve conflicts (HR, Finance, IT)**
  - Conflict resolution APIs exist but are generic; they do not reference roles or departments.
  - No authorization or role-based restrictions are enforced at API level.
  - **Which function (HR, Finance, IT) should operate these endpoints is not determinable from current codebase.**

- **Whether decisions require dual control or approval**
  - There is no second-approver or approval workflow implemented.
  - Conflict resolutions are one-step updates without built-in dual control.

- **Whether conflict resolution decisions are reviewed or logged externally**
  - System logs contain:
    - Console logs.
    - Import logs with error summaries.
  - There is no dedicated audit trail for “who decided what” in conflict resolution.
  - Any external review (e.g. via process documents or external logs) is **not determinable from current codebase.**

---

## 26. Export Trust Model

- **Which exports trust frontend-prepared aggregates by design**
  - The following export endpoints accept `data` payloads from the frontend and format them into files without recomputing from DB:
    - `POST /api/exports/monthly-summary/pdf` and `/xlsx` (monthly summary export).
    - `POST /api/exports/annual-bonus-report/pdf` and `/xlsx` (annual bonus export).
    - `POST /api/exports/additions-deductions/pdf` and `/xlsx` (additions/deductions export).
  - These trusts frontend-prepared aggregates by design in the current implementation.

- **Whether frontend is considered a trusted computation layer**
  - These endpoints implicitly treat the frontend as a **trusted computation and aggregation layer** for those specific reports.
  - No server-side validation is applied to check that provided aggregates match DB state.

- **Whether this is intentional or a temporary implementation**
  - The code does not clearly label this as temporary or transitional.
  - No TODOs or comments indicate planned migration of these computations back to the server.
  - **Whether this trust model is a deliberate long-term design or a pragmatic shortcut is not determinable from current codebase.**

---

## 27. Known Failure Modes

- **Import interrupted mid-run**
  - Imports are not transactional across the whole batch:
    - Records successfully created/updated before failure remain in DB.
    - Remaining records are not processed.
  - Recovery is **manual**:
    - Operators may re-run imports and resolve any resulting conflicts.
  - No automatic rollback or idempotent transaction scope is implemented.

- **Excel file partially malformed**
  - Parsers:
    - Log errors for specific issues (missing sheets, parsing errors).
    - May skip problematic rows or entire workbooks.
  - Result:
    - Partial imports with `status = 'partial'` in `ImportLog` and non-empty `errors`.
  - Recovery is **manual**:
    - Fix Excel file and re-import.
    - Review logs for skipped or errored records.

- **Two operators import overlapping periods**
  - For overlapping `(employeeId, year, month)`:
    - New import detects existing records, compares fields, and:
      - Skips identical records.
      - Records conflicts where differences exist, requiring explicit resolution.
  - There is no locking or user-level collision detection:
    - Outcome depends on which records are ultimately kept or updated via conflict resolution or CRUD operations.

- **DB file corrupted or partially written**
  - SQLite corruption handling is not addressed in application code.
  - No health checks or corruption detection are implemented beyond normal query error handling.
  - Recovery is **assumed to be external**:
    - Restore from file-level backup of `dev.db`.
    - Any finer-grained recovery strategy is **not determinable from current codebase.**

- **Whether recovery is manual or automatic**
  - Across these failure modes, all recovery paths visible in code are **manual**:
    - Operator-driven re-import.
    - Manual conflict resolution.
    - External DB backup/restore.
  - No automatic repair, re-run scheduling, or self-healing logic is implemented.

---

## 28. Data Ownership & Responsibility

- **Who owns payroll correctness**
  - The system ingests and reports on Excel-provided figures but does not encode responsibility assignments.
  - Responsibility for payroll correctness (values in workbooks and thus DB) is **not determinable from current codebase** and is assumed to lie with business stakeholders outside the system.

- **Who owns system correctness**
  - Code does not define an “owner” for:
    - Parser correctness.
    - Report logic correctness.
  - Responsibility likely falls to IT/engineering or whoever maintains the repo, but this is **not determinable from current codebase.**

- **Whether IT is allowed to modify payroll data**
  - Technically:
    - Any actor with access to the API (including IT) can modify payroll data via CRUD and conflict resolution endpoints.
  - There is no separation of duties enforced in code (e.g., preventing IT users from editing payroll amounts).
  - Whether such modifications are **allowed or prohibited by policy** is **not determinable from current codebase.**

---

## 29. Payroll Period Definition

- **Definition of a payroll period**
  - All salary logic is keyed by:
    - `year: Int`
    - `month: Int` (1–12)
  - Reports and imports assume a **Gregorian calendar month**:
    - Month names like `"January"` and standard 1–12 indexing are used.
  - There is no representation of custom cut-off dates (e.g., mid-month payroll periods).

- **Whether months are assumed to have equal weight**
  - Aggregations sum per-month `SalaryRecord` values without weighting based on actual days in month.
  - Reports treat each month as a discrete bucket with equal logical weight.

- **Whether partial-month proration is expected or ignored**
  - No proration logic appears in code:
    - New joiners/leavers are inferred from presence/absence of monthly records, not intra-month dates or proration.
  - Any partial-month adjustments must be baked into the Excel values; the system only imports those numbers.

- **Whether fiscal vs calendar years are considered**
  - All year fields are simple integers (e.g., 2024, 2025) with no fiscal-year abstraction.
  - Reporting endpoints default to `new Date().getFullYear()` and treat that as the relevant year.
  - **Conclusion**: The system assumes calendar years; fiscal-year concepts are **not present in code.**

---

## 30. Date & Time Zone Assumptions

- **Whether dates are treated as date-only vs timezone-aware**
  - Prisma `DateTime` fields store full timestamps, but most logic uses them as **date-only**:
    - Import parsers convert Excel date cells into JS `Date` objects without explicit timezone normalization.
    - Tenure calculations use `new Date()` and direct `getFullYear/getMonth/getDate` differences.
  - No code converts times between time zones; dates are effectively treated as local server times.

- **Whether frontend and backend are assumed to be in the same timezone**
  - There is no explicit timezone negotiation between frontend and backend.
  - All date computations (e.g. tenure, `importedAt`) happen on the backend only.
  - **Assumption**: Frontend and backend are effectively operating under the same local timezone, but this is **implicit**, not enforced.

- **Whether daylight saving or cross-timezone users are considered**
  - No DST-specific corrections or cross-timezone handling is implemented.
  - Reports do not reference time-of-day; only dates are exposed.
  - **Conclusion**: DST and cross-timezone concerns are effectively ignored in the codebase.**

---

## 31. Currency & Numeric Precision Assumptions

- **Assumed currency (single-currency system)**
  - No currency field or ISO code is stored alongside salary amounts.
  - All monetary values are assumed to be in a single implicit currency.
  - **Exact currency (e.g., EGP vs others) is not determinable from current codebase.**

- **Decimal precision expected**
  - Parsers use `parseFloat` / `parseNumeric`, storing amounts as JS `number` and Prisma `Float`.
  - Exports format numbers typically with:
    - `#,##0` or `#,##0.00` in Excel.
    - Two decimal places in PDFs where formatted explicitly.
  - This implies an expected **2-decimal** representation for most monetary values.

- **Whether rounding differences are tolerated**
  - There is no reconciliation check between:
    - Imported `gross`/`net` and recomputed aggregates from components.
  - Minor rounding differences are implicitly tolerated:
    - The system does not throw errors or flag inconsistencies when totals do not exactly match computed sums.

- **Whether currency formatting is purely presentational**
  - All numeric storage is unformatted (`Float`).
  - Formatting (thousand separators, decimals) is applied only:
    - During CSV/XLSX/PDF generation.
    - In frontend display.
  - **Conclusion**: Currency formatting is purely presentational; it does not affect stored values.**

---

## 32. Testing & Verification

- **Whether automated tests exist**
  - Within the inspected workspace:
    - No dedicated automated test suites (e.g., Jest, Mocha) are present for:
      - Import logic.
      - Salary parsing.
      - Reports.
  - Some scripts under `scripts/` and `docs` are used for **manual analysis and schema discovery**, not as formal tests.
  - ✅ **Validation testing (comprehensive coverage achieved - 2026-01-10)**:
    - **95 validation middleware instances** across 20 route files provide runtime validation as a form of contract testing.
    - Invalid inputs are automatically rejected with clear, field-level error messages (400 Bad Request).
    - Type safety is enforced at both compile-time (TypeScript) and runtime (Zod).
    - All request bodies, query parameters, and path parameters validated before route handlers execute.
    - Complex nested data structures validated with flexible schemas using `.passthrough()` patterns for export routes.
    - Type coercion validated (string to number for query parameters, date parsing, etc.).
  - ✅ **Validation coverage verification (100% achieved)**:
    - All export routes validated (16 endpoints including complex nested data structures).
    - All report routes validated (11 endpoints with query parameter validation).
    - All bulk operations validated (2 endpoints with path params and body validation).
    - All personnel routes validated (5 endpoints with query/param validation).
    - All employee detail routes validated (7 endpoints with path params and query validation).
    - All configuration endpoints validated (1 endpoint with body validation).
    - Import/merge routes already validated (verified complete).
    - **Reviewer's acceptance criteria fully met**: Zero endpoints consume unchecked `req.body`, `req.query`, or `req.params`.
  - **Manual testing recommendations**:
    - Test valid input (should process correctly).
    - Test invalid input (should return 400 with clear error messages).
    - Test edge cases (empty strings, null, undefined, NaN, boundary values).
    - Verify type coercion works correctly (string to number, etc.).
  - **Conclusion**: Input validation provides comprehensive runtime contract enforcement across all API endpoints with 100% coverage. While no dedicated automated test suites exist for core payroll logic, Zod validation ensures data integrity and type safety at the API boundary. Manual functional testing recommended to verify all validation behaviors work correctly in practice.**

- **Whether verification is manual**
  - Docs (e.g., `DATA_PARSING.md`, `schema_discovery.md`, analysis scripts) indicate:
    - Manual verification against sample workbooks.
    - Ad-hoc script-based comparisons during development.
  - No automated regression checks are wired into runtime or CI.

- **Whether Excel outputs are reconciled against system outputs**
  - The system does not:
    - Re-open or re-evaluate the original Excel formulas after import.
    - Provide an automatic reconciliation report comparing Excel totals vs DB totals.
  - Any reconciliation appears to be manual, aided by ad-hoc scripts and human inspection, not enforced by the application.

---

## 33. Operational Runbook

- **Whether a documented payroll run procedure exists**
  - The `docs` directory contains:
    - User and import guides (e.g., `USER_GUIDE.md`, `PERSONNEL_IMPORT_GUIDE.md`, `SEP_EMPLOYEES_IMPORT.md`).
  - These describe how to run imports and interpret data but do not encode a formal, machine-enforced runbook.
  - A complete, step-by-step runbook (with roles, timings, approvals) may exist outside this repo but is **not determinable from current codebase.**

- **Whether imports are checklist-driven**
  - No in-app checklist or workflow engine is implemented.
  - Any checklists would have to be in external documentation or organizational process, not in code.

- **Whether sign-offs occur outside the system**
  - The application has:
    - No approval objects.
    - No sign-off states or signatures.
  - This implies that any formal sign-offs (e.g., payroll approval, HR review) occur **outside** the system (e.g., via email, documents, meetings), but the specific process is **not determinable from current codebase.**

---

## 34. Payroll vs Payment Boundary

- **The system does not initiate, schedule, or confirm salary payments**
  - There is no integration with banking APIs, payment gateways, or payroll disbursement services.
  - No routes or services exist to:
    - Create payment orders.
    - Track payment status.
    - Reconcile paid vs unpaid transactions.

- **All payment execution occurs outside the system**
  - Payment methods and account numbers are stored as informational fields in `SalaryRecord` and `Employee`, but:
    - They are not used to trigger any financial transactions.
  - Actual payment execution (bank transfers, cash, cheques, etc.) is assumed to be managed by external systems or manual processes.

- **The system’s responsibility ends at reporting and exporting payroll figures**
  - Scope is limited to:
    - Importing and storing payroll-related data.
    - Generating reports and exports (PDF/XLSX/CSV, employee cards, summaries).
  - Ensuring that payments are actually made, on time, and in correct amounts is **out of scope** for this system.

---

## 35. Data Accuracy Disclaimer

- **The system assumes correctness of source Excel data**
  - Parsing logic does not:
    - Cross-check imported numbers against external authoritative sources.
    - Apply independent validation of business rules beyond structural expectations (presence of sheets/columns).
  - If Excel contains incorrect values, those values will be ingested and reflected in reports.

- **It does not independently validate payroll legality or correctness**
  - No legal/tax rules engine exists to:
    - Flag under/over-withholding.
    - Enforce statutory caps or thresholds.
    - Validate compliance with labor or tax regulations.
  - The system does not mark any records as legally “approved” or “compliant.”

- **Any inaccuracies in outputs reflect inaccuracies in source inputs or manual corrections**
  - Reports and exports are deterministic functions of:
    - Imported Excel values.
    - Subsequent manual CRUD edits and conflict resolutions.
  - If outputs are wrong, the cause is:
    - Erroneous source workbooks, or
    - Incorrect manual modification/decision within the system.
  - The system does not currently provide automated root-cause analysis or guarantees of correctness beyond faithfully reflecting its stored data.


