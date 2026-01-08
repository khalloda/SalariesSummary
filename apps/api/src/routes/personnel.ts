/**
 * Personnel API Routes
 * Handles personnel data retrieval and reports
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { logAudit } from '../utils/audit.js';

const prisma = new PrismaClient();
export const personnelRouter = Router();

/**
 * GET /api/personnel/compliance/report
 * Get document compliance report
 * Query params: category (optional), minCompliance (optional, default 0)
 */
personnelRouter.get('/compliance/report', async (req, res) => {
  try {
    const { category, minCompliance } = req.query;
    const minComplianceNum = minCompliance ? parseFloat(minCompliance as string) : 0;

    // Get all employees with personnel records
    // Note: We'll filter by status on the client side to allow showing Resigned employees if needed
    const employees = await prisma.employee.findMany({
      where: {
        ...(category ? { category: category as string } : {})
      },
      include: {
        personnelRecord: true
      }
    });

    // Calculate compliance for each employee
    const complianceData = employees
      .filter(emp => emp.personnelRecord)
      .map(emp => {
        const pr = emp.personnelRecord!;
        
        // Define all document fields
        // Note: Association ID and Tax Card are only applicable for Partners and Lawyers
        const isPartnerOrLawyer = emp.category === 'Partner' || emp.category === 'Lawyer';
        const documents = [
          { name: 'Criminal Record', status: pr.criminalRecord },
          { name: 'Military Certificate', status: pr.militaryCertificate },
          { name: 'ID Copy', status: pr.idCopy ? 'Present' : 'Missing' },
          { name: 'Education Certificate', status: pr.educationCertificate },
          { name: 'Birth Certificate', status: pr.birthCertificate },
          { name: 'Recommendation Letter', status: pr.recommendationLetter ? 'Present' : 'Missing' },
          { name: 'Personal Photos', status: pr.personalPhotos ? 'Present' : 'Missing' },
          { name: 'Tax Card', status: isPartnerOrLawyer ? (pr.taxCard ? 'Present' : 'Missing') : 'N/A' },
          { name: 'Association ID', status: isPartnerOrLawyer ? (pr.associationId ? 'Present' : 'Missing') : 'N/A' }
        ];

        // Count completed documents (Present, Copy, Original - not Missing or N/A)
        const completed = documents.filter(doc => {
          const status = doc.status;
          return status === 'Present' || status === 'Copy' || status === 'Original';
        }).length;

        // Count applicable documents (exclude N/A)
        const applicable = documents.filter(doc => {
          const status = doc.status;
          return status !== 'N/A' && status !== null;
        }).length;

        const compliancePercentage = applicable > 0 ? (completed / applicable) * 100 : 0;
        const missingDocuments = documents
          .filter(doc => doc.status === 'Missing' || doc.status === null)
          .map(doc => doc.name);

        return {
          employeeId: emp.id,
          employeeName: emp.name,
          employeeCode: emp.employeeCode || '',
          category: emp.category || '',
          department: emp.department || '',
          status: emp.status || 'Active',
          compliancePercentage: Math.round(compliancePercentage * 100) / 100,
          completedDocuments: completed,
          totalApplicableDocuments: applicable,
          missingDocuments,
          personnelRecord: pr
        };
      })
      .filter(data => data.compliancePercentage >= minComplianceNum)
      .sort((a, b) => b.compliancePercentage - a.compliancePercentage);

    // Calculate summary statistics
    const totalEmployees = complianceData.length;
    const avgCompliance = totalEmployees > 0
      ? complianceData.reduce((sum, emp) => sum + emp.compliancePercentage, 0) / totalEmployees
      : 0;
    
    const complianceLevels = {
      critical: complianceData.filter(emp => emp.compliancePercentage < 70).length,
      warning: complianceData.filter(emp => emp.compliancePercentage >= 70 && emp.compliancePercentage < 90).length,
      good: complianceData.filter(emp => emp.compliancePercentage >= 90).length
    };

    res.json({
      summary: {
        totalEmployees,
        averageCompliance: Math.round(avgCompliance * 100) / 100,
        complianceLevels
      },
      employees: complianceData
    });
  } catch (error: any) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/personnel/assets/report
 * Get asset inventory report
 */
personnelRouter.get('/assets/report', async (req, res) => {
  try {
    const { category } = req.query;

    const employees = await prisma.employee.findMany({
      where: {
        ...(category ? { category: category as string } : {}),
        status: { not: 'Resigned' }
      },
      include: {
        personnelRecord: true
      }
    });

    const assetData = employees
      .filter(emp => emp.personnelRecord)
      .map(emp => ({
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.employeeCode || '',
        category: emp.category || '',
        department: emp.department || '',
        assetType: emp.personnelRecord!.laptopPcTablet || 'None',
        status: emp.status || 'Active'
      }));

    // Calculate summary
    const assetSummary = {
      total: assetData.length,
      laptops: assetData.filter(a => a.assetType === 'Laptop').length,
      pcs: assetData.filter(a => a.assetType === 'PC').length,
      tablets: assetData.filter(a => a.assetType === 'Tablet').length,
      none: assetData.filter(a => a.assetType === 'None' || !a.assetType).length,
      byCategory: {} as Record<string, { laptops: number; pcs: number; tablets: number; none: number }>
    };

    // Group by category
    assetData.forEach(asset => {
      const cat = asset.category || 'Unknown';
      if (!assetSummary.byCategory[cat]) {
        assetSummary.byCategory[cat] = { laptops: 0, pcs: 0, tablets: 0, none: 0 };
      }
      if (asset.assetType === 'Laptop') assetSummary.byCategory[cat].laptops++;
      else if (asset.assetType === 'PC') assetSummary.byCategory[cat].pcs++;
      else if (asset.assetType === 'Tablet') assetSummary.byCategory[cat].tablets++;
      else assetSummary.byCategory[cat].none++;
    });

    res.json({
      summary: assetSummary,
      employees: assetData
    });
  } catch (error: any) {
    console.error('Error generating asset report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/personnel/dashboard
 * Get personnel status dashboard with overall metrics
 */
personnelRouter.get('/dashboard', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      where: {
        status: { not: 'Resigned' }
      },
      include: {
        personnelRecord: true
      }
    });

    const employeesWithRecords = employees.filter(emp => emp.personnelRecord);
    
    // Calculate document status distribution
    const documentStatuses: Record<string, { present: number; missing: number; na: number; copy: number; original: number }> = {
      'Criminal Record': { present: 0, missing: 0, na: 0, copy: 0, original: 0 },
      'Military Certificate': { present: 0, missing: 0, na: 0, copy: 0, original: 0 },
      'ID Copy': { present: 0, missing: 0, na: 0, copy: 0, original: 0 },
      'Education Certificate': { present: 0, missing: 0, na: 0, copy: 0, original: 0 },
      'Birth Certificate': { present: 0, missing: 0, na: 0, copy: 0, original: 0 },
      'Recommendation Letter': { present: 0, missing: 0, na: 0, copy: 0, original: 0 },
      'Personal Photos': { present: 0, missing: 0, na: 0, copy: 0, original: 0 },
      'Tax Card': { present: 0, missing: 0, na: 0, copy: 0, original: 0 },
      'Association ID': { present: 0, missing: 0, na: 0, copy: 0, original: 0 }
    };

    employeesWithRecords.forEach(emp => {
      const pr = emp.personnelRecord!;
      
      // Count document statuses
      if (pr.criminalRecord === 'Present') documentStatuses['Criminal Record'].present++;
      else if (pr.criminalRecord === 'Missing') documentStatuses['Criminal Record'].missing++;
      
      if (pr.militaryCertificate === 'Copy') documentStatuses['Military Certificate'].copy++;
      else if (pr.militaryCertificate === 'Original') documentStatuses['Military Certificate'].original++;
      else if (pr.militaryCertificate === 'N/A') documentStatuses['Military Certificate'].na++;
      else if (pr.militaryCertificate === 'Missing') documentStatuses['Military Certificate'].missing++;
      
      if (pr.idCopy) documentStatuses['ID Copy'].present++;
      else documentStatuses['ID Copy'].missing++;
      
      if (pr.educationCertificate === 'Copy') documentStatuses['Education Certificate'].copy++;
      else if (pr.educationCertificate === 'Original') documentStatuses['Education Certificate'].original++;
      else if (pr.educationCertificate === 'Missing') documentStatuses['Education Certificate'].missing++;
      
      if (pr.birthCertificate === 'Copy') documentStatuses['Birth Certificate'].copy++;
      else if (pr.birthCertificate === 'Original') documentStatuses['Birth Certificate'].original++;
      else if (pr.birthCertificate === 'Missing') documentStatuses['Birth Certificate'].missing++;
      
      if (pr.recommendationLetter) documentStatuses['Recommendation Letter'].present++;
      else documentStatuses['Recommendation Letter'].missing++;
      
      if (pr.personalPhotos) documentStatuses['Personal Photos'].present++;
      else documentStatuses['Personal Photos'].missing++;
      
      // Tax Card and Association ID are only applicable for Partners and Lawyers
      const isPartnerOrLawyer = emp.category === 'Partner' || emp.category === 'Lawyer';
      if (isPartnerOrLawyer) {
        if (pr.taxCard) documentStatuses['Tax Card'].present++;
        else documentStatuses['Tax Card'].missing++;
        
        if (pr.associationId) documentStatuses['Association ID'].present++;
        else documentStatuses['Association ID'].missing++;
      } else {
        // For Admins and others, these are N/A
        documentStatuses['Tax Card'].na++;
        documentStatuses['Association ID'].na++;
      }
    });

    // Calculate compliance by category
    const complianceByCategory: Record<string, { total: number; avgCompliance: number }> = {};
    
    employeesWithRecords.forEach(emp => {
      const cat = emp.category || 'Unknown';
      if (!complianceByCategory[cat]) {
        complianceByCategory[cat] = { total: 0, avgCompliance: 0 };
      }
      complianceByCategory[cat].total++;
    });

    // Calculate average compliance per category
    Object.keys(complianceByCategory).forEach(cat => {
      const categoryEmployees = employeesWithRecords.filter(emp => (emp.category || 'Unknown') === cat);
      let totalCompliance = 0;
      
      categoryEmployees.forEach(emp => {
        const pr = emp.personnelRecord!;
        // Association ID and Tax Card are only applicable for Partners and Lawyers
        const isPartnerOrLawyer = emp.category === 'Partner' || emp.category === 'Lawyer';
        const documents = [
          pr.criminalRecord,
          pr.militaryCertificate,
          pr.idCopy ? 'Present' : 'Missing',
          pr.educationCertificate,
          pr.birthCertificate,
          pr.recommendationLetter ? 'Present' : 'Missing',
          pr.personalPhotos ? 'Present' : 'Missing',
          isPartnerOrLawyer ? (pr.taxCard ? 'Present' : 'Missing') : 'N/A',
          isPartnerOrLawyer ? (pr.associationId ? 'Present' : 'Missing') : 'N/A'
        ];
        
        const completed = documents.filter(s => s === 'Present' || s === 'Copy' || s === 'Original').length;
        const applicable = documents.filter(s => s !== 'N/A' && s !== null).length;
        const compliance = applicable > 0 ? (completed / applicable) * 100 : 0;
        totalCompliance += compliance;
      });
      
      complianceByCategory[cat].avgCompliance = categoryEmployees.length > 0
        ? Math.round((totalCompliance / categoryEmployees.length) * 100) / 100
        : 0;
    });

    // Asset distribution
    const assetDistribution = {
      laptops: employeesWithRecords.filter(emp => emp.personnelRecord!.laptopPcTablet === 'Laptop').length,
      pcs: employeesWithRecords.filter(emp => emp.personnelRecord!.laptopPcTablet === 'PC').length,
      tablets: employeesWithRecords.filter(emp => emp.personnelRecord!.laptopPcTablet === 'Tablet').length,
      none: employeesWithRecords.filter(emp => !emp.personnelRecord!.laptopPcTablet || emp.personnelRecord!.laptopPcTablet === 'None').length
    };

    // Overall compliance
    let totalCompliance = 0;
    employeesWithRecords.forEach(emp => {
      const pr = emp.personnelRecord!;
      // Association ID and Tax Card are only applicable for Partners and Lawyers
      const isPartnerOrLawyer = emp.category === 'Partner' || emp.category === 'Lawyer';
      const documents = [
        pr.criminalRecord,
        pr.militaryCertificate,
        pr.idCopy ? 'Present' : 'Missing',
        pr.educationCertificate,
        pr.birthCertificate,
        pr.recommendationLetter ? 'Present' : 'Missing',
        pr.personalPhotos ? 'Present' : 'Missing',
        isPartnerOrLawyer ? (pr.taxCard ? 'Present' : 'Missing') : 'N/A',
        isPartnerOrLawyer ? (pr.associationId ? 'Present' : 'Missing') : 'N/A'
      ];
      
      const completed = documents.filter(s => s === 'Present' || s === 'Copy' || s === 'Original').length;
      const applicable = documents.filter(s => s !== 'N/A' && s !== null).length;
      const compliance = applicable > 0 ? (completed / applicable) * 100 : 0;
      totalCompliance += compliance;
    });

    const overallCompliance = employeesWithRecords.length > 0
      ? Math.round((totalCompliance / employeesWithRecords.length) * 100) / 100
      : 0;

    // Most common missing documents
    const missingCounts: Record<string, number> = {};
    Object.keys(documentStatuses).forEach(doc => {
      missingCounts[doc] = documentStatuses[doc].missing;
    });
    const mostCommonMissing = Object.entries(missingCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([doc, count]) => ({ document: doc, count }));

    res.json({
      overallCompliance,
      totalEmployees: employeesWithRecords.length,
      documentStatuses,
      complianceByCategory,
      assetDistribution,
      mostCommonMissing,
      complianceLevels: {
        critical: employeesWithRecords.filter(emp => {
          const pr = emp.personnelRecord!;
          // Association ID and Tax Card are only applicable for Partners and Lawyers
          const isPartnerOrLawyer = emp.category === 'Partner' || emp.category === 'Lawyer';
          const documents = [
            pr.criminalRecord,
            pr.militaryCertificate,
            pr.idCopy ? 'Present' : 'Missing',
            pr.educationCertificate,
            pr.birthCertificate,
            pr.recommendationLetter ? 'Present' : 'Missing',
            pr.personalPhotos ? 'Present' : 'Missing',
            isPartnerOrLawyer ? (pr.taxCard ? 'Present' : 'Missing') : 'N/A',
            isPartnerOrLawyer ? (pr.associationId ? 'Present' : 'Missing') : 'N/A'
          ];
          const completed = documents.filter(s => s === 'Present' || s === 'Copy' || s === 'Original').length;
          const applicable = documents.filter(s => s !== 'N/A' && s !== null).length;
          const compliance = applicable > 0 ? (completed / applicable) * 100 : 0;
          return compliance < 70;
        }).length,
        warning: employeesWithRecords.filter(emp => {
          const pr = emp.personnelRecord!;
          // Association ID and Tax Card are only applicable for Partners and Lawyers
          const isPartnerOrLawyer = emp.category === 'Partner' || emp.category === 'Lawyer';
          const documents = [
            pr.criminalRecord,
            pr.militaryCertificate,
            pr.idCopy ? 'Present' : 'Missing',
            pr.educationCertificate,
            pr.birthCertificate,
            pr.recommendationLetter ? 'Present' : 'Missing',
            pr.personalPhotos ? 'Present' : 'Missing',
            isPartnerOrLawyer ? (pr.taxCard ? 'Present' : 'Missing') : 'N/A',
            isPartnerOrLawyer ? (pr.associationId ? 'Present' : 'Missing') : 'N/A'
          ];
          const completed = documents.filter(s => s === 'Present' || s === 'Copy' || s === 'Original').length;
          const applicable = documents.filter(s => s !== 'N/A' && s !== null).length;
          const compliance = applicable > 0 ? (completed / applicable) * 100 : 0;
          return compliance >= 70 && compliance < 90;
        }).length,
        good: employeesWithRecords.filter(emp => {
          const pr = emp.personnelRecord!;
          // Association ID and Tax Card are only applicable for Partners and Lawyers
          const isPartnerOrLawyer = emp.category === 'Partner' || emp.category === 'Lawyer';
          const documents = [
            pr.criminalRecord,
            pr.militaryCertificate,
            pr.idCopy ? 'Present' : 'Missing',
            pr.educationCertificate,
            pr.birthCertificate,
            pr.recommendationLetter ? 'Present' : 'Missing',
            pr.personalPhotos ? 'Present' : 'Missing',
            isPartnerOrLawyer ? (pr.taxCard ? 'Present' : 'Missing') : 'N/A',
            isPartnerOrLawyer ? (pr.associationId ? 'Present' : 'Missing') : 'N/A'
          ];
          const completed = documents.filter(s => s === 'Present' || s === 'Copy' || s === 'Original').length;
          const applicable = documents.filter(s => s !== 'N/A' && s !== null).length;
          const compliance = applicable > 0 ? (completed / applicable) * 100 : 0;
          return compliance >= 90;
        }).length
      }
    });
  } catch (error: any) {
    console.error('Error generating personnel dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/personnel/:employeeId
 * Get personnel record for a specific employee
 * NOTE: This must be defined AFTER all specific routes (like /dashboard, /compliance/report, etc.)
 * to prevent route conflicts
 */
personnelRouter.get('/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    const personnelRecord = await prisma.personnelRecord.findUnique({
      where: { employeeId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            category: true,
            department: true
          }
        }
      }
    });

    if (!personnelRecord) {
      return res.status(404).json({ error: 'Personnel record not found' });
    }

    res.json(personnelRecord);
  } catch (error: any) {
    console.error('Error fetching personnel record:', error);
    res.status(500).json({ error: error.message });
  }
});

