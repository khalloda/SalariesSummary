# Deep Analysis: Personnel Sheet - SEPEmployees.xlsx

**Generated:** 2025-01-XX  
**Workbook:** SEPEmployees.xlsx  
**Sheet:** Personnel  
**Purpose:** HR Document Checklist and Asset Tracking

---

## Executive Summary

The Personnel sheet serves as a comprehensive HR document checklist and asset tracking system for all employees. It tracks the status of required documents, certificates, and company-provided assets for each employee, along with their employment status.

**Key Characteristics:**
- **Total Columns:** 16
- **Data Rows:** ~49 employees
- **Primary Purpose:** Document compliance tracking and asset management
- **Data Format:** Checklist-style with status indicators (X, √, Copy, Original, N/A)
- **Visual Formatting:** Color-coded rows (green for active, red/pink for resigned)

---

## Column Structure Analysis

### Column A: Employee ID/Code
- **Header:** "Employee ID/Code" or "ID"
- **Format:** Pattern "X-Y" (e.g., "1-1", "1-2", "2-1", "2-14")
- **Purpose:** Primary identifier linking to AllOffice sheet
- **Data Type:** String
- **Uniqueness:** Should be unique per employee
- **Example Values:** "1-1", "1-2", "2-1", "2-2", "2-3", "2-14", "2-16", "2-17", "2-20", "2-21", "2-22", "3-1", "3-2", "3-3", "3-5", "3-6", "3-8", "3-9", "3-10", "3-11", "3-12", "3-13", "3-14", "3-15", "3-16", "3-18", "3-19", "3-20", "3-23", "3-24", "3-25"
- **Relationship:** Links to `Employee.employeeCode` in database

### Column B: Name
- **Header:** "Name"
- **Format:** Full employee name in English
- **Purpose:** Employee identification
- **Data Type:** String
- **Example Values:** 
  - "Dr. Hani Salah Mohamed Sarie Eldin"
  - "Ms. Amira Mohamed Ali Sherif"
  - "Mohamed Abd El Aziz Abd El Hafez Mohamed"
  - "Mahmoud Shabaan Mahmoud Hassan"
  - "Habiba Mahmoud Samir Mahmoud Issa"
- **Relationship:** Links to `Employee.name` in database
- **Normalization:** Should use `normalizeEmployeeName()` for matching

### Column C: Criminal Record
- **Header:** "Criminal Record"
- **Format:** Status indicator
- **Values:** 
  - `'X'` - Missing/Not provided
  - `'√'` (checkmark) - Present/Provided
- **Purpose:** Track criminal background check status
- **Data Type:** String (Boolean-like)
- **Distribution:** Mix of X and √ across employees
- **Example Pattern:** 
  - Rows 2-7, 9, 11, 12: 'X'
  - Rows 8, 10, 13-16: '√'
- **Storage Recommendation:** Boolean field or enum ('Present', 'Missing', 'Not Required')

### Column D: Military Certificate
- **Header:** "Military Certificate"
- **Format:** Document status
- **Values:**
  - `"Copy"` - Copy provided
  - `"Original"` - Original document provided
  - `"N/A"` - Not applicable (likely for female employees or exempt)
  - `'X'` - Missing/Not provided
- **Purpose:** Track military service certificate status
- **Data Type:** String (Enum)
- **Distribution:** Mix of all values
- **Example Pattern:**
  - Rows 2, 4, 9, 10, 13: "Copy"
  - Rows 3, 6, 8, 16, 17: "N/A"
  - Rows 5, 7, 14, 15: "Original"
  - Rows 11, 12: 'X'
- **Storage Recommendation:** Enum field ('Copy', 'Original', 'N/A', 'Missing')

### Column E: ID Copy
- **Header:** "ID Copy"
- **Format:** Status indicator
- **Values:** 
  - `'√'` (checkmark) - Present/Provided
