import { useEffect, useCallback } from 'react';

/**
 * Hook to persist form data to localStorage and restore on mount
 * @param formId - Unique identifier for the form (e.g., 'employee-form', 'user-form')
 * @param entityId - Optional entity ID (e.g., employee ID when editing)
 * @param formData - Current form data object
 * @param enabled - Whether auto-save is enabled (default: true)
 */
export function useFormDraft<T extends Record<string, any>>(
  formId: string,
  entityId: string | null = null,
  formData: T,
  enabled: boolean = true
) {
  const storageKey = `form-draft-${formId}${entityId ? `-${entityId}` : ''}`;

  // Save to localStorage whenever formData changes
  useEffect(() => {
    if (!enabled) return;

    try {
      const dataToSave = JSON.stringify(formData);
      localStorage.setItem(storageKey, dataToSave);
    } catch (error) {
      console.warn('Failed to save form draft:', error);
    }
  }, [formData, storageKey, enabled]);

  // Load from localStorage
  const loadDraft = useCallback((): T | null => {
    if (!enabled) return null;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved) as T;
      }
    } catch (error) {
      console.warn('Failed to load form draft:', error);
    }
    return null;
  }, [storageKey, enabled]);

  // Clear draft
  const clearDraft = useCallback(() => {
    if (!enabled) return;

    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear form draft:', error);
    }
  }, [storageKey, enabled]);

  return { loadDraft, clearDraft };
}
