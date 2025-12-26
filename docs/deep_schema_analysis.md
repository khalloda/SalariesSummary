# Excel Workbook Deep Schema Analysis

Generated: 2025-12-25T13:34:14.159Z

This document provides a comprehensive analysis of the Excel workbook structures, formulas, and data mappings.

## Overview

Total files analyzed: 4

## Files by Month

- Month 1: 01 - Jan Salaries 2025.xlsx
- Month 6: 06- June Salaries 2025.xlsx
- Month 10: 10- Oct Salaries 2025.xlsx
- Month 12: 12- Dec Salaries 2025.xlsx

## 01 - Jan Salaries 2025.xlsx

### Sheet: مرتبات

**Dimensions:** A1:P127

**Header Row:** Index 2

#### Column Mapping

| Index | Header | Data Type | Sample Values |
|-------|--------|-----------|---------------|
| 0 | م | number_string | 1, 2, 3 |
| 1 | الاسماء / Name | string | د/هانى صلاح الدين مح..., أ/أميرة محمد على شري..., أ/إيهاب حمدى ابراهيم |
| 3 | صافي الاتعاب والمرتبات / Salary | number_string | 0, 500000, 120000 |
| 4 | إضافات غير مباشرة / In direct additions | number_string | 1422, 159776, 36049 |
| 5 | إضافات مباشرة / Direct Additions | number_string | 0, 700, 350 |
| 6 | زيادة سنوية / Yearly Increase | number_string | 0 |
| 7 | علاوات / Bouns | number_string | 0 |
| 8 | خصومات / Deductions | number_string | 0, 4183, 1587.5 |
| 9 | الإجمالي قبل الخصم
GROSS | number_string | 1422, 660476, 156399 |
| 10 | الصافى بعد الخصم
 أو الزيادة
NET | number_string | 0, 495817, 118412.5 |
| 12 | طريقة الدفع | unknown |  |
| 13 | رقم الحساب | unknown |  |
| 14 | ملحوظات | unknown |  |

#### Formulas

| Address | Formula | Value |
|---------|---------|-------|
| E4 | `HYPERLINK(اضافات!N4)` | 1422 |
| F4 | `HYPERLINK(اضافات!M4)` | 0 |
| G4 | `HYPERLINK(اضافات!F4)` | 0 |
| H4 | `HYPERLINK(اضافات!O4)` | 0 |
| I4 | `HYPERLINK(خصومات!L4)` | 0 |
| J4 | `SUM(D4,VALUE(E4),VALUE(F4),VALUE(G4))` | 1422 |
| K4 | `VALUE(D4)+VALUE(G4)+VALUE(H4)-VALUE(I4)` | 0 |
| E5 | `HYPERLINK(اضافات!N5)` | 159776 |
| F5 | `HYPERLINK(اضافات!M5)` | 700 |
| G5 | `HYPERLINK(اضافات!F5)` | 0 |
| H5 | `HYPERLINK(اضافات!O5)` | 0 |
| I5 | `HYPERLINK(خصومات!L5)` | 4183 |
| J5 | `SUM(D5,VALUE(E5),VALUE(F5),VALUE(G5))` | 660476 |
| K5 | `VALUE(D5)+VALUE(G5)+VALUE(H5)-VALUE(I5)` | 495817 |
| E6 | `HYPERLINK(اضافات!N6)` | 36049 |
| F6 | `HYPERLINK(اضافات!M6)` | 350 |
| G6 | `HYPERLINK(اضافات!F6)` | 0 |
| H6 | `HYPERLINK(اضافات!O6)` | 0 |
| I6 | `HYPERLINK(خصومات!L6)` | 1587.5 |
| J6 | `SUM(D6,VALUE(E6),VALUE(F6),VALUE(G6))` | 156399 |

#### Sample Data

**Row 3:**

```json
{
  "م": "1",
  "الاسماء / Name": "د/هانى صلاح الدين محمد سري الدين",
  "صافي الاتعاب والمرتبات / Salary": "0",
  "إضافات غير مباشرة / In direct additions": "1422",
  "إضافات مباشرة / Direct Additions": "0",
  "زيادة سنوية / Yearly Increase": "0",
  "علاوات / Bouns": "0",
  "خصومات / Deductions": "0",
  "الإجمالي قبل الخصم\r\nGROSS": "1422",
  "الصافى بعد الخصم\r\n أو الزيادة\r\nNET": "0"
}
```

**Row 4:**

```json
{
  "م": "2",
  "الاسماء / Name": "أ/أميرة محمد على شريف",
  "صافي الاتعاب والمرتبات / Salary": "500000",
  "إضافات غير مباشرة / In direct additions": "159776",
  "إضافات مباشرة / Direct Additions": "700",
  "زيادة سنوية / Yearly Increase": "0",
  "علاوات / Bouns": "0",
  "خصومات / Deductions": "4183",
  "الإجمالي قبل الخصم\r\nGROSS": "660476",
  "الصافى بعد الخصم\r\n أو الزيادة\r\nNET": "495817"
}
```

**Row 5:**

```json
{
  "م": "3",
  "الاسماء / Name": "أ/إيهاب حمدى ابراهيم",
  "صافي الاتعاب والمرتبات / Salary": "120000",
  "إضافات غير مباشرة / In direct additions": "36049",
  "إضافات مباشرة / Direct Additions": "350",
  "زيادة سنوية / Yearly Increase": "0",
  "علاوات / Bouns": "0",
  "خصومات / Deductions": "1587.5",
  "الإجمالي قبل الخصم\r\nGROSS": "156399",
  "الصافى بعد الخصم\r\n أو الزيادة\r\nNET": "118412.5"
}
```

### Sheet: اضافات

**Dimensions:** A1:Q118

**Header Row:** Index 1

**Merged Cells:** 1 ranges

- A1:B1

#### Column Mapping

