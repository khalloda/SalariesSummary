/**
 * Deep Schema Analysis Script
 * Analyzes Excel workbook structures, formulas, and relationships
 */

import XLSX from 'xlsx';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Sheets directory
const SHEETS_DIR = join(__dirname, '..', 'Sheets');

// Get password if exists
function getPassword() {
  const passFile = join(SHEETS_DIR, 'pass.txt');
  if (existsSync(passFile)) {
    return readFileSync(passFile, 'utf-8').trim();
  }
  return null;
}

// Analyze a single workbook deeply
function analyzeWorkbook(filePath, fileName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Analyzing: ${fileName}`);
  console.log('='.repeat(80));
  
  const analysis = {
    fileName,
    sheets: {},
    formulas: [],
    relationships: [],
    issues: []
  };
  
  try {
    const data = readFileSync(filePath);
    const workbook = XLSX.read(data, {
      type: 'buffer',
      cellDates: true,
      cellFormulas: true, // Important: read formulas
      cellStyles: false,
      cellNF: false,
      cellText: false
    });
    
    console.log(`\nWorkbook has ${workbook.SheetNames.length} sheets:`, workbook.SheetNames);
    
    // Analyze each sheet
    for (const sheetName of workbook.SheetNames) {
      // Skip Pay Clip sheets
      if (sheetName.includes('Pay Clip')) {
        console.log(`\nSkipping ${sheetName}`);
        continue;
      }
      
      console.log(`\n${'-'.repeat(80)}`);
      console.log(`Sheet: ${sheetName}`);
      console.log('-'.repeat(80));
      
      const worksheet = workbook.Sheets[sheetName];
      const sheetAnalysis = analyzeSheet(worksheet, sheetName, fileName);
      analysis.sheets[sheetName] = sheetAnalysis;
    }
    
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error.message);
    analysis.issues.push(`Error reading file: ${error.message}`);
  }
  
  return analysis;
}

// Analyze a single sheet deeply
function analyzeSheet(worksheet, sheetName, fileName) {
  const analysis = {
    name: sheetName,
    dimensions: worksheet['!ref'] || 'No dimensions',
    headerRows: [],
    dataRows: [],
    columns: {},
    formulas: [],
    mergedCells: [],
    dataTypes: {},
    sampleData: []
  };
  
  // Get raw JSON data
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: null
  });
  
  // Get cell references for formulas
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Analyze first 20 rows in detail
  const rowsToAnalyze = Math.min(20, jsonData.length);
  
  console.log(`\nSheet dimensions: ${worksheet['!ref']}`);
  console.log(`Total rows: ${jsonData.length}`);
  console.log(`Analyzing first ${rowsToAnalyze} rows in detail...`);
  
  // Find header row
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    if (!row) continue;
    
    const rowText = row.map(cell => {
      if (cell && typeof cell === 'object' && 'text' in cell) {
        return cell.text?.toString().trim() || '';
      }
      return cell?.toString().trim() || '';
    }).join(' ').toLowerCase();
    
    const headerKeywords = ['الاسماء', 'name', 'صافي', 'salary', 'gross', 'net', 
                            'الإجمالي', 'الصافى', 'مباشرة', 'direct', 'indirect'];
    const keywordCount = headerKeywords.filter(kw => rowText.includes(kw.toLowerCase())).length;
    
    if (keywordCount >= 3) {
      headerRowIndex = i;
      break;
    }
  }
  
  if (headerRowIndex >= 0) {
    console.log(`\nHeader row found at index: ${headerRowIndex}`);
    analysis.headerRows.push(headerRowIndex);
    
    const headerRow = jsonData[headerRowIndex];
    console.log(`\nHeader row (first 15 columns):`);
    headerRow.slice(0, 15).forEach((cell, idx) => {
      const cellValue = cell && typeof cell === 'object' && 'text' in cell 
        ? cell.text?.toString().trim() 
        : cell?.toString().trim() || '';
      if (cellValue) {
        console.log(`  [${idx}]: "${cellValue}"`);
        analysis.columns[idx] = {
          index: idx,
          header: cellValue,
          dataType: 'unknown',
          sampleValues: []
        };
      }
    });
  }
  
  // Analyze formulas in the sheet
  console.log(`\nAnalyzing formulas...`);
  for (let R = range.s.r; R <= Math.min(range.e.r, range.s.r + 50); R++) {
    for (let C = range.s.c; C <= Math.min(range.e.c, 20); C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.f) {
        // Cell has a formula
        const formula = {
          address: cellAddress,
          row: R + 1,
          col: C + 1,
          formula: cell.f,
          value: cell.v,
          sheet: sheetName
        };
        analysis.formulas.push(formula);
        console.log(`  Formula at ${cellAddress}: ${cell.f} = ${cell.v}`);
      }
    }
  }
  
  // Analyze merged cells
  if (worksheet['!merges']) {
    console.log(`\nFound ${worksheet['!merges'].length} merged cell ranges`);
    analysis.mergedCells = worksheet['!merges'].map(merge => ({
      start: XLSX.utils.encode_cell(merge.s),
      end: XLSX.utils.encode_cell(merge.e),
      range: `${XLSX.utils.encode_cell(merge.s)}:${XLSX.utils.encode_cell(merge.e)}`
    }));
  }
  
  // Analyze sample data rows (after header)
  if (headerRowIndex >= 0 && headerRowIndex < jsonData.length - 1) {
    const sampleRows = Math.min(5, jsonData.length - headerRowIndex - 1);
    console.log(`\nSample data rows (first ${sampleRows} after header):`);
    
    for (let i = headerRowIndex + 1; i < headerRowIndex + 1 + sampleRows; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      const rowData = {};
      Object.keys(analysis.columns).forEach(colIdx => {
        const col = analysis.columns[colIdx];
        const value = row[parseInt(colIdx)];
        if (value !== null && value !== undefined) {
          const cellValue = value && typeof value === 'object' && 'text' in value
            ? value.text
            : value;
          
          rowData[col.header] = cellValue;
          
          // Track data types
          if (!col.sampleValues.includes(cellValue)) {
            col.sampleValues.push(cellValue);
          }
          
          // Determine data type
          if (typeof cellValue === 'number') {
            col.dataType = 'number';
          } else if (typeof cellValue === 'string') {
            if (cellValue.match(/^\d+$/)) {
              col.dataType = 'number_string';
            } else {
              col.dataType = 'string';
            }
          }
        }
      });
      
      if (Object.keys(rowData).length > 0) {
        analysis.sampleData.push({
          rowIndex: i,
          data: rowData
        });
        console.log(`  Row ${i}:`, JSON.stringify(rowData, null, 2).substring(0, 200));
      }
    }
  }
  
  // Analyze column data types and patterns
  console.log(`\nColumn analysis:`);
  Object.keys(analysis.columns).forEach(colIdx => {
    const col = analysis.columns[colIdx];
    console.log(`  Column [${colIdx}] "${col.header}":`);
    console.log(`    Type: ${col.dataType}`);
    console.log(`    Sample values: ${col.sampleValues.slice(0, 3).join(', ')}`);
  });
  
  return analysis;
}

// Generate markdown documentation
function generateMarkdown(allAnalyses) {
  let md = `# Excel Workbook Deep Schema Analysis\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `This document provides a comprehensive analysis of the Excel workbook structures, formulas, and data mappings.\n\n`;
  
  md += `## Overview\n\n`;
  md += `Total files analyzed: ${allAnalyses.length}\n\n`;
  
  // Group by month
  const byMonth = {};
  allAnalyses.forEach(analysis => {
    const monthMatch = analysis.fileName.match(/^(\d{1,2})/);
    if (monthMatch) {
      const month = parseInt(monthMatch[1]);
      if (!byMonth[month]) byMonth[month] = [];
      byMonth[month].push(analysis);
    }
  });
  
  md += `## Files by Month\n\n`;
  Object.keys(byMonth).sort((a, b) => parseInt(a) - parseInt(b)).forEach(month => {
    md += `- Month ${month}: ${byMonth[month].map(a => a.fileName).join(', ')}\n`;
  });
  md += `\n`;
  
  // Detailed analysis for each file
  allAnalyses.forEach(analysis => {
    md += `## ${analysis.fileName}\n\n`;
    
    if (analysis.issues.length > 0) {
      md += `### Issues\n\n`;
      analysis.issues.forEach(issue => {
        md += `- ⚠️ ${issue}\n`;
      });
      md += `\n`;
    }
    
    Object.keys(analysis.sheets).forEach(sheetName => {
      const sheet = analysis.sheets[sheetName];
      md += `### Sheet: ${sheetName}\n\n`;
      
      md += `**Dimensions:** ${sheet.dimensions}\n\n`;
      md += `**Header Row:** Index ${sheet.headerRows[0] || 'Not found'}\n\n`;
      
      if (sheet.mergedCells.length > 0) {
        md += `**Merged Cells:** ${sheet.mergedCells.length} ranges\n\n`;
        sheet.mergedCells.slice(0, 10).forEach(merge => {
          md += `- ${merge.range}\n`;
        });
        md += `\n`;
      }
      
      md += `#### Column Mapping\n\n`;
      md += `| Index | Header | Data Type | Sample Values |\n`;
      md += `|-------|--------|-----------|---------------|\n`;
      
      Object.keys(sheet.columns).sort((a, b) => parseInt(a) - parseInt(b)).forEach(colIdx => {
        const col = sheet.columns[colIdx];
        const samples = col.sampleValues.slice(0, 3).map(v => 
          typeof v === 'string' && v.length > 20 ? v.substring(0, 20) + '...' : String(v)
        ).join(', ');
        md += `| ${colIdx} | ${col.header} | ${col.dataType} | ${samples} |\n`;
      });
      md += `\n`;
      
      if (sheet.formulas.length > 0) {
        md += `#### Formulas\n\n`;
        md += `| Address | Formula | Value |\n`;
        md += `|---------|---------|-------|\n`;
        sheet.formulas.slice(0, 20).forEach(formula => {
          md += `| ${formula.address} | \`${formula.formula}\` | ${formula.value} |\n`;
        });
        md += `\n`;
      }
      
      if (sheet.sampleData.length > 0) {
        md += `#### Sample Data\n\n`;
        sheet.sampleData.slice(0, 3).forEach((sample, idx) => {
          md += `**Row ${sample.rowIndex}:**\n\n`;
          md += `\`\`\`json\n${JSON.stringify(sample.data, null, 2)}\n\`\`\`\n\n`;
        });
      }
    });
    
    md += `\n---\n\n`;
  });
  
  // Summary and recommendations
  md += `## Summary and Recommendations\n\n`;
  
  // Find common patterns
  const allSheets = {};
  allAnalyses.forEach(analysis => {
    Object.keys(analysis.sheets).forEach(sheetName => {
      if (!allSheets[sheetName]) {
        allSheets[sheetName] = {
          name: sheetName,
          files: [],
          columnMappings: {}
        };
      }
      allSheets[sheetName].files.push(analysis.fileName);
      
      const sheet = analysis.sheets[sheetName];
      Object.keys(sheet.columns).forEach(colIdx => {
        const col = sheet.columns[colIdx];
        if (!allSheets[sheetName].columnMappings[colIdx]) {
          allSheets[sheetName].columnMappings[colIdx] = {
            index: colIdx,
            headers: new Set(),
            dataTypes: new Set()
          };
        }
        allSheets[sheetName].columnMappings[colIdx].headers.add(col.header);
        allSheets[sheetName].columnMappings[colIdx].dataTypes.add(col.dataType);
      });
    });
  });
  
  md += `### Consistent Column Mappings\n\n`;
  Object.keys(allSheets).forEach(sheetName => {
    md += `#### ${sheetName}\n\n`;
    md += `Found in ${allSheets[sheetName].files.length} file(s)\n\n`;
    md += `| Index | Headers (all variations) | Data Types |\n`;
    md += `|-------|---------------------------|------------|\n`;
    
    Object.keys(allSheets[sheetName].columnMappings).sort((a, b) => parseInt(a) - parseInt(b)).forEach(colIdx => {
      const mapping = allSheets[sheetName].columnMappings[colIdx];
      const headers = Array.from(mapping.headers).join(' / ');
      const types = Array.from(mapping.dataTypes).join(', ');
      md += `| ${colIdx} | ${headers} | ${types} |\n`;
    });
    md += `\n`;
  });
  
  return md;
}

