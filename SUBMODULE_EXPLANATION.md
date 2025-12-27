# Why `excel-reader-mcp` Shows "Submodule changes" Message

## What is a Git Submodule?

A **Git submodule** is a separate Git repository that is embedded inside another Git repository. It allows you to:
- Include external projects as dependencies
- Keep them in separate repositories
- Track a specific commit/version of the submodule

## Why You See This Message

The message appears because:

1. **`excel-reader-mcp` is a Git submodule** (not a regular directory)
   - It's tracked as a submodule in your main repository
   - It has its own separate Git repository inside it

2. **The submodule has uncommitted changes**
   - Inside `excel-reader-mcp`, the file `package-lock.json` has been modified
   - These changes are **inside the submodule**, not in your main repository

3. **Git's submodule workflow requires two commits:**
   - **First:** Commit changes **inside the submodule** (`excel-reader-mcp`)
   - **Then:** Commit the submodule reference update in your **main repository**

## Current Situation

```
Main Repository (SalariesSummary)
├── Your files ✅
└── excel-reader-mcp (submodule)
    └── package-lock.json (modified) ⚠️ Needs commit inside submodule
```

## How to Fix It

### Option 1: Commit the changes inside the submodule

```bash
# Navigate to the submodule
cd excel-reader-mcp

# Check what changed
git status

# Add and commit the changes
git add package-lock.json
git commit -m "Update package-lock.json"

# Push if needed (if submodule has remote)
git push
```

### Option 2: Discard the changes (if not needed)

```bash
# Navigate to the submodule
cd excel-reader-mcp

# Discard the changes
git restore package-lock.json
```

### After fixing inside the submodule:

```bash
# Go back to main repository
cd ..

# The submodule status should now be clean
git status
```

## Why This Design?

Git submodules work this way because:
- **Separation of concerns:** Each repository manages its own changes
- **Version control:** The main repo tracks a specific commit of the submodule
- **Independence:** Submodule can be updated independently

## What Happens If You Don't Fix It?

- The main repository will show the submodule as "modified"
- You can't commit the submodule reference until changes inside are committed
- This is **normal behavior** - not an error, just a workflow requirement

---

**In Summary:**
The message appears because `excel-reader-mcp` is a submodule with uncommitted changes (`package-lock.json`). You need to commit those changes inside the submodule first, then you can update the submodule reference in your main repository.

