#!/usr/bin/env node
/**
 * Comprehensive Analysis Script for SEPEmployees.xlsx - All Sheets
 * Analyzes AllOffice, Contracts, Personnel, and Resigned sheets
 */

import * as XLSX from 'xlsx';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sheetsDir = join(__dirname, '..', 'Sheets');
const filePath = join(sheetsDir, 'SEPEmployees.xlsx');
const outputFile = join(__dirname, '..', 'docs', 'SEP_EMPLOYEES_ALL_SHEETS_ANALYSIS.md');

function analyzeAllSheets() {
  console.log('\n' + '='.repeat(80));
  console.log('COMPREHENSIVE ANALYSIS: SEPEmployees.xlsx - All Sheets');
  console.log('='.repeat(80) + '\n');

  if (!existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }

  try {
    const data = readFileSync(filePath);
    const workbook = XLSX.read(data, {
      type: 'buffer',
      cellDates: true,
      cellFormulas: true,
      cellStyles: false,
      cellNF: false,
      cellText: false,
      sheetStubs: true
    });

    console.log(`📁 Workbook: SEPEmployees.xlsx`);
    console.log(`📊 Total Sheets: ${workbook.SheetNames.length}`);
    console.log(`📋 Sheet Names: ${workbook.SheetNames.join(', ')}\n`);

    const targetSheets = ['AllOffice', 'Contracts', 'Personnel', 'Resigned'];
    const allAnalyses = {};

    // Analyze each target sheet
    for (const sheetName of targetSheets) {
      if (!workbook.SheetNames.includes(sheetName)) {
        console.warn(`⚠️  Sheet "${sheetName}" not found, skipping...`);
        continue;
      }

      console.log(`\n${'='.repeat(80)}`);
      console.log(`Analyzing Sheet: ${sheetName}`);
      console.log('='.repeat(80));

      const worksheet = workbook.Sheets[sheetName];
      const analysis = analyzeSheet(worksheet, sheetName, workbook);
      allAnalyses[sheetName] = analysis;
    }

    // Generate comprehensive markdown report
    const report = generateComprehensiveReport(allAnalyses, workbook.SheetNames);
    writeFileSync(outputFile, report, 'utf-8');
    console.log(`\n✅ Comprehensive analysis report saved to: ${outputFile}\n`);

    // Print summary
    printSummary(allAnalyses);

  } catch (error) {
    console.error('❌ Error analyzing workbook:', error);
    console.error(error.stack);
  }
}

function analyzeSheet(worksheet, sheetName, workbook) {
  console.log(`\n${'-'.repeat(80)}`);
  console.log(`Analyzing Sheet: ${sheetName}`);
  console.log('-'.repeat(80) + '\n');

  // Get raw data as array
  const rawData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: null
  });

  // Get data as objects (auto-detect headers)
  const objectData = XLSX.utils.sheet_to_json(worksheet, {
    raw: true,
    defval: null
  });

  // Get range
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const totalRows = range.e.r + 1;
  const totalCols = range.e.c + 1;

  console.log(`📏 Dimensions: ${totalRows} rows × ${totalCols} columns`);
  console.log(`📊 Data Rows (non-empty): ${objectData.length}\n`);

  // Find header row(s)
  const headerAnalysis = findHeaderStructure(rawData, sheetName);
  const headers = headerAnalysis.headers;

  console.log(`📋 Header Row(s): ${headerAnalysis.headerRows.join(', ')}`);
  console.log(`📝 Headers Found: ${headers.length}\n`);

  // Analyze headers
  const headerDetails = analyzeHeaders(headers, rawData[headerAnalysis.mainHeaderRow]);

  // Analyze data types
  const dataTypeAnalysis = analyzeDataTypes(objectData, headers);

  // Analyze data patterns
  const patternAnalysis = analyzePatterns(objectData, headers);

  // Analyze formulas
  const formulaAnalysis = analyzeFormulas(worksheet);

  // Analyze empty cells
  const emptyCellAnalysis = analyzeEmptyCells(rawData, headerAnalysis.mainHeaderRow);

  // Sample data
  const sampleData = objectData.slice(0, Math.min(10, objectData.length));

  // Statistical analysis
  const statistics = calculateStatistics(objectData, headers);

  // Sheet-specific analysis
  const sheetSpecific = analyzeSheetSpecific(sheetName, objectData, headers, rawData);

  return {
    sheetName,
    dimensions: { rows: totalRows, cols: totalCols, dataRows: objectData.length },
    headerAnalysis: headerDetails,
    headerStructure: headerAnalysis,
    headers,
    dataTypeAnalysis,
    patternAnalysis,
    formulaAnalysis,
    emptyCellAnalysis,
    sampleData,
    statistics,
    sheetSpecific,
    rawData: rawData.slice(0, 20), // First 20 rows for inspection
    allData: objectData
  };
}