| Index | Header | Data Type | Sample Values |
|-------|--------|-----------|---------------|
| 0 | # | number_string | 1, 2, 3 |
| 1 | شهر يناير 2025 | string | شركاء, د/هانى صلاح الدين مح..., أ/أميرة محمد على شري... |
| 2 | بدلات تليفون / Phone Allowance | number_string | 0, 700, 350 |
| 3 | بدلات انتقال / Transportation Allowance | number_string | 0 |
| 4 | بدل سكن / Accommodation Allowance | number_string | 0 |
| 5 | زيادة سنوية / Yearly Increase | number_string | 0 |
| 6 | مكافئات سنوية / Annual Bonus | number_string | 0 |
| 7 | مكافئات شهرية / Monthly Bonus | number_string | 0 |
| 8 | قيمة التأمين الإجتماعي الممنوح / Given Social Insurance | number_string | 0 |
| 9 | ضرائب إداريين/محامين / Taxs | number_string | 0, 158904, 35461 |
| 10 | قيمة التأمين الصحي الممنوح \ Given Medical Insurance | number_string | 1422, 872, 588 |
| 11 | بدلات اخري / Allowances | number_string | 0 |
| 12 | اجمالي إضافات مباشرة / Total Direct Allownces | number_string | 0, 700, 350 |
| 13 | اجمالي إضافات غير مباشرة / Total InDirect Allownces | number_string | 1422, 159776, 36049 |
| 14 | اجمالي علاوات / Total Bouns | number_string | 0 |

#### Formulas

| Address | Formula | Value |
|---------|---------|-------|
| A4 | `مرتبات!A4` | 1 |
| B4 | `مرتبات!B4` | د/هانى صلاح الدين محمد سري الدين |
| M4 | `SUM(C4:E4)+L4` | 0 |
| N4 | `SUM(I4:K4)` | 1422 |
| O4 | `SUM(G4:H4)` | 0 |
| P4 | `SUM(M4:O4)` | 1422 |
| A5 | `مرتبات!A5` | 2 |
| B5 | `مرتبات!B5` | أ/أميرة محمد على شريف |
| M5 | `SUM(C5:E5)+L5` | 700 |
| N5 | `SUM(I5:K5)` | 159776 |
| O5 | `SUM(G5:H5)` | 0 |
| P5 | `SUM(M5:O5)` | 160476 |
| A6 | `مرتبات!A6` | 3 |
| B6 | `مرتبات!B6` | أ/إيهاب حمدى ابراهيم |
| M6 | `SUM(C6:E6)+L6` | 350 |
| N6 | `SUM(I6:K6)` | 36049 |
| O6 | `SUM(G6:H6)` | 0 |
| P6 | `SUM(M6:O6)` | 36399 |
| A7 | `مرتبات!A7` | 0 |
| B7 | `مرتبات!B7` | Spare |

#### Sample Data

**Row 2:**

```json
{
  "شهر يناير 2025": "شركاء"
}
```

**Row 3:**

```json
{
  "#": "1",
  "شهر يناير 2025": "د/هانى صلاح الدين محمد سري الدين",
  "بدلات تليفون / Phone Allowance": "0",
  "بدلات انتقال / Transportation Allowance": "0",
  "بدل سكن / Accommodation Allowance": "0",
  "زيادة سنوية / Yearly Increase": "0",
  "مكافئات سنوية / Annual Bonus": "0",
  "مكافئات شهرية / Monthly Bonus": "0",
  "قيمة التأمين الإجتماعي الممنوح / Given Social Insurance": "0",
  "ضرائب إداريين/محامين / Taxs": "0",
  "قيمة التأمين الصحي الممنوح \\ Given Medical Insurance": "1422",
  "بدلات اخري / Allowances": "0",
  "اجمالي إضافات مباشرة / Total Direct Allownces": "0",
  "اجمالي إضافات غير مباشرة / Total InDirect Allownces": "1422",
  "اجمالي علاوات / Total Bouns": "0"
}
```

**Row 4:**

```json
{
  "#": "2",
  "شهر يناير 2025": "أ/أميرة محمد على شريف",
  "بدلات تليفون / Phone Allowance": "700",
  "بدلات انتقال / Transportation Allowance": "0",
  "بدل سكن / Accommodation Allowance": "0",
  "زيادة سنوية / Yearly Increase": "0",
  "مكافئات سنوية / Annual Bonus": "0",
  "مكافئات شهرية / Monthly Bonus": "0",
  "قيمة التأمين الإجتماعي الممنوح / Given Social Insurance": "0",
  "ضرائب إداريين/محامين / Taxs": "158904",
  "قيمة التأمين الصحي الممنوح \\ Given Medical Insurance": "872",
  "بدلات اخري / Allowances": "0",
  "اجمالي إضافات مباشرة / Total Direct Allownces": "700",
  "اجمالي إضافات غير مباشرة / Total InDirect Allownces": "159776",
  "اجمالي علاوات / Total Bouns": "0"
}
```

### Sheet: خصومات

**Dimensions:** A1:M188

**Header Row:** Index Not found

#### Column Mapping

| Index | Header | Data Type | Sample Values |
|-------|--------|-----------|---------------|

#### Formulas

| Address | Formula | Value |
|---------|---------|-------|
| A4 | `مرتبات!A4` | 1 |
| B4 | `مرتبات!B4` | د/هانى صلاح الدين محمد سري الدين |
| L4 | `SUM(C4:K4)` | 0 |
| A5 | `مرتبات!A5` | 2 |
| B5 | `مرتبات!B5` | أ/أميرة محمد على شريف |
| L5 | `SUM(C5:K5)` | 4183 |
| A6 | `مرتبات!A6` | 3 |
| B6 | `مرتبات!B6` | أ/إيهاب حمدى ابراهيم |
| L6 | `SUM(C6:K6)` | 1587.5 |
| A7 | `مرتبات!A7` | 0 |
| B7 | `مرتبات!B7` | Spare |
| L7 | `SUM(C7:K7)` | 0 |
| A8 | `مرتبات!A8` | 0 |
| B8 | `مرتبات!B8` | Spare |
| L8 | `SUM(C8:K8)` | 0 |
| A9 | `مرتبات!A9` | 0 |
| B9 | `مرتبات!B9` | Spare |
| L9 | `SUM(C9:K9)` | 0 |
| A10 | `مرتبات!A10` | 0 |
| B10 | `مرتبات!B10` | Spare |


---

## 06- June Salaries 2025.xlsx

### Sheet: مرتبات

**Dimensions:** A1:P127

**Header Row:** Index 2

#### Column Mapping

