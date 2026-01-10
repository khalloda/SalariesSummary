# Prisma Singleton Functional Testing Checklist

**Use this checklist to verify the singleton refactor is working correctly**

---

## Pre-Testing Verification

- [x] API server is running on port 3001
- [ ] No errors in server startup logs related to Prisma
- [ ] Database file exists and is accessible
- [ ] Server logs show successful Prisma connection

---

## 1. Health Check & Basic Connectivity

### Test: Health Endpoint
```bash
# PowerShell
curl.exe http://localhost:3001/api/health

# Expected: {"status":"ok","timestamp":"..."}
```

- [ ] Health endpoint responds successfully
- [ ] No Prisma connection errors in server logs
- [ ] Response is valid JSON

---

## 2. Authentication Endpoints

### Test: Login
```bash
# POST /api/auth/login
# Body: { "username": "your_username", "password": "your_password" }
```

- [ ] Login succeeds with valid credentials
- [ ] JWT token is returned
- [ ] Cookie is set correctly
- [ ] No database connection errors
- [ ] Check server logs for any Prisma errors

### Test: Get Current User
```bash
# GET /api/auth/me
# Headers: Cookie: salaries_auth=...
```

- [ ] Returns current user data
- [ ] Includes user roles
- [ ] No database connection errors

### Test: Logout
```bash
# POST /api/auth/logout
```

- [ ] Logout succeeds
- [ ] Cookie is cleared
- [ ] No database connection errors

---

## 3. CRUD Operations - Employees

### Test: List Employees
```bash
# GET /api/employees
```

- [ ] Returns list of employees
- [ ] No connection pool exhaustion errors
- [ ] Response time is reasonable
- [ ] Check server logs for Prisma query logs (should show singleton usage)

### Test: Create Employee (if authorized)
```bash
# POST /api/employees
# Body: { "name": "Test Employee", "category": "Test", ... }
```

- [ ] Employee is created successfully
- [ ] Returns created employee with ID
- [ ] Database query executes without errors
- [ ] Verify in database that record exists

### Test: Get Employee by ID
```bash
# GET /api/employees/:id
```

- [ ] Returns employee details
- [ ] Includes related data (salaries, etc.)
- [ ] No connection errors

### Test: Update Employee (if authorized)
```bash
# PUT /api/employees/:id
# Body: { "name": "Updated Name", ... }
```

- [ ] Employee is updated successfully
- [ ] Returns updated employee
- [ ] Changes persist in database

### Test: Delete Employee (if authorized)
```bash
# DELETE /api/employees/:id
```

- [ ] Employee is deleted successfully
- [ ] Related records are handled correctly
- [ ] No foreign key constraint errors

---

## 4. CRUD Operations - Salaries

### Test: List Salaries
```bash
# GET /api/salaries?year=2025&month=1
```

- [ ] Returns salary records
- [ ] Filters work correctly
- [ ] No connection errors

### Test: Create Salary (if authorized)
```bash
# POST /api/salaries
# Body: { "employeeId": "...", "year": 2025, "month": 1, ... }
```

- [ ] Salary record is created
- [ ] Validation works correctly
- [ ] No connection errors

---

## 5. CRUD Operations - Users

### Test: List Users (ADMIN+ only)
```bash
# GET /api/users
# Requires: ADMIN or SUPER_ADMIN role
```

- [ ] Returns list of users
- [ ] Role-based access control works
- [ ] No connection errors

### Test: Create/Update User (if authorized)
```bash
# POST /api/users
# PUT /api/users/:id
```

- [ ] User operations work correctly
- [ ] Password hashing works
- [ ] No connection errors

---

## 6. CRUD Operations - Bonuses

### Test: List Bonuses
```bash
# GET /api/bonuses?year=2025
```

- [ ] Returns bonus records
- [ ] Filters work correctly
- [ ] No connection errors

### Test: Create Bonus (if authorized)
```bash
# POST /api/bonuses
```

- [ ] Bonus record is created
- [ ] Calculations work correctly
- [ ] No connection errors

---

## 7. CRUD Operations - Contracts

### Test: List Contracts
```bash
# GET /api/contracts
```

- [ ] Returns contract records
- [ ] No connection errors

### Test: Create Contract (if authorized)
```bash
# POST /api/contracts
```

- [ ] Contract is created
- [ ] Employee relationship works
- [ ] No connection errors

---

## 8. Reports & Queries

### Test: Monthly Summary Report
```bash
# GET /api/reports/monthly-summary?year=2025&month=1
```

- [ ] Report generates successfully
- [ ] Aggregations are correct
- [ ] Complex queries execute without connection errors
- [ ] Response time is acceptable

### Test: Annual Bonus Report
```bash
# GET /api/reports/annual-bonus?year=2025
```

- [ ] Report generates successfully
- [ ] Complex joins work correctly
- [ ] No connection pool exhaustion

### Test: Category Totals
```bash
# GET /api/reports/category-totals?year=2025&month=1
```

- [ ] Totals are calculated correctly
- [ ] Grouping works properly
- [ ] No connection errors

---

## 9. Import Operations

