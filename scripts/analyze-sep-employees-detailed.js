#!/usr/bin/env node
/**
 * Detailed Analysis Script for SEPEmployees.xlsx - AllOffice Sheet
 * Analyzes the complex structure with sub-headers and merged cells
 */

import * as XLSX from 'xlsx';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sheetsDir = join(__dirname, '..', 'Sheets');
const filePath = join(sheetsDir, 'SEPEmployees.xlsx');
const outputFile = join(__dirname, '..', 'docs', 'SEP_EMPLOYEES_DETAILED_ANALYSIS.md');

function analyzeDetailed() {
  console.log('\n' + '='.repeat(80));
  console.log('DETAILED ANALYSIS: SEPEmployees.xlsx - AllOffice Sheet');
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

    const worksheet = workbook.Sheets['AllOffice'];
    
    // Get raw data
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: null
    });

    // Analyze structure
    console.log('📊 STRUCTURE ANALYSIS:\n');
    console.log(`Total Rows: ${rawData.length}`);
    console.log(`First 5 rows preview:\n`);
    rawData.slice(0, 5).forEach((row, idx) => {
      console.log(`Row ${idx + 1}: ${JSON.stringify(row.slice(0, 10))}`);
    });
    console.log('');

    // Identify header structure
    const headerAnalysis = analyzeHeaderStructure(rawData);
    
    // Get proper data (skip header rows)
    const dataStartRow = headerAnalysis.dataStartRow;
    const properHeaders = headerAnalysis.combinedHeaders;
    
    // Convert to objects with proper headers
    const objectData = [];
    for (let i = dataStartRow; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.every(cell => !cell || cell === '')) continue;
      
      const obj = {};
      properHeaders.forEach((header, idx) => {
        if (header && header !== '') {
          obj[header] = row[idx] !== undefined ? row[idx] : null;
        }
      });
      objectData.push(obj);
    }

    // Detailed analysis
    const analysis = {
      structure: headerAnalysis,
      data: objectData,
      statistics: calculateDetailedStatistics(objectData, properHeaders),
      dataQuality: analyzeDataQuality(objectData, properHeaders),
      relationships: analyzeRelationships(objectData)
    };

    // Generate detailed report
    const report = generateDetailedReport(analysis);
    writeFileSync(outputFile, report, 'utf-8');
    console.log(`✅ Detailed analysis report saved to: ${outputFile}\n`);

    // Print key findings
    printKeyFindings(analysis);

  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  }
}

function analyzeHeaderStructure(rawData) {
  // Row 0: Main headers
  // Row 1: Sub-headers (Division, Certificate, Section, etc.)
  // Row 2+: Data
  
  const mainHeaders = rawData[0] || [];
  const subHeaders = rawData[1] || [];
  
  // Combine headers intelligently
  const combinedHeaders = [];
  for (let i = 0; i < Math.max(mainHeaders.length, subHeaders.length); i++) {
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

  console.log('📋 HEADER STRUCTURE:\n');
  console.log('Main Headers (Row 1):');
  mainHeaders.forEach((h, i) => {
    if (h) console.log(`  ${XLSX.utils.encode_col(i)}: ${h}`);
  });
  console.log('\nSub Headers (Row 2):');
  subHeaders.forEach((h, i) => {
    if (h) console.log(`  ${XLSX.utils.encode_col(i)}: ${h}`);
  });
  console.log('\nCombined Headers:');
  combinedHeaders.forEach((h, i) => {
    if (h && h !== 'Column_' + (i + 1)) console.log(`  ${XLSX.utils.encode_col(i)}: ${h}`);
  });
  console.log('');

  return {
    mainHeaders,
    subHeaders,
    combinedHeaders,
    dataStartRow: 2 // Data starts from row 3 (index 2)
  };
}

function calculateDetailedStatistics(objectData, headers) {
  const stats = {};
  
  headers.forEach(header => {
    if (!header || header.startsWith('Column_')) return;
    
    const values = objectData
      .map(row => row[header])
      .filter(val => val !== null && val !== undefined && val !== '');

    const stat = {
      total: objectData.length,
      filled: values.length,
      empty: objectData.length - values.length,
      fillRate: ((values.length / objectData.length) * 100).toFixed(2) + '%',
      uniqueValues: new Set(values).size
    };

    // Numeric analysis
    const numericValues = values
      .map(v => {
        if (typeof v === 'number') return v;
        const num = parseFloat(String(v).replace(/[^\d.-]/g, ''));
        return isNaN(num) ? null : num;
      })
      .filter(v => v !== null);

    if (numericValues.length > 0) {
      stat.numeric = {
        count: numericValues.length,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        sum: numericValues.reduce((a, b) => a + b, 0),
        avg: (numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(2),
        median: calculateMedian(numericValues).toFixed(2)
      };
    }

    // Date analysis
    const dateValues = values.filter(v => v instanceof Date || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)));
    if (dateValues.length > 0) {
      stat.hasDates = true;
      stat.dateCount = dateValues.length;
    }

    // Text analysis
    const textValues = values.filter(v => typeof v === 'string' && !dateValues.includes(v));
    if (textValues.length > 0) {
      stat.textCount = textValues.length;
      stat.avgTextLength = (textValues.reduce((sum, v) => sum + v.length, 0) / textValues.length).toFixed(1);
    }

    stats[header] = stat;
  });

  return stats;
}