| Index | Header | Data Type | Sample Values |
|-------|--------|-----------|---------------|
| 0 | م | number_string | 1, 2, 3 |
| 1 | الاسماء / Name | string | د/هانى صلاح الدين مح..., أ/أميرة محمد على شري..., أ/إيهاب حمدى ابراهيم |
| 3 | صافي الاتعاب والمرتبات / Salary | number_string | 0, 500000, 120000 |
| 4 | إضافات غير مباشرة / In direct additions | number_string | 1422, 159776, 36051 |
| 5 | إضافات مباشرة / Direct Additions | number_string | 0, 1000, 475 |
| 6 | زيادة سنوية / Yearly Increase | number_string | 0 |
| 7 | علاوات / Bouns | number_string | 0 |
| 8 | خصومات / Deductions | number_string | 0, 17500, 612 |
| 9 | الإجمالي قبل الخصم
GROSS | number_string | 1422, 660776, 156526 |
| 10 | الصافى بعد الخصم
 أو الزيادة
NET | number_string | 0, 482500, 119388 |
| 12 | طريقة الدفع | unknown |  |
| 13 | رقم الحساب | unknown |  |
| 14 | ملحوظات | unknown |  |

#### Formulas

| Address | Formula | Value |
|---------|---------|-------|
| E4 | `HYPERLINK(اضافات!N4)` | 1422 |
| F4 | `HYPERLINK(اضافات!M4)` | 0 |
| G4 | `HYPERLINK(اضافات!F4)` | 0 |
| H4 | `HYPERLINK(اضافات!O4)` | 0 |
| I4 | `HYPERLINK(خصومات!L4)` | 0 |
| J4 | `SUM(D4,VALUE(E4),VALUE(F4),VALUE(G4))` | 1422 |
| K4 | `VALUE(D4)+VALUE(G4)+VALUE(H4)-VALUE(I4)` | 0 |
| E5 | `HYPERLINK(اضافات!N5)` | 159776 |
| F5 | `HYPERLINK(اضافات!M5)` | 1000 |
| G5 | `HYPERLINK(اضافات!F5)` | 0 |
| H5 | `HYPERLINK(اضافات!O5)` | 0 |
| I5 | `HYPERLINK(خصومات!L5)` | 17500 |
| J5 | `SUM(D5,VALUE(E5),VALUE(F5),VALUE(G5))` | 660776 |
| K5 | `VALUE(D5)+VALUE(G5)+VALUE(H5)-VALUE(I5)` | 482500 |
| E6 | `HYPERLINK(اضافات!N6)` | 36051 |
| F6 | `HYPERLINK(اضافات!M6)` | 475 |
| G6 | `HYPERLINK(اضافات!F6)` | 0 |
| H6 | `HYPERLINK(اضافات!O6)` | 0 |
| I6 | `HYPERLINK(خصومات!L6)` | 612 |
| J6 | `SUM(D6,VALUE(E6),VALUE(F6),VALUE(G6))` | 156526 |

#### Sample Data

**Row 3:**

```json
{
  "م": "1",
  "الاسماء / Name": "د/هانى صلاح الدين محمد سري الدين",
  "صافي الاتعاب والمرتبات / Salary": "0",
  "إضافات غير مباشرة / In direct additions": "1422",
  "إضافات مباشرة / Direct Additions": "0",
  "زيادة سنوية / Yearly Increase": "0",
  "علاوات / Bouns": "0",
  "خصومات / Deductions": "0",
  "الإجمالي قبل الخصم\r\nGROSS": "1422",
  "الصافى بعد الخصم\r\n أو الزيادة\r\nNET": "0"
}
```

**Row 4:**

```json
{
  "م": "2",
  "الاسماء / Name": "أ/أميرة محمد على شريف",
  "صافي الاتعاب والمرتبات / Salary": "500000",
  "إضافات غير مباشرة / In direct additions": "159776",
  "إضافات مباشرة / Direct Additions": "1000",
  "زيادة سنوية / Yearly Increase": "0",
  "علاوات / Bouns": "0",
  "خصومات / Deductions": "17500",
  "الإجمالي قبل الخصم\r\nGROSS": "660776",
  "الصافى بعد الخصم\r\n أو الزيادة\r\nNET": "482500"
}
```

**Row 5:**

```json
{
  "م": "3",
  "الاسماء / Name": "أ/إيهاب حمدى ابراهيم",
  "صافي الاتعاب والمرتبات / Salary": "120000",
  "إضافات غير مباشرة / In direct additions": "36051",
  "إضافات مباشرة / Direct Additions": "475",
  "زيادة سنوية / Yearly Increase": "0",
  "علاوات / Bouns": "0",
  "خصومات / Deductions": "612",
  "الإجمالي قبل الخصم\r\nGROSS": "156526",
  "الصافى بعد الخصم\r\n أو الزيادة\r\nNET": "119388"
}
```

### Sheet: اضافات

**Dimensions:** A1:Q118

**Header Row:** Index 1

**Merged Cells:** 1 ranges

- A1:B1

#### Column Mapping

| Index | Header | Data Type | Sample Values |
|-------|--------|-----------|---------------|
| 0 | # | number_string | 1, 2, 3 |
| 1 | شهر يونيو 2025 | string | شركاء, د/هانى صلاح الدين مح..., أ/أميرة محمد على شري... |
| 2 | بدلات تليفون / Phone Allowance | number_string | 0, 1000, 475 |
| 3 | بدلات انتقال / Transportation Allowance | number_string | 0 |
| 4 | بدل سكن / Accommodation Allowance | number_string | 0 |
| 5 | زيادة سنوية / Yearly Increase | number_string | 0 |
| 6 | مكافئات سنوية / Annual Bonus | number_string | 0 |
| 7 | مكافئات شهرية / Monthly Bonus | number_string | 0 |
| 8 | قيمة التأمين الإجتماعي الممنوح / Given Social Insurance | number_string | 0 |
| 9 | ضرائب إداريين/محامين / Taxs | number_string | 0, 158904, 35461 |
| 10 | قيمة التأمين الصحي الممنوح \ Given Medical Insurance | number_string | 1422, 872, 590 |
| 11 | بدلات اخري / Allowances | number_string | 0 |
| 12 | اجمالي إضافات مباشرة / Total Direct Allownces | number_string | 0, 1000, 475 |
| 13 | اجمالي إضافات غير مباشرة / Total InDirect Allownces | number_string | 1422, 159776, 36051 |
| 14 | اجمالي علاوات / Total Bouns | number_string | 0 |

