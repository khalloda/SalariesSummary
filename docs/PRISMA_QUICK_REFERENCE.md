# Prisma Client Quick Reference

**For Developers Working on the Salaries Summary API**

---

## ⚠️ Important Rule

**NEVER create a new `PrismaClient()` instance. Always use the singleton.**

---

## ✅ Correct Usage

### In Route Files (`apps/api/src/routes/`)

```typescript
import { Router } from 'express';
import { prisma } from '../db/prisma.js';

export const myRouter = Router();

myRouter.get('/example', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});
```

### In Service Files (`apps/api/src/services/`)

```typescript
import { prisma } from '../db/prisma.js';

export async function myServiceFunction() {
  const data = await prisma.employee.findMany();
  return data;
}
```

### In Utility Files (`apps/api/src/utils/`)

```typescript
import { prisma } from '../db/prisma.js';

export async function myUtilityFunction() {
  await prisma.auditLog.create({ /* ... */ });
}
```

### In Script Files (`apps/api/src/scripts/`)

```typescript
import { prisma } from '../db/prisma.js';

async function main() {
  // Use prisma here
  const users = await prisma.user.findMany();
  
  // Scripts can call $disconnect() at the end if needed
  await prisma.$disconnect();
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## ❌ Common Mistakes to Avoid

### ❌ Mistake 1: Creating New Instance

```typescript
// ❌ WRONG - Don't do this!
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

**Why it's wrong:**
- Creates a separate connection pool
- Wastes memory and database connections
- Violates singleton pattern

### ❌ Mistake 2: Multiple Imports Creating Instances

```typescript
// ❌ WRONG - Each file should NOT have its own instance
// File 1
const prisma = new PrismaClient();

// File 2
const prisma = new PrismaClient(); // ❌ Creates second instance!
```

### ❌ Mistake 3: Calling `$disconnect()` in Route Handlers

```typescript
// ❌ WRONG - Don't disconnect in routes
export const myRouter = Router();
myRouter.get('/example', async (req, res) => {
  const data = await prisma.user.findMany();
  await prisma.$disconnect(); // ❌ Don't do this!
  res.json(data);
});
```

**Why it's wrong:**
- Disconnects the shared connection pool
- Breaks other concurrent requests
- The singleton handles lifecycle automatically

---

## 📍 Import Paths by File Location

### From Routes (`apps/api/src/routes/`)

```typescript
import { prisma } from '../db/prisma.js';
```

### From Services (`apps/api/src/services/`)

```typescript
import { prisma } from '../db/prisma.js';
```

### From Utils (`apps/api/src/utils/`)

```typescript
import { prisma } from '../db/prisma.js';
```

### From Scripts (`apps/api/src/scripts/`)

```typescript
import { prisma } from '../db/prisma.js';
```

### From Validation (`apps/api/src/validation/`)

```typescript
import { prisma } from '../db/prisma.js';
```

**Note:** The path `../db/prisma.js` works from any file in `apps/api/src/` because:
- All files are in `apps/api/src/` subdirectories
- The singleton is at `apps/api/src/db/prisma.ts`
- Relative path `../db/` goes up one level, then into `db/`

---

## 🔍 Finding the Singleton

**Location:** `apps/api/src/db/prisma.ts`

**What it does:**
- Creates a single `PrismaClient` instance
- Uses `globalThis` in development for hot-reload support
- Configures logging (query logging in dev, error logging in prod)
- Handles graceful shutdown on process termination
- Exports the singleton as `prisma`

---

## 🧪 Testing Your Changes

After modifying code that uses Prisma:

1. **Check for new instances:**
   ```bash
   grep -r "new PrismaClient" apps/api/src/
   ```
   Should only find the singleton file.

2. **Verify imports:**
   ```bash
   grep -r "from.*db/prisma" apps/api/src/ | wc -l
   ```
   Should find ~31 files importing from singleton.

3. **Run linter:**
   ```bash
   cd apps/api
   npm run lint
   ```

4. **Test functionality:**
   - Start the API server
   - Test endpoints that use database
   - Verify no connection errors

---

## 📚 Additional Resources

- **Full Implementation Plan**: See `docs/PRISMA_SINGLETON_REFACTOR_PLAN.md`
- **Architecture Details**: See `docs/ARCHITECTURE.md` (Database section)
- **Prisma Documentation**: https://www.prisma.io/docs/concepts/components/prisma-client

---

## 🚨 If You See Connection Errors

If you encounter connection pool exhaustion or "too many connections" errors:

1. **Check for rogue instances:**
   ```bash
   grep -r "new PrismaClient" apps/api/src/
   ```

2. **Verify singleton import:**
   ```bash
   grep -r "from.*db/prisma" apps/api/src/
   ```

3. **Check for `$disconnect()` calls in routes:**
   ```bash
   grep -r "\$disconnect" apps/api/src/routes/
   ```
   Should be empty (except possibly in error handlers, but avoid it).

4. **Restart the server:**
   - The singleton initializes on server start
   - Old instances might still be in memory

---

## ✅ Checklist for New Code

When adding new files that need database access:

- [ ] Import from `../db/prisma.js` (adjust path as needed)
- [ ] Use `prisma` directly (don't create new instance)
- [ ] Don't call `$disconnect()` in routes/services/utils
- [ ] Scripts can call `$disconnect()` at the end if needed
- [ ] Test that your code works with the singleton
- [ ] Verify no linter errors

---

**Last Updated:** 2026-01-09  
**Maintained By:** Backend Team
