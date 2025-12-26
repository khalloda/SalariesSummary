# Documentation Index

This directory contains comprehensive documentation for the Salaries Summary application.

## Getting Started

- **[README.md](../README.md)**: Main project documentation with quick start guide
- **[USER_GUIDE.md](USER_GUIDE.md)**: Complete user guide for end users

## Technical Documentation

### Architecture & Design

- **[ARCHITECTURE.md](ARCHITECTURE.md)**: System architecture, technology stack, and design decisions
- **[DATA_PARSING.md](DATA_PARSING.md)**: Detailed explanation of Excel parsing logic
- **[EMPLOYEE_CATEGORIZATION.md](EMPLOYEE_CATEGORIZATION.md)**: How employee categorization works

### API & Development

- **[API.md](API.md)**: Complete API endpoint documentation
- **[DEPLOYMENT.md](DEPLOYMENT.md)**: Deployment guide for various environments

### Excel Schema

- **[COMPLETE_SCHEMA_MAPPING.md](COMPLETE_SCHEMA_MAPPING.md)**: Detailed Excel workbook schema mapping
- **[schema_discovery.md](schema_discovery.md)**: Initial schema discovery results
- **[deep_schema_analysis.md](deep_schema_analysis.md)**: Deep analysis of Excel structure and formulas

### Setup & Configuration

- **[XAMPP_SETUP.md](XAMPP_SETUP.md)**: XAMPP deployment instructions
- **[PASSWORD_PROTECTED_FILES.md](PASSWORD_PROTECTED_FILES.md)**: Handling password-protected Excel files

### Other

- **[assumptions.md](assumptions.md)**: Project assumptions and constraints

## Documentation by Role

### For End Users

1. Start with [USER_GUIDE.md](USER_GUIDE.md)
2. Reference [README.md](../README.md) for installation

### For Developers

1. Read [ARCHITECTURE.md](ARCHITECTURE.md) for system overview
2. Review [DATA_PARSING.md](DATA_PARSING.md) for parsing logic
3. Check [API.md](API.md) for API endpoints
4. See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment

### For System Administrators

1. Follow [DEPLOYMENT.md](DEPLOYMENT.md) for setup
2. Review [XAMPP_SETUP.md](XAMPP_SETUP.md) for XAMPP configuration
3. Check [PASSWORD_PROTECTED_FILES.md](PASSWORD_PROTECTED_FILES.md) for file handling

## Quick Reference

### Key Features

- ✅ Excel workbook import (12 months)
- ✅ Employee categorization (Partners, Lawyers, Admins, Consultants)
- ✅ Annual reports per employee
- ✅ Joiners/Leavers tracking
- ✅ Salary changes monitoring
- ✅ Multiple export formats (PDF, CSV, XLSX)
- ✅ Bilingual UI (Arabic/English with RTL)

### Important Notes

- Net values are read directly from Excel (column K), not calculated
- "Total Deduction" replaces "Gross Deductions" in exports
- Rows with "Spare" or "اجمالي" are automatically skipped
- Employee categories are determined by position in workbook

## Version History

- **v1.0.0** (2025-12-26): Initial complete implementation
  - Employee categorization
  - Data parsing fixes
  - Comprehensive documentation

## Contributing

When adding new features:
1. Update relevant documentation
2. Add API documentation if new endpoints
3. Update USER_GUIDE.md for user-facing features
4. Update this index if new docs are created

