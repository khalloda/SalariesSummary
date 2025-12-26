# API Documentation

## Base URL

- Development: `http://localhost:3001`
- Production: `http://salaries.local` (XAMPP)

## Endpoints

### Health Check

**GET** `/api/health`

Check if the API server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-26T08:00:00.000Z"
}
```

---

### Import

#### Import All Workbooks

**POST** `/api/import`

Import all Excel workbooks from the `./Sheets/` directory.

**Response:**
```json
{
  "success": true,
  "filesProcessed": 12,
  "recordsImported": 144,
  "errors": []
}
```

**Error Response:**
```json
{
  "success": false,
  "filesProcessed": 5,
  "recordsImported": 60,
  "errors": [
    "Error parsing workbook: Sheet not found"
  ]
}
```

#### Clear Database

**DELETE** `/api/import/clear`

Clear all imported data (employees, salary records, import logs).

**Response:**
```json
{
  "success": true,
  "message": "Database cleared successfully",
  "deleted": {
    "salaryRecords": 144,
    "employees": 12,
    "importLogs": 12
  }
}
```

---

### Employees

#### List All Employees

**GET** `/api/employees`

Get a list of all employees with their record counts.

**Response:**
```json
[
  {
    "id": "cmjlfthr600mcp7ep2lihgwms",
    "name": "أ/ أحمد سعيد أحمد محمد على",
    "normalizedName": "أ/ أحمد سعيد أحمد محمد على",
    "category": "Lawyers/محامين",
    "employeeCode": null,
    "notes": null,
    "createdAt": "2025-12-26T08:00:00.000Z",
    "updatedAt": "2025-12-26T08:00:00.000Z",
    "_count": {
      "salaries": 12
    }
  }
]
```

#### Get Employee Details

**GET** `/api/employees/:id`

Get detailed information about a specific employee.

**Response:**
```json
{
  "id": "cmjlfthr600mcp7ep2lihgwms",
  "name": "أ/ أحمد سعيد أحمد محمد على",
  "normalizedName": "أ/ أحمد سعيد أحمد محمد على",
  "category": "Lawyers/محامين",
  "salaries": [
    {
      "id": "...",
      "year": 2025,
      "month": 1,
      "monthName": "January",
      "basicSalary": 500000,
      "gross": 660476,
      "net": 495817,
      ...
    }
  ]
}
```

#### Get Employee Annual Report

**GET** `/api/employees/:id/annual?year=2025`

Get annual report data for a specific employee and year.

**Query Parameters:**
- `year` (optional): Year (defaults to current year)

**Response:**
```json
{
  "employee": {
    "id": "...",
    "name": "...",
    "category": "Lawyers/محامين"
  },
  "year": 2025,
  "monthlyData": [
    {
      "month": 1,
      "monthName": "January",
      "basicSalary": 500000,
      "directAdditions": 700,
      "indirectAdditions": 159776,
      "yearlyIncrease": 0,
      "bonuses": 0,
      "salaryDeductions": 4183,
      "grossDeductions": 0,
      "gross": 660476,
      "net": 495817,
      "additionsBreakdown": "{\"phoneAllowance\": 0, ...}",
      "deductionsBreakdown": "{\"otherBankWithdrawal\": 4183, ...}"
    }
  ],
  "totals": {
    "basicSalary": 6000000,
    "directAdditions": 8400,
    "indirectAdditions": 1917312,
    "yearlyIncrease": 0,
    "bonuses": 0,
    "salaryDeductions": 50196,
    "grossDeductions": 0,
    "gross": 7925712,
    "net": 5949816
  },
  "additionsByCategory": {
    "phoneAllowance": 0,
    "transportationAllowance": 700,
    ...
  },
  "deductionsByCategory": {
    "otherBankWithdrawal": 4183,
    ...
  },
  "missingMonths": []
}
```

---

### Reports

#### Joiners/Leavers Report

**GET** `/api/reports/joiners-leavers?year=2025`

Get a report of employees who joined or left during the year.

**Query Parameters:**
- `year` (optional): Year (defaults to current year)

**Response:**
```json
{
  "year": 2025,
  "joiners": [
    {
      "employee": {
        "id": "...",
        "name": "...",
        "category": "Lawyers/محامين"
      },
      "firstMonth": 3,
      "firstMonthName": "March"
    }
  ],
  "leavers": [
    {
      "employee": {
        "id": "...",
        "name": "...",
        "category": "Admins/عاملين"
      },
      "lastMonth": 10,
      "lastMonthName": "October"
    }
  ],
  "summary": {
    "totalJoiners": 5,
    "totalLeavers": 2,
    "netChange": 3
  }
}
```

#### Salary Changes Report

**GET** `/api/reports/salary-changes?year=2025`

Get a report of salary changes (Basic Salary only) across months.

**Query Parameters:**
- `year` (optional): Year (defaults to current year)

**Response:**
```json
{
  "year": 2025,
  "changes": [
    {
      "employee": {
        "id": "...",
        "name": "...",
        "category": "Lawyers/محامين"
      },
      "month": 6,
      "monthName": "June",
      "previousBasicSalary": 500000,
      "newBasicSalary": 550000,
      "change": 50000
    }
  ],
  "totals": {
    "previousBasicSalary": 5000000,
    "newBasicSalary": 5500000,
    "change": 500000
  }
}
```

---

### Exports

#### Export Employee Annual Report

**GET** `/api/exports/employee/:id/annual?year=2025&format=pdf`

Export an employee's annual report in various formats.

**Path Parameters:**
- `id`: Employee ID

**Query Parameters:**
- `year` (optional): Year (defaults to current year)
- `format`: Export format (`pdf`, `csv`, or `xlsx`)

**Response:**
- PDF: Binary PDF file
- CSV: Text CSV file with UTF-8 BOM
- XLSX: Binary Excel workbook

**Headers:**
- `Content-Type`: `application/pdf`, `text/csv`, or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition`: `attachment; filename="..."`

---

## Error Responses

All endpoints may return error responses:

**400 Bad Request:**
```json
{
  "error": "Invalid year parameter"
}
```

**404 Not Found:**
```json
{
  "error": "Employee not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "stack": "..." // Only in development
}
```

---

## CORS Configuration

The API allows requests from:
- `http://localhost:3000`
- `http://salaries.local`
- `http://www.salaries.local`

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding for production use.

---

## Authentication

Currently no authentication is implemented. Consider adding for production use.

