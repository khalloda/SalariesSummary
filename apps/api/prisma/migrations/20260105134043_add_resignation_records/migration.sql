-- CreateTable
CREATE TABLE "ResignationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "resignationDate" DATETIME NOT NULL,
    "jobTitle" TEXT,
    "department" TEXT,
    "category" TEXT,
    "reason" TEXT,
    "importedFrom" TEXT,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResignationRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ResignationRecord_employeeId_idx" ON "ResignationRecord"("employeeId");

-- CreateIndex
CREATE INDEX "ResignationRecord_resignationDate_idx" ON "ResignationRecord"("resignationDate");
