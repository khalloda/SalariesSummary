-- CreateTable
CREATE TABLE "PersonnelRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "criminalRecord" TEXT,
    "militaryCertificate" TEXT,
    "idCopy" BOOLEAN DEFAULT true,
    "educationCertificate" TEXT,
    "birthCertificate" TEXT,
    "recommendationLetter" BOOLEAN,
    "personalPhotos" BOOLEAN,
    "taxCard" BOOLEAN,
    "associationId" BOOLEAN,
    "form6" TEXT DEFAULT 'N/A',
    "laptopPcTablet" TEXT,
    "workStub" TEXT DEFAULT 'N/A',
    "insuranceStartDate" DATETIME,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sourceFile" TEXT,
    CONSTRAINT "PersonnelRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonnelRecord_employeeId_key" ON "PersonnelRecord"("employeeId");

-- CreateIndex
CREATE INDEX "PersonnelRecord_criminalRecord_idx" ON "PersonnelRecord"("criminalRecord");

-- CreateIndex
CREATE INDEX "PersonnelRecord_militaryCertificate_idx" ON "PersonnelRecord"("militaryCertificate");

-- CreateIndex
CREATE INDEX "PersonnelRecord_laptopPcTablet_idx" ON "PersonnelRecord"("laptopPcTablet");

-- CreateIndex
CREATE INDEX "PersonnelRecord_insuranceStartDate_idx" ON "PersonnelRecord"("insuranceStartDate");