- **Purpose:** Track National ID copy status
- **Data Type:** String (Boolean-like)
- **Distribution:** All visible cells contain '√' (all employees have ID copy)
- **Storage Recommendation:** Boolean field (default: true if all have it)

### Column F: Education Certificate
- **Header:** "Education Certificate"
- **Format:** Document status
- **Values:**
  - `"Copy"` - Copy provided
  - `"Original"` - Original document provided
  - `'X'` - Missing/Not provided
- **Purpose:** Track education/graduation certificate status
- **Data Type:** String (Enum)
- **Distribution:** Mix of Copy, Original, and X
- **Example Pattern:**
  - Rows 2, 3, 4, 5, 9, 10, 11, 12: "Copy"
  - Row 6: 'X'
  - Rows 7, 8, 13-17: "Original"
- **Storage Recommendation:** Enum field ('Copy', 'Original', 'Missing')

### Column G: Birth Certificate
- **Header:** "Birth Certificate"
- **Format:** Document status
- **Values:**
  - `"Copy"` - Copy provided
  - `"Original"` - Original document provided
  - `'X'` - Missing/Not provided
- **Purpose:** Track birth certificate status
- **Data Type:** String (Enum)
- **Distribution:** Mix of Copy, Original, and X
- **Example Pattern:**
  - Rows 2, 3, 4, 9, 10, 11, 12: "Copy"
  - Row 6: 'X'
  - Rows 5, 7, 8, 13-17: "Original"
- **Storage Recommendation:** Enum field ('Copy', 'Original', 'Missing')

### Column H: Recommendation Letter
- **Header:** "Recommendation Letter"
- **Format:** Status indicator
- **Values:** 
  - `'X'` - Missing/Not provided
  - `'√'` (checkmark) - Present/Provided
- **Purpose:** Track recommendation/reference letter status
- **Data Type:** String (Boolean-like)
- **Distribution:** Mostly X, some √
- **Example Pattern:**
  - Rows 2-7, 9, 10, 12-15, 17: 'X'
  - Rows 8, 11, 16: '√'
- **Storage Recommendation:** Boolean field ('Present', 'Missing')

### Column I: Personal Photos
- **Header:** "Personal Photos"
- **Format:** Status indicator
- **Values:** 
  - `'X'` - Missing/Not provided
  - `'√'` (checkmark) - Present/Provided
- **Purpose:** Track personal photos submission status
- **Data Type:** String (Boolean-like)
- **Distribution:** Mix of X and √
- **Example Pattern:**
  - Rows 3, 4, 6-8, 9, 10, 11, 15-17: 'X'
  - Rows 2, 5, 12-14: '√'
- **Storage Recommendation:** Boolean field ('Present', 'Missing')

### Column J: Tax Card
- **Header:** "Tax Card"
- **Format:** Status indicator
- **Values:** 
  - `'X'` - Missing/Not provided
  - `'√'` (checkmark) - Present/Provided
- **Purpose:** Track tax card submission status
- **Data Type:** String (Boolean-like)
- **Distribution:** Mostly √, one X
- **Example Pattern:**
  - Rows 2-10, 12-17: '√'
  - Row 11: 'X'
- **Storage Recommendation:** Boolean field ('Present', 'Missing')

### Column K: Association ID
- **Header:** "Association ID"
- **Format:** Status indicator
- **Values:** 
  - `'X'` - Missing/Not provided
  - `'√'` (checkmark) - Present/Provided
- **Purpose:** Track professional association ID status (likely Bar Association)
- **Data Type:** String (Boolean-like)
- **Distribution:** Mostly √, one X
- **Example Pattern:**
  - Rows 2-10, 12-17: '√'
  - Row 11: 'X'
- **Storage Recommendation:** Boolean field ('Present', 'Missing')

### Column L: Form 6
- **Header:** "Form 6"
- **Format:** Status indicator
- **Values:** 
  - `"N/A"` - Not applicable
