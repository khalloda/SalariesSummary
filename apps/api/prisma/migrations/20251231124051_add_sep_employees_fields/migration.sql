-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "additionalData" TEXT;
ALTER TABLE "Employee" ADD COLUMN "address" TEXT;
ALTER TABLE "Employee" ADD COLUMN "addressGovernorate" TEXT;
ALTER TABLE "Employee" ADD COLUMN "addressRegion" TEXT;
ALTER TABLE "Employee" ADD COLUMN "barAssociation" TEXT;
ALTER TABLE "Employee" ADD COLUMN "barAssociationDegree" TEXT;
ALTER TABLE "Employee" ADD COLUMN "barAssociationValidTill" DATETIME;
ALTER TABLE "Employee" ADD COLUMN "contractDuration" TEXT;
ALTER TABLE "Employee" ADD COLUMN "contractRenewalDate" DATETIME;
ALTER TABLE "Employee" ADD COLUMN "contractType" TEXT;
ALTER TABLE "Employee" ADD COLUMN "dateOfBirth" DATETIME;
ALTER TABLE "Employee" ADD COLUMN "department" TEXT;
ALTER TABLE "Employee" ADD COLUMN "experienceInMonths" INTEGER;
ALTER TABLE "Employee" ADD COLUMN "experienceInYears" INTEGER;
ALTER TABLE "Employee" ADD COLUMN "experienceOutMonths" INTEGER;
ALTER TABLE "Employee" ADD COLUMN "experienceOutYears" INTEGER;
ALTER TABLE "Employee" ADD COLUMN "extension" TEXT;
ALTER TABLE "Employee" ADD COLUMN "graduationCertificate" TEXT;
ALTER TABLE "Employee" ADD COLUMN "graduationSection" TEXT;
ALTER TABLE "Employee" ADD COLUMN "graduationUniversity" TEXT;
ALTER TABLE "Employee" ADD COLUMN "graduationYear" INTEGER;
ALTER TABLE "Employee" ADD COLUMN "jobTitle" TEXT;
ALTER TABLE "Employee" ADD COLUMN "joiningDate" DATETIME;
ALTER TABLE "Employee" ADD COLUMN "mobileNumber" TEXT;
ALTER TABLE "Employee" ADD COLUMN "nameArabic" TEXT;
ALTER TABLE "Employee" ADD COLUMN "socialInsurance" TEXT;
ALTER TABLE "Employee" ADD COLUMN "status" TEXT;
ALTER TABLE "Employee" ADD COLUMN "taxCard" TEXT;

-- CreateIndex
CREATE INDEX "Employee_department_idx" ON "Employee"("department");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "Employee_employeeCode_idx" ON "Employee"("employeeCode");
