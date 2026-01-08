# User & Role Guide

This guide explains the user roles, permissions, and how to manage users in the Salaries Summary system.

## User Roles Overview

The system implements role-based access control (RBAC) with the following roles:

### HR_PERSONNEL
**Purpose**: Manage HR and personnel data without access to salary information.

**Capabilities**:
- ✅ View and edit employee basic information (name, department, job title, etc.)
- ✅ View and edit personnel records (document compliance, asset inventory)
- ✅ View and edit contract records
- ✅ View and edit additions and deductions in salary records
- ✅ Import and manage resigned employees
- ✅ Run personnel diagnostics
- ✅ Access HR-related reports (joiners/leavers, document compliance, asset inventory)
- ✅ Export reports with redacted salary data (Additions/Deductions Breakdown)

**Restrictions**:
- ❌ Cannot view `Basic Salary`, `Gross`, `Net`, or bonus amounts (shown as "RESTRICTED")
- ❌ Cannot access salary-sensitive reports (Category Totals, Monthly Summary, Annual Bonus, Bonus Comparison)
- ❌ Cannot export full salary reports
- ❌ Cannot create/delete salary records (can only edit additions/deductions)

**Use Case**: HR staff who need to manage employee information and compliance data but should not see compensation details.

---

### OFFICE_MANAGER
**Purpose**: Full operational access to all system data and functions.

**Capabilities**:
- ✅ Full read/write access to all employee, salary, bonus, and personnel data
- ✅ Import salary, bonus, personnel, and contract data
- ✅ Create, update, and delete salary and bonus records
- ✅ Access all reports and exports (including full salary details)
- ✅ Manage bulk salary entry
- ✅ Access all management pages

**Restrictions**:
- ❌ Cannot manage users or roles (requires ADMIN or SUPER_ADMIN)
- ❌ Cannot configure system settings or notifications (requires ADMIN or SUPER_ADMIN)

**Use Case**: Office managers or payroll administrators who need complete access to manage payroll operations.

---

### FINANCE
**Purpose**: View and analyze financial data with limited editing capabilities.

**Capabilities**:
- ✅ Full visibility of all salary and bonus amounts
- ✅ Access to all salary/bonus reports and exports
- ✅ Edit additions and deductions in salary records
- ✅ View all HR data (read-only)
- ✅ Access financial analysis reports (Category Totals, Monthly Summary, Annual Bonus, Bonus Comparison)

**Restrictions**:
- ❌ Cannot edit employee basic information
- ❌ Cannot edit personnel records
- ❌ Cannot create/delete salary records (can only edit additions/deductions)
- ❌ Cannot import data
- ❌ Cannot manage users or system settings

**Use Case**: Finance team members who need to review and analyze payroll data but should not modify employee records.

---

### VIEW_ONLY
**Purpose**: Read-only access for reporting and analysis.

**Capabilities**:
- ✅ View all employee, salary, bonus, and personnel data
- ✅ Access all reports and exports (including full salary details)
- ✅ View all management pages (read-only)

**Restrictions**:
- ❌ Cannot create, update, or delete any records
- ❌ Cannot import data
- ❌ Cannot manage users or system settings

**Use Case**: Executives, auditors, or analysts who need to view data but should not make changes.

---

### ADMIN
**Purpose**: System administration without access to sensitive payroll data.

**Capabilities**:
- ✅ Create, update, and delete user accounts
- ✅ Assign roles to users
- ✅ View and manage roles and permissions
- ✅ Configure system settings (notifications, bonus halves)
- ✅ View audit logs
- ✅ Access employee management page (`/manage/employees`)
- ✅ Access notification settings page (`/settings/notifications`)

**Restrictions**:
- ❌ Cannot view salary or bonus amounts (shown as "RESTRICTED")
- ❌ Cannot access salary-sensitive reports
- ❌ Cannot export full salary reports
- ❌ Cannot clear database (requires SUPER_ADMIN)

**Use Case**: IT administrators who manage users and system configuration but should not access payroll data.

---

### SUPER_ADMIN
**Purpose**: Complete system control with all capabilities.

**Capabilities**:
- ✅ All capabilities of ADMIN
- ✅ Full visibility of all salary and bonus data
- ✅ Access to all reports and exports
- ✅ Clear database (`/api/import/clear`)
- ✅ All management functions
- ✅ Cannot be deleted or modified by other ADMIN users

**Use Case**: System owner or primary administrator who needs complete system access.

**Note**: The initial SUPER_ADMIN user is seeded with:
- Username: `khelmy`
- Initial password: `P@ssw0rd` (should be changed on first login)

---

## Managing Users

### Accessing User Management