// Main execution
async function main() {
  console.log('Starting deep schema analysis...');
  console.log(`Sheets directory: ${SHEETS_DIR}`);
  
  if (!existsSync(SHEETS_DIR)) {
    console.error(`Sheets directory not found: ${SHEETS_DIR}`);
    process.exit(1);
  }
  
  const { readdir } = await import('fs/promises');
  const files = await readdir(SHEETS_DIR);
  const excelFiles = files.filter(f => f.endsWith('.xlsx') && !f.includes('~$'));
  
  console.log(`\nFound ${excelFiles.length} Excel files to analyze`);
  
  const allAnalyses = [];
  
  // Analyze sample months: January, June, October, December
  const sampleMonths = ['01', '06', '10', '12'];
  const filesToAnalyze = excelFiles.filter(f => {
    const monthMatch = f.match(/^(\d{1,2})/);
    return monthMatch && sampleMonths.includes(monthMatch[1]);
  });
  
  console.log(`\nAnalyzing sample months: ${filesToAnalyze.join(', ')}`);
  
  for (const fileName of filesToAnalyze) {
    const filePath = join(SHEETS_DIR, fileName);
    const analysis = analyzeWorkbook(filePath, fileName);
    allAnalyses.push(analysis);
  }
  
  // Generate markdown
  const md = generateMarkdown(allAnalyses);
  
  // Write to file
  const outputPath = join(__dirname, '..', 'docs', 'deep_schema_analysis.md');
  const { writeFileSync, mkdirSync } = await import('fs');
  const { dirname } = await import('path');
  
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, md, 'utf-8');
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Analysis complete!`);
  console.log(`Markdown document written to: ${outputPath}`);
  console.log('='.repeat(80));
}

main().catch(console.error);

