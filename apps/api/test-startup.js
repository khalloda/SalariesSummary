// Test script to identify startup errors
console.log('Testing API server startup...\n');

try {
  console.log('1. Testing Prisma client...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  console.log('   ✓ Prisma client created');
  
  console.log('\n2. Testing route imports...');
  const { importRouter } = require('./src/routes/import.js');
  console.log('   ✓ importRouter imported');
  
  const { employeesRouter } = require('./src/routes/employees.js');
  console.log('   ✓ employeesRouter imported');
  
  const { reportsRouter } = require('./src/routes/reports.js');
  console.log('   ✓ reportsRouter imported');
  
  const { exportsRouter } = require('./src/routes/exports.js');
  console.log('   ✓ exportsRouter imported');
  
  console.log('\n3. Testing Express app creation...');
  const express = require('express');
  const app = express();
  console.log('   ✓ Express app created');
  
  console.log('\n✅ All imports successful!');
  console.log('\nThe issue might be at runtime. Check the actual server logs.');
  
  process.exit(0);
} catch (error) {
  console.error('\n❌ Error during startup test:');
  console.error(error);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}

