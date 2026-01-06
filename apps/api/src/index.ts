console.log('📦 Starting API server...');
console.log('📦 Loading dependencies...');

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

console.log('📦 Loading routes...');
import { importRouter } from './routes/import.js';
import { authRouter } from './routes/auth.js';
import { employeesRouter } from './routes/employees.js';
import { employeesCrudRouter } from './routes/employees-crud.js';
import { contractsCrudRouter } from './routes/contracts-crud.js';
import { salariesCrudRouter } from './routes/salaries-crud.js';
import { bonusesCrudRouter } from './routes/bonuses-crud.js';
import { bulkSalaryRouter } from './routes/bulk-salary.js';
import { reportsRouter } from './routes/reports.js';
import { exportsRouter } from './routes/exports.js';
import { annualBonusExportRouter } from './routes/annual-bonus-export.js';
import { monthlySummaryExportRouter } from './routes/monthly-summary-export.js';
import { additionsDeductionsExportRouter } from './routes/additions-deductions-export.js';
import { employeeCardExportRouter } from './routes/employee-card-export.js';
import { configRouter } from './routes/config.js';
import { personnelRouter } from './routes/personnel.js';
import { personnelCrudRouter } from './routes/personnel-crud.js';
import { personnelDiagnosticsRouter } from './routes/personnel-diagnostics.js';
import { personnelExportRouter } from './routes/personnel-export.js';
import notificationsRouter from './routes/notifications.js';
import { usersRouter } from './routes/users.js';
import { rolesRouter } from './routes/roles.js';
import { startNotificationScheduler } from './services/cron-scheduler.js';

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
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/import', importRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/employees', employeesCrudRouter); // CRUD operations
app.use('/api/contracts', contractsCrudRouter);
app.use('/api/salaries', salariesCrudRouter);
app.use('/api/bonuses', bonusesCrudRouter);
app.use('/api/bulk-salary', bulkSalaryRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/exports', exportsRouter);
app.use('/api/exports', annualBonusExportRouter);
app.use('/api/exports', monthlySummaryExportRouter);
app.use('/api/exports', additionsDeductionsExportRouter);
app.use('/api/exports', employeeCardExportRouter);
app.use('/api/config', configRouter);
app.use('/api/personnel', personnelRouter);
app.use('/api/personnel', personnelCrudRouter); // CRUD operations
app.use('/api/personnel-diagnostics', personnelDiagnosticsRouter);
app.use('/api/exports', personnelExportRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);

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
    
    // Start notification scheduler
    startNotificationScheduler();
  });
} catch (error: any) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
