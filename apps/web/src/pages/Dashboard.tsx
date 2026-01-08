import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import Tooltip from '../components/Tooltip';
import { tooltips } from '../utils/tooltips';
import ConflictResolutionModal from '../components/ConflictResolutionModal';
import CandidateSelectionModal from '../components/CandidateSelectionModal';
import ResignedConflictModal from '../components/ResignedConflictModal';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [merging, setMerging] = useState(false);
  const [lastImport, setLastImport] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [importReport, setImportReport] = useState<any>(null);
  const [mergeReport, setMergeReport] = useState<any>(null);
  const [showImportReport, setShowImportReport] = useState(false);
  const [showMergeReport, setShowMergeReport] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPairs, setSelectedPairs] = useState<Set<number>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [useFileUpload, setUseFileUpload] = useState(true);
  const [importingEmployees, setImportingEmployees] = useState(false);
  const [selectedEmployeeFile, setSelectedEmployeeFile] = useState<File | null>(null);
  const [useEmployeeFileUpload, setUseEmployeeFileUpload] = useState(true);
  const [employeeImportReport, setEmployeeImportReport] = useState<any>(null);
  const [showEmployeeImportReport, setShowEmployeeImportReport] = useState(false);
  const [importingContracts, setImportingContracts] = useState(false);
  const [selectedContractsFile, setSelectedContractsFile] = useState<File | null>(null);
  const [useContractsFileUpload, setUseContractsFileUpload] = useState(true);
  const [contractsImportReport, setContractsImportReport] = useState<any>(null);
  const [showContractsImportReport, setShowContractsImportReport] = useState(false);
  const [importingPersonnel, setImportingPersonnel] = useState(false);
  const [selectedPersonnelFile, setSelectedPersonnelFile] = useState<File | null>(null);
  const [usePersonnelFileUpload, setUsePersonnelFileUpload] = useState(true);
  const [personnelImportReport, setPersonnelImportReport] = useState<any>(null);
  const [showPersonnelImportReport, setShowPersonnelImportReport] = useState(false);
  const [importConflicts, setImportConflicts] = useState<any[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictType, setConflictType] = useState<'salary' | 'employee' | 'contract' | 'personnel'>('salary');
  const [importingResigned, setImportingResigned] = useState(false);
  const [selectedResignedFile, setSelectedResignedFile] = useState<File | null>(null);
  const [useResignedFileUpload, setUseResignedFileUpload] = useState(true);
  const [resignedImportReport, setResignedImportReport] = useState<any>(null);
  const [showResignedImportReport, setShowResignedImportReport] = useState(false);
  const [resignedCandidates, setResignedCandidates] = useState<any[]>([]);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [resignedConflicts, setResignedConflicts] = useState<any[]>([]);
  const [showResignedConflictModal, setShowResignedConflictModal] = useState(false);
  
  useEffect(() => {
    // Fetch available years from database
    axios.get(`${API_BASE_URL}/reports/available-years`)
      .then(res => {
        const years = res.data.years || [];
        if (years.length > 0) {
          setAvailableYears(years);
          setYear(years[0]); // Set to most recent year
        } else {
          // Fallback to last 10 years if no data
          const currentYear = new Date().getFullYear();
          setAvailableYears(Array.from({ length: 10 }, (_, i) => currentYear - i));
        }
      })
      .catch(() => {
        // Fallback on error
        const currentYear = new Date().getFullYear();
        setAvailableYears(Array.from({ length: 10 }, (_, i) => currentYear - i));
      });
  }, [lastImport]); // Refresh when import completes
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const excelFiles = Array.from(files).filter(file => 
        file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
      );
      setSelectedFiles(excelFiles);
    }
  };

  const handleEmployeeFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedEmployeeFile(files[0]);
    }
  };

  const handleContractsFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedContractsFile(files[0]);
    }
  };

  const handlePersonnelFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedPersonnelFile(files[0]);
    }
  };

  const handleResignedFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedResignedFile(files[0]);
    }
  };

  const handleImportEmployees = async () => {
    setImportingEmployees(true);
    setEmployeeImportReport(null);
    setShowEmployeeImportReport(false);
    try {
      let response;
      
      if (useEmployeeFileUpload && selectedEmployeeFile) {
        // Upload file from client
        const formData = new FormData();
        formData.append('file', selectedEmployeeFile);
        
        response = await axios.post(`${API_BASE_URL}/import/employees/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Use server-side Sheets directory
        response = await axios.post(`${API_BASE_URL}/import/employees`);
      }
      
      if (response.data.success) {
        setEmployeeImportReport(response.data);
        setShowEmployeeImportReport(true);
        
        // Check for conflicts
        if (response.data.conflicts && response.data.conflicts.length > 0) {
          setImportConflicts(response.data.conflicts);
          setShowConflictModal(true);
        } else {
          const errorMsg = response.data.errors && response.data.errors.length > 0
            ? `\n\n${t('errors')}: ${response.data.errors.slice(0, 5).join('\n')}`
            : '';
          const skippedMsg = response.data.recordsSkipped > 0
            ? `\n\n${t('recordsSkipped')}: ${response.data.recordsSkipped}`
            : '';
          alert(t('employeeImportSuccessful', { 
            created: response.data.recordsImported, 
            updated: response.data.recordsUpdated, 
            errors: errorMsg + skippedMsg
          }));
          // Clear selected file after successful import
          setSelectedEmployeeFile(null);
          // Reset file input
          const fileInput = document.getElementById('employee-file-input') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }
      } else {
        const errorMsg = response.data.errors && response.data.errors.length > 0
          ? response.data.errors.slice(0, 10).join('\n')
          : 'Unknown error';
        alert(t('employeeImportCompletedWithErrors', { errors: errorMsg }));
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      const errorDetails = error.response?.data?.stack 
        ? `\n\nDetails: ${error.response.data.stack.split('\n').slice(0, 3).join('\n')}`
        : '';
      alert(t('employeeImportFailed', { error: errorMsg + errorDetails }));
      console.error('Employee import error:', error);
    } finally {
      setImportingEmployees(false);
    }
  };

  const handleImportContracts = async () => {
    setImportingContracts(true);
    setContractsImportReport(null);
    setShowContractsImportReport(false);
    try {
      let response;
      
      if (useContractsFileUpload && selectedContractsFile) {
        // Upload file from client
        const formData = new FormData();
        formData.append('file', selectedContractsFile);
        
        response = await axios.post(`${API_BASE_URL}/import/contracts/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Use server-side Sheets directory
        response = await axios.post(`${API_BASE_URL}/import/contracts`);
      }
      
      if (response.data.success) {
        setContractsImportReport(response.data);
        setShowContractsImportReport(true);
        
        // Check for conflicts
        if (response.data.conflicts && response.data.conflicts.length > 0) {
          setConflictType('contract');
          setImportConflicts(response.data.conflicts);
          setShowConflictModal(true);
        } else {
          const errorMsg = response.data.errors && response.data.errors.length > 0
            ? `\n\n${t('errors')}: ${response.data.errors.slice(0, 5).join('\n')}`
            : '';
          const skippedMsg = response.data.recordsSkipped > 0
            ? `\n\n${t('recordsSkipped')}: ${response.data.recordsSkipped}`
            : '';
          alert(t('contractsImportSuccessful', { 
            imported: response.data.recordsImported, 
            linked: response.data.recordsLinked, 
            updated: response.data.recordsUpdated, 
            errors: errorMsg + skippedMsg
          }));
          // Clear selected file after successful import
          setSelectedContractsFile(null);
          // Reset file input
          const fileInput = document.getElementById('contracts-file-input') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }
      } else {
        const errorMsg = response.data.errors && response.data.errors.length > 0
          ? response.data.errors.slice(0, 10).join('\n')
          : 'Unknown error';
        alert(t('contractsImportCompletedWithErrors', { errors: errorMsg }));
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      const errorDetails = error.response?.data?.stack 
        ? `\n\nDetails: ${error.response.data.stack.split('\n').slice(0, 3).join('\n')}`
        : '';
      alert(t('contractsImportFailed', { error: errorMsg + errorDetails }));
      console.error('Contracts import error:', error);
    } finally {
      setImportingContracts(false);
    }
  };

  const handleImportPersonnel = async () => {
    setImportingPersonnel(true);
    setPersonnelImportReport(null);
    setShowPersonnelImportReport(false);
    try {
      let response;
      
      if (usePersonnelFileUpload && selectedPersonnelFile) {
        // Upload file from client
        const formData = new FormData();
        formData.append('file', selectedPersonnelFile);
        
        response = await axios.post(`${API_BASE_URL}/import/personnel/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Use server-side Sheets directory
        response = await axios.post(`${API_BASE_URL}/import/personnel`);
      }
      
      if (response.data.success) {
        setPersonnelImportReport(response.data);
        setShowPersonnelImportReport(true);
        
        // Check for conflicts
        if (response.data.conflicts && response.data.conflicts.length > 0) {
          setConflictType('personnel');
          setImportConflicts(response.data.conflicts);
          setShowConflictModal(true);
        } else {
          const errorMsg = response.data.errors && response.data.errors.length > 0
            ? `\n\n${t('errors')}: ${response.data.errors.slice(0, 5).join('\n')}`
            : '';
          const skippedMsg = response.data.recordsSkipped > 0
            ? `\n\n${t('recordsSkipped')}: ${response.data.recordsSkipped}`
            : '';
          alert(t('personnelImportSuccessful', { 
            updated: response.data.recordsUpdated, 
            errors: errorMsg + skippedMsg
          }));
          // Clear selected file after successful import
          setSelectedPersonnelFile(null);
          // Reset file input
          const fileInput = document.getElementById('personnel-file-input') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }
      } else {
        const errorMsg = response.data.errors && response.data.errors.length > 0
          ? response.data.errors.slice(0, 10).join('\n')
          : 'Unknown error';
        alert(t('personnelImportCompletedWithErrors', { errors: errorMsg }));
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      const errorDetails = error.response?.data?.stack 
        ? `\n\nDetails: ${error.response.data.stack.split('\n').slice(0, 3).join('\n')}`
        : '';
      alert(t('personnelImportFailed', { error: errorMsg + errorDetails }));
      console.error('Personnel import error:', error);
    } finally {
      setImportingPersonnel(false);
    }
  };

  const handleImportResigned = async () => {
    setImportingResigned(true);
    setResignedImportReport(null);
    setShowResignedImportReport(false);
    setResignedCandidates([]);
    setShowCandidateModal(false);
    try {
      let response;
      
      if (useResignedFileUpload && selectedResignedFile) {
        // Upload file from client
        const formData = new FormData();
        formData.append('file', selectedResignedFile);
        
        response = await axios.post(`${API_BASE_URL}/import/resigned/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Use server-side Sheets directory
        response = await axios.post(`${API_BASE_URL}/import/resigned`);
      }
      
      if (response.data.success) {
        setResignedImportReport(response.data);
        setShowResignedImportReport(true);
        
        // Check for conflicts (multiple matches) - handle first
        if (response.data.conflicts && response.data.conflicts.length > 0) {
          setResignedConflicts(response.data.conflicts);
          setShowResignedConflictModal(true);
        } else if (response.data.candidates && response.data.candidates.length > 0) {
          // Check for candidates (employees not found)
          setResignedCandidates(response.data.candidates);
          setShowCandidateModal(true);
        } else {
          const errorMsg = response.data.errors && response.data.errors.length > 0
            ? `\n\n${t('errors')}: ${response.data.errors.slice(0, 5).join('\n')}`
            : '';
          alert(t('resignedImportSuccessful', { 
            updated: response.data.recordsUpdated,
            notFound: response.data.recordsNotFound,
            errors: errorMsg
          }) || `Resigned import completed successfully!\n\nUpdated: ${response.data.recordsUpdated}\nNot Found: ${response.data.recordsNotFound}${errorMsg}`);
          // Clear selected file after successful import
          setSelectedResignedFile(null);
          // Reset file input
          const fileInput = document.getElementById('resigned-file-input') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }
      } else {
        const errorMsg = response.data.errors && response.data.errors.length > 0
          ? response.data.errors.slice(0, 10).join('\n')
          : 'Unknown error';
        alert(t('resignedImportCompletedWithErrors', { errors: errorMsg }) || `Resigned import completed with errors:\n${errorMsg}`);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      const errorDetails = error.response?.data?.stack 
        ? `\n\nDetails: ${error.response.data.stack.split('\n').slice(0, 3).join('\n')}`
        : '';
      alert(t('resignedImportFailed', { error: errorMsg + errorDetails }) || `Resigned import failed: ${errorMsg}${errorDetails}`);
      console.error('Resigned import error:', error);
    } finally {
      setImportingResigned(false);
    }
  };

  const handleCandidateComplete = (created: number, skipped: number) => {
    // Refresh the import report
    if (resignedImportReport) {
      setResignedImportReport({
        ...resignedImportReport,
        recordsUpdated: resignedImportReport.recordsUpdated + created,
        recordsNotFound: resignedImportReport.recordsNotFound - created,
        candidates: []
      });
    }
    // Clear selected file after successful creation
    setSelectedResignedFile(null);
    // Reset file input
    const fileInput = document.getElementById('resigned-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleResolveResignedConflicts = async (resolutions: any[]) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/import/resigned/resolve-conflicts`, {
        resolutions
      });
      
      if (response.data.success) {
        alert(
          t('conflictsResolvedSuccessfully', {
            updated: response.data.updated,
            skipped: response.data.skipped
          }) || `Resolved ${response.data.updated} conflict(s), skipped ${response.data.skipped}`
        );
        setShowResignedConflictModal(false);
        setResignedConflicts([]);
        
        // Refresh import report
        if (resignedImportReport) {
          setResignedImportReport({
            ...resignedImportReport,
            recordsUpdated: resignedImportReport.recordsUpdated + response.data.updated,
            conflicts: []
          });
        }

        // Check if there are candidates after resolving conflicts
        if (resignedImportReport?.candidates && resignedImportReport.candidates.length > 0) {
          setResignedCandidates(resignedImportReport.candidates);
          setShowCandidateModal(true);
        } else {
          // Clear selected file after successful resolution
          setSelectedResignedFile(null);
          const fileInput = document.getElementById('resigned-file-input') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }
      } else {
        const errorMsg = response.data.errors && response.data.errors.length > 0
          ? response.data.errors.slice(0, 5).join('\n')
          : 'Unknown error';
        alert(t('failedToResolveConflicts', { error: errorMsg }) || `Failed to resolve conflicts: ${errorMsg}`);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      alert(t('conflictResolutionError', { error: errorMsg }) || `Error resolving conflicts: ${errorMsg}`);
      console.error('Resolve conflicts error:', error);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setImportReport(null);
    setShowImportReport(false);
    try {
      let response;
      
      if (useFileUpload && selectedFiles.length > 0) {
        // Upload files from client
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });
        
        response = await axios.post(`${API_BASE_URL}/import/salaries/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Use server-side Sheets directory (legacy method)
        response = await axios.post(`${API_BASE_URL}/import/salaries`);
      }
      
      if (response.data.success) {
        setLastImport(new Date().toISOString());
        setImportReport(response.data);
        setShowImportReport(true);
        
        // Check for conflicts
        if (response.data.conflicts && response.data.conflicts.length > 0) {
          setConflictType('salary');
          setImportConflicts(response.data.conflicts);
          setShowConflictModal(true);
        } else {
          const errorMsg = response.data.errors && response.data.errors.length > 0
            ? `\n\n${t('errors')}: ${response.data.errors.slice(0, 5).join('\n')}`
            : '';
          const skippedMsg = response.data.recordsSkipped > 0
            ? `\n\n${t('recordsSkipped')}: ${response.data.recordsSkipped}`
            : '';
          alert(t('importSuccessfulMessage', { 
            imported: response.data.recordsImported, 
            files: response.data.filesProcessed, 
            errors: errorMsg + skippedMsg
          }));
          // Clear selected files after successful import
          setSelectedFiles([]);
          // Reset file input
          const fileInput = document.getElementById('file-input') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }
      } else {
        const errorMsg = response.data.errors && response.data.errors.length > 0
          ? response.data.errors.slice(0, 10).join('\n')
          : 'Unknown error';
        alert(t('importCompletedWithErrors', { errors: errorMsg }));
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      const errorDetails = error.response?.data?.stack 
        ? `\n\nDetails: ${error.response.data.stack.split('\n').slice(0, 3).join('\n')}`
        : '';
      alert(t('importFailedMessage', { error: errorMsg + errorDetails }));
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const handleResolveConflicts = async (resolutions: any[]) => {
    try {
      // Determine which endpoint to use based on conflict type
      let endpoint = '/import/resolve-conflicts';
      if (conflictType === 'employee') {
        endpoint = '/import/resolve-employee-conflicts';
      } else if (conflictType === 'contract') {
        endpoint = '/import/resolve-contract-conflicts';
      } else if (conflictType === 'personnel') {
        endpoint = '/import/resolve-personnel-conflicts';
      }

      const response = await axios.post(`${API_BASE_URL}${endpoint}`, {
        resolutions
      });
      
      if (response.data.success) {
        const errorMsg = response.data.errors && response.data.errors.length > 0
          ? `\n\n${t('errors')}: ${response.data.errors.slice(0, 5).join('\n')}`
          : '';
        alert(t('conflictsResolved', {
          kept: response.data.kept,
          updated: response.data.updated,
          skipped: response.data.skipped,
          errors: errorMsg
        }));
        setImportConflicts([]);
        setShowConflictModal(false);
        setConflictType('salary');
        // Refresh import report
        setLastImport(new Date().toISOString());
        // Clear selected files after successful import
        setSelectedFiles([]);
        setSelectedEmployeeFile(null);
        setSelectedContractsFile(null);
        setSelectedPersonnelFile(null);
        // Reset file inputs
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        const employeeFileInput = document.getElementById('employee-file-input') as HTMLInputElement;
        if (employeeFileInput) employeeFileInput.value = '';
        const contractsFileInput = document.getElementById('contracts-file-input') as HTMLInputElement;
        if (contractsFileInput) contractsFileInput.value = '';
        const personnelFileInput = document.getElementById('personnel-file-input') as HTMLInputElement;
        if (personnelFileInput) personnelFileInput.value = '';
      } else {
        alert(t('failedToResolveConflicts', { error: response.data.error || 'Unknown error' }));
      }
    } catch (error: any) {
      alert(t('failedToResolveConflicts', { error: error.response?.data?.error || error.message }));
    }
  };
  
  const handleClearDatabase = async () => {
    if (!confirm(t('confirmClearDatabase'))) {
      return;
    }
    
    setClearing(true);
    try {
      const response = await axios.delete(`${API_BASE_URL}/import/clear`);
      if (response.data.success) {
        alert(t('databaseClearedSuccessfully', { 
          salaryRecords: response.data.deleted.salaryRecords, 
          employees: response.data.deleted.employees, 
          importLogs: response.data.deleted.importLogs 
        }));
        setLastImport(null);
      } else {
        alert(t('failedToClearDatabase', { error: response.data.error || 'Unknown error' }));
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      alert(t('failedToClearDatabase', { error: errorMsg }));
      console.error('Clear database error:', error);
    } finally {
      setClearing(false);
    }
  };
  
  const handlePreviewDuplicates = async () => {
    setMerging(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/import/preview-duplicates`);
      if (response.data.success) {
        setPreviewData(response.data);
        setSelectedPairs(new Set());
        setShowPreview(true);
      } else {
        alert(t('failedToPreviewDuplicates', { error: response.data.error || 'Unknown error' }));
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      alert(t('failedToPreviewDuplicates', { error: errorMsg }));
      console.error('Preview duplicates error:', error);
    } finally {
      setMerging(false);
    }
  };

  const handleMergeDuplicates = async () => {
    if (!confirm(t('confirmMerge'))) {
      return;
    }
    
    setMerging(true);
    setMergeReport(null);
    setShowMergeReport(false);
    setShowPreview(false);
    try {
      const response = await axios.post(`${API_BASE_URL}/import/merge-duplicates`);
      if (response.data.success) {
        setMergeReport(response.data);
        setShowMergeReport(true);
        alert(t('duplicateMergeCompleted', { 
          merged: response.data.merged, 
          duplicates: response.data.duplicates 
        }));
      } else {
        alert(t('failedToMergeDuplicates', { error: response.data.error || 'Unknown error' }));
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      alert(t('failedToMergeDuplicates', { error: errorMsg }));
      console.error('Merge duplicates error:', error);
    } finally {
      setMerging(false);
    }
  };
  
  const handleConfirmSelectedMerges = async () => {
    if (selectedPairs.size === 0) {
      alert(t('pleaseSelectAtLeastOnePair'));
      return;
    }
    
    if (!confirm(t('mergeSelectedPairsConfirm', { count: selectedPairs.size }))) {
      return;
    }
    
    setMerging(true);
    try {
      // Build the selected pairs array
      const selectedPairsArray = Array.from(selectedPairs).map(idx => ({
        employee1Id: previewData.pairs[idx].employee1.id,
        employee2Id: previewData.pairs[idx].employee2.id
      }));
      
      const response = await axios.post(`${API_BASE_URL}/import/merge-duplicates`, {
        selectedPairs: selectedPairsArray
      });
      
      if (response.data.success) {
        setMergeReport(response.data);
        setShowMergeReport(true);
        setShowPreview(false);
        setSelectedPairs(new Set());
        alert(t('mergeCompleted', { 
          merged: response.data.merged, 
          moved: response.data.recordsMoved, 
          skipped: response.data.recordsSkipped 
        }));
        // Refresh the page or reload data
        window.location.reload();
      } else {
        alert(t('mergeFailedMessage', { error: response.data.error || 'Unknown error' }));
      }
    } catch (error: any) {
      alert(t('mergeFailedMessage', { error: error.response?.data?.error || error.message }));
      console.error('Merge error:', error);
    } finally {
      setMerging(false);
    }
  };
  
  return (
    <div>
      {/* Quick Access to Management */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg shadow-sm border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dataManagement')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <button
            onClick={() => navigate('/manage/employees')}
            className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left border border-gray-200 hover:border-blue-400"
          >
            <div className="font-semibold text-gray-900 mb-1">👥 {t('employees')}</div>
            <div className="text-sm text-gray-600">{t('manageEmployeeRecords')}</div>
          </button>
          <button
            onClick={() => navigate('/manage/contracts')}
            className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left border border-gray-200 hover:border-blue-400"
          >
            <div className="font-semibold text-gray-900 mb-1">📄 {t('contracts')}</div>
            <div className="text-sm text-gray-600">{t('manageContractRecords')}</div>
          </button>
          <button
            onClick={() => navigate('/manage/salaries')}
            className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left border border-gray-200 hover:border-blue-400"
          >
            <div className="font-semibold text-gray-900 mb-1">💰 {t('salaries')}</div>
            <div className="text-sm text-gray-600">{t('manageSalaryRecords')}</div>
          </button>
          <button
            onClick={() => navigate('/manage/bonuses')}
            className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left border border-gray-200 hover:border-blue-400"
          >
            <div className="font-semibold text-gray-900 mb-1">🎁 {t('bonuses')}</div>
            <div className="text-sm text-gray-600">{t('manageBonusRecords')}</div>
          </button>
          <button
            onClick={() => navigate('/manage/bulk-salary')}
            className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left border border-gray-200 hover:border-blue-400"
          >
            <div className="font-semibold text-gray-900 mb-1">📊 {t('bulkSalaryEntry')}</div>
            <div className="text-sm text-gray-600">{t('createMonthSalary')}</div>
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">{t('dashboard')}</h2>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="mb-4">
            <Tooltip content={tooltips.dashboard.yearSelector}>
              <label className="block text-sm font-medium mb-2">{t('year')}</label>
            </Tooltip>
            <Tooltip content={tooltips.dashboard.yearSelector}>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="border rounded px-3 py-2"
              >
                {availableYears.length > 0 ? (
                  availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))
                ) : (
                  Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))
                )}
              </select>
            </Tooltip>
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-600">{t('lastImported')}: {lastImport || t('never')}</p>
          </div>
          
          {/* File Upload Section */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="mb-3">
              <Tooltip content={tooltips.dashboard.fileUpload}>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={useFileUpload}
                    onChange={(e) => setUseFileUpload(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">{t('uploadFilesFromComputer')}</span>
                </label>
              </Tooltip>
              <p className="text-xs text-gray-500 ml-6">
                {useFileUpload 
                  ? t('selectExcelFiles')
                  : t('useServerFiles')}
              </p>
            </div>
            
            {useFileUpload && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('selectExcelFilesLabel')}
                </label>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  disabled={importing || clearing || merging}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>{selectedFiles.length}</strong> {t('filesSelected')}
                    </p>
                    <ul className="text-xs text-gray-500 list-disc list-inside max-h-32 overflow-y-auto">
                      {selectedFiles.map((file, idx) => (
                        <li key={idx}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
                      ))}
                    </ul>
                  </div>
                )}
                {useFileUpload && selectedFiles.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ {t('pleaseSelectFile')}
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Tooltip content={tooltips.dashboard.importSalaries}>
              <button
                onClick={handleImport}
                disabled={importing || clearing || merging || (useFileUpload && selectedFiles.length === 0)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? t('importing') : t('importSalaries')}
              </button>
            </Tooltip>
            <Tooltip content="Import annual bonus data from Excel files">
              <button
                onClick={() => navigate('/import/bonus')}
                disabled={importing || clearing || merging}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {t('importBonuses')}
              </button>
            </Tooltip>
            <Tooltip content="Preview duplicate employees before merging">
              <button
                onClick={handlePreviewDuplicates}
                disabled={importing || clearing || merging}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
              >
                {merging ? t('loading') : t('previewDuplicates')}
              </button>
            </Tooltip>
            <Tooltip content={tooltips.dashboard.mergeDuplicates}>
              <button
                onClick={handleMergeDuplicates}
                disabled={importing || clearing || merging}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
              >
                {merging ? t('merging') : t('autoMergeAll')}
              </button>
            </Tooltip>
            <Tooltip content={tooltips.dashboard.clearData}>
              <button
                onClick={handleClearDatabase}
                disabled={importing || clearing || merging}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {clearing ? t('clearing') : t('clearDatabase')}
              </button>
            </Tooltip>
            {importReport && (
              <Tooltip content={tooltips.dashboard.viewImportReport}>
                <button
                  onClick={() => setShowImportReport(!showImportReport)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  {showImportReport ? t('hideImportReport') : t('viewImportReport')}
                </button>
              </Tooltip>
            )}
            {mergeReport && (
              <Tooltip content="View detailed merge results">
                <button
                  onClick={() => setShowMergeReport(!showMergeReport)}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  {showMergeReport ? t('hideMergeReport') : t('viewMergeReport')}
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Employee Import Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">{t('employeeImport')}</h2>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-4">
            {t('employeeImportDescription')}
          </p>
          
          {/* File Upload Section */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="mb-3">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={useEmployeeFileUpload}
                  onChange={(e) => setUseEmployeeFileUpload(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">{t('uploadFilesFromComputer')}</span>
              </label>
              <p className="text-xs text-gray-500 ml-6">
                {useEmployeeFileUpload 
                  ? t('selectExcelFiles')
                  : t('useServerFiles')}
              </p>
            </div>
            
            {useEmployeeFileUpload && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('selectSEPEmployeesFile')}
                </label>
                <input
                  id="employee-file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleEmployeeFileSelect}
                  disabled={importingEmployees || importingPersonnel || importing || clearing || merging}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50"
                />
                {selectedEmployeeFile && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      <strong>{t('selected')}:</strong> {selectedEmployeeFile.name} ({(selectedEmployeeFile.size / 1024).toFixed(1)} KB)
                    </p>
                  </div>
                )}
                {useEmployeeFileUpload && !selectedEmployeeFile && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ {t('pleaseSelectEmployeeFile')}
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Tooltip content={tooltips.dashboard.importEmployees}>
              <button
                onClick={handleImportEmployees}
                disabled={importingEmployees || importingPersonnel || importing || clearing || merging || (useEmployeeFileUpload && !selectedEmployeeFile)}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {importingEmployees ? t('importingEmployees') : t('importEmployees')}
              </button>
            </Tooltip>
            {employeeImportReport && (
              <Tooltip content={tooltips.dashboard.viewImportReport}>
                <button
                  onClick={() => setShowEmployeeImportReport(!showEmployeeImportReport)}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  {showEmployeeImportReport ? t('hide') : t('view')} {t('importReport')}
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Employee Import Report */}
      {showEmployeeImportReport && employeeImportReport && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">{t('employeeImport')} {t('reports')}</h3>
          <div className="mb-4">
            <p><strong>Records Created:</strong> {employeeImportReport.recordsImported}</p>
            <p><strong>Records Updated:</strong> {employeeImportReport.recordsUpdated}</p>
            <p><strong>Total Processed:</strong> {employeeImportReport.recordsImported + employeeImportReport.recordsUpdated}</p>
            {employeeImportReport.errors && employeeImportReport.errors.length > 0 && (
              <div className="mt-2">
                <p><strong>Errors:</strong> {employeeImportReport.errors.length}</p>
                <ul className="list-disc list-inside text-red-600 text-sm max-h-48 overflow-y-auto">
                  {employeeImportReport.errors.map((error: string, idx: number) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {employeeImportReport.errors && employeeImportReport.errors.length === 0 && (
              <p className="text-green-600 mt-2">✅ {t('noErrors')}</p>
            )}
          </div>
        </div>
      )}

      {/* Contracts Import Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">{t('contractsImport')}</h2>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-4">
            {t('contractsImportDescription')}
          </p>
          
          {/* File Upload Section */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="mb-3">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={useContractsFileUpload}
                  onChange={(e) => setUseContractsFileUpload(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">{t('uploadFilesFromComputer')}</span>
              </label>
              <p className="text-xs text-gray-500 ml-6">
                {useContractsFileUpload 
                  ? t('selectSEPEmployeesFromComputer')
                  : 'Use SEPEmployees.xlsx from server Sheets directory (legacy method)'}
              </p>
            </div>
            
            {useContractsFileUpload && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('selectSEPEmployeesFile')}
                </label>
                <input
                  id="contracts-file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleContractsFileSelect}
                  disabled={importingContracts || importingPersonnel || importing || clearing || merging}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                />
                {selectedContractsFile && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      <strong>{t('selected')}:</strong> {selectedContractsFile.name} ({(selectedContractsFile.size / 1024).toFixed(1)} KB)
                    </p>
                  </div>
                )}
                {useContractsFileUpload && !selectedContractsFile && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ {t('pleaseSelectEmployeeFile')}
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Tooltip content={tooltips.dashboard.importContracts}>
              <button
                onClick={handleImportContracts}
                disabled={importingContracts || importingPersonnel || importing || clearing || merging || (useContractsFileUpload && !selectedContractsFile)}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {importingContracts ? t('importingContracts') : t('importContracts')}
              </button>
            </Tooltip>
            {contractsImportReport && (
              <Tooltip content={tooltips.dashboard.viewImportReport}>
                <button
                  onClick={() => setShowContractsImportReport(!showContractsImportReport)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  {showContractsImportReport ? t('hide') : t('view')} {t('importReport')}
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Contracts Import Report */}
      {showContractsImportReport && contractsImportReport && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">{t('contractsImport')} {t('reports')}</h3>
          <div className="mb-4">
            <p><strong>{t('recordsImported')}:</strong> {contractsImportReport.recordsImported}</p>
            <p><strong>{t('recordsLinked')}:</strong> {contractsImportReport.recordsLinked}</p>
            <p><strong>{t('employeesUpdated')}:</strong> {contractsImportReport.recordsUpdated}</p>
            {contractsImportReport.errors && contractsImportReport.errors.length > 0 && (
              <div className="mt-2">
                <p><strong>{t('errors')}:</strong> {contractsImportReport.errors.length}</p>
                <ul className="list-disc list-inside text-red-600 text-sm max-h-48 overflow-y-auto">
                  {contractsImportReport.errors.map((error: string, idx: number) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {contractsImportReport.errors && contractsImportReport.errors.length === 0 && (
              <p className="text-green-600 mt-2">✅ {t('noErrors')}</p>
            )}
          </div>
        </div>
      )}

      {/* Personnel Import Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{t('personnelImport')}</h2>
          <Tooltip content={tooltips.dashboard.runDiagnostics}>
            <button
              onClick={() => navigate('/personnel-diagnostics')}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium"
            >
              🔍 {t('runDiagnostics')}
            </button>
          </Tooltip>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-4">
            {t('personnelImportDescription')}
            <span className="block mt-2 text-xs text-blue-600">
              💡 {t('havingImportErrors')}
            </span>
          </p>
          
          {/* File Upload Section */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="mb-3">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={usePersonnelFileUpload}
                  onChange={(e) => setUsePersonnelFileUpload(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">{t('uploadFilesFromComputer')}</span>
              </label>
              <p className="text-xs text-gray-500 ml-6">
                {usePersonnelFileUpload 
                  ? t('selectSEPEmployeesFromComputer')
                  : 'Use SEPEmployees.xlsx from server Sheets directory (legacy method)'}
              </p>
            </div>
            
            {usePersonnelFileUpload && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('selectSEPEmployeesFile')}
                </label>
                <input
                  id="personnel-file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handlePersonnelFileSelect}
                  disabled={importingPersonnel || importing || clearing || merging}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50"
                />
                {selectedPersonnelFile && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      <strong>{t('selected')}:</strong> {selectedPersonnelFile.name} ({(selectedPersonnelFile.size / 1024).toFixed(1)} KB)
                    </p>
                  </div>
                )}
                {usePersonnelFileUpload && !selectedPersonnelFile && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ {t('pleaseSelectEmployeeFile')}
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Tooltip content={tooltips.dashboard.importPersonnel}>
              <button
                onClick={handleImportPersonnel}
                disabled={importingPersonnel || importing || clearing || merging || (usePersonnelFileUpload && !selectedPersonnelFile)}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {importingPersonnel ? t('importingPersonnel') : t('importPersonnel')}
              </button>
            </Tooltip>
            {personnelImportReport && (
              <Tooltip content={tooltips.dashboard.viewImportReport}>
                <button
                  onClick={() => setShowPersonnelImportReport(!showPersonnelImportReport)}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  {showPersonnelImportReport ? t('hide') : t('view')} {t('importReport')}
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Personnel Import Report */}
      {showPersonnelImportReport && personnelImportReport && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">{t('personnelImport')} {t('reports')}</h3>
          <div className="mb-4">
            <p><strong>Records Updated:</strong> {personnelImportReport.recordsUpdated}</p>
            {personnelImportReport.errors && personnelImportReport.errors.length > 0 && (
              <div className="mt-2">
                <p><strong>Errors:</strong> {personnelImportReport.errors.length}</p>
                <ul className="list-disc list-inside text-red-600 text-sm max-h-48 overflow-y-auto">
                  {personnelImportReport.errors.map((error: string, idx: number) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {personnelImportReport.errors && personnelImportReport.errors.length === 0 && (
              <p className="text-green-600 mt-2">✅ {t('noErrors')}</p>
            )}
          </div>
        </div>
      )}

      {/* Resigned Import Section */}
      <div className="mb-6 bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{t('importResignedEmployees') || 'Import Resigned Employees'}</h2>
          <p className="text-sm text-gray-600">
            {t('importResignedEmployeesDescription') || 'Import resigned employee data from SEPEmployees.xlsx - Resigned sheet'}
          </p>
        </div>
        
        {/* File Upload Section */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="mb-3">
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={useResignedFileUpload}
                onChange={(e) => setUseResignedFileUpload(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">{t('uploadFilesFromComputer')}</span>
            </label>
            <p className="text-xs text-gray-500 ml-6">
              {useResignedFileUpload 
                ? t('selectSEPEmployeesFromComputer')
                : 'Use SEPEmployees.xlsx from server Sheets directory (legacy method)'}
            </p>
          </div>
          
          {useResignedFileUpload && (
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('selectSEPEmployeesFile')}
              </label>
              <input
                id="resigned-file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleResignedFileSelect}
                disabled={importingResigned || importing || clearing || merging}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 disabled:opacity-50"
              />
              {selectedResignedFile && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    <strong>{t('selected')}:</strong> {selectedResignedFile.name} ({(selectedResignedFile.size / 1024).toFixed(1)} KB)
                  </p>
                </div>
              )}
              {useResignedFileUpload && !selectedResignedFile && (
                <p className="text-xs text-yellow-600 mt-1">
                  ⚠️ {t('pleaseSelectEmployeeFile')}
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Tooltip content={t('importResignedEmployeesTooltip') || 'Import resigned employees from the Resigned sheet'}>
            <button
              onClick={handleImportResigned}
              disabled={importingResigned || importing || clearing || merging || (useResignedFileUpload && !selectedResignedFile)}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
            >
              {importingResigned ? (t('importingResigned') || 'Importing...') : (t('importResigned') || 'Import Resigned')}
            </button>
          </Tooltip>
          {resignedImportReport && (
            <Tooltip content={t('viewImportReport') || 'View import report'}>
              <button
                onClick={() => setShowResignedImportReport(!showResignedImportReport)}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                {showResignedImportReport ? t('hide') : t('view')} {t('importReport')}
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Resigned Import Report */}
      {showResignedImportReport && resignedImportReport && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">{t('resignedImport') || 'Resigned Import'} {t('reports')}</h3>
          <div className="mb-4">
            <p><strong>{t('recordsUpdated') || 'Records Updated'}:</strong> {resignedImportReport.recordsUpdated}</p>
            <p><strong>{t('recordsNotFound') || 'Records Not Found'}:</strong> {resignedImportReport.recordsNotFound}</p>
            {resignedImportReport.conflicts && resignedImportReport.conflicts.length > 0 && (
              <p className="text-red-600 mt-2">
                ⚠️ <strong>{resignedImportReport.conflicts.length}</strong> {t('conflictsRequiringResolution') || 'conflict(s) requiring resolution'}
              </p>
            )}
            {resignedImportReport.candidates && resignedImportReport.candidates.length > 0 && (
              <p className="text-orange-600 mt-2">
                ⚠️ <strong>{resignedImportReport.candidates.length}</strong> {t('candidatesForCreation') || 'candidate(s) available for creation'}
              </p>
            )}
            {resignedImportReport.errors && resignedImportReport.errors.length > 0 && (
              <div className="mt-2">
                <p><strong>{t('errors')}:</strong> {resignedImportReport.errors.length}</p>
                <ul className="list-disc list-inside text-red-600 text-sm max-h-48 overflow-y-auto">
                  {resignedImportReport.errors.map((error: string, idx: number) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {resignedImportReport.errors && resignedImportReport.errors.length === 0 && (
              <p className="text-green-600 mt-2">✅ {t('noErrors')}</p>
            )}
          </div>
        </div>
      )}

      {/* Candidate Selection Modal */}
      {showCandidateModal && resignedCandidates.length > 0 && (
        <CandidateSelectionModal
          candidates={resignedCandidates}
          onClose={() => setShowCandidateModal(false)}
          onComplete={handleCandidateComplete}
        />
      )}
      
      {/* Import Report */}
      {showImportReport && importReport && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">{t('import')} {t('reports')}</h3>
          <div className="mb-4">
            <p><strong>Files Processed:</strong> {importReport.filesProcessed}</p>
            <p><strong>Records Imported:</strong> {importReport.recordsImported}</p>
            {importReport.recordsSkipped !== undefined && importReport.recordsSkipped > 0 && (
              <p><strong>{t('recordsSkipped')}:</strong> {importReport.recordsSkipped}</p>
            )}
            {importReport.recordsWithConflicts !== undefined && importReport.recordsWithConflicts > 0 && (
              <p><strong>{t('importConflicts')}:</strong> {importReport.recordsWithConflicts}</p>
            )}
            {importReport.errors && importReport.errors.length > 0 && (
              <div className="mt-2">
                <p><strong>Errors:</strong> {importReport.errors.length}</p>
                <ul className="list-disc list-inside text-red-600 text-sm">
                  {importReport.errors.slice(0, 10).map((error: string, idx: number) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {importReport.similarNameMatches && importReport.similarNameMatches.length > 0 && (
            <div className="mt-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Note:</strong> {importReport.similarNameMatches.length} similar name match(es) were found but NOT automatically merged.
                  Please review these in the Employees page and merge manually if they are the same person.
                </p>
              </div>
              <h4 className="font-semibold mb-2">Similar Name Matches ({importReport.similarNameMatches.length}):</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Existing Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">New Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importReport.similarNameMatches.map((match: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 whitespace-nowrap">{match.existingName}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{match.newName}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{match.recordsLinked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Preview Duplicates */}
      {showPreview && previewData && previewData.pairs && previewData.pairs.length > 0 && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Preview Duplicates ({previewData.totalPairs} pairs found)</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPairs(new Set(previewData.pairs.map((_: any, idx: number) => idx)))}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedPairs(new Set())}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
              >
                Deselect All
              </button>
              <button
                onClick={handleConfirmSelectedMerges}
                disabled={selectedPairs.size === 0 || merging}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50"
              >
                Merge Selected ({selectedPairs.size})
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
              >
                Close
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-12">
                    <input
                      type="checkbox"
                      checked={selectedPairs.size === previewData.pairs.length && previewData.pairs.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPairs(new Set(previewData.pairs.map((_: any, idx: number) => idx)));
                        } else {
                          setSelectedPairs(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee 1</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee 2</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Match Reason</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.pairs.map((pair: any, idx: number) => (
                  <tr key={idx} className={selectedPairs.has(idx) ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedPairs.has(idx)}
                        onChange={(e) => {
                          const newSet = new Set(selectedPairs);
                          if (e.target.checked) {
                            newSet.add(idx);
                          } else {
                            newSet.delete(idx);
                          }
                          setSelectedPairs(newSet);
                        }}
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{pair.employee1.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{pair.employee1.recordCount}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{pair.employee2.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{pair.employee2.recordCount}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{pair.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Merge Report */}
      {showMergeReport && mergeReport && mergeReport.report && mergeReport.report.length > 0 && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Merge Report</h3>
          <div className="mb-4">
            <p><strong>Total Merged:</strong> {mergeReport.merged} employees</p>
            <p><strong>Total Duplicates Found:</strong> {mergeReport.duplicates}</p>
          </div>
          
          <div className="space-y-4">
            {mergeReport.report.map((group: any, idx: number) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="mb-2">
                  <h4 className="font-semibold text-green-600">Kept Employee:</h4>
                  <p className="ml-4">
                    <strong>{group.keptEmployee.name}</strong><br />
                    Initial Records: {group.keptEmployee.initialRecords} → Final Records: {group.keptEmployee.finalRecords}
                  </p>
                </div>
                {group.mergedEmployees && group.mergedEmployees.length > 0 && (
                  <div className="mt-2">
                    <h5 className="font-semibold text-blue-600">Merged Into Above:</h5>
                    <ul className="ml-4 space-y-1">
                      {group.mergedEmployees.map((merged: any, mIdx: number) => (
                        <li key={mIdx} className="text-sm">
                          <strong>{merged.fromName}</strong> ({merged.fromRecords} records)
                          <br />
                          <span className="text-gray-600">
                            → {merged.recordsMoved} records moved, {merged.recordsSkipped} skipped
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg transition" onClick={() => navigate('/employees')}>
          <h3 className="text-lg font-semibold mb-2">{t('employees')}</h3>
          <p className="text-gray-600">{t('viewAllEmployees')}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg transition" onClick={() => navigate('/reports/joiners-leavers')}>
          <h3 className="text-lg font-semibold mb-2">{t('joinersLeavers')}</h3>
          <p className="text-gray-600">{t('viewJoinersAndLeavers')}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg transition" onClick={() => navigate('/reports/salary-changes')}>
          <h3 className="text-lg font-semibold mb-2">{t('salaryChanges')}</h3>
          <p className="text-gray-600">{t('viewSalaryChanges')}</p>
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {showConflictModal && importConflicts.length > 0 && (
        <ConflictResolutionModal
          conflicts={importConflicts}
          onResolve={handleResolveConflicts}
          onClose={() => {
            setShowConflictModal(false);
            setImportConflicts([]);
            setConflictType('salary');
          }}
          conflictType={conflictType}
        />
      )}
    </div>
  );
}


