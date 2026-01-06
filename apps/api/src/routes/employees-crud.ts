import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { normalizeEmployeeName } from '../utils/normalize.js';
import { requireAuth, requireRole } from '../utils/auth.js';
import { logAudit } from '../utils/audit.js';

const prisma = new PrismaClient();
export const employeesCrudRouter = Router();

/**
 * POST /api/employees
 * Create a new employee
 */
employeesCrudRouter.post('/', requireAuth, requireRole('HR_PERSONNEL', 'OFFICE_MANAGER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const {
      name,
      nameArabic,
      category,
      employeeCode,
      jobTitle,
      department,
      dateOfBirth,
      joiningDate,
      graduationCertificate,
      graduationSection,
      graduationUniversity,
      graduationYear,
      socialInsurance,
      barAssociation,
      barAssociationValidTill,
      barAssociationDegree,
      taxCard,
      nationalId,
      nationalIdValidTill,
      address,
      addressRegion,
      addressGovernorate,
      extension,
      mobileNumber,
      contractType,
      contractDuration,
      contractRenewalDate,
      status,
      experienceInYears,
      experienceInMonths,
      experienceOutYears,
      experienceOutMonths,
      notes,
      personnelData,
      resignationDate,
      resignationReason
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const normalizedName = normalizeEmployeeName(name);

    // Check if employee with same normalized name already exists
    const existing = await prisma.employee.findUnique({
      where: { normalizedName }
    });

    if (existing) {
      return res.status(409).json({ error: 'Employee with this name already exists' });
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        normalizedName,
        nameArabic,
        category,
        employeeCode,
        jobTitle,
        department,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        graduationCertificate,
        graduationSection,
        graduationUniversity,
        graduationYear: graduationYear ? parseInt(graduationYear) : null,
        socialInsurance,
        barAssociation,
        barAssociationValidTill: barAssociationValidTill ? new Date(barAssociationValidTill) : null,
        barAssociationDegree,
        taxCard,
        nationalId,
        nationalIdValidTill: nationalIdValidTill ? new Date(nationalIdValidTill) : null,
        address,
        addressRegion,
        addressGovernorate,
        extension,
        mobileNumber,
        contractType,
        contractDuration,
        contractRenewalDate: contractRenewalDate ? new Date(contractRenewalDate) : null,
        status: status || 'Active',
        experienceInYears: experienceInYears ? parseInt(experienceInYears) : null,
        experienceInMonths: experienceInMonths ? parseInt(experienceInMonths) : null,
        experienceOutYears: experienceOutYears ? parseInt(experienceOutYears) : null,
        experienceOutMonths: experienceOutMonths ? parseInt(experienceOutMonths) : null,
        notes,
        personnelData: personnelData ? JSON.stringify(personnelData) : null,
        resignationDate: resignationDate ? new Date(resignationDate) : null,
        resignationReason
      }
    });

    res.status(201).json(employee);
  } catch (error: any) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/employees/:id
 * Update an employee
 */