#### Formulas

| Address | Formula | Value |
|---------|---------|-------|
| A4 | `مرتبات!A4` | 1 |
| B4 | `مرتبات!B4` | د/هانى صلاح الدين محمد سري الدين |
| M4 | `SUM(C4:E4)+L4` | 0 |
| N4 | `SUM(I4:K4)` | 1422 |
| O4 | `SUM(G4:H4)` | 0 |
| P4 | `SUM(M4:O4)` | 1422 |
| A5 | `مرتبات!A5` | 2 |
| B5 | `مرتبات!B5` | أ/أميرة محمد على شريف |
| M5 | `SUM(C5:E5)+L5` | 1000 |
| N5 | `SUM(I5:K5)` | 159776 |
| O5 | `SUM(G5:H5)` | 0 |
| P5 | `SUM(M5:O5)` | 160776 |
| A6 | `مرتبات!A6` | 3 |
| B6 | `مرتبات!B6` | أ/إيهاب حمدى ابراهيم |
| M6 | `SUM(C6:E6)+L6` | 475 |
| N6 | `SUM(I6:K6)` | 36051 |
| O6 | `SUM(G6:H6)` | 0 |
| P6 | `SUM(M6:O6)` | 36526 |
| A7 | `مرتبات!A7` | 0 |
| B7 | `مرتبات!B7` | Spare |

#### Sample Data

**Row 2:**

```json
{
  "شهر يونيو 2025": "شركاء"
}
```

**Row 3:**

```json
{
  "#": "1",
  "شهر يونيو 2025": "د/هانى صلاح الدين محمد سري الدين",
  "بدلات تليفون / Phone Allowance": "0",
  "بدلات انتقال / Transportation Allowance": "0",
  "بدل سكن / Accommodation Allowance": "0",
  "زيادة سنوية / Yearly Increase": "0",
  "مكافئات سنوية / Annual Bonus": "0",
  "مكافئات شهرية / Monthly Bonus": "0",
  "قيمة التأمين الإجتماعي الممنوح / Given Social Insurance": "0",
  "ضرائب إداريين/محامين / Taxs": "0",
  "قيمة التأمين الصحي الممنوح \\ Given Medical Insurance": "1422",
  "بدلات اخري / Allowances": "0",
  "اجمالي إضافات مباشرة / Total Direct Allownces": "0",
  "اجمالي إضافات غير مباشرة / Total InDirect Allownces": "1422",
  "اجمالي علاوات / Total Bouns": "0"
}
```

**Row 4:**

```json
{
  "#": "2",
  "شهر يونيو 2025": "أ/أميرة محمد على شريف",
  "بدلات تليفون / Phone Allowance": "1000",
  "بدلات انتقال / Transportation Allowance": "0",
  "بدل سكن / Accommodation Allowance": "0",
  "زيادة سنوية / Yearly Increase": "0",
  "مكافئات سنوية / Annual Bonus": "0",
  "مكافئات شهرية / Monthly Bonus": "0",
  "قيمة التأمين الإجتماعي الممنوح / Given Social Insurance": "0",
  "ضرائب إداريين/محامين / Taxs": "158904",
  "قيمة التأمين الصحي الممنوح \\ Given Medical Insurance": "872",
  "بدلات اخري / Allowances": "0",
  "اجمالي إضافات مباشرة / Total Direct Allownces": "1000",
  "اجمالي إضافات غير مباشرة / Total InDirect Allownces": "159776",
  "اجمالي علاوات / Total Bouns": "0"
}
```

### Sheet: خصومات

**Dimensions:** A1:M188

**Header Row:** Index Not found

#### Column Mapping

| Index | Header | Data Type | Sample Values |
|-------|--------|-----------|---------------|

#### Formulas

| Address | Formula | Value |
|---------|---------|-------|
| A4 | `مرتبات!A4` | 1 |
| B4 | `مرتبات!B4` | د/هانى صلاح الدين محمد سري الدين |
| L4 | `SUM(C4:K4)` | 0 |
| A5 | `مرتبات!A5` | 2 |
| B5 | `مرتبات!B5` | أ/أميرة محمد على شريف |
| L5 | `SUM(C5:K5)` | 17500 |
| A6 | `مرتبات!A6` | 3 |
| B6 | `مرتبات!B6` | أ/إيهاب حمدى ابراهيم |
| L6 | `SUM(C6:K6)` | 612 |
| A7 | `مرتبات!A7` | 0 |
| B7 | `مرتبات!B7` | Spare |
| L7 | `SUM(C7:K7)` | 0 |
| A8 | `مرتبات!A8` | 0 |
| B8 | `مرتبات!B8` | Spare |
| L8 | `SUM(C8:K8)` | 0 |
| A9 | `مرتبات!A9` | 0 |
| B9 | `مرتبات!B9` | Spare |
| L9 | `SUM(C9:K9)` | 0 |
| A10 | `مرتبات!A10` | 0 |
| B10 | `مرتبات!B10` | Spare |


---

## 10- Oct Salaries 2025.xlsx

### Sheet: مرتبات

**Dimensions:** A1:P127

**Header Row:** Index 2

#### Column Mapping

| Index | Header | Data Type | Sample Values |
|-------|--------|-----------|---------------|
| 0 | م | number_string | 1, 2, 3 |
| 1 | الاسماء / Name | string | د/هانى صلاح الدين مح..., أ/أميرة محمد على شري..., أ/إيهاب حمدى ابراهيم |
| 2 | - | unknown |  |
| 3 | صافي الاتعاب والمرتبات / Salary | number_string | 0, 500000, 120000 |
| 4 | إضافات غير مباشرة / In direct additions | number_string | 1422, 159776, 36051 |
| 5 | إضافات مباشرة / Direct Additions | number_string | 0, 1000, 475 |
| 6 | زيادة سنوية / Yearly Increase | number_string | 0 |
| 7 | علاوات / Bouns | number_string | 0 |
| 8 | خصومات / Deductions | number_string | 0, 573 |
| 9 | الإجمالي قبل الخصم
GROSS | number_string | 1422, 660776, 156526 |
| 10 | الصافى بعد الخصم
 أو الزيادة
