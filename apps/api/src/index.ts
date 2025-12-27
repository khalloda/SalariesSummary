console.log('📦 Starting API server...');
console.log('📦 Loading dependencies...');

import express from 'express';
import cors from 'cors';

console.log('📦 Loading routes...');
import { importRouter } from './routes/import.js';
import { employeesRouter } from './routes/employees.js';
import { reportsRouter } from './routes/reports.js';
import { exportsRouter } from './routes/exports.js';

console.log('📦 Routes loaded successfully');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - allow salaries.local
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://salaries.local',
    'http://www.salaries.local'
  ],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/import', importRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/exports', exportsRouter);

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

try {
  app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
    console.log(`📡 CORS enabled for: salaries.local, localhost:3000`);
  });
} catch (error: any) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