- **Purpose:** Track Form 6 status (appears to be not applicable for all)
- **Data Type:** String (Enum)
- **Distribution:** All cells contain "N/A"
- **Storage Recommendation:** Enum field ('N/A', 'Present', 'Missing') - Currently all N/A

### Column M: Laptop / PC / Tablet
- **Header:** "Laptop / PC / Tablet"
- **Format:** Asset type
- **Values:**
  - `"Laptop"` - Laptop provided
  - `"PC"` - Desktop PC provided
  - `"Tablet"` - Tablet provided (if applicable)
- **Purpose:** Track company-provided computing device
- **Data Type:** String (Enum)
- **Distribution:** Mix of Laptop and PC
- **Example Pattern:**
  - Rows 2-8, 11, 12, 14-17: "Laptop"
  - Rows 9, 10, 13: "PC"
- **Storage Recommendation:** Enum field ('Laptop', 'PC', 'Tablet', 'None')

### Column N: كعب العمل (Work Stub)
- **Header:** "كعب العمل" (Arabic: Work Stub)
- **Format:** Status indicator
- **Values:** 
  - `"N/A"` - Not applicable
- **Purpose:** Track work stub document status
- **Data Type:** String (Enum)
- **Distribution:** All cells contain "N/A"
- **Storage Recommendation:** Enum field ('N/A', 'Present', 'Missing') - Currently all N/A

### Column O: تاريخ بداية التأمين (Insurance Start Date)
- **Header:** "تاريخ بداية التأمين" (Arabic: Insurance Start Date)
- **Format:** Date or status
- **Values:**
  - `"N/A"` - Not applicable (most common)
  - Date format: `"1-Jan-21"` or similar date strings
- **Purpose:** Track social insurance start date
- **Data Type:** Date or String
- **Distribution:** Mostly "N/A", occasional dates
- **Example Pattern:**
  - Rows 2-10, 12-17: "N/A"
  - Row 11: "1-Jan-21" (January 1, 2021)
- **Storage Recommendation:** Date field (nullable) - Parse dates, store null for N/A
- **Date Parsing:** Handle formats like "1-Jan-21", "DD-Mon-YY", Excel serial dates

### Column P: Status
- **Header:** "Status"
- **Format:** Employment status
- **Values:**
  - `"Active"` - Currently employed
  - `"Resigned"` - No longer employed
- **Purpose:** Track current employment status
- **Data Type:** String (Enum)
- **Distribution:** Mix of Active and Resigned
- **Example Pattern:**
  - Rows 2-12, 17: "Active"
  - Rows 13-16: "Resigned"
- **Visual Indicator:** Rows with "Resigned" have light red/pink background
- **Storage Recommendation:** Enum field ('Active', 'Resigned') - Should match `Employee.status`
- **Relationship:** Should sync with `Employee.status` field

---

## Data Patterns and Observations

### Visual Formatting
- **Header Row:** Dark green background with white text
- **Active Employees:** Light green background rows
- **Resigned Employees:** Light red/pink background rows
- **Filter Dropdowns:** All header cells have filter dropdown arrows

### Data Completeness
- **ID Copy:** 100% complete (all have √)
- **Tax Card:** ~94% complete (one missing)
- **Association ID:** ~94% complete (one missing)
- **Form 6:** 100% N/A (not applicable for all)
- **Work Stub:** 100% N/A (not applicable for all)
- **Insurance Start Date:** Mostly N/A, one date provided
- **Other Documents:** Varying completion rates

### Status Distribution
- **Active:** Majority of employees
- **Resigned:** Smaller subset (rows 13-16 in sample)

### Document Status Patterns
- **Most Common:** "Copy" for certificates
- **Original Documents:** Less common, typically for newer employees or specific documents
- **Missing (X):** Varies by document type
- **N/A:** Used appropriately for non-applicable items (military certificate for females, Form 6, Work Stub)

---

## Data Type Mapping