NET | number_string | 0, 500000, 119427 |
| 12 | طريقة الدفع | unknown |  |
| 13 | رقم الحساب | unknown |  |
| 14 | ملحوظات | unknown |  |

#### Formulas

| Address | Formula | Value |
|---------|---------|-------|
| E4 | `HYPERLINK(اضافات!N4)` | 1422 |
| F4 | `HYPERLINK(اضافات!M4)` | 0 |
| G4 | `HYPERLINK(اضافات!F4)` | 0 |
| H4 | `HYPERLINK(اضافات!O4)` | 0 |
| I4 | `HYPERLINK(خصومات!L4)` | 0 |
| J4 | `SUM(D4,VALUE(E4),VALUE(F4),VALUE(G4))` | 1422 |
| K4 | `VALUE(D4)+VALUE(G4)+VALUE(H4)-VALUE(I4)` | 0 |
| E5 | `HYPERLINK(اضافات!N5)` | 159776 |
| F5 | `HYPERLINK(اضافات!M5)` | 1000 |
| G5 | `HYPERLINK(اضافات!F5)` | 0 |
| H5 | `HYPERLINK(اضافات!O5)` | 0 |
| I5 | `HYPERLINK(خصومات!L5)` | 0 |
| J5 | `SUM(D5,VALUE(E5),VALUE(F5),VALUE(G5))` | 660776 |
| K5 | `VALUE(D5)+VALUE(G5)+VALUE(H5)-VALUE(I5)` | 500000 |
| E6 | `HYPERLINK(اضافات!N6)` | 36051 |
| F6 | `HYPERLINK(اضافات!M6)` | 475 |
| G6 | `HYPERLINK(اضافات!F6)` | 0 |
| H6 | `HYPERLINK(اضافات!O6)` | 0 |
| I6 | `HYPERLINK(خصومات!L6)` | 573 |
| J6 | `SUM(D6,VALUE(E6),VALUE(F6),VALUE(G6))` | 156526 |

#### Sample Data

**Row 3:**

```json
{
  "م": "1",
  "الاسماء / Name": "د/هانى صلاح الدين محمد سري الدين",
  "صافي الاتعاب والمرتبات / Salary": "0",
  "إضافات غير مباشرة / In direct additions": "1422",
  "إضافات مباشرة / Direct Additions": "0",
  "زيادة سنوية / Yearly Increase": "0",
  "علاوات / Bouns": "0",
  "خصومات / Deductions": "0",
  "الإجمالي قبل الخصم\r\nGROSS": "1422",
  "الصافى بعد الخصم\r\n أو الزيادة\r\nNET": "0"
}
```

**Row 4:**

```json
{
  "م": "2",
  "الاسماء / Name": "أ/أميرة محمد على شريف",
  "صافي الاتعاب والمرتبات / Salary": "500000",
  "إضافات غير مباشرة / In direct additions": "159776",
  "إضافات مباشرة / Direct Additions": "1000",
  "زيادة سنوية / Yearly Increase": "0",
  "علاوات / Bouns": "0",
  "خصومات / Deductions": "0",
  "الإجمالي قبل الخصم\r\nGROSS": "660776",
  "الصافى بعد الخصم\r\n أو الزيادة\r\nNET": "500000"
}
```

**Row 5:**

```json
{
  "م": "3",
  "الاسماء / Name": "أ/إيهاب حمدى ابراهيم",
  "صافي الاتعاب والمرتبات / Salary": "120000",
  "إضافات غير مباشرة / In direct additions": "36051",
  "إضافات مباشرة / Direct Additions": "475",
  "زيادة سنوية / Yearly Increase": "0",
  "علاوات / Bouns": "0",
  "خصومات / Deductions": "573",
  "الإجمالي قبل الخصم\r\nGROSS": "156526",
  "الصافى بعد الخصم\r\n أو الزيادة\r\nNET": "119427"
}
```

### Sheet: اضافات

**Dimensions:** A1:Q118

**Header Row:** Index 1

**Merged Cells:** 1 ranges

- A1:B1

#### Column Mapping

| Index | Header | Data Type | Sample Values |
|-------|--------|-----------|---------------|
| 0 | # | number_string | 1, 2, 3 |
| 1 | شهر أكتوبر 2025 | string | شركاء, د/هانى صلاح الدين مح..., أ/أميرة محمد على شري... |
| 2 | بدلات تليفون / Phone Allowance | number_string | 0, 1000, 475 |
| 3 | بدلات انتقال / Transportation Allowance | number_string | 0 |
| 4 | بدل سكن / Accommodation Allowance | number_string | 0 |
| 5 | زيادة سنوية / Yearly Increase | number_string | 0 |
| 6 | مكافئات سنوية / Annual Bonus | number_string | 0 |
| 7 | مكافئات شهرية / Monthly Bonus | number_string | 0 |
| 8 | قيمة التأمين الإجتماعي الممنوح / Given Social Insurance | number_string | 0 |
| 9 | ضرائب إداريين/محامين / Taxs | number_string | 0, 158904, 35461 |
| 10 | قيمة التأمين الصحي الممنوح \ Given Medical Insurance | number_string | 1422, 872, 590 |
| 11 | بدلات اخري / Allowances | number_string | 0 |
| 12 | اجمالي إضافات مباشرة / Total Direct Allownces | number_string | 0, 1000, 475 |
| 13 | اجمالي إضافات غير مباشرة / Total InDirect Allownces | number_string | 1422, 159776, 36051 |
| 14 | اجمالي علاوات / Total Bouns | number_string | 0 |

#### Formulas