employeesCrudRouter.put('/:id', requireAuth, requireRole('HR_PERSONNEL', 'OFFICE_MANAGER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      nameArabic,
      category,
      employeeCode,
      jobTitle,
      department,
      dateOfBirth,
      joiningDate,
      graduationCertificate,
      graduationSection,
      graduationUniversity,
      graduationYear,
      socialInsurance,
      barAssociation,
      barAssociationValidTill,
      barAssociationDegree,
      taxCard,
      nationalId,
      nationalIdValidTill,
      address,
      addressRegion,
      addressGovernorate,
      extension,
      mobileNumber,
      contractType,
      contractDuration,
      contractRenewalDate,
      status,
      experienceInYears,
      experienceInMonths,
      experienceOutYears,
      experienceOutMonths,
      notes,
      personnelData,
      resignationDate,
      resignationReason
    } = req.body;

    // Check if employee exists
    const existing = await prisma.employee.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // If name changed, update normalizedName and check for conflicts
    let normalizedName = existing.normalizedName;
    if (name && name !== existing.name) {
      normalizedName = normalizeEmployeeName(name);
      // Check if another employee has this normalized name
      const conflict = await prisma.employee.findUnique({
        where: { normalizedName }
      });
      if (conflict && conflict.id !== id) {
        return res.status(409).json({ error: 'Employee with this name already exists' });
      }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(name && { name, normalizedName }),
        ...(nameArabic !== undefined && { nameArabic }),
        ...(category !== undefined && { category }),
        ...(employeeCode !== undefined && { employeeCode }),
        ...(jobTitle !== undefined && { jobTitle }),
        ...(department !== undefined && { department }),
        ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
        ...(joiningDate !== undefined && { joiningDate: joiningDate ? new Date(joiningDate) : null }),
        ...(graduationCertificate !== undefined && { graduationCertificate }),
        ...(graduationSection !== undefined && { graduationSection }),
        ...(graduationUniversity !== undefined && { graduationUniversity }),
        ...(graduationYear !== undefined && { graduationYear: graduationYear ? parseInt(graduationYear) : null }),
        ...(socialInsurance !== undefined && { socialInsurance }),
        ...(barAssociation !== undefined && { barAssociation }),
        ...(barAssociationValidTill !== undefined && { barAssociationValidTill: barAssociationValidTill ? new Date(barAssociationValidTill) : null }),
        ...(barAssociationDegree !== undefined && { barAssociationDegree }),
        ...(taxCard !== undefined && { taxCard }),
        ...(nationalId !== undefined && { nationalId }),
        ...(nationalIdValidTill !== undefined && { nationalIdValidTill: nationalIdValidTill ? new Date(nationalIdValidTill) : null }),
        ...(address !== undefined && { address }),
        ...(addressRegion !== undefined && { addressRegion }),
        ...(addressGovernorate !== undefined && { addressGovernorate }),
        ...(extension !== undefined && { extension }),
        ...(mobileNumber !== undefined && { mobileNumber }),
        ...(contractType !== undefined && { contractType }),
        ...(contractDuration !== undefined && { contractDuration }),
        ...(contractRenewalDate !== undefined && { contractRenewalDate: contractRenewalDate ? new Date(contractRenewalDate) : null }),
        ...(status !== undefined && { status }),
        ...(experienceInYears !== undefined && { experienceInYears: experienceInYears ? parseInt(experienceInYears) : null }),
        ...(experienceInMonths !== undefined && { experienceInMonths: experienceInMonths ? parseInt(experienceInMonths) : null }),
        ...(experienceOutYears !== undefined && { experienceOutYears: experienceOutYears ? parseInt(experienceOutYears) : null }),
        ...(experienceOutMonths !== undefined && { experienceOutMonths: experienceOutMonths ? parseInt(experienceOutMonths) : null }),
        ...(notes !== undefined && { notes }),
        ...(personnelData !== undefined && { personnelData: personnelData ? JSON.stringify(personnelData) : null }),
        ...(resignationDate !== undefined && { resignationDate: resignationDate ? new Date(resignationDate) : null }),
        ...(resignationReason !== undefined && { resignationReason })
      }
    });

    res.json(employee);
  } catch (error: any) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/employees/:id
 * Delete an employee
 */
employeesCrudRouter.delete('/:id', requireAuth, requireRole('OFFICE_MANAGER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            salaries: true,
            annualBonuses: true,
            contractRecords: true
          }
        }
      }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Warn if employee has related records
    const hasRelatedRecords = 
      employee._count.salaries > 0 || 
      employee._count.annualBonuses > 0 || 
      employee._count.contractRecords > 0;

    if (hasRelatedRecords) {
      // Delete related records first (cascade)
      await prisma.employee.delete({
        where: { id }
      });
    } else {
      await prisma.employee.delete({
        where: { id }
      });
    }

    res.json({ 
      success: true, 
      message: 'Employee deleted successfully',
      deletedRecords: {
        salaries: employee._count.salaries,
        annualBonuses: employee._count.annualBonuses,
        contractRecords: employee._count.contractRecords
      }
    });
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: error.message });
  }
});

