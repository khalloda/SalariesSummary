#!/usr/bin/env node
/**
 * Deep Analysis Script for SEPEmployees.xlsx - AllOffice Sheet
 * Comprehensive analysis of structure, data, patterns, and relationships
 */

import * as XLSX from 'xlsx';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sheetsDir = join(__dirname, '..', 'Sheets');
const filePath = join(sheetsDir, 'SEPEmployees.xlsx');
const outputFile = join(__dirname, '..', 'docs', 'SEP_EMPLOYEES_ANALYSIS.md');

// Read password if available
let password = null;
const passFile = join(sheetsDir, 'pass.txt');
if (existsSync(passFile)) {
  password = readFileSync(passFile, 'utf-8').trim();
}

function analyzeSEPEmployees() {
  console.log('\n' + '='.repeat(80));
  console.log('DEEP ANALYSIS: SEPEmployees.xlsx - AllOffice Sheet');
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
      cellFormulas: true, // Read formulas
      cellStyles: false,
      cellNF: false,
      cellText: false,
      sheetStubs: true
    });

    console.log(`📁 Workbook: SEPEmployees.xlsx`);
    console.log(`📊 Total Sheets: ${workbook.SheetNames.length}`);
    console.log(`📋 Sheet Names: ${workbook.SheetNames.join(', ')}\n`);

    // Find AllOffice sheet
    const sheetName = 'AllOffice';
    if (!workbook.SheetNames.includes(sheetName)) {
      console.error(`❌ Sheet "${sheetName}" not found!`);
      console.log(`Available sheets: ${workbook.SheetNames.join(', ')}`);
      return;
    }

    const worksheet = workbook.Sheets[sheetName];
    const analysis = analyzeSheet(worksheet, sheetName);

    // Generate markdown report
    const report = generateMarkdownReport(analysis);
    writeFileSync(outputFile, report, 'utf-8');
    console.log(`\n✅ Analysis report saved to: ${outputFile}\n`);

    // Print summary to console
    printSummary(analysis);

  } catch (error) {
    console.error('❌ Error analyzing workbook:', error);
    console.error(error.stack);
  }
}

function analyzeSheet(worksheet, sheetName) {
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

  // Find header row
  const headerRowIndex = findHeaderRow(rawData);
  const headers = rawData[headerRowIndex]?.map(cell => 
    cell?.toString().trim() || ''
  ).filter(h => h) || [];

  console.log(`📋 Header Row: ${headerRowIndex + 1}`);
  console.log(`📝 Headers Found: ${headers.length}\n`);

  // Analyze headers
  const headerAnalysis = analyzeHeaders(headers, rawData[headerRowIndex]);

  // Analyze data types
  const dataTypeAnalysis = analyzeDataTypes(objectData, headers);

  // Analyze data patterns
  const patternAnalysis = analyzePatterns(objectData, headers);

  // Analyze formulas
  const formulaAnalysis = analyzeFormulas(worksheet);

  // Analyze empty cells
  const emptyCellAnalysis = analyzeEmptyCells(rawData, headerRowIndex);

  // Sample data
  const sampleData = objectData.slice(0, Math.min(10, objectData.length));

  // Statistical analysis
  const statistics = calculateStatistics(objectData, headers);

  return {
    sheetName,
    dimensions: { rows: totalRows, cols: totalCols, dataRows: objectData.length },
    headerRowIndex,
    headers,
    headerAnalysis,
    dataTypeAnalysis,
    patternAnalysis,
    formulaAnalysis,
    emptyCellAnalysis,
    sampleData,
    statistics,
    rawData: rawData.slice(0, 20), // First 20 rows for inspection
    allData: objectData
  };
}

function findHeaderRow(rawData) {
  // Look for common header indicators
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
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
      'position', 'منصب'
    ];

    const hasHeaderIndicators = headerIndicators.some(indicator => 
      rowText.includes(indicator)
    );

    if (hasHeaderIndicators && row.filter(cell => cell && cell.toString().trim()).length >= 3) {
      return i;
    }
  }
  return 0; // Default to first row
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
        // Check if string is numeric
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
  console.log(`   Numeric Columns: ${numericColumns.length} - ${numericColumns.slice(0, 5).join(', ')}${numericColumns.length > 5 ? '...' : ''}`);
  console.log(`   Date Columns: ${dateColumns.length} - ${dateColumns.join(', ') || 'None'}`);
  console.log(`   Text Columns: ${textColumns.length} - ${textColumns.slice(0, 5).join(', ')}${textColumns.length > 5 ? '...' : ''}`);
  console.log(`   Mixed Columns: ${mixedColumns.length} - ${mixedColumns.join(', ') || 'None'}\n`);

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
    const values = objectData
      .map(row => row[header])
      .filter(val => val !== null && val !== undefined && val !== '');

    // Unique values
    const unique = new Set(values);
    patterns.uniqueValues[header] = unique.size;

    // Duplicates
    const valueCounts = {};
    values.forEach(val => {
      const key = String(val);
      valueCounts[key] = (valueCounts[key] || 0) + 1;
    });
    const duplicates = Object.entries(valueCounts)
      .filter(([_, count]) => count > 1)
      .map(([val, count]) => ({ value: val, count }));
    if (duplicates.length > 0) {
      patterns.duplicates[header] = duplicates.slice(0, 10); // Top 10
    }

    // Value ranges (for numeric)
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

    // Common values
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

  console.log('🔍 PATTERN ANALYSIS:');
  const duplicateColumns = Object.keys(patterns.duplicates);
  console.log(`   Columns with Duplicates: ${duplicateColumns.length} - ${duplicateColumns.slice(0, 5).join(', ')}${duplicateColumns.length > 5 ? '...' : ''}`);
  console.log(`   Columns with Value Ranges: ${Object.keys(patterns.valueRanges).length}\n`);

  return patterns;
}