function findHeaderStructure(rawData, sheetName) {
  const headerRows = [];
  let mainHeaderRow = 0;
  let subHeaderRow = -1;

  // Look for header rows (usually first 2-3 rows)
  for (let i = 0; i < Math.min(5, rawData.length); i++) {
    const row = rawData[i];
    if (!row) continue;

    const rowText = row.map(cell => cell?.toString().trim() || '').join(' ').toLowerCase();
    
    // Check for header indicators
    const headerIndicators = [
      'name', 'employee', 'اسم', 'الاسماء',
      'salary', 'صافي', 'راتب',
      'id', 'code', 'رقم',
      'date', 'تاريخ',
      'department', 'قسم',
      'position', 'منصب',
      'contract', 'عقد',
      'personnel', 'موظف',
      'resigned', 'استقال'
    ];

    const hasHeaderIndicators = headerIndicators.some(indicator => 
      rowText.includes(indicator)
    );

    const nonEmptyCells = row.filter(cell => cell && cell.toString().trim()).length;

    if (hasHeaderIndicators && nonEmptyCells >= 3) {
      headerRows.push(i);
      if (mainHeaderRow === 0) {
        mainHeaderRow = i;
      } else if (subHeaderRow === -1) {
        subHeaderRow = i;
      }
    }
  }

  // If no headers found, use first row
  if (headerRows.length === 0) {
    headerRows.push(0);
    mainHeaderRow = 0;
  }

  // Combine headers from main and sub header rows
  const mainHeaders = rawData[mainHeaderRow]?.map(cell => cell?.toString().trim() || '') || [];
  const subHeaders = subHeaderRow >= 0 ? (rawData[subHeaderRow]?.map(cell => cell?.toString().trim() || '') || []) : [];

  // Combine headers intelligently
  const combinedHeaders = [];
  const maxCols = Math.max(mainHeaders.length, subHeaders.length);
  
  for (let i = 0; i < maxCols; i++) {
    const main = mainHeaders[i]?.toString().trim() || '';
    const sub = subHeaders[i]?.toString().trim() || '';
    
    if (main && sub) {
      combinedHeaders.push(`${main} - ${sub}`);
    } else if (main) {
      combinedHeaders.push(main);
    } else if (sub) {
      combinedHeaders.push(sub);
    } else {
      combinedHeaders.push(`Column_${i + 1}`);
    }
  }

  return {
    headerRows,
    mainHeaderRow,
    subHeaderRow,
    mainHeaders,
    subHeaders,
    headers: combinedHeaders.filter(h => h && !h.startsWith('Column_') || mainHeaders.some(m => m))
  };
}