| Address | Formula | Value |
|---------|---------|-------|
| A4 | `مرتبات!A4` | 1 |
| B4 | `مرتبات!B4` | د/هانى صلاح الدين محمد سري الدين |
| M4 | `SUM(C4:E4)+L4` | 0 |
| N4 | `SUM(I4:K4)` | 1422 |
| O4 | `SUM(G4:H4)` | 0 |
| P4 | `SUM(M4:O4)` | 1422 |
| A5 | `مرتبات!A5` | 2 |
| B5 | `مرتبات!B5` | أ/أميرة محمد على شريف |
| M5 | `SUM(C5:E5)+L5` | 1000 |
| N5 | `SUM(I5:K5)` | 159776 |
| O5 | `SUM(G5:H5)` | 0 |
| P5 | `SUM(M5:O5)` | 160776 |
| A6 | `مرتبات!A6` | 3 |
| B6 | `مرتبات!B6` | أ/إيهاب حمدى ابراهيم |
| M6 | `SUM(C6:E6)+L6` | 475 |
| N6 | `SUM(I6:K6)` | 36051 |
| O6 | `SUM(G6:H6)` | 0 |
| P6 | `SUM(M6:O6)` | 36526 |
| A7 | `مرتبات!A7` | 0 |
| B7 | `مرتبات!B7` | Spare |

#### Sample Data

**Row 2:**

```json
{
  "شهر أكتوبر 2025": "شركاء"
}
```

**Row 3:**

```json
{
  "#": "1",
  "شهر أكتوبر 2025": "د/هانى صلاح الدين محمد سري الدين",
  "بدلات تليفون / Phone Allowance": "0",
  "بدلات انتقال / Transportation Allowance": "0",
  "بدل سكن / Accommodation Allowance": "0",
  "زيادة سنوية / Yearly Increase": "0",
  "مكافئات سنوية / Annual Bonus": "0",
  "مكافئات شهرية / Monthly Bonus": "0",
  "قيمة التأمين الإجتماعي الممنوح / Given Social Insurance": "0",
  "ضرائب إداريين/محامين / Taxs": "0",
  "قيمة التأمين الصحي الممنوح \\ Given Medical Insurance": "1422",
  "بدلات اخري / Allowances": "0",
  "اجمالي إضافات مباشرة / Total Direct Allownces": "0",
  "اجمالي إضافات غير مباشرة / Total InDirect Allownces": "1422",
  "اجمالي علاوات / Total Bouns": "0"
}
```

**Row 4:**

```json
{
  "#": "2",
  "شهر أكتوبر 2025": "أ/أميرة محمد على شريف",
  "بدلات تليفون / Phone Allowance": "1000",
  "بدلات انتقال / Transportation Allowance": "0",
  "بدل سكن / Accommodation Allowance": "0",
  "زيادة سنوية / Yearly Increase": "0",
  "مكافئات سنوية / Annual Bonus": "0",
  "مكافئات شهرية / Monthly Bonus": "0",
  "قيمة التأمين الإجتماعي الممنوح / Given Social Insurance": "0",
  "ضرائب إداريين/محامين / Taxs": "158904",
  "قيمة التأمين الصحي الممنوح \\ Given Medical Insurance": "872",
  "بدلات اخري / Allowances": "0",
  "اجمالي إضافات مباشرة / Total Direct Allownces": "1000",
  "اجمالي إضافات غير مباشرة / Total InDirect Allownces": "159776",
  "اجمالي علاوات / Total Bouns": "0"
}
```

### Sheet: خصومات

**Dimensions:** A1:M188

**Header Row:** Index Not found

#### Column Mapping

| Index | Header | Data Type | Sample Values |
|-------|--------|-----------|---------------|

#### Formulas

| Address | Formula | Value |
|---------|---------|-------|
| A4 | `مرتبات!A4` | 1 |
| B4 | `مرتبات!B4` | د/هانى صلاح الدين محمد سري الدين |
| L4 | `SUM(C4:K4)` | 0 |
| A5 | `مرتبات!A5` | 2 |
| B5 | `مرتبات!B5` | أ/أميرة محمد على شريف |
| L5 | `SUM(C5:K5)` | 0 |
| A6 | `مرتبات!A6` | 3 |
| B6 | `مرتبات!B6` | أ/إيهاب حمدى ابراهيم |
| L6 | `SUM(C6:K6)` | 573 |
| A7 | `مرتبات!A7` | 0 |
| B7 | `مرتبات!B7` | Spare |
| L7 | `SUM(C7:K7)` | 0 |
| A8 | `مرتبات!A8` | 0 |
| B8 | `مرتبات!B8` | Spare |
| L8 | `SUM(C8:K8)` | 0 |
| A9 | `مرتبات!A9` | 0 |
| B9 | `مرتبات!B9` | Spare |
| L9 | `SUM(C9:K9)` | 0 |
| A10 | `مرتبات!A10` | 0 |
| B10 | `مرتبات!B10` | Spare |


---

## 12- Dec Salaries 2025.xlsx

### Sheet: مرتبات

**Dimensions:** A1:P127

**Header Row:** Index 2

#### Column Mapping

| Index | Header | Data Type | Sample Values |
|-------|--------|-----------|---------------|
| 0 | م | number_string | 1, 2, 3 |
| 1 | الاسماء / Name | string | د/هانى صلاح الدين مح..., أ/أميرة محمد على شري..., أ/إيهاب حمدى ابراهيم |
| 2 | - | unknown |  |
| 3 | صافي الاتعاب والمرتبات / Salary | number_string | 0, 500000, 120000 |
| 4 | إضافات غير مباشرة / In direct additions | number_string | 1422, 159776, 36051 |
| 5 | إضافات مباشرة / Direct Additions | number_string | 0, 1000, 475 |
| 6 | زيادة سنوية / Yearly Increase | number_string | 0 |
| 7 | علاوات / Bouns | number_string | 0 |
| 8 | خصومات / Deductions | number_string | 0 |
| 9 | الإجمالي قبل الخصم
GROSS | number_string | 1422, 660776, 156526 |
| 10 | الصافى بعد الخصم
 أو الزيادة
NET | number_string | 0, 500000, 120000 |
| 12 | طريقة الدفع | unknown |  |
| 13 | رقم الحساب | unknown |  |
| 14 | ملحوظات | unknown |  |

#### Formulas