1. Log in with an ADMIN or SUPER_ADMIN account
2. Navigate to **Management** → **User Management** (or go to `/manage/users`)
3. The page shows all users with their roles and status

### Creating a New User

1. Click **"+ New User"** button
2. Fill in the required fields:
   - **Username** (required, must be unique)
   - **Full Name** (required)
   - **Password** (required for new users)
   - **Email** (optional)
   - **System ID** (optional, e.g. "3-2")
3. Select one or more **Roles** by checking the boxes
4. Set **Active** status (checked = active, unchecked = inactive)
5. Click **Save**

**Note**: Inactive users cannot log in, even with correct credentials.

### Editing a User

1. Click **Edit** next to the user in the user list
2. Modify any fields (except username, which cannot be changed)
3. To change password, enter a new password and confirm it
4. To update roles, check/uncheck the role boxes
5. Click **Save**

**Note**: 
- You cannot delete your own account
- You cannot delete or modify the SUPER_ADMIN user (`khelmy`) unless you are SUPER_ADMIN

### Deleting a User

1. Click **Delete** next to the user
2. Confirm the deletion
3. The user and all their role assignments will be permanently removed

**Note**: 
- You cannot delete your own account
- You cannot delete the SUPER_ADMIN user (`khelmy`) unless you are SUPER_ADMIN

---

## Login Process

1. Navigate to the application URL (e.g., `http://localhost:3000`)
2. If not logged in, you will be redirected to the login page
3. Enter your **Username** and **Password**
4. Click **Login**
5. Upon successful login, you will be redirected to the page you were trying to access (or the dashboard)

**Session Duration**: Sessions expire after 8 hours of inactivity. You will need to log in again after expiration.

---

## Data Redaction

For roles that cannot view salary amounts (`HR_PERSONNEL`, `ADMIN`), the following fields are replaced with the text `"RESTRICTED"`:

- Basic Salary
- Gross Salary
- Net Salary
- Yearly Increase
- Bonus amounts

**Additions and Deductions** remain visible and editable for `HR_PERSONNEL` and `FINANCE` roles.

**Export Files**: When exporting reports, filenames indicate the role context:
- `Employee Card (HR view).pdf` - Redacted version for HR_PERSONNEL
- `Employee Card (Manager view).pdf` - Full version for OFFICE_MANAGER/FINANCE/VIEW_ONLY

---

## Audit Trail

All security-sensitive actions are logged in the audit trail:

- **Authentication events**: Login success/failure, logout
- **Data modifications**: Create, update, delete operations on employees, salaries, bonuses, users, etc.
- **Salary/bonus access**: Viewing or exporting salary/bonus data

Audit logs are retained for **1 year** and are automatically cleaned up daily.

**Viewing Audit Logs**: Currently, audit logs are stored in the database but there is no UI to view them. This may be added in a future update.

---

## Security Best Practices

1. **Change Default Password**: The initial SUPER_ADMIN password (`P@ssw0rd`) should be changed immediately after first login.

2. **Use Strong Passwords**: While not enforced programmatically, use strong passwords:
   - Minimum 8 characters
   - Mix of uppercase, lowercase, numbers, and special characters

3. **Principle of Least Privilege**: Assign users only the roles they need:
   - HR staff → `HR_PERSONNEL`
   - Finance staff → `FINANCE`
   - Managers → `OFFICE_MANAGER`
   - IT staff → `ADMIN` (if they don't need salary access)

4. **Deactivate Unused Accounts**: Set `isActive = false` for users who no longer need access instead of deleting them (preserves audit trail).

5. **Regular Review**: Periodically review user accounts and role assignments to ensure they match current job responsibilities.

---

## Troubleshooting

### "Access Denied" Error
- **Cause**: Your role does not have permission to access the requested page or perform the action.
- **Solution**: Contact an ADMIN or SUPER_ADMIN to review your role assignments.

### Cannot Log In
- **Check**: Ensure your username and password are correct
- **Check**: Verify your account is active (`isActive = true`)
- **Solution**: Contact an ADMIN or SUPER_ADMIN to reset your password or activate your account

### Salary Data Shows "RESTRICTED"
- **Cause**: Your role (`HR_PERSONNEL` or `ADMIN`) does not have permission to view salary amounts.
- **Solution**: If you need salary access, request `OFFICE_MANAGER`, `FINANCE`, or `VIEW_ONLY` role from an ADMIN.

### Session Expired
- **Cause**: Your session token expired (8 hours of inactivity).
- **Solution**: Log in again to create a new session.

---

## Support

For issues or questions about user management or role assignments, contact your system administrator (ADMIN or SUPER_ADMIN).

