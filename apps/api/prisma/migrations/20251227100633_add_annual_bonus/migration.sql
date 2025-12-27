-- CreateTable
CREATE TABLE "AnnualBonus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "netSalary" REAL NOT NULL,
    "grossSalary" REAL NOT NULL,
    "bonusAmount" REAL NOT NULL DEFAULT 0,
    "bonusFirstHalf" REAL,
    "bonusSecondHalf" REAL,
    "previousYearBonus" REAL,
    "reflectedInMonths" REAL,
    "reflectedInPercent" REAL,
    "remainingFromPrevious" REAL,
    "yearComparison" REAL,
    "notes" TEXT,
    "sourceFile" TEXT,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnnualBonus_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AnnualBonus_year_idx" ON "AnnualBonus"("year");

-- CreateIndex
CREATE INDEX "AnnualBonus_employeeId_idx" ON "AnnualBonus"("employeeId");

-- CreateIndex
CREATE INDEX "AnnualBonus_year_employeeId_idx" ON "AnnualBonus"("year", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnualBonus_employeeId_year_key" ON "AnnualBonus"("employeeId", "year");