function analyzeFormulas(worksheet) {
  const formulas = [];
  const formulaCells = [];

  // Check each cell for formulas
  for (const cellAddress in worksheet) {
    if (cellAddress.startsWith('!')) continue;
    
    const cell = worksheet[cellAddress];
    if (cell && cell.f) { // f property indicates formula
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
  if (formulas.length > 0) {
    console.log(`   Sample Formulas:`);
    formulas.slice(0, 5).forEach(f => {
      console.log(`     ${f.cell}: ${f.formula} = ${f.value}`);
    });
  }
  console.log('');

  return {
    total: formulas.length,
    formulas: formulas.slice(0, 20), // First 20 formulas
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

  // Count empty cells
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

  // Check for empty columns
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
  console.log(`   Empty Columns: ${emptyAnalysis.emptyColumns.length} - ${emptyAnalysis.emptyColumns.join(', ')}\n`);

  return emptyAnalysis;
}

function calculateStatistics(objectData, headers) {
  const stats = {};

  headers.forEach(header => {
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

function printSummary(analysis) {
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Sheet: ${analysis.sheetName}`);
  console.log(`Dimensions: ${analysis.dimensions.rows} rows × ${analysis.dimensions.cols} columns`);
  console.log(`Data Rows: ${analysis.dimensions.dataRows}`);
  console.log(`Headers: ${analysis.headers.length}`);
  console.log(`Formulas: ${analysis.formulaAnalysis.total}`);
  console.log(`Empty Cells: ${analysis.emptyCellAnalysis.emptyCells} (${((analysis.emptyCellAnalysis.emptyCells / analysis.emptyCellAnalysis.totalCells) * 100).toFixed(2)}%)`);
  console.log('='.repeat(80) + '\n');
}

function generateMarkdownReport(analysis) {
  let report = `# Deep Analysis: SEPEmployees.xlsx - AllOffice Sheet\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `---\n\n`;

  // Overview
  report += `## Overview\n\n`;
  report += `- **Sheet Name:** ${analysis.sheetName}\n`;
  report += `- **Dimensions:** ${analysis.dimensions.rows} rows × ${analysis.dimensions.cols} columns\n`;
  report += `- **Data Rows:** ${analysis.dimensions.dataRows}\n`;
  report += `- **Header Row:** ${analysis.headerRowIndex + 1}\n`;
  report += `- **Total Headers:** ${analysis.headers.length}\n\n`;

  // Headers
  report += `## Headers Analysis\n\n`;
  report += `### Header Details\n\n`;
  report += `| Index | Column | Header | Has Arabic | Has English | Length |\n`;
  report += `|-------|--------|--------|------------|--------------|--------|\n`;
  analysis.headerAnalysis.details.forEach(h => {
    report += `| ${h.index} | ${h.column} | ${h.header} | ${h.hasArabic ? '✓' : ''} | ${h.hasEnglish ? '✓' : ''} | ${h.length} |\n`;
  });
  report += `\n`;

  report += `### Header Statistics\n\n`;
  report += `- **Total Headers:** ${analysis.headerAnalysis.total}\n`;
  report += `- **Empty Headers:** ${analysis.headerAnalysis.empty}\n`;
  report += `- **Arabic Headers:** ${analysis.headerAnalysis.withArabic}\n`;
  report += `- **English Headers:** ${analysis.headerAnalysis.withEnglish}\n`;
  report += `- **Bilingual Headers:** ${analysis.headerAnalysis.bilingual}\n\n`;

  // Data Types
  report += `## Data Type Analysis\n\n`;
  report += `### Column Types\n\n`;
  report += `| Column | Type | Notes |\n`;
  report += `|--------|------|-------|\n`;
  Object.entries(analysis.dataTypeAnalysis.typeMap).forEach(([header, type]) => {
    const notes = [];
    if (analysis.dataTypeAnalysis.numericColumns.includes(header)) notes.push('Numeric');
    if (analysis.dataTypeAnalysis.dateColumns.includes(header)) notes.push('Date');
    if (analysis.dataTypeAnalysis.textColumns.includes(header)) notes.push('Text');
    if (analysis.dataTypeAnalysis.mixedColumns.includes(header)) notes.push('Mixed');
    report += `| ${header} | ${type} | ${notes.join(', ') || '-'} |\n`;
  });
  report += `\n`;

  // Patterns
  report += `## Pattern Analysis\n\n`;
  const duplicateCols = Object.keys(analysis.patternAnalysis.duplicates);
  if (duplicateCols.length > 0) {
    report += `### Duplicate Values\n\n`;
    duplicateCols.forEach(col => {
      report += `#### ${col}\n\n`;
      report += `| Value | Count |\n`;
      report += `|-------|-------|\n`;
      analysis.patternAnalysis.duplicates[col].slice(0, 10).forEach(dup => {
        report += `| ${dup.value} | ${dup.count} |\n`;
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
    rangeCols.forEach(col => {
      const range = analysis.patternAnalysis.valueRanges[col];
      report += `| ${col} | ${range.min.toLocaleString()} | ${range.max.toLocaleString()} | ${range.avg.toFixed(2)} | ${range.count} |\n`;
    });
    report += `\n`;
  }

  // Common Values
  const commonCols = Object.keys(analysis.patternAnalysis.commonValues);
  if (commonCols.length > 0) {
    report += `### Most Common Values\n\n`;
    commonCols.slice(0, 10).forEach(col => {
      report += `#### ${col}\n\n`;
      report += `| Value | Count | Percentage |\n`;
      report += `|-------|-------|------------|\n`;
      analysis.patternAnalysis.commonValues[col].forEach(item => {
        report += `| ${item.value} | ${item.count} | ${item.percentage} |\n`;
      });
      report += `\n`;
    });
  }

  // Formulas
  if (analysis.formulaAnalysis.total > 0) {
    report += `## Formula Analysis\n\n`;
    report += `**Total Formulas:** ${analysis.formulaAnalysis.total}\n\n`;
    report += `### Formula Details\n\n`;
    report += `| Cell | Formula | Value |\n`;
    report += `|------|---------|-------|\n`;
    analysis.formulaAnalysis.formulas.forEach(f => {
      report += `| ${f.cell} | ${f.formula} | ${f.value} |\n`;
    });
    report += `\n`;
  }

  // Statistics
  report += `## Column Statistics\n\n`;
  report += `| Column | Filled | Empty | Fill Rate | Min | Max | Avg |\n`;
  report += `|--------|--------|-------|-----------|-----|-----|-----|\n`;
  Object.entries(analysis.statistics).forEach(([header, stat]) => {
    const numeric = stat.numeric || {};
    report += `| ${header} | ${stat.filled} | ${stat.empty} | ${stat.fillRate} | `;
    report += `${numeric.min !== undefined ? numeric.min.toLocaleString() : '-'} | `;
    report += `${numeric.max !== undefined ? numeric.max.toLocaleString() : '-'} | `;
    report += `${numeric.avg !== undefined ? numeric.avg.toFixed(2) : '-'} |\n`;
  });
  report += `\n`;

  // Empty Cells
  report += `## Empty Cell Analysis\n\n`;
  report += `- **Total Cells:** ${analysis.emptyCellAnalysis.totalCells}\n`;
  report += `- **Empty Cells:** ${analysis.emptyCellAnalysis.emptyCells} (${((analysis.emptyCellAnalysis.emptyCells / analysis.emptyCellAnalysis.totalCells) * 100).toFixed(2)}%)\n`;
  report += `- **Empty Rows:** ${analysis.emptyCellAnalysis.emptyRows.length}\n`;
  if (analysis.emptyCellAnalysis.emptyRows.length > 0 && analysis.emptyCellAnalysis.emptyRows.length <= 20) {
    report += `  - Rows: ${analysis.emptyCellAnalysis.emptyRows.join(', ')}\n`;
  }
  report += `- **Empty Columns:** ${analysis.emptyCellAnalysis.emptyColumns.length}\n`;
  if (analysis.emptyCellAnalysis.emptyColumns.length > 0) {
    report += `  - Columns: ${analysis.emptyCellAnalysis.emptyColumns.join(', ')}\n`;
  }
  report += `\n`;

  // Sample Data
  report += `## Sample Data (First 10 Rows)\n\n`;
  if (analysis.sampleData.length > 0) {
    const sampleHeaders = Object.keys(analysis.sampleData[0]);
    report += `| ${sampleHeaders.join(' | ')} |\n`;
    report += `|${sampleHeaders.map(() => '---').join('|')}|\n`;
    analysis.sampleData.forEach(row => {
      const values = sampleHeaders.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'number') return val.toLocaleString();
        if (val instanceof Date) return val.toISOString().split('T')[0];
        return String(val).substring(0, 50); // Truncate long strings
      });
      report += `| ${values.join(' | ')} |\n`;
    });
  }
  report += `\n`;

  // Raw Data Preview
  report += `## Raw Data Preview (First 20 Rows)\n\n`;
  report += `\`\`\`\n`;
  analysis.rawData.slice(0, 20).forEach((row, idx) => {
    report += `Row ${idx + 1}: ${JSON.stringify(row.slice(0, 10))}\n`;
  });
  report += `\`\`\`\n\n`;

  return report;
}

// Run analysis
analyzeSEPEmployees();