| Address | Formula | Value |
|---------|---------|-------|
| E4 | `HYPERLINK(اضافات!N4)` | 1422 |
| F4 | `HYPERLINK(اضافات!M4)` | 0 |
| G4 | `HYPERLINK(اضافات!F4)` | 0 |
| H4 | `HYPERLINK(اضافات!O4)` | 0 |
| I4 | `HYPERLINK(خصومات!L4)` | 0 |
| J4 | `SUM(D4,VALUE(E4),VALUE(F4),VALUE(G4))` | 1422 |
| K4 | `VALUE(D4)+VALUE(G4)+VALUE(H4)-VALUE(I4)` | 0 |
| E5 | `HYPERLINK(اضافات!N5)` | 159776 |
| F5 | `HYPERLINK(اضافات!M5)` | 1000 |
| G5 | `HYPERLINK(اضافات!F5)` | 0 |
| H5 | `HYPERLINK(اضافات!O5)` | 0 |
| I5 | `HYPERLINK(خصومات!L5)` | 0 |
| J5 | `SUM(D5,VALUE(E5),VALUE(F5),VALUE(G5))` | 660776 |
| K5 | `VALUE(D5)+VALUE(G5)+VALUE(H5)-VALUE(I5)` | 500000 |
| E6 | `HYPERLINK(اضافات!N6)` | 36051 |
| F6 | `HYPERLINK(اضافات!M6)` | 475 |
| G6 | `HYPERLINK(اضافات!F6)` | 0 |
| H6 | `HYPERLINK(اضافات!O6)` | 0 |
| I6 | `HYPERLINK(خصومات!L6)` | 0 |
| J6 | `SUM(D6,VALUE(E6),VALUE(F6),VALUE(G6))` | 156526 |

#### Sample Data

**Row 3:**

```json
{
  "م": "1",
  "الاسماء / Name": "د/هانى صلاح الدين محمد سري الدين",
  "صافي الاتعاب والمرتبات / Salary": "0",
  "إضافات غير مباشرة / In direct additions": "1422",
  "إضافات مباشرة / Direct Additions": "0",
  "زيادة سنوية / Yearly Increase": "0",
  "علاوات / Bouns": "0",
  "خصومات / Deductions": "0",
  "الإجمالي قبل الخصم\r\nGROSS": "1422",
  "الصافى بعد الخصم\r\n أو الزيادة\r\nNET": "0"
}
```

**Row 4:**

```json
{
  "م": "2",
  "الاسماء / Name": "أ/أميرة محمد على شريف",
  "صافي الاتعاب والمرتبات / Salary": "500000",
  "إضافات غير مباشرة / In direct additions": "159776",
  "إضافات مباشرة / Direct Additions": "1000",
  "زيادة سنوية / Yearly Increase": "0",
  "علاوات / Bouns": "0",
  "خصومات / Deductions": "0",
  "الإجمالي قبل الخصم\r\nGROSS": "660776",
  "الصافى بعد الخصم\r\n أو الزيادة\r\nNET": "500000"
}
```

**Row 5:**

```json
{
  "م": "3",
  "الاسماء / Name": "أ/إيهاب حمدى ابراهيم",
  "صافي الاتعاب والمرتبات / Salary": "120000",
  "إضافات غير مباشرة / In direct additions": "36051",
  "إضافات مباشرة / Direct Additions": "475",
  "زيادة سنوية / Yearly Increase": "0",
  "علاوات / Bouns": "0",
  "خصومات / Deductions": "0",
  "الإجمالي قبل الخصم\r\nGROSS": "156526",
  "الصافى بعد الخصم\r\n أو الزيادة\r\nNET": "120000"
}
```

### Sheet: اضافات

**Dimensions:** A1:Q118

**Header Row:** Index 1

**Merged Cells:** 1 ranges

- A1:B1

#### Column Mapping

| Index | Header | Data Type | Sample Values |
|-------|--------|-----------|---------------|
| 0 | # | number_string | 1, 2, 3 |
| 1 | شهر ديسمبر 2025 | string | شركاء, د/هانى صلاح الدين مح..., أ/أميرة محمد على شري... |
| 2 | بدلات تليفون / Phone Allowance | number_string | 0, 1000, 475 |
| 3 | بدلات انتقال / Transportation Allowance | number_string | 0 |
| 4 | بدل سكن / Accommodation Allowance | number_string | 0 |
| 5 | زيادة سنوية / Yearly Increase | number_string | 0 |
| 6 | مكافئات سنوية / Annual Bonus | number_string | 0 |
| 7 | مكافئات شهرية / Monthly Bonus | number_string | 0 |
| 8 | قيمة التأمين الإجتماعي الممنوح / Given Social Insurance | number_string | 0 |
| 9 | ضرائب إداريين/محامين / Taxs | number_string | 0, 158904, 35461 |
| 10 | قيمة التأمين الصحي الممنوح \ Given Medical Insurance | number_string | 1422, 872, 590 |
| 11 | بدلات اخري / Allowances | number_string | 0 |
| 12 | اجمالي إضافات مباشرة / Total Direct Allownces | number_string | 0, 1000, 475 |
| 13 | اجمالي إضافات غير مباشرة / Total InDirect Allownces | number_string | 1422, 159776, 36051 |
| 14 | اجمالي علاوات / Total Bouns | number_string | 0 |

#### Formulas

| Address | Formula | Value |
|---------|---------|-------|
| A4 | `مرتبات!A4` | 1 |
| B4 | `مرتبات!B4` | د/هانى صلاح الدين محمد سري الدين |
| M4 | `SUM(C4:E4)+L4` | 0 |
| N4 | `SUM(I4:K4)` | 1422 |
| O4 | `SUM(G4:H4)` | 0 |
| P4 | `SUM(M4:O4)` | 1422 |
| A5 | `مرتبات!A5` | 2 |
| B5 | `مرتبات!B5` | أ/أميرة محمد على شريف |
| M5 | `SUM(C5:E5)+L5` | 1000 |
| N5 | `SUM(I5:K5)` | 159776 |
| O5 | `SUM(G5:H5)` | 0 |
| P5 | `SUM(M5:O5)` | 160776 |
| A6 | `مرتبات!A6` | 3 |
| B6 | `مرتبات!B6` | أ/إيهاب حمدى ابراهيم |
| M6 | `SUM(C6:E6)+L6` | 475 |
| N6 | `SUM(I6:K6)` | 36051 |
| O6 | `SUM(G6:H6)` | 0 |
| P6 | `SUM(M6:O6)` | 36526 |
| A7 | `مرتبات!A7` | 0 |
| B7 | `مرتبات!B7` | Spare |