function analyzeDataQuality(objectData, headers) {
  const quality = {
    issues: [],
    warnings: [],
    completeness: {},
    consistency: {}
  };

  // Check for missing critical fields
  const criticalFields = ['ID', 'Category', 'Name in English', 'Department', 'Status'];
  criticalFields.forEach(field => {
    const found = headers.find(h => h && h.includes(field));
    if (found) {
      const emptyCount = objectData.filter(row => !row[found] || row[found] === '').length;
      if (emptyCount > 0) {
        quality.issues.push(`Missing ${field} in ${emptyCount} records`);
      }
    }
  });

  // Check for duplicates
  const idField = headers.find(h => h && h.includes('ID') && !h.includes('Social') && !h.includes('Tax'));
  if (idField) {
    const ids = objectData.map(row => row[idField]).filter(id => id);
    const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    if (duplicates.length > 0) {
      quality.warnings.push(`Duplicate IDs found: ${[...new Set(duplicates)].join(', ')}`);
    }
  }

  // Check date consistency
  const dateFields = headers.filter(h => h && (h.includes('Date') || h.includes('Birth')));
  dateFields.forEach(field => {
    const dates = objectData
      .map(row => row[field])
      .filter(d => d)
      .map(d => {
        if (d instanceof Date) return d;
        if (typeof d === 'string') {
          const parsed = new Date(d);
          return isNaN(parsed.getTime()) ? null : parsed;
        }
        return null;
      })
      .filter(d => d !== null);

    if (dates.length > 0) {
      const years = dates.map(d => d.getFullYear());
      const minYear = Math.min(...years);
      const maxYear = Math.max(...years);
      
      if (field.includes('Birth')) {
        if (maxYear > new Date().getFullYear()) {
          quality.warnings.push(`Future birth dates found in ${field}`);
        }
        if (minYear < 1900) {
          quality.warnings.push(`Very old birth dates found in ${field} (before 1900)`);
        }
      }
    }
  });

  return quality;
}

function analyzeRelationships(objectData) {
  const relationships = {
    categoryDistribution: {},
    departmentDistribution: {},
    jobTitleDistribution: {},
    statusDistribution: {},
    contractTypeDistribution: {}
  };

  // Category distribution
  const categoryField = Object.keys(objectData[0] || {}).find(k => k.includes('Category'));
  if (categoryField) {
    objectData.forEach(row => {
      const cat = row[categoryField];
      if (cat) relationships.categoryDistribution[cat] = (relationships.categoryDistribution[cat] || 0) + 1;
    });
  }

  // Department distribution
  const deptField = Object.keys(objectData[0] || {}).find(k => k.includes('Department'));
  if (deptField) {
    objectData.forEach(row => {
      const dept = row[deptField];
      if (dept) relationships.departmentDistribution[dept] = (relationships.departmentDistribution[dept] || 0) + 1;
    });
  }

  // Job Title distribution
  const jobField = Object.keys(objectData[0] || {}).find(k => k.includes('Job Title'));
  if (jobField) {
    objectData.forEach(row => {
      const job = row[jobField];
      if (job) relationships.jobTitleDistribution[job] = (relationships.jobTitleDistribution[job] || 0) + 1;
    });
  }

  // Status distribution
  const statusField = Object.keys(objectData[0] || {}).find(k => k.includes('Status'));
  if (statusField) {
    objectData.forEach(row => {
      const status = row[statusField];
      if (status) relationships.statusDistribution[status] = (relationships.statusDistribution[status] || 0) + 1;
    });
  }

  // Contract Type distribution
  const contractField = Object.keys(objectData[0] || {}).find(k => k.includes('Contract'));
  if (contractField) {
    objectData.forEach(row => {
      const contract = row[contractField];
      if (contract && contract !== '-') {
        relationships.contractTypeDistribution[contract] = (relationships.contractTypeDistribution[contract] || 0) + 1;
      }
    });
  }

  return relationships;
}

function calculateMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function printKeyFindings(analysis) {
  console.log('\n' + '='.repeat(80));
  console.log('KEY FINDINGS');
  console.log('='.repeat(80));
  
  console.log(`\n📊 Total Records: ${analysis.data.length}`);
  
  if (Object.keys(analysis.relationships.categoryDistribution).length > 0) {
    console.log(`\n👥 Category Distribution:`);
    Object.entries(analysis.relationships.categoryDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count} (${((count / analysis.data.length) * 100).toFixed(1)}%)`);
      });
  }

  if (Object.keys(analysis.relationships.departmentDistribution).length > 0) {
    console.log(`\n🏢 Department Distribution:`);
    Object.entries(analysis.relationships.departmentDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([dept, count]) => {
        console.log(`   ${dept}: ${count} (${((count / analysis.data.length) * 100).toFixed(1)}%)`);
      });
  }

  if (Object.keys(analysis.relationships.statusDistribution).length > 0) {
    console.log(`\n📈 Status Distribution:`);
    Object.entries(analysis.relationships.statusDistribution)
      .forEach(([status, count]) => {
        console.log(`   ${status}: ${count} (${((count / analysis.data.length) * 100).toFixed(1)}%)`);
      });
  }

  if (analysis.dataQuality.issues.length > 0) {
    console.log(`\n⚠️  Data Quality Issues:`);
    analysis.dataQuality.issues.forEach(issue => console.log(`   - ${issue}`));
  }

  if (analysis.dataQuality.warnings.length > 0) {
    console.log(`\n⚠️  Data Quality Warnings:`);
    analysis.dataQuality.warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

function generateDetailedReport(analysis) {
  let report = `# Detailed Analysis: SEPEmployees.xlsx - AllOffice Sheet\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `---\n\n`;

  // Overview
  report += `## Overview\n\n`;
  report += `- **Total Records:** ${analysis.data.length}\n`;
  report += `- **Data Start Row:** ${analysis.structure.dataStartRow + 1}\n`;
  report += `- **Total Headers:** ${analysis.structure.combinedHeaders.filter(h => h && !h.startsWith('Column_')).length}\n\n`;

  // Header Structure
  report += `## Header Structure\n\n`;
  report += `### Main Headers (Row 1)\n\n`;
  report += `| Column | Header |\n`;
  report += `|--------|--------|\n`;
  analysis.structure.mainHeaders.forEach((h, i) => {
    if (h) report += `| ${XLSX.utils.encode_col(i)} | ${h} |\n`;
  });
  report += `\n`;

  report += `### Sub Headers (Row 2)\n\n`;
  report += `| Column | Sub Header |\n`;
  report += `|--------|------------|\n`;
  analysis.structure.subHeaders.forEach((h, i) => {
    if (h) report += `| ${XLSX.utils.encode_col(i)} | ${h} |\n`;
  });
  report += `\n`;

  // Relationships
  report += `## Data Distribution\n\n`;
  
  if (Object.keys(analysis.relationships.categoryDistribution).length > 0) {
    report += `### Category Distribution\n\n`;
    report += `| Category | Count | Percentage |\n`;
    report += `|----------|-------|------------|\n`;
    Object.entries(analysis.relationships.categoryDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        report += `| ${cat} | ${count} | ${((count / analysis.data.length) * 100).toFixed(2)}% |\n`;
      });
    report += `\n`;
  }

  if (Object.keys(analysis.relationships.departmentDistribution).length > 0) {
    report += `### Department Distribution\n\n`;
    report += `| Department | Count | Percentage |\n`;
    report += `|------------|-------|------------|\n`;
    Object.entries(analysis.relationships.departmentDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([dept, count]) => {
        report += `| ${dept} | ${count} | ${((count / analysis.data.length) * 100).toFixed(2)}% |\n`;
      });
    report += `\n`;
  }

  if (Object.keys(analysis.relationships.jobTitleDistribution).length > 0) {
    report += `### Job Title Distribution\n\n`;
    report += `| Job Title | Count | Percentage |\n`;
    report += `|-----------|-------|------------|\n`;
    Object.entries(analysis.relationships.jobTitleDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([job, count]) => {
        report += `| ${job} | ${count} | ${((count / analysis.data.length) * 100).toFixed(2)}% |\n`;
      });
    report += `\n`;
  }

  if (Object.keys(analysis.relationships.statusDistribution).length > 0) {
    report += `### Status Distribution\n\n`;
    report += `| Status | Count | Percentage |\n`;
    report += `|--------|-------|------------|\n`;
    Object.entries(analysis.relationships.statusDistribution)
      .forEach(([status, count]) => {
        report += `| ${status} | ${count} | ${((count / analysis.data.length) * 100).toFixed(2)}% |\n`;
      });
    report += `\n`;
  }

  if (Object.keys(analysis.relationships.contractTypeDistribution).length > 0) {
    report += `### Contract Type Distribution\n\n`;
    report += `| Contract Type | Count | Percentage |\n`;
    report += `|---------------|-------|------------|\n`;
    Object.entries(analysis.relationships.contractTypeDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([contract, count]) => {
        report += `| ${contract} | ${count} | ${((count / analysis.data.length) * 100).toFixed(2)}% |\n`;
      });
    report += `\n`;
  }

  // Column Statistics
  report += `## Column Statistics\n\n`;
  report += `| Column | Filled | Empty | Fill Rate | Unique Values | Min | Max | Avg |\n`;
  report += `|--------|--------|-------|-----------|----------------|-----|-----|-----|\n`;
  Object.entries(analysis.statistics)
    .filter(([header]) => header && !header.startsWith('Column_'))
    .forEach(([header, stat]) => {
      report += `| ${header} | ${stat.filled} | ${stat.empty} | ${stat.fillRate} | ${stat.uniqueValues} | `;
      if (stat.numeric) {
        report += `${stat.numeric.min.toLocaleString()} | ${stat.numeric.max.toLocaleString()} | ${stat.numeric.avg} |\n`;
      } else {
        report += `- | - | - |\n`;
      }
    });
  report += `\n`;

  // Data Quality
  report += `## Data Quality Assessment\n\n`;
  if (analysis.dataQuality.issues.length > 0) {
    report += `### Issues\n\n`;
    analysis.dataQuality.issues.forEach(issue => {
      report += `- ⚠️ ${issue}\n`;
    });
    report += `\n`;
  }

  if (analysis.dataQuality.warnings.length > 0) {
    report += `### Warnings\n\n`;
    analysis.dataQuality.warnings.forEach(warning => {
      report += `- ⚠️ ${warning}\n`;
    });
    report += `\n`;
  }

  if (analysis.dataQuality.issues.length === 0 && analysis.dataQuality.warnings.length === 0) {
    report += `✅ No major data quality issues detected.\n\n`;
  }

  // Sample Data
  report += `## Sample Data (First 5 Records)\n\n`;
  if (analysis.data.length > 0) {
    const sampleHeaders = Object.keys(analysis.data[0]).filter(h => h && !h.startsWith('Column_'));
    report += `| ${sampleHeaders.slice(0, 10).join(' | ')} |\n`;
    report += `|${sampleHeaders.slice(0, 10).map(() => '---').join('|')}|\n`;
    analysis.data.slice(0, 5).forEach(row => {
      const values = sampleHeaders.slice(0, 10).map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'number') return val.toLocaleString();
        if (val instanceof Date) return val.toISOString().split('T')[0];
        return String(val).substring(0, 30); // Truncate
      });
      report += `| ${values.join(' | ')} |\n`;
    });
  }
  report += `\n`;

  // Field Mapping Recommendations
  report += `## Field Mapping Recommendations\n\n`;
  report += `Based on the analysis, here are the recommended field mappings for integration:\n\n`;
  report += `| Source Field | Recommended Mapping | Notes |\n`;
  report += `|--------------|---------------------|-------|\n`;
  report += `| ID | employeeCode | Employee identifier |\n`;
  report += `| Category | category | Partner/Lawyer/Admin |\n`;
  report += `| Name in English | name | Primary name field |\n`;
  report += `| الاسم بالعربية | nameArabic | Arabic name |\n`;
  report += `| Job Title | jobTitle | Position title |\n`;
  report += `| Department | department | Department assignment |\n`;
  report += `| Date of Birth | dateOfBirth | Birth date |\n`;
  report += `| Joining Date | joiningDate | Employment start date |\n`;
  report += `| Status | status | Active/Resigned |\n`;
  report += `| Experience In | experienceYears | Years of experience |\n`;
  report += `| Experience Out | experienceMonths | Months of experience |\n`;
  report += `\n`;

  return report;
}

// Run analysis
analyzeDetailed();

