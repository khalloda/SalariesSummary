# Changelog

All notable changes to the Salaries Summary application will be documented in this file.

## [1.1.0] - 2025-12-26

### Added
- **Multi-Year Comparison**: Compare employee salary data across multiple years
  - Year-over-year totals chart (Line chart)
  - Monthly trend chart across all years
  - Year-over-year comparison table with two modes:
    - Selectable Metric: Choose one metric (Basic Salary, Gross, or Net) to show change and % change
    - Show All Metrics: Display change and % change for all three metrics side by side
  - Year-over-year bar chart
- **Month-to-Month Comparison**: Compare any two specific months from the same or different years
  - Flexible month selection (any month from any year)
  - Same comparison modes as multi-year (Selectable Metric vs Show All Metrics)
  - Color-coded changes (green for increases, red for decreases)
- **Category Totals Page**: New page showing aggregated totals by employee category
  - Totals for Partners, Lawyers, Admins, and Consultants
  - Employee count per category
  - Interactive charts (Bar, Pie, Line) with selectable metrics
  - Grand totals row
- **Enhanced Employee Annual Report**:
  - Multiple tabs: Summary, Details, Charts, Multi-Year Comparison, Month-to-Month Comparison
  - Interactive charts with print support
  - Detailed breakdowns of additions and deductions
- **Duplicate Employee Detection and Merging**:
  - Improved employee name normalization with Unicode-aware regex
  - Handles Arabic prefixes (أ/, د/) with or without spaces
  - Merge duplicates feature in Dashboard
  - Automatic detection and safe merging of duplicate employees
- **Improved Normalization**:
  - Better handling of Arabic prefixes with spaces
  - Normalizes all whitespace (multiple spaces to single space)
  - Prevents future duplicates during import

### Improved
- Employee name normalization now handles variations like "أ/ " vs "أ/"
- Better error handling for duplicate employees
- Enhanced comparison tables with percentage calculations
- Print-optimized charts and reports

### Fixed
- Fixed duplicate employee issue when importing data from different years
- Improved normalization to handle space variations in Arabic prefixes

## [1.0.0] - 2025-12-26

### Added
- Initial complete implementation
- Excel workbook import (12 months)
- Employee categorization (Partners, Lawyers, Admins, Consultants)
- Annual reports per employee
- Joiners/Leavers tracking
- Salary changes monitoring
- Multiple export formats (PDF, CSV, XLSX)
- Bilingual UI (Arabic/English with RTL)
- Employee filtering and search
- Data parsing fixes
- Comprehensive documentation