function analyzeHeaders(headers, headerRow) {
  const analysis = {
    total: headers.length,
    empty: headerRow.filter(cell => !cell || !cell.toString().trim()).length,
    withArabic: headers.filter(h => /[\u0600-\u06FF]/.test(h)).length,
    withEnglish: headers.filter(h => /[a-zA-Z]/.test(h)).length,
    bilingual: headers.filter(h => /[\u0600-\u06FF]/.test(h) && /[a-zA-Z]/.test(h)).length,
    details: headers.map((h, idx) => ({
      index: idx,
      header: h,
      column: XLSX.utils.encode_col(idx),
      hasArabic: /[\u0600-\u06FF]/.test(h),
      hasEnglish: /[a-zA-Z]/.test(h),
      length: h.length
    }))
  };

  console.log('📋 HEADER ANALYSIS:');
  console.log(`   Total Headers: ${analysis.total}`);
  console.log(`   Empty Headers: ${analysis.empty}`);
  console.log(`   Arabic Headers: ${analysis.withArabic}`);
  console.log(`   English Headers: ${analysis.withEnglish}`);
  console.log(`   Bilingual Headers: ${analysis.bilingual}\n`);

  return analysis;
}

function analyzeDataTypes(objectData, headers) {
  const typeMap = {};
  const numericColumns = [];
  const dateColumns = [];
  const textColumns = [];
  const mixedColumns = [];

  headers.forEach(header => {
    if (!header || header.startsWith('Column_')) return;

    const values = objectData
      .map(row => row[header])
      .filter(val => val !== null && val !== undefined && val !== '');

    if (values.length === 0) {
      typeMap[header] = 'empty';
      return;
    }

    const types = new Set();
    let hasNumbers = false;
    let hasDates = false;
    let hasText = false;
    let numericCount = 0;

    values.forEach(val => {
      if (typeof val === 'number') {
        types.add('number');
        hasNumbers = true;
        numericCount++;
      } else if (val instanceof Date) {
        types.add('date');
        hasDates = true;
      } else if (typeof val === 'string') {
        types.add('string');
        hasText = true;
        const numVal = parseFloat(val.replace(/[^\d.-]/g, ''));
        if (!isNaN(numVal) && val.trim() !== '') {
          hasNumbers = true;
          numericCount++;
        }
      } else {
        types.add('other');
      }
    });

    const typeArray = Array.from(types);
    typeMap[header] = typeArray.length > 1 ? 'mixed' : typeArray[0];

    if (hasNumbers && numericCount > values.length * 0.8) {
      numericColumns.push(header);
    }
    if (hasDates) {
      dateColumns.push(header);
    }
    if (!hasNumbers && !hasDates && hasText) {
      textColumns.push(header);
    }
    if (typeArray.length > 1) {
      mixedColumns.push(header);
    }
  });

  console.log('🔢 DATA TYPE ANALYSIS:');
  console.log(`   Numeric Columns: ${numericColumns.length}`);
  console.log(`   Date Columns: ${dateColumns.length}`);
  console.log(`   Text Columns: ${textColumns.length}`);
  console.log(`   Mixed Columns: ${mixedColumns.length}\n`);

  return {
    typeMap,
    numericColumns,
    dateColumns,
    textColumns,
    mixedColumns
  };
}

function analyzePatterns(objectData, headers) {
  const patterns = {
    duplicates: {},
    uniqueValues: {},
    valueRanges: {},
    commonValues: {}
  };

  headers.forEach(header => {
    if (!header || header.startsWith('Column_')) return;

    const values = objectData
      .map(row => row[header])
      .filter(val => val !== null && val !== undefined && val !== '');

    const unique = new Set(values);
    patterns.uniqueValues[header] = unique.size;

    const valueCounts = {};
    values.forEach(val => {
      const key = String(val);
      valueCounts[key] = (valueCounts[key] || 0) + 1;
    });

    const duplicates = Object.entries(valueCounts)
      .filter(([_, count]) => count > 1)
      .map(([val, count]) => ({ value: val, count }));
    if (duplicates.length > 0) {
      patterns.duplicates[header] = duplicates.slice(0, 10);
    }

    const numericValues = values
      .map(v => typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.-]/g, '')))
      .filter(v => !isNaN(v));
    
    if (numericValues.length > 0) {
      patterns.valueRanges[header] = {
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
        count: numericValues.length
      };
    }

    const sorted = Object.entries(valueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (sorted.length > 0) {
      patterns.commonValues[header] = sorted.map(([val, count]) => ({
        value: val,
        count,
        percentage: ((count / values.length) * 100).toFixed(2) + '%'
      }));
    }
  });

  return patterns;
}