| Column | Excel Type | Database Type | Nullable | Default | Notes |
|--------|-----------|---------------|----------|---------|-------|
| Employee ID/Code | String | String | No | - | Primary key, format "X-Y" |
| Name | String | String | No | - | Full name in English |
| Criminal Record | String (X/√) | Enum/Boolean | Yes | null | 'Present' or 'Missing' |
| Military Certificate | String | Enum | Yes | null | 'Copy', 'Original', 'N/A', 'Missing' |
| ID Copy | String (√) | Boolean | Yes | true | Most have it |
| Education Certificate | String | Enum | Yes | null | 'Copy', 'Original', 'Missing' |
| Birth Certificate | String | Enum | Yes | null | 'Copy', 'Original', 'Missing' |
| Recommendation Letter | String (X/√) | Boolean | Yes | null | 'Present' or 'Missing' |
| Personal Photos | String (X/√) | Boolean | Yes | null | 'Present' or 'Missing' |
| Tax Card | String (X/√) | Boolean | Yes | null | 'Present' or 'Missing' |
| Association ID | String (X/√) | Boolean | Yes | null | 'Present' or 'Missing' |
| Form 6 | String | Enum | Yes | 'N/A' | Currently all N/A |
| Laptop/PC/Tablet | String | Enum | Yes | null | 'Laptop', 'PC', 'Tablet', 'None' |
| Work Stub | String | Enum | Yes | 'N/A' | Currently all N/A |
| Insurance Start Date | Date/String | Date | Yes | null | Parse dates, null for N/A |
| Status | String | Enum | Yes | 'Active' | 'Active' or 'Resigned' |

---

## Relationships and Dependencies

### Primary Relationships
1. **Employee ID/Code → Employee.employeeCode**
   - One-to-one relationship
   - Primary linking field
   - Format: "X-Y" pattern

2. **Name → Employee.name**
   - Secondary linking field (fallback)
   - Requires name normalization for matching
   - Use `normalizeEmployeeName()` function

3. **Status → Employee.status**
   - Should be synchronized
   - Updates employee status if different

### Data Integrity Considerations
- **Employee Matching:** Must match by employeeCode first, then by normalized name
- **Status Sync:** Personnel status should update Employee.status if different
- **Document Completeness:** Can calculate compliance percentage per employee
- **Asset Tracking:** Laptop/PC/Tablet should be tracked separately from documents

---

## Import Strategy

### Current Implementation
The existing `personnel-import-service.ts` stores all personnel data as a JSON string in `Employee.personnelData` field. This is a flexible approach but has limitations:

**Pros:**
- Flexible schema (can add new fields without migration)
- Single field storage
- Easy to serialize/deserialize

