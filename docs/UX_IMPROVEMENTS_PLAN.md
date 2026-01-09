# Frontend UX Enhancements Plan (Forms & Validation)

**Owner**: SalariesSummary Frontend  
**Last Updated**: 2026-01-09  

This document tracks a multi-phase UX improvement program focused on forms, validation, and feedback in the web app.  

---

## Overview

- **Scope**: All major interactive forms in `apps/web` (Auth, Users, Employees, Salaries, Bonuses, Contracts, Bulk Salary, key dashboards).
- **Primary Goals**:
  - Make validation errors clear, local, and actionable.
  - Improve perceived performance and responsiveness.
  - Reduce accidental data loss and user frustration.
  - Align UX with security and correctness guarantees already provided by Zod on the backend.
- **Classification**:
  - **Core**: Changes that materially improve correctness, clarity, or safety for day-to-day use.
  - **Optional**: Polishing and “delight” features that are nice to have, but not required for reliable operation.

---

## Phase 1 – Field-Level Validation & Real-Time Feedback (CORE)

**Goal**: Make validation feedback precise and immediate, similar to the existing Login form.

### 1.1 Field-Level Errors

- **Description**: Replace or augment top-level error boxes with field-level error messages under each control, driven by Zod.
- **Targets (Core)**:
  - `UserManagement` modal (user create/edit)
  - `EmployeeManagement` modal (employee create/edit)
  - `SalaryManagement` modal (salary create/edit)
  - `BonusManagement` modal (bonus create/edit)
  - `ContractManagement` modal (contract create/edit)
- **Approach**:
  - For forms already using Zod `.safeParse(...)`:
    - Capture `ZodError.issues` and map to a `fieldErrors` object keyed by field name.
    - Render `fieldErrors[field]` directly under the corresponding input.
  - Keep a top-level summary box only for non-field-specific or multiple-field errors (e.g., complex business constraints).

**Tasks**
- [ ] 1.1.1 Create a small helper to map Zod errors to `{ [path]: string[] }` (optional but recommended).
- [ ] 1.1.2 Wire field-level errors into `UserManagement` form.
- [ ] 1.1.3 Wire field-level errors into `EmployeeManagement` form.
- [ ] 1.1.4 Wire field-level errors into `SalaryManagement` form.
- [ ] 1.1.5 Wire field-level errors into `BonusManagement` form.
- [ ] 1.1.6 Wire field-level errors into `ContractManagement` form.

### 1.2 Real-Time Validation Feedback

- **Description**: Show validation errors on blur (and optionally on change) instead of only on submit.
- **Approach**:
  - For forms using `react-hook-form` (e.g., `Login`):
    - Set `mode: 'onBlur'` and optionally `reValidateMode: 'onChange'`.
  - For forms using Zod manually:
    - Add per-field validation on `onBlur` (validate only that field via a small per-field schema or by partially parsing with a pick/shape).

**Tasks**
- [ ] 1.2.1 Enable `mode: 'onBlur'` on `Login` form.
- [ ] 1.2.2 Add per-field blur validation to `UserManagement` form.
- [ ] 1.2.3 Add per-field blur validation to `EmployeeManagement` form.
- [ ] 1.2.4 Add per-field blur validation to `SalaryManagement` form.
- [ ] 1.2.5 Add per-field blur validation to `BonusManagement` form.
- [ ] 1.2.6 Add per-field blur validation to `ContractManagement` form.

**Phase 1 Status**: ⏳ Not Started (plan defined)  

---

## Phase 2 – Visual Field States & Loading Feedback (CORE)

**Goal**: Make the form state obvious: which fields are invalid, which are in focus, and when a save is in progress.

### 2.1 Visual Field State Indicators

- **Description**: Use consistent Tailwind classes for field states:
  - **Error**: Red border + red helper text.
  - **Valid** (where appropriate): Green border or check icon.
  - **Warning**: Amber/yellow border or icon for non-blocking issues.
- **Approach**:
  - Centralize commonly used class names (possibly via a small utility or pattern).
  - Drive states from the same `fieldErrors` object or from `react-hook-form`’s `formState`.

**Tasks**
- [ ] 2.1.1 Define standard CSS/Tailwind patterns for `error`, `valid`, and `warning` field states.
- [ ] 2.1.2 Apply error state styling to all core forms (Users, Employees, Salaries, Bonuses, Contracts, Login).
- [ ] 2.1.3 (Optional) Add green checkmark icon for fields that validate successfully.

### 2.2 Better Loading & Submission States

- **Description**:
  - Disable submit buttons while saving.
  - Show a spinner or progress indicator.
  - Prevent double submissions.