function analyzeFormulas(worksheet) {
  const formulas = [];
  const formulaCells = [];

  for (const cellAddress in worksheet) {
    if (cellAddress.startsWith('!')) continue;
    
    const cell = worksheet[cellAddress];
    if (cell && cell.f) {
      formulas.push({
        cell: cellAddress,
        formula: cell.f,
        value: cell.v,
        type: cell.t
      });
      formulaCells.push(cellAddress);
    }
  }

  console.log('📐 FORMULA ANALYSIS:');
  console.log(`   Total Formulas: ${formulas.length}`);
  if (formulas.length > 0 && formulas.length <= 10) {
    formulas.forEach(f => {
      console.log(`     ${f.cell}: ${f.formula} = ${f.value}`);
    });
  }
  console.log('');

  return {
    total: formulas.length,
    formulas: formulas.slice(0, 20),
    formulaCells
  };
}

function analyzeEmptyCells(rawData, headerRowIndex) {
  const emptyAnalysis = {
    totalCells: 0,
    emptyCells: 0,
    emptyRows: [],
    emptyColumns: []
  };

  if (rawData.length === 0) return emptyAnalysis;

  const dataRows = rawData.slice(headerRowIndex + 1);
  const maxCols = Math.max(...rawData.map(row => row ? row.length : 0));

  dataRows.forEach((row, rowIdx) => {
    if (!row) {
      emptyAnalysis.emptyRows.push(headerRowIndex + 1 + rowIdx);
      return;
    }
    
    let rowEmpty = true;
    for (let colIdx = 0; colIdx < maxCols; colIdx++) {
      emptyAnalysis.totalCells++;
      const cell = row[colIdx];
      if (!cell || cell === '' || cell === null || cell === undefined) {
        emptyAnalysis.emptyCells++;
      } else {
        rowEmpty = false;
      }
    }
    if (rowEmpty) {
      emptyAnalysis.emptyRows.push(headerRowIndex + 1 + rowIdx);
    }
  });

  for (let colIdx = 0; colIdx < maxCols; colIdx++) {
    let colEmpty = true;
    for (let rowIdx = headerRowIndex + 1; rowIdx < rawData.length; rowIdx++) {
      const cell = rawData[rowIdx]?.[colIdx];
      if (cell && cell !== '' && cell !== null && cell !== undefined) {
        colEmpty = false;
        break;
      }
    }
    if (colEmpty) {
      emptyAnalysis.emptyColumns.push(XLSX.utils.encode_col(colIdx));
    }
  }

  const emptyPercentage = emptyAnalysis.totalCells > 0
    ? ((emptyAnalysis.emptyCells / emptyAnalysis.totalCells) * 100).toFixed(2)
    : 0;

  console.log('📭 EMPTY CELL ANALYSIS:');
  console.log(`   Total Cells: ${emptyAnalysis.totalCells}`);
  console.log(`   Empty Cells: ${emptyAnalysis.emptyCells} (${emptyPercentage}%)`);
  console.log(`   Empty Rows: ${emptyAnalysis.emptyRows.length}`);
  console.log(`   Empty Columns: ${emptyAnalysis.emptyColumns.length}\n`);

  return emptyAnalysis;
}