### Test: Import Status Check
```bash
# GET /api/import/status
```

- [ ] Returns import status
- [ ] No connection errors

**Note**: Full import testing requires Excel files. Test if available.

---

## 10. Export Operations

### Test: Export Employee Card (PDF/CSV/XLSX)
```bash
# GET /api/exports/employee-card/:employeeId/:year?format=pdf
```

- [ ] Export generates successfully
- [ ] Long-running queries complete without connection errors
- [ ] File download works correctly

---

## 11. Background Services

### Test: Notification Scheduler
- [ ] Check cron scheduler starts correctly (if configured)
- [ ] Notification service can query database
- [ ] No connection errors in scheduled tasks

**Note**: This requires cron to be configured and running.

---

## 12. Scripts Execution

### Test: Seed Superadmin Script
```bash
cd apps/api
npm run seed:superadmin
# Or: node dist/scripts/seed-superadmin.js
```

- [ ] Script executes successfully
- [ ] Database operations complete
- [ ] Script disconnects correctly at end
- [ ] Superadmin user is created/updated

### Test: Merge Duplicates Script
```bash
node dist/scripts/merge-duplicate-employees.js
```

- [ ] Script executes successfully
- [ ] Database queries work
- [ ] Duplicates are merged correctly
- [ ] Script disconnects at end

---

## 13. Connection Pool Testing

### Test: Concurrent Requests
- [ ] Send 10-20 simultaneous requests to `/api/employees`
- [ ] All requests succeed
- [ ] No "too many connections" errors
- [ ] Response times remain reasonable
- [ ] Server logs show single connection pool being used

### Test: Long-Running Operations
- [ ] Run a complex report query
- [ ] While report is running, send other requests
- [ ] Other requests should not wait or timeout
- [ ] All requests complete successfully

---

## 14. Error Scenarios

### Test: Invalid Database Query
- [ ] Attempt invalid query (e.g., invalid employee ID)
- [ ] Error is handled gracefully
- [ ] Connection pool is not affected
- [ ] Subsequent valid requests still work

### Test: Database Connection Issues
- [ ] If database file is temporarily locked/moved
- [ ] Error messages are clear
- [ ] Connection pool recovers when database is available again

---

## 15. Server Logs Inspection

After running tests, check server logs for:

- [ ] **No "too many connections" errors**
- [ ] **No "connection pool exhausted" errors**
- [ ] **Prisma query logs show singleton usage** (in development)
- [ ] **No warnings about multiple PrismaClient instances**
- [ ] **Graceful shutdown logs** when server stops

### What to Look For:
```
✅ Good: "Prisma Client initialized"
✅ Good: Query logs showing successful database operations
✅ Good: "Prisma Client disconnected" on shutdown

❌ Bad: "Can't reach database server"
❌ Bad: "Connection pool exhausted"
❌ Bad: Multiple "Prisma Client initialized" messages
❌ Bad: Connection errors in concurrent requests
```

---

## 16. Memory Usage (Optional)

### Monitor During Testing:
- [ ] Memory usage remains stable during test runs
- [ ] No memory leaks from multiple PrismaClient instances
- [ ] Memory usage is lower than before refactor (if baseline available)

**Tools:**
- Windows: Task Manager, Performance Monitor
- Or use Node.js memory profiling tools

---

## 17. Performance Verification

### Compare Before/After (if possible):
- [ ] Average response time for `/api/employees`
- [ ] Average response time for complex reports
- [ ] Connection pool usage (should be single pool)
- [ ] Memory usage (should be lower)

---

## ✅ Testing Completion

Once all applicable tests pass:

- [ ] All core CRUD operations work
- [ ] No connection pool errors
- [ ] Reports generate correctly
- [ ] Imports work (if tested)
- [ ] Scripts execute successfully
- [ ] Concurrent requests handled properly
- [ ] Server logs show no Prisma-related errors

---

## 🐛 Troubleshooting

### If you see "too many connections" errors:
1. Check for any remaining `new PrismaClient()` instances:
   ```bash
   grep -r "new PrismaClient" apps/api/src/
   ```
2. Verify all files import from singleton:
   ```bash
   grep -r "from.*db/prisma" apps/api/src/ | wc -l
   ```
3. Check for `$disconnect()` calls in routes:
   ```bash
   grep -r "\$disconnect" apps/api/src/routes/
   ```

### If queries are slow:
- Check database indexes
- Verify single connection pool is being used
- Check for N+1 query problems

### If server crashes:
- Check server logs for Prisma errors
- Verify database file is accessible
- Check for memory issues

---

## 📝 Test Results Template

**Date:** _____________  
**Tester:** _____________  
**Server Status:** ✅ Running / ❌ Issues  
**Database Status:** ✅ Accessible / ❌ Issues  

### Summary:
- Total Tests Run: _____
- Passed: _____
- Failed: _____
- Skipped: _____

### Issues Found:
1. _______________________________________
2. _______________________________________
3. _______________________________________

### Notes:
_______________________________________
_______________________________________
_______________________________________

---

**Last Updated:** 2026-01-09  
**Version:** 1.0