**Cons:**
- Not queryable (can't filter by document status)
- No type safety
- Harder to generate reports
- Can't create indexes on specific fields

### Recommended Approach

#### Option 1: Dedicated PersonnelRecord Model (Recommended)
Create a separate `PersonnelRecord` model with dedicated fields:

```prisma
model PersonnelRecord {
  id                    String    @id @default(cuid())
  employeeId            String
  employee              Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  
  // Document Status Fields
  criminalRecord        String?   // 'Present', 'Missing'
  militaryCertificate   String?   // 'Copy', 'Original', 'N/A', 'Missing'
  idCopy                Boolean?  @default(true)
  educationCertificate  String?   // 'Copy', 'Original', 'Missing'
  birthCertificate      String?   // 'Copy', 'Original', 'Missing'
  recommendationLetter  Boolean?  // true = Present, false = Missing
  personalPhotos        Boolean?  // true = Present, false = Missing
  taxCard               Boolean?  // true = Present, false = Missing
  associationId         Boolean?  // true = Present, false = Missing
  form6                 String?  @default("N/A") // 'N/A', 'Present', 'Missing'
  
  // Asset Fields
  laptopPcTablet        String?   // 'Laptop', 'PC', 'Tablet', 'None'
  
  // Other Fields
  workStub              String?   @default("N/A") // 'N/A', 'Present', 'Missing'
  insuranceStartDate    DateTime?
  
  // Metadata
  importedAt            DateTime  @default(now())
  sourceFile            String?
  
  @@unique([employeeId])
  @@index([criminalRecord])
  @@index([militaryCertificate])
  @@index([laptopPcTablet])
  @@index([insuranceStartDate])
}
```

**Benefits:**
- Queryable fields (can filter by document status)
- Type safety
- Better reporting capabilities
- Can create indexes for performance
- Clear schema

#### Option 2: Extend Employee Model
Add all personnel fields directly to Employee model:

```prisma
model Employee {
  // ... existing fields ...
  
  // Personnel Document Fields
  criminalRecord        String?
  militaryCertificate   String?
  idCopy                Boolean?  @default(true)
  educationCertificate  String?
  birthCertificate      String?
  recommendationLetter  Boolean?
  personalPhotos        Boolean?
  taxCard               Boolean?
  associationId         Boolean?
  form6                 String?   @default("N/A")
  laptopPcTablet        String?
  workStub              String?    @default("N/A")
  insuranceStartDate    DateTime?
  
  // ... rest of fields ...
}
```

**Benefits:**
- Simpler (no separate table)
- Direct access from employee
- No joins needed

**Drawbacks:**
- Makes Employee model larger
- Mixes different concerns (basic info + HR documents)

#### Option 3: Hybrid Approach (Current + Enhanced)
Keep `personnelData` JSON field but add key fields to Employee model:

```prisma
model Employee {
  // ... existing fields ...
  
  // Key personnel fields for querying
  laptopPcTablet        String?
  insuranceStartDate    DateTime?
  criminalRecord        String?
  
  // Full data in JSON
  personnelData         String?   // JSON with all fields
  
  // ... rest of fields ...
}
```

**Benefits:**
- Queryable on important fields
- Flexible for additional fields
- Backward compatible

---

## Parsing Logic

### Value Parsing Functions

```typescript
// Parse status indicators (X, √)
function parseStatusIndicator(value: any): 'Present' | 'Missing' | null {
  if (!value) return null;
  const str = String(value).trim();
  if (str === '√' || str === '✓' || str.toLowerCase() === 'yes' || str.toLowerCase() === 'present') {
    return 'Present';
  }
  if (str === 'X' || str === '✗' || str.toLowerCase() === 'no' || str.toLowerCase() === 'missing') {
    return 'Missing';
  }
  return null;
}

// Parse document status (Copy, Original, N/A, X)
function parseDocumentStatus(value: any): 'Copy' | 'Original' | 'N/A' | 'Missing' | null {
  if (!value) return null;
  const str = String(value).trim().toUpperCase();
  if (str === 'COPY') return 'Copy';
  if (str === 'ORIGINAL') return 'Original';
  if (str === 'N/A' || str === 'NA' || str === 'NOT APPLICABLE') return 'N/A';
  if (str === 'X' || str === '✗') return 'Missing';
  return null;
}

// Parse asset type
function parseAssetType(value: any): 'Laptop' | 'PC' | 'Tablet' | 'None' | null {
  if (!value) return null;
  const str = String(value).trim().toUpperCase();
  if (str.includes('LAPTOP')) return 'Laptop';
  if (str === 'PC' || str.includes('DESKTOP')) return 'PC';
  if (str.includes('TABLET')) return 'Tablet';
  if (str === 'N/A' || str === 'NONE') return 'None';
  return null;
}

// Parse insurance start date
function parseInsuranceDate(value: any): Date | null {
  if (!value) return null;
  const str = String(value).trim().toUpperCase();
  if (str === 'N/A' || str === 'NA' || str === 'NOT APPLICABLE') return null;
  
  // Try parsing as date
  if (value instanceof Date) return value;
  
  // Try "DD-Mon-YY" format (e.g., "1-Jan-21")
  const dateMatch = String(value).match(/(\d+)-(\w+)-(\d+)/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const monthName = dateMatch[2];
    const year = parseInt(dateMatch[3]);
    const yearFull = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
    
    const monthMap: Record<string, number> = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    const month = monthMap[monthName.toLowerCase()];
    if (month !== undefined) {
      return new Date(yearFull, month, day);
    }
  }
  
  // Try standard date parsing
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) return parsed;
  
  return null;
}
```

---

## Integration Recommendations

### 1. Employee Details Page Integration

**Location:** `/employees/:id/details` (EmployeeDetail.tsx)

**Display Options:**

#### Option A: New "Personnel" Tab
Add a new tab alongside existing tabs:
- Basic Info
- Education
- IDs
- Address
- Contract
- Salary History
- **Personnel** (NEW)

**Content:**
- Document Checklist Section
  - Grid/Table showing all documents with status indicators
  - Color coding: Green for Present, Red for Missing, Gray for N/A
  - Icons: ✓ for Present, ✗ for Missing, - for N/A
- Asset Information Section
  - Laptop/PC/Tablet type
  - Insurance Start Date
- Compliance Summary
  - Percentage of documents completed
  - Missing documents list
  - Last updated date

#### Option B: Expand "Basic Info" Section
Add personnel information to existing Basic Info section:
- Document status indicators inline
- Asset information
- Compliance badge

#### Option C: Dedicated Personnel Card
Create a separate "Personnel Card" similar to Employee Card:
- Full document checklist
- Asset tracking
- Compliance metrics
- Exportable as PDF/XLSX

### 2. Reports Page Integration

**Location:** Reports section

**New Reports:**

#### Report 1: Document Compliance Report
- **Purpose:** Track document completion across all employees
- **Columns:**
  - Employee Name
  - Employee Code
  - Category
  - Each document column with status
  - Compliance Percentage
  - Missing Documents Count
- **Filters:**
  - By Category
  - By Compliance Level (e.g., < 80%, 80-90%, > 90%)
  - By Missing Document Type
- **Export:** PDF, XLSX, CSV

#### Report 2: Asset Inventory Report
- **Purpose:** Track company-provided assets
- **Columns:**
  - Employee Name
  - Employee Code
  - Category
  - Asset Type (Laptop/PC/Tablet)
  - Status (Active/Resigned)
- **Summary:**
  - Total Laptops
  - Total PCs
  - Total Tablets
  - By Category breakdown
- **Export:** PDF, XLSX, CSV

#### Report 3: Personnel Status Dashboard
- **Purpose:** Overview of personnel document status
- **Metrics:**
  - Overall compliance percentage
  - Documents by status (Present/Missing/N/A)
  - Most common missing documents
  - Compliance by category
  - Asset distribution
- **Charts:**
  - Pie chart: Document status distribution
  - Bar chart: Compliance by category
  - Bar chart: Asset type distribution
- **Export:** PDF, XLSX

### 3. Employee Card Report Integration

**Location:** Employee Card export (PDF/XLSX)

**Add Section:**
- **Personnel Information** section
  - Document Checklist (compact view)
  - Asset Information
  - Insurance Start Date

### 4. Dashboard Integration

**Location:** Main Dashboard

**New Widget:**
- **Personnel Compliance Widget**
  - Overall compliance percentage
  - Employees with missing documents count
  - Quick link to compliance report

---

## UI/UX Recommendations

### Visual Design
1. **Status Indicators:**
   - ✓ (Green) for Present/Complete
   - ✗ (Red) for Missing
   - - (Gray) for N/A
   - Use icons with tooltips

2. **Color Coding:**
   - Green background for complete rows
   - Yellow background for partial completion
   - Red background for missing critical documents

3. **Compliance Badge:**
   - Show percentage badge (e.g., "85% Complete")
   - Color-coded: Green (>90%), Yellow (70-90%), Red (<70%)

4. **Document Checklist UI:**
   - Checkbox-style interface
   - Grouped by document type
   - Expandable sections for details

### User Interactions
1. **Filtering:**
   - Filter by document status
   - Filter by compliance level
   - Filter by asset type

2. **Sorting:**
   - Sort by compliance percentage
   - Sort by missing documents count
   - Sort by asset type

3. **Actions:**
   - Mark documents as received
   - Update asset assignments
   - Export compliance reports
   - Send reminders for missing documents

---

## Data Validation Rules

1. **Employee Matching:**
   - Must match by employeeCode first
   - Fallback to normalized name matching
   - Log warnings for unmatched records

2. **Status Synchronization:**
   - Personnel Status should update Employee.status
   - If conflict, Personnel sheet takes precedence

3. **Required Fields:**
   - Employee ID/Code: Required
   - Name: Required
   - Status: Required (default: 'Active')

4. **Data Consistency:**
   - Validate date formats
   - Validate enum values
   - Handle special characters in names

---

## Migration Strategy

### Phase 1: Schema Update
1. Create `PersonnelRecord` model (if Option 1)
2. Or extend `Employee` model (if Option 2)
3. Run migration

### Phase 2: Import Service Update
1. Update `personnel-import-service.ts` to use new schema
2. Add parsing functions for all field types
3. Add validation and error handling
4. Test import with sample data

### Phase 3: Frontend Integration
1. Add Personnel tab/section to EmployeeDetail page
2. Create document checklist component
3. Add compliance calculations
4. Style with appropriate colors and icons

### Phase 4: Reports Integration
1. Create Document Compliance Report
2. Create Asset Inventory Report
3. Create Personnel Status Dashboard
4. Add export functionality

### Phase 5: Dashboard Widget
1. Add compliance widget to dashboard
2. Add quick links to reports
3. Add notifications for low compliance

---

## Testing Checklist

- [ ] Import Personnel sheet successfully
- [ ] Match employees by employeeCode
- [ ] Match employees by normalized name (fallback)
- [ ] Parse all document status values correctly
- [ ] Parse asset types correctly
- [ ] Parse insurance start dates correctly
- [ ] Handle N/A values appropriately
- [ ] Update Employee.status from Personnel status
- [ ] Display personnel data in EmployeeDetail page
- [ ] Calculate compliance percentages correctly
- [ ] Generate compliance reports
- [ ] Export reports in PDF/XLSX formats
- [ ] Filter and sort personnel data
- [ ] Handle edge cases (missing data, invalid formats)

---

## Next Steps

1. **Review and Decide:**
   - Choose schema approach (Option 1, 2, or 3)
   - Review UI/UX recommendations
   - Prioritize features

2. **Implementation:**
   - Update database schema
   - Update import service
   - Create frontend components
   - Create reports

3. **Testing:**
   - Test import functionality
   - Test UI display
   - Test report generation
   - Test edge cases

4. **Documentation:**
   - Update API documentation
   - Create user guide for personnel features
   - Document compliance calculations

---

## Questions for Discussion

1. **Schema Choice:** Which approach do you prefer?
   - Option 1: Separate PersonnelRecord model
   - Option 2: Extend Employee model
   - Option 3: Hybrid approach

2. **UI Location:** Where should personnel data be displayed?
   - New tab in EmployeeDetail page
   - Expand existing Basic Info section
   - Separate Personnel Card page

3. **Reporting Priority:** Which reports are most important?
   - Document Compliance Report
   - Asset Inventory Report
   - Personnel Status Dashboard

4. **Compliance Thresholds:** What compliance levels should trigger alerts?
   - < 70%: Critical
   - 70-90%: Warning
   - > 90%: Good

5. **Update Frequency:** How often should personnel data be updated?
   - Real-time (on import)
   - Manual update button
   - Scheduled sync

---

**End of Analysis**

