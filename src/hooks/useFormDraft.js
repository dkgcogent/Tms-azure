import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * A reusable hook to handle form draft persistence in localStorage.
 * 
 * @param {string} formKey - Unique identifier for the form.
 * @param {string} userId - Unique identifier for the user.
 * @param {object} initialData - Default initial state of the form.
 * @returns {object} Draft management methods and state.
 */
const useFormDraft = (formKey, userId = 'default_user') => {
    const [hasDraft, setHasDraft] = useState(false);
    const storageKey = `form_draft_${formKey}_${userId}`;
    const saveTimeoutRef = useRef(null);

    // Check if draft exists on mount
    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && Object.keys(parsed).length > 0) {
                    setHasDraft(true);
                }
            } catch (e) {
                console.error('Error parsing draft on mount:', e);
            }
        }
    }, [storageKey]);

    /**
     * Retrieves the saved draft data.
     */
    const getDraft = useCallback(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Error parsing draft:', e);
                return null;
            }
        }
        return null;
    }, [storageKey]);

    /**
     * Saves the current form data to localStorage with a debounce.
     */
    const saveDraft = useCallback((data) => {
        // We don't want to save empty or initial state if possible, 
        // but usually the caller handles when to save.
        if (!data) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            localStorage.setItem(storageKey, JSON.stringify(data));
            setHasDraft(true);
            console.log(`📝 Draft auto-saved for ${formKey}`);
        }, 1000); // 1 second debounce
    }, [storageKey, formKey]);

    /**
     * Clears the saved draft from localStorage.
     */
    const clearDraft = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        localStorage.removeItem(storageKey);
        setHasDraft(false);
        console.log(`🧹 Draft cleared for ${formKey}`);
    }, [storageKey, formKey]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    return {
        hasDraft,
        getDraft,
        saveDraft,
        clearDraft,
    };
};

export default useFormDraft;
