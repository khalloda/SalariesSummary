-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "personnelData" TEXT;
ALTER TABLE "Employee" ADD COLUMN "resignationDate" DATETIME;
ALTER TABLE "Employee" ADD COLUMN "resignationReason" TEXT;

-- CreateTable
CREATE TABLE "ContractRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT,
    "employeeName" TEXT,
    "employeeCode" TEXT,
    "contractDate" DATETIME,
    "contractDuration" TEXT,
    "comments" TEXT,
    "sourceFile" TEXT,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContractRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ContractRecord_employeeId_idx" ON "ContractRecord"("employeeId");

-- CreateIndex
CREATE INDEX "ContractRecord_employeeName_idx" ON "ContractRecord"("employeeName");

-- CreateIndex
CREATE INDEX "ContractRecord_employeeCode_idx" ON "ContractRecord"("employeeCode");

-- CreateIndex
CREATE INDEX "ContractRecord_contractDate_idx" ON "ContractRecord"("contractDate");
