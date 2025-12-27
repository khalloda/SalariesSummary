-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AnnualBonus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "netSalary2024" REAL NOT NULL DEFAULT 0,
    "grossSalary2024" REAL NOT NULL DEFAULT 0,
    "netSalary2025" REAL NOT NULL DEFAULT 0,
    "grossSalary2025" REAL NOT NULL DEFAULT 0,
    "currentVs2025Net" REAL NOT NULL DEFAULT 0,
    "currentVs2025Gross" REAL NOT NULL DEFAULT 0,
    "netSalary" REAL NOT NULL DEFAULT 0,
    "grossSalary" REAL NOT NULL DEFAULT 0,
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
INSERT INTO "new_AnnualBonus" ("bonusAmount", "bonusFirstHalf", "bonusSecondHalf", "employeeId", "grossSalary", "id", "importedAt", "netSalary", "notes", "previousYearBonus", "reflectedInMonths", "reflectedInPercent", "remainingFromPrevious", "sourceFile", "year", "yearComparison") SELECT "bonusAmount", "bonusFirstHalf", "bonusSecondHalf", "employeeId", "grossSalary", "id", "importedAt", "netSalary", "notes", "previousYearBonus", "reflectedInMonths", "reflectedInPercent", "remainingFromPrevious", "sourceFile", "year", "yearComparison" FROM "AnnualBonus";
DROP TABLE "AnnualBonus";
ALTER TABLE "new_AnnualBonus" RENAME TO "AnnualBonus";
CREATE INDEX "AnnualBonus_year_idx" ON "AnnualBonus"("year");
CREATE INDEX "AnnualBonus_employeeId_idx" ON "AnnualBonus"("employeeId");
CREATE INDEX "AnnualBonus_year_employeeId_idx" ON "AnnualBonus"("year", "employeeId");
CREATE UNIQUE INDEX "AnnualBonus_employeeId_year_key" ON "AnnualBonus"("employeeId", "year");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
