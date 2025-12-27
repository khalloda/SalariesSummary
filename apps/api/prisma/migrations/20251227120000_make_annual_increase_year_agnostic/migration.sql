-- Migrate from year-specific fields (2024/2025) to year-agnostic fields
-- This migration preserves existing data by mapping:
-- netSalary2024 -> previousYearNet
-- netSalary2025 -> currentYearNet
-- grossSalary2024 -> previousYearGross
-- grossSalary2025 -> currentYearGross
-- currentVs2025Net -> annualIncreaseNet
-- currentVs2025Gross -> annualIncreaseGross

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_AnnualBonus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "previousYearNet" REAL NOT NULL DEFAULT 0,
    "previousYearGross" REAL NOT NULL DEFAULT 0,
    "currentYearNet" REAL NOT NULL DEFAULT 0,
    "currentYearGross" REAL NOT NULL DEFAULT 0,
    "annualIncreaseNet" REAL NOT NULL DEFAULT 0,
    "annualIncreaseGross" REAL NOT NULL DEFAULT 0,
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

-- Migrate data: map old fields to new fields
INSERT INTO "new_AnnualBonus" (
    "id", "employeeId", "year",
    "previousYearNet", "previousYearGross",
    "currentYearNet", "currentYearGross",
    "annualIncreaseNet", "annualIncreaseGross",
    "netSalary", "grossSalary",
    "bonusAmount", "bonusFirstHalf", "bonusSecondHalf",
    "previousYearBonus", "reflectedInMonths", "reflectedInPercent",
    "remainingFromPrevious", "yearComparison",
    "notes", "sourceFile", "importedAt"
)
SELECT 
    "id", "employeeId", "year",
    COALESCE("netSalary2024", 0) as "previousYearNet",
    COALESCE("grossSalary2024", 0) as "previousYearGross",
    COALESCE("netSalary2025", 0) as "currentYearNet",
    COALESCE("grossSalary2025", 0) as "currentYearGross",
    COALESCE("currentVs2025Net", 0) as "annualIncreaseNet",
    COALESCE("currentVs2025Gross", 0) as "annualIncreaseGross",
    "netSalary", "grossSalary",
    "bonusAmount", "bonusFirstHalf", "bonusSecondHalf",
    "previousYearBonus", "reflectedInMonths", "reflectedInPercent",
    "remainingFromPrevious", "yearComparison",
    "notes", "sourceFile", "importedAt"
FROM "AnnualBonus";

DROP TABLE "AnnualBonus";
ALTER TABLE "new_AnnualBonus" RENAME TO "AnnualBonus";

CREATE INDEX "AnnualBonus_year_idx" ON "AnnualBonus"("year");
CREATE INDEX "AnnualBonus_employeeId_idx" ON "AnnualBonus"("employeeId");
CREATE INDEX "AnnualBonus_year_employeeId_idx" ON "AnnualBonus"("year", "employeeId");
CREATE UNIQUE INDEX "AnnualBonus_employeeId_year_key" ON "AnnualBonus"("employeeId", "year");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

