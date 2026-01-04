/**
 * Personnel Record Comparison Utility
 * Compares personnel records to detect duplicates and calculate similarity
 */

export interface PersonnelData {
  employeeId: string;
  criminalRecord?: 'Present' | 'Missing' | null;
  militaryCertificate?: 'Copy' | 'Original' | 'N/A' | 'Missing' | null;
  idCopy?: boolean | null;
  educationCertificate?: 'Copy' | 'Original' | 'N/A' | 'Missing' | null;
  birthCertificate?: 'Copy' | 'Original' | 'N/A' | 'Missing' | null;
  recommendationLetter?: boolean | null;
  personalPhotos?: boolean | null;
  taxCard?: boolean | null;
  associationId?: boolean | null;
  form6?: string | null;
  laptopPcTablet?: 'Laptop' | 'PC' | 'Tablet' | 'None' | null;
  workStub?: string | null;
  insuranceStartDate?: Date | null;
}

export interface ComparisonResult {
  isIdentical: boolean;
  similarity: number; // 0-100 percentage
  differences: Array<{
    field: string;
    existing: any;
    incoming: any;
  }>;
}

/**
 * Compare two personnel records and calculate similarity
 */
export function comparePersonnelRecords(
  existing: PersonnelData,
  incoming: PersonnelData
): ComparisonResult {
  const differences: Array<{ field: string; existing: any; incoming: any }> = [];
  let matchingFields = 0;
  let totalFields = 0;

  const fieldsToCompare: Array<keyof PersonnelData> = [
    'criminalRecord',
    'militaryCertificate',
    'idCopy',
    'educationCertificate',
    'birthCertificate',
    'recommendationLetter',
    'personalPhotos',
    'taxCard',
    'associationId',
    'form6',
    'laptopPcTablet',
    'workStub',
    'insuranceStartDate'
  ];

  // Compare dates
  const compareDates = (a: Date | null | undefined, b: Date | null | undefined): boolean => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.getTime() === b.getTime();
  };

  for (const field of fieldsToCompare) {
    totalFields++;
    const existingValue = existing[field];
    const incomingValue = incoming[field];

    let isMatch = false;

    if (field === 'insuranceStartDate') {
      isMatch = compareDates(existingValue as Date | null, incomingValue as Date | null);
    } else {
      // Direct comparison for other fields
      const existingVal = existingValue ?? null;
      const incomingVal = incomingValue ?? null;
      isMatch = existingVal === incomingVal;
    }

    if (isMatch) {
      matchingFields++;
    } else {
      differences.push({
        field,
        existing: existingValue,
        incoming: incomingValue
      });
    }
  }

  const similarity = totalFields > 0 ? (matchingFields / totalFields) * 100 : 100;
  const isIdentical = differences.length === 0;

  return {
    isIdentical,
    similarity: Math.round(similarity * 100) / 100,
    differences
  };
}

