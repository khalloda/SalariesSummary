-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "category" TEXT;

-- CreateIndex
CREATE INDEX "Employee_category_idx" ON "Employee"("category");
