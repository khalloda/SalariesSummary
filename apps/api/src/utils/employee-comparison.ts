/**
 * Employee Record Comparison Utility
 * Compares employee records to detect duplicates and calculate similarity
 */

export interface EmployeeData {
  name: string;
  normalizedName: string;
  employeeCode?: string | null;
  category?: string | null;
  nameArabic?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  dateOfBirth?: Date | null;
  joiningDate?: Date | null;
  graduationCertificate?: string | null;
  graduationSection?: string | null;
  graduationUniversity?: string | null;
  graduationYear?: number | null;
  socialInsurance?: string | null;
  barAssociation?: string | null;
  barAssociationValidTill?: Date | null;
  barAssociationDegree?: string | null;
  taxCard?: string | null;
  nationalId?: string | null;
  nationalIdValidTill?: Date | null;
  address?: string | null;
  addressRegion?: string | null;
  addressGovernorate?: string | null;
  extension?: string | null;
  mobileNumber?: string | null;
  contractType?: string | null;
  contractDuration?: string | null;
  contractRenewalDate?: Date | null;
  status?: string | null;
  experienceInYears?: number | null;
  experienceInMonths?: number | null;
  experienceOutYears?: number | null;
  experienceOutMonths?: number | null;
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
 * Compare two employee records and calculate similarity
 */
export function compareEmployeeRecords(
  existing: EmployeeData,
  incoming: EmployeeData
): ComparisonResult {
  const differences: Array<{ field: string; existing: any; incoming: any }> = [];
  let matchingFields = 0;
  let totalFields = 0;

  // Fields to compare (excluding id, normalizedName which are identifiers)
  const fieldsToCompare: Array<keyof EmployeeData> = [
    'name',
    'employeeCode',
    'category',
    'nameArabic',
    'jobTitle',
    'department',
    'dateOfBirth',
    'joiningDate',
    'graduationCertificate',
    'graduationSection',
    'graduationUniversity',
    'graduationYear',
    'socialInsurance',
    'barAssociation',
    'barAssociationValidTill',
    'barAssociationDegree',
    'taxCard',
    'nationalId',
    'nationalIdValidTill',
    'address',
    'addressRegion',
    'addressGovernorate',
    'extension',
    'mobileNumber',
    'contractType',
    'contractDuration',
    'contractRenewalDate',
    'status',
    'experienceInYears',
    'experienceInMonths',
    'experienceOutYears',
    'experienceOutMonths'
  ];

  // Compare dates
  const compareDates = (a: Date | null | undefined, b: Date | null | undefined): boolean => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.getTime() === b.getTime();
  };

  // Compare numeric values
  const compareNumeric = (a: number | null | undefined, b: number | null | undefined): boolean => {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return a === b;
  };

  for (const field of fieldsToCompare) {
    totalFields++;
    const existingValue = existing[field];
    const incomingValue = incoming[field];

    let isMatch = false;

    if (field === 'dateOfBirth' || field === 'joiningDate' || field === 'barAssociationValidTill' || 
        field === 'nationalIdValidTill' || field === 'contractRenewalDate') {
      isMatch = compareDates(existingValue as Date | null, incomingValue as Date | null);
    } else if (field === 'graduationYear' || field === 'experienceInYears' || field === 'experienceInMonths' ||
               field === 'experienceOutYears' || field === 'experienceOutMonths') {
      isMatch = compareNumeric(existingValue as number | null, incomingValue as number | null);
    } else {
      // String comparison (normalize null/undefined)
      const existingStr = existingValue ?? null;
      const incomingStr = incomingValue ?? null;
      isMatch = existingStr === incomingStr;
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