- **Approach**:
  - Standardize a `LoadingButton` pattern that accepts `isLoading` and `label`/`loadingLabel` props.
  - Use existing `saving`/`isSubmitting` flags across forms.

**Tasks**
- [ ] 2.2.1 Create a reusable `LoadingButton` component (or pattern) in `components/`.
- [ ] 2.2.2 Replace ad-hoc save buttons in `UserManagement` with `LoadingButton`.
- [ ] 2.2.3 Replace ad-hoc save buttons in `EmployeeManagement` with `LoadingButton`.
- [ ] 2.2.4 Replace ad-hoc save buttons in `SalaryManagement` with `LoadingButton`.
- [ ] 2.2.5 Replace ad-hoc save buttons in `BonusManagement` with `LoadingButton`.
- [ ] 2.2.6 Replace ad-hoc save buttons in `ContractManagement` with `LoadingButton`.
- [ ] 2.2.7 Ensure all destructive actions (delete, etc.) are disabled while requests are in flight.

**Phase 2 Status**: ⏳ Not Started  

---

## Phase 3 – Toast Notifications & Confirmation Dialogs (CORE)

**Goal**: Replace intrusive `alert()` / `confirm()` with consistent, non-blocking toasts and nice confirmation modals.

### 3.1 Toast Notifications

- **Description**: Use a toast library (`react-hot-toast` or `sonner`) for success and error messages.
- **Scope (Core)**:
  - CRUD save/delete on Users, Employees, Salaries, Bonuses, Contracts.
  - Bulk Salary creation feedback.
  - Key exports/imports in Dashboard.
- **Approach**:
  - Add toast provider in `main.tsx` (e.g., `<Toaster />`).
  - Replace `alert(...)` usages with `toast.success(...)` / `toast.error(...)`.

**Tasks**
- [ ] 3.1.1 Install and configure toast library in `apps/web` (`react-hot-toast` or `sonner`).
- [ ] 3.1.2 Replace `alert` calls in `UserManagement` with toasts.
- [ ] 3.1.3 Replace `alert` calls in `EmployeeManagement` with toasts.
- [ ] 3.1.4 Replace `alert` calls in `SalaryManagement` with toasts.
- [ ] 3.1.5 Replace `alert` calls in `BonusManagement` with toasts.
- [ ] 3.1.6 Replace `alert` calls in `ContractManagement` with toasts.
- [ ] 3.1.7 Replace key `alert` calls in `Dashboard` and report/export pages with toasts.

### 3.2 Confirmation Dialogs (Destructive Actions)

- **Description**: Replace `confirm()` with styled, accessible confirmation modals.
- **Scope (Core)**: Delete operations in Users, Employees, Salaries, Bonuses, Contracts.

**Tasks**
- [ ] 3.2.1 Create a reusable `ConfirmDialog` component with callbacks and configurable text.
- [ ] 3.2.2 Use `ConfirmDialog` for user deletion in `UserManagement`.
- [ ] 3.2.3 Use `ConfirmDialog` for employee deletion in `EmployeeManagement`.
- [ ] 3.2.4 Use `ConfirmDialog` for salary deletion in `SalaryManagement`.
- [ ] 3.2.5 Use `ConfirmDialog` for bonus deletion in `BonusManagement`.
- [ ] 3.2.6 Use `ConfirmDialog` for contract deletion in `ContractManagement`.

**Phase 3 Status**: ⏳ Not Started  

---

## Phase 4 – Input Formatting & Smart Defaults (CORE / OPTIONAL MIX)

**Goal**: Reduce input errors and cognitive load by formatting values and pre-filling sensible defaults.

### 4.1 Input Formatting Helpers (Optional but Recommended)

- **Description**:
  - Auto-format numbers with thousand separators.
  - Auto-format dates (display as `DD/MM/YYYY` while storing ISO).
  - Phone number formatting.
  - Currency formatting (EGP).

**Tasks**
- [ ] 4.1.1 Create formatting utilities for numbers, EGP currency, and dates (`formatNumber`, `formatCurrencyEGP`, `formatDateDisplay`).
- [ ] 4.1.2 Apply numeric formatting to salary, bonus, and allowance fields (display vs stored value).
- [ ] 4.1.3 Apply date display formatting where appropriate while keeping ISO values behind the scenes.
- [ ] 4.1.4 (Optional) Add formatting for phone numbers where relevant.

### 4.2 Smart Defaults (Core-lite)

- **Description**:
  - Pre-fill year/month fields to current values where it makes sense.
  - Remember last selected employee or filters per user (optional).
  - Auto-calculate derived fields when all required inputs are present.