#### Sample Data

**Row 2:**

```json
{
  "شهر ديسمبر 2025": "شركاء"
}
```

**Row 3:**

```json
{
  "#": "1",
  "شهر ديسمبر 2025": "د/هانى صلاح الدين محمد سري الدين",
  "بدلات تليفون / Phone Allowance": "0",
  "بدلات انتقال / Transportation Allowance": "0",
  "بدل سكن / Accommodation Allowance": "0",
  "زيادة سنوية / Yearly Increase": "0",
  "مكافئات سنوية / Annual Bonus": "0",
  "مكافئات شهرية / Monthly Bonus": "0",
  "قيمة التأمين الإجتماعي الممنوح / Given Social Insurance": "0",
  "ضرائب إداريين/محامين / Taxs": "0",
  "قيمة التأمين الصحي الممنوح \\ Given Medical Insurance": "1422",
  "بدلات اخري / Allowances": "0",
  "اجمالي إضافات مباشرة / Total Direct Allownces": "0",
  "اجمالي إضافات غير مباشرة / Total InDirect Allownces": "1422",
  "اجمالي علاوات / Total Bouns": "0"
}
```

**Row 4:**

```json
{
  "#": "2",
  "شهر ديسمبر 2025": "أ/أميرة محمد على شريف",
  "بدلات تليفون / Phone Allowance": "1000",
  "بدلات انتقال / Transportation Allowance": "0",
  "بدل سكن / Accommodation Allowance": "0",
  "زيادة سنوية / Yearly Increase": "0",
  "مكافئات سنوية / Annual Bonus": "0",
  "مكافئات شهرية / Monthly Bonus": "0",
  "قيمة التأمين الإجتماعي الممنوح / Given Social Insurance": "0",
  "ضرائب إداريين/محامين / Taxs": "158904",
  "قيمة التأمين الصحي الممنوح \\ Given Medical Insurance": "872",
  "بدلات اخري / Allowances": "0",
  "اجمالي إضافات مباشرة / Total Direct Allownces": "1000",
  "اجمالي إضافات غير مباشرة / Total InDirect Allownces": "159776",
  "اجمالي علاوات / Total Bouns": "0"
}
```

### Sheet: خصومات

**Dimensions:** A1:M188

**Header Row:** Index Not found

#### Column Mapping

| Index | Header | Data Type | Sample Values |
|-------|--------|-----------|---------------|

#### Formulas

| Address | Formula | Value |
|---------|---------|-------|
| A4 | `مرتبات!A4` | 1 |
| B4 | `مرتبات!B4` | د/هانى صلاح الدين محمد سري الدين |
| L4 | `SUM(C4:K4)` | 0 |
| A5 | `مرتبات!A5` | 2 |
| B5 | `مرتبات!B5` | أ/أميرة محمد على شريف |
| L5 | `SUM(C5:K5)` | 0 |
| A6 | `مرتبات!A6` | 3 |
| B6 | `مرتبات!B6` | أ/إيهاب حمدى ابراهيم |
| L6 | `SUM(C6:K6)` | 0 |
| A7 | `مرتبات!A7` | 0 |
| B7 | `مرتبات!B7` | Spare |
| L7 | `SUM(C7:K7)` | 0 |
| A8 | `مرتبات!A8` | 0 |
| B8 | `مرتبات!B8` | Spare |
| L8 | `SUM(C8:K8)` | 0 |
| A9 | `مرتبات!A9` | 0 |
| B9 | `مرتبات!B9` | Spare |
| L9 | `SUM(C9:K9)` | 0 |
| A10 | `مرتبات!A10` | 0 |
| B10 | `مرتبات!B10` | Spare |


---

## Summary and Recommendations

### Consistent Column Mappings

#### مرتبات

Found in 4 file(s)

| Index | Headers (all variations) | Data Types |
|-------|---------------------------|------------|
| 0 | م | number_string |
| 1 | الاسماء / Name | string |
| 2 | - | unknown |
| 3 | صافي الاتعاب والمرتبات / Salary | number_string |
| 4 | إضافات غير مباشرة / In direct additions | number_string |
| 5 | إضافات مباشرة / Direct Additions | number_string |
| 6 | زيادة سنوية / Yearly Increase | number_string |
| 7 | علاوات / Bouns | number_string |
| 8 | خصومات / Deductions | number_string |
| 9 | الإجمالي قبل الخصم
GROSS | number_string |
| 10 | الصافى بعد الخصم
 أو الزيادة
NET | number_string |
| 12 | طريقة الدفع | unknown |
| 13 | رقم الحساب | unknown |
| 14 | ملحوظات | unknown |

#### اضافات

Found in 4 file(s)

| Index | Headers (all variations) | Data Types |
|-------|---------------------------|------------|
| 0 | # | number_string |
| 1 | شهر يناير 2025 / شهر يونيو 2025 / شهر أكتوبر 2025 / شهر ديسمبر 2025 | string |
| 2 | بدلات تليفون / Phone Allowance | number_string |
| 3 | بدلات انتقال / Transportation Allowance | number_string |
| 4 | بدل سكن / Accommodation Allowance | number_string |
| 5 | زيادة سنوية / Yearly Increase | number_string |
| 6 | مكافئات سنوية / Annual Bonus | number_string |
| 7 | مكافئات شهرية / Monthly Bonus | number_string |
| 8 | قيمة التأمين الإجتماعي الممنوح / Given Social Insurance | number_string |
| 9 | ضرائب إداريين/محامين / Taxs | number_string |
| 10 | قيمة التأمين الصحي الممنوح \ Given Medical Insurance | number_string |
| 11 | بدلات اخري / Allowances | number_string |
| 12 | اجمالي إضافات مباشرة / Total Direct Allownces | number_string |
| 13 | اجمالي إضافات غير مباشرة / Total InDirect Allownces | number_string |
| 14 | اجمالي علاوات / Total Bouns | number_string |

#### خصومات

Found in 4 file(s)

| Index | Headers (all variations) | Data Types |
|-------|---------------------------|------------|

