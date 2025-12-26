-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "employeeCode" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SalaryRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "monthName" TEXT NOT NULL,
    "basicSalary" REAL NOT NULL DEFAULT 0,
    "directAdditions" REAL NOT NULL DEFAULT 0,
    "indirectAdditions" REAL NOT NULL DEFAULT 0,
    "yearlyIncrease" REAL NOT NULL DEFAULT 0,
    "bonuses" REAL NOT NULL DEFAULT 0,
    "salaryDeductions" REAL NOT NULL DEFAULT 0,
    "grossDeductions" REAL NOT NULL DEFAULT 0,
    "gross" REAL NOT NULL DEFAULT 0,
    "net" REAL NOT NULL DEFAULT 0,
    "additionsBreakdown" TEXT,
    "deductionsBreakdown" TEXT,
    "paymentMethod" TEXT,
    "accountNumber" TEXT,
    "notes" TEXT,
    "sourceFile" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalaryRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "recordsImported" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_normalizedName_key" ON "Employee"("normalizedName");

-- CreateIndex
CREATE INDEX "Employee_normalizedName_idx" ON "Employee"("normalizedName");

-- CreateIndex
CREATE INDEX "SalaryRecord_employeeId_idx" ON "SalaryRecord"("employeeId");

-- CreateIndex
CREATE INDEX "SalaryRecord_year_month_idx" ON "SalaryRecord"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryRecord_employeeId_year_month_key" ON "SalaryRecord"("employeeId", "year", "month");

-- CreateIndex
CREATE INDEX "ImportLog_year_month_idx" ON "ImportLog"("year", "month");
