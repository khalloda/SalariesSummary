# Bonus First/Second Half Visibility Configuration

This document explains how to control the visibility of bonus first/second half columns in the SalariesSummary application.

## Overview

The application supports showing or hiding the "First Half" and "Second Half" bonus columns across all bonus-related pages, reports, and exports. This is controlled by a server-side configuration file.

**Default State**: OFF (halves are hidden by default)

## Configuration File

The configuration is stored in: `apps/api/config.json`

```json
{
  "bonus": {
    "showHalves": false
  }
}
```

## How to Toggle

### Method 1: Edit Config File (Recommended)

1. Open `apps/api/config.json`
2. Change `"showHalves": false` to `"showHalves": true` (or vice versa)
3. Save the file
4. The change takes effect immediately (no server restart needed)

### Method 2: API Endpoint

You can also toggle via API:

**Get current state:**
```bash
GET http://localhost:3001/api/config/bonus-halves
```

**Set state:**
```bash
POST http://localhost:3001/api/config/bonus-halves
Content-Type: application/json

{
  "showHalves": true
}
```

## What Gets Hidden/Shown

When `showHalves` is `false` (default):
- ✅ **Total Bonus** column is always shown
- ❌ **First Half** column is hidden
- ❌ **Second Half** column is hidden
- ✅ All other columns remain visible

When `showHalves` is `true`:
- ✅ **Total Bonus** column is shown
- ✅ **First Half** column is shown
- ✅ **Second Half** column is shown
- ✅ All other columns remain visible

## Affected Pages

The configuration affects the following pages:

1. **Annual Bonus Report** (`/reports/annual-bonus`)
   - Consolidated view table
   - Individual view tables
   - Grand totals table
   - PDF exports
   - XLSX exports

2. **Employee Bonus Page** (`/employees/:id/bonus`)
   - Bonus breakdown table
   - Year-over-year comparison
   - Historical trend charts
   - Historical data table
   - Comparison data tables

3. **Export Functions**
   - PDF exports (Annual Bonus Report)
   - XLSX exports (Annual Bonus Report)

## Backend Behavior

**Important**: The backend always processes and stores first/second half data. The configuration only controls **visibility** in the frontend and exports. The data remains intact in the database.

## Persistence

- The configuration is stored in `config.json` on the server
- Changes persist across server restarts
- All users see the same state (server-side configuration)
- No browser-specific settings

## Technical Details

- **Config Location**: `apps/api/config.json`
- **Config Utility**: `apps/api/src/utils/config.ts`
- **API Endpoint**: `/api/config/bonus-halves`
- **Frontend Hook**: `apps/web/src/hooks/useBonusHalfSwitch.ts`
- **Caching**: Config is cached and auto-reloads when file changes

## Example Usage

### Enable Halves Visibility

1. Edit `apps/api/config.json`:
   ```json
   {
     "bonus": {
       "showHalves": true
     }
   }
   ```

2. Refresh any bonus page in the browser
3. First/Second Half columns will now appear

### Disable Halves Visibility

1. Edit `apps/api/config.json`:
   ```json
   {
     "bonus": {
       "showHalves": false
     }
   }
   ```

2. Refresh any bonus page in the browser
3. First/Second Half columns will be hidden

## Notes

- The configuration file is automatically created with default values if it doesn't exist
- The config is cached for performance but auto-reloads when the file is modified
- If the config file is missing or invalid, the system defaults to `false` (halves hidden)
- The backend continues to process and store first/second half data regardless of the setting

---

**Last Updated**: 2024
**Default State**: `showHalves: false` (halves hidden)