function calculateStatistics(objectData, headers) {
  const stats = {};

  headers.forEach(header => {
    if (!header || header.startsWith('Column_')) return;

    const values = objectData
      .map(row => row[header])
      .filter(val => val !== null && val !== undefined && val !== '');

    if (values.length === 0) {
      stats[header] = { count: 0, filled: 0, empty: objectData.length };
      return;
    }

    const numericValues = values
      .map(v => typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.-]/g, '')))
      .filter(v => !isNaN(v));

    const stat = {
      count: values.length,
      filled: values.length,
      empty: objectData.length - values.length,
      fillRate: ((values.length / objectData.length) * 100).toFixed(2) + '%'
    };

    if (numericValues.length > 0) {
      stat.numeric = {
        count: numericValues.length,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        sum: numericValues.reduce((a, b) => a + b, 0),
        avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
        median: calculateMedian(numericValues)
      };
    }

    stats[header] = stat;
  });

  return stats;
}

function calculateMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function analyzeSheetSpecific(sheetName, objectData, headers, rawData) {
  const specific = {
    purpose: '',
    keyFields: [],
    relationships: {},
    uniqueIdentifiers: []
  };

  switch (sheetName) {
    case 'AllOffice':
      specific.purpose = 'Master employee list with all current employees';
      specific.keyFields = ['ID', 'Category', 'Name in English', 'Department', 'Status'];
      break;
    
    case 'Contracts':
      specific.purpose = 'Contract information and renewal dates';
      specific.keyFields = headers.filter(h => h && (h.includes('Contract') || h.includes('Date') || h.includes('Renewal')));
      break;
    
    case 'Personnel':
      specific.purpose = 'Personnel records and HR information';
      specific.keyFields = headers.filter(h => h && (h.includes('Personnel') || h.includes('HR') || h.includes('Employee')));
      break;
    
    case 'Resigned':
      specific.purpose = 'Records of resigned employees';
      specific.keyFields = headers.filter(h => h && (h.includes('Resigned') || h.includes('Date') || h.includes('Status')));
      break;
  }

  // Try to identify unique identifiers
  headers.forEach(header => {
    if (!header || header.startsWith('Column_')) return;
    const values = objectData.map(row => row[header]).filter(v => v);
    const unique = new Set(values);
    if (unique.size === values.length && values.length > 0) {
      specific.uniqueIdentifiers.push(header);
    }
  });

  return specific;
}

function printSummary(allAnalyses) {
  console.log('\n' + '='.repeat(80));
  console.log('COMPREHENSIVE SUMMARY');
  console.log('='.repeat(80));
  
  Object.entries(allAnalyses).forEach(([sheetName, analysis]) => {
    console.log(`\n📊 ${sheetName}:`);
    console.log(`   Dimensions: ${analysis.dimensions.rows} rows × ${analysis.dimensions.cols} columns`);
    console.log(`   Data Rows: ${analysis.dimensions.dataRows}`);
    console.log(`   Headers: ${analysis.headers.length}`);
    console.log(`   Formulas: ${analysis.formulaAnalysis.total}`);
    console.log(`   Empty Cells: ${analysis.emptyCellAnalysis.emptyCells} (${((analysis.emptyCellAnalysis.emptyCells / analysis.emptyCellAnalysis.totalCells) * 100).toFixed(2)}%)`);
    if (analysis.sheetSpecific.purpose) {
      console.log(`   Purpose: ${analysis.sheetSpecific.purpose}`);
    }
  });
  
  console.log('\n' + '='.repeat(80) + '\n');
}