**Tasks**
- [ ] 4.2.1 Confirm and document existing smart defaults (many already exist in salary/bonus pages).
- [ ] 4.2.2 Add/standardize defaults for year/month in relevant forms (Salary, Bonus, Bulk Salary, reports).
- [ ] 4.2.3 (Optional) Persist last-used filters in localStorage for Employees/Reports dashboards.

**Phase 4 Status**: ⏳ Not Started  

---

## Phase 5 – Form Auto-Save & Keyboard Shortcuts (OPTIONAL)

**Goal**: Improve productivity and prevent data loss on long forms.

### 5.1 Draft Persistence (Auto-Save)

- **Description**: Save form state to `localStorage` as the user types; restore on reload.
- **Scope (Optional)**:
  - `EmployeeManagement` create/edit form.
  - `UserManagement` form.
  - Long configuration forms if added later.

**Tasks**
- [ ] 5.1.1 Design a small `useFormDraft` hook (keyed by form ID + entity ID) that syncs to `localStorage`.
- [ ] 5.1.2 Integrate `useFormDraft` into `EmployeeManagement` form.
- [ ] 5.1.3 Integrate `useFormDraft` into `UserManagement` form.

### 5.2 Keyboard Shortcuts

- **Description**:
  - `Ctrl+S` / `Cmd+S` to save.
  - `Esc` to close modal.
  - `Enter` to submit when appropriate (no modals or confirmations open).

**Tasks**
- [ ] 5.2.1 Create a small hook/util for binding keyboard shortcuts (with proper cleanup).
- [ ] 5.2.2 Wire `Ctrl+S` / `Cmd+S` to trigger save in modal forms (Users, Employees, Salaries, Bonuses, Contracts).
- [ ] 5.2.3 Wire `Esc` to close active modal safely (respect unsaved changes later if needed).

**Phase 5 Status**: ⏳ Not Started  

---

## Phase 6 – Error Message Quality & Accessibility (CORE-LIKE)

**Goal**: Ensure that errors are meaningful and forms are usable with assistive technologies.

### 6.1 Better Error Messages

- **Description**: Refine Zod and UI messages to be specific and actionable.

**Tasks**
- [ ] 6.1.1 Review core Zod schemas for user-facing message quality (Auth, Users, Employees, Salaries, Bonuses, Contracts).
- [ ] 6.1.2 Map schema messages to localized translations where appropriate.

### 6.2 Accessibility Improvements

- **Description**:
  - Add proper `aria-*` attributes for errors and descriptions.
  - Ensure focus moves to the first invalid field on submit failure.
  - Verify keyboard navigation (Tab order, Enter behavior, Space/Enter on buttons).
  - Consider high contrast / reduced motion settings.

**Tasks**
- [ ] 6.2.1 Add `aria-invalid` and `aria-describedby` hookups for form controls with errors.
- [ ] 6.2.2 On submit error, programmatically focus the first invalid field (core forms).
- [ ] 6.2.3 Audit keyboard navigation for core forms and fix any obvious issues.

**Phase 6 Status**: ⏳ Not Started  

---

## Phase 7 – Inline Help, Progress Indicators, and Optimistic Updates (OPTIONAL)

**Goal**: Add “polish” and reduce friction on complex flows.

### 7.1 Inline Help Text & Tooltips

- **Description**: Add context-sensitive help, especially for complex salary/bonus fields and imports.

**Tasks**
- [ ] 7.1.1 Identify fields that are commonly misunderstood (from docs and experience).
- [ ] 7.1.2 Add help text or tooltips (`Tooltip` component) next to these fields.

### 7.2 Form Sections with Progress Indicators

- **Description**: For long forms (e.g., `EmployeeManagement`), visually segment sections and show “X of Y sections completed” or a simple step indicator.

**Tasks**
- [ ] 7.2.1 Add section headers and a mini progress indicator for `EmployeeManagement` (e.g., Basic Info, Contact, Education, Identification, Employment, Experience, Resignation, Notes).

### 7.3 Optimistic Updates

- **Description**: Show immediate UI updates for some operations and roll back if the server fails.

**Tasks**
- [ ] 7.3.1 Identify safe candidates for optimistic updates (e.g., toggling `isActive`, non-destructive updates).
- [ ] 7.3.2 Implement optimistic update pattern for at least one list (e.g., Users or Employees), with rollback on error.

**Phase 7 Status**: ⏳ Not Started  

---

## Tracking & Conventions

- This file should be updated **after each phase or notable task** with:
  - Checkbox updates (`[ ]` → `[x]`).
  - Brief notes if needed (e.g., deviations or implementation details).
- When a phase is substantially complete, add a one-line summary under its status.