function generateComprehensiveReport(allAnalyses, allSheetNames) {
  let report = `# Comprehensive Analysis: SEPEmployees.xlsx - All Sheets\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `**Workbook:** SEPEmployees.xlsx\n`;
  report += `**Total Sheets:** ${allSheetNames.length}\n`;
  report += `**All Sheets:** ${allSheetNames.join(', ')}\n\n`;
  report += `---\n\n`;

  // Overview table
  report += `## Overview\n\n`;
  report += `| Sheet | Rows | Columns | Data Rows | Headers | Formulas | Empty % |\n`;
  report += `|-------|------|--------|-----------|---------|----------|--------|\n`;
  Object.entries(allAnalyses).forEach(([sheetName, analysis]) => {
    const emptyPct = analysis.emptyCellAnalysis.totalCells > 0
      ? ((analysis.emptyCellAnalysis.emptyCells / analysis.emptyCellAnalysis.totalCells) * 100).toFixed(2)
      : '0.00';
    report += `| ${sheetName} | ${analysis.dimensions.rows} | ${analysis.dimensions.cols} | ${analysis.dimensions.dataRows} | ${analysis.headers.length} | ${analysis.formulaAnalysis.total} | ${emptyPct}% |\n`;
  });
  report += `\n`;

  // Detailed analysis for each sheet
  Object.entries(allAnalyses).forEach(([sheetName, analysis]) => {
    report += `## ${sheetName} Sheet\n\n`;
    
    if (analysis.sheetSpecific.purpose) {
      report += `**Purpose:** ${analysis.sheetSpecific.purpose}\n\n`;
    }

    report += `### Structure\n\n`;
    report += `- **Dimensions:** ${analysis.dimensions.rows} rows × ${analysis.dimensions.cols} columns\n`;
    report += `- **Data Rows:** ${analysis.dimensions.dataRows}\n`;
    report += `- **Header Row(s):** ${analysis.headerStructure.headerRows.map(r => r + 1).join(', ')}\n`;
    report += `- **Total Headers:** ${analysis.headers.length}\n\n`;

    // Headers
    report += `### Headers\n\n`;
    report += `| Index | Column | Header | Has Arabic | Has English |\n`;
    report += `|-------|--------|--------|------------|--------------|\n`;
    analysis.headerAnalysis.details.slice(0, 30).forEach(h => {
      report += `| ${h.index} | ${h.column} | ${h.header} | ${h.hasArabic ? '✓' : ''} | ${h.hasEnglish ? '✓' : ''} |\n`;
    });
    if (analysis.headerAnalysis.details.length > 30) {
      report += `| ... | ... | ... (${analysis.headerAnalysis.details.length - 30} more) | ... | ... |\n`;
    }
    report += `\n`;

    // Key Fields
    if (analysis.sheetSpecific.keyFields.length > 0) {
      report += `### Key Fields\n\n`;
      analysis.sheetSpecific.keyFields.forEach(field => {
        report += `- ${field}\n`;
      });
      report += `\n`;
    }

    // Data Types
    report += `### Data Types\n\n`;
    report += `| Column | Type | Notes |\n`;
    report += `|--------|------|-------|\n`;
    Object.entries(analysis.dataTypeAnalysis.typeMap).slice(0, 20).forEach(([header, type]) => {
      const notes = [];
      if (analysis.dataTypeAnalysis.numericColumns.includes(header)) notes.push('Numeric');
      if (analysis.dataTypeAnalysis.dateColumns.includes(header)) notes.push('Date');
      if (analysis.dataTypeAnalysis.textColumns.includes(header)) notes.push('Text');
      if (analysis.dataTypeAnalysis.mixedColumns.includes(header)) notes.push('Mixed');
      report += `| ${header} | ${type} | ${notes.join(', ') || '-'} |\n`;
    });
    if (Object.keys(analysis.dataTypeAnalysis.typeMap).length > 20) {
      report += `| ... | ... | ... (${Object.keys(analysis.dataTypeAnalysis.typeMap).length - 20} more) |\n`;
    }
    report += `\n`;

    // Patterns - Common Values
    const commonCols = Object.keys(analysis.patternAnalysis.commonValues);
    if (commonCols.length > 0) {
      report += `### Most Common Values\n\n`;
      commonCols.slice(0, 5).forEach(col => {
        report += `#### ${col}\n\n`;
        report += `| Value | Count | Percentage |\n`;
        report += `|-------|-------|------------|\n`;
        analysis.patternAnalysis.commonValues[col].forEach(item => {
          report += `| ${item.value} | ${item.count} | ${item.percentage} |\n`;
        });
        report += `\n`;
      });
    }

    // Value Ranges
    const rangeCols = Object.keys(analysis.patternAnalysis.valueRanges);
    if (rangeCols.length > 0) {
      report += `### Value Ranges (Numeric Columns)\n\n`;
      report += `| Column | Min | Max | Average | Count |\n`;
      report += `|--------|-----|-----|--------|-------|\n`;
      rangeCols.slice(0, 10).forEach(col => {
        const range = analysis.patternAnalysis.valueRanges[col];
        report += `| ${col} | ${range.min.toLocaleString()} | ${range.max.toLocaleString()} | ${range.avg.toFixed(2)} | ${range.count} |\n`;
      });
      report += `\n`;
    }

    // Sample Data
    report += `### Sample Data (First 5 Rows)\n\n`;
    if (analysis.sampleData.length > 0) {
      const sampleHeaders = Object.keys(analysis.sampleData[0]).filter(h => h && !h.startsWith('__')).slice(0, 10);
      report += `| ${sampleHeaders.join(' | ')} |\n`;
      report += `|${sampleHeaders.map(() => '---').join('|')}|\n`;
      analysis.sampleData.slice(0, 5).forEach(row => {
        const values = sampleHeaders.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'number') return val.toLocaleString();
          if (val instanceof Date) return val.toISOString().split('T')[0];
          return String(val).substring(0, 30);
        });
        report += `| ${values.join(' | ')} |\n`;
      });
    }
    report += `\n`;

    // Formulas
    if (analysis.formulaAnalysis.total > 0) {
      report += `### Formulas\n\n`;
      report += `**Total:** ${analysis.formulaAnalysis.total}\n\n`;
      if (analysis.formulaAnalysis.formulas.length <= 10) {
        report += `| Cell | Formula | Value |\n`;
        report += `|------|---------|-------|\n`;
        analysis.formulaAnalysis.formulas.forEach(f => {
          report += `| ${f.cell} | ${f.formula} | ${f.value} |\n`;
        });
      } else {
        report += `*Showing first 10 of ${analysis.formulaAnalysis.total} formulas*\n\n`;
        report += `| Cell | Formula | Value |\n`;
        report += `|------|---------|-------|\n`;
        analysis.formulaAnalysis.formulas.slice(0, 10).forEach(f => {
          report += `| ${f.cell} | ${f.formula} | ${f.value} |\n`;
        });
      }
      report += `\n`;
    }

    report += `---\n\n`;
  });

  // Cross-sheet relationships
  report += `## Cross-Sheet Relationships\n\n`;
  report += `### Potential Relationships\n\n`;
  report += `- **AllOffice ↔ Contracts**: Employee IDs/Names likely link contract information\n`;
  report += `- **AllOffice ↔ Personnel**: Employee IDs/Names likely link personnel records\n`;
  report += `- **AllOffice ↔ Resigned**: Employee IDs/Names likely link resigned employee records\n`;
  report += `- **Contracts ↔ Personnel**: May share employee identifiers\n`;
  report += `\n`;

  // Recommendations
  report += `## Recommendations for Import\n\n`;
  report += `### AllOffice Sheet\n`;
  report += `- Primary employee master data\n`;
  report += `- Use as base for employee records\n`;
  report += `- Link other sheets via employee ID or name\n\n`;

  report += `### Contracts Sheet\n`;
  report += `- Import as additional employee data or separate table\n`;
  report += `- Link to employees via ID or name matching\n`;
  report += `- Store contract dates and renewal information\n\n`;

  report += `### Personnel Sheet\n`;
  report += `- Import as additional employee data or separate table\n`;
  report += `- Link to employees via ID or name matching\n`;
  report += `- Store HR-specific information\n\n`;

  report += `### Resigned Sheet\n`;
  report += `- Update employee status in AllOffice\n`;
  report += `- Store resignation dates and details\n`;
  report += `- Maintain historical records\n\n`;

  return report;
}

// Run analysis
analyzeAllSheets();

