import { useState, useCallback, useRef } from 'react';

// Validation rule interface
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any, formData?: any) => string | null;
}

// Validation rules configuration
export interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

// Validation errors state
export interface ValidationErrors {
  [fieldName: string]: string;
}

// Hook return interface
export interface UseFormValidationReturn {
  errors: ValidationErrors;
  validateField: (fieldName: string, value: any) => string | null;
  validateForm: (formData: any) => ValidationErrors;
  clearError: (fieldName: string) => void;
  clearAllErrors: () => void;
  scrollToFirstError: () => void;
  hasErrors: boolean;
  setFieldError: (fieldName: string, error: string) => void;
}

// Auto-scroll utility function
const scrollToElement = (element: HTMLElement, offset: number = 100) => {
  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
  const offsetPosition = elementPosition - offset;

  // Check if browser supports smooth scrolling
  if ('scrollBehavior' in document.documentElement.style) {
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  } else {
    // Fallback for older browsers
    window.scrollTo(0, offsetPosition);
  }
};

// Main validation hook
export const useFormValidation = (rules: ValidationRules): UseFormValidationReturn => {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const errorFieldsRef = useRef<Set<string>>(new Set());

  // Validate a single field
  const validateField = useCallback((fieldName: string, value: any): string | null => {
    const rule = rules[fieldName];
    if (!rule) return null;

    // Required validation
    if (rule.required) {
      if (value === null || value === undefined || value === '' || 
          (typeof value === 'string' && !value.trim())) {
        return `${getFieldDisplayName(fieldName)} is required`;
      }
    }

    // Skip other validations if field is empty and not required
    if (!rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return null;
    }

    // Custom validation (takes precedence)
    if (rule.custom) {
      // Pass both value and full formData if provided
      const customError = rule.custom(value, (rules as any).__formData);
      if (customError) return customError;
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        return `Please enter a valid ${getFieldDisplayName(fieldName).toLowerCase()}`;
      }
    }

    // Length validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return `${getFieldDisplayName(fieldName)} must be at least ${rule.minLength} characters`;
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return `${getFieldDisplayName(fieldName)} must not exceed ${rule.maxLength} characters`;
      }
    }

    return null;
  }, [rules]);

  // Validate entire form
  const validateForm = useCallback((formData: any): ValidationErrors => {
    const newErrors: ValidationErrors = {};
    
    Object.keys(rules).forEach(fieldName => {
      // Temporarily attach formData to rules for custom validators
      (rules as any).__formData = formData;
      const error = validateField(fieldName, formData[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
      }
    });
    delete (rules as any).__formData;

    setErrors(newErrors);
    errorFieldsRef.current = new Set(Object.keys(newErrors));
    return newErrors;
  }, [rules, validateField]);

  // Clear error for specific field
  const clearError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      errorFieldsRef.current.delete(fieldName);
      return newErrors;
    });
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors({});
    errorFieldsRef.current.clear();
  }, []);

  // Set error for specific field
  const setFieldError = useCallback((fieldName: string, error: string) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
    errorFieldsRef.current.add(fieldName);
  }, []);

  // Scroll to first error field
  const scrollToFirstError = useCallback(() => {
    const errorFields = Array.from(errorFieldsRef.current);
    if (errorFields.length === 0) return;

    // Find the first error field in DOM order
    const firstErrorField = errorFields
      .map(fieldName => {
        // Try multiple possible selectors for the field
        const selectors = [
          `[name="${fieldName}"]`,
          `#${fieldName}`,
          `[data-field="${fieldName}"]`,
          `input[name="${fieldName}"]`,
          `textarea[name="${fieldName}"]`,
          `select[name="${fieldName}"]`
        ];
        
        for (const selector of selectors) {
          const element = document.querySelector(selector) as HTMLElement;
          if (element) return { fieldName, element };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (!a || !b) return 0;
        // Sort by DOM position
        const position = a.element.compareDocumentPosition(b.element);
        return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      })[0];

    if (firstErrorField) {
      // Scroll to the field
      scrollToElement(firstErrorField.element);
      
      // Focus the field after a short delay to ensure scroll completes
      setTimeout(() => {
        firstErrorField.element.focus();
      }, 300);
    }
  }, []);

  // Check if there are any errors
  const hasErrors = Object.keys(errors).length > 0;

  return {
    errors,
    validateField,
    validateForm,
    clearError,
    clearAllErrors,
    scrollToFirstError,
    hasErrors,
    setFieldError
  };
};

// Helper function to convert field names to display names
const getFieldDisplayName = (fieldName: string): string => {
  const displayNames: { [key: string]: string } = {
    client_name: 'Client name',
    client_mobile: 'Mobile number',
    client_email: 'Email',
    client_city: 'City',
    client_address: 'Address',
    schedule_date: 'Schedule date',
    service_type: 'Service type',
    price: 'Price',
    next_service_date: 'Next service date',
    payment_status: 'Payment status',
    status: 'Status'
  };

  return displayNames[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Job Card specific validation rules
export const jobCardValidationRules: ValidationRules = {
  job_type: {
    required: true,
    custom: (value) => {
      if (!value) return 'Job type is required';
      if (!['Customer', 'Society'].includes(value)) return 'Please select a valid job type';
      return null;
    }
  },
  client_name: {
    required: true,
    minLength: 2,
    custom: (value) => {
      if (!value?.trim()) return 'Client name is required';
      if (value.trim().length < 2) return 'Client name must be at least 2 characters';
      return null;
    }
  },
  client_mobile: {
    required: true,
    custom: (value) => {
      if (!value) return 'Mobile number is required';
      const cleanValue = value.toString().replace(/\D/g, '');
      if (cleanValue.length !== 10) return 'Please enter a valid 10-digit phone number';
      return null;
    }
  },
  client_email: {
    custom: (value) => {
      if (value && value.trim()) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value.trim())) {
          return 'Please enter a valid email address';
        }
      }
      return null;
    }
  },
  city: {
    required: true,
    custom: (value) => {
      if (!value?.trim()) return 'City is required';
      return null;
    }
  },
  client_address: {
    required: true,
    custom: (value) => {
      if (!value?.trim()) return 'Address is required';
      return null;
    }
  },
  schedule_date: {
    required: true,
    custom: (value) => {
      if (!value) return 'Schedule date is required';
      return null;
    }
  },
  service_type: {
    required: true,
    custom: (value) => {
      if (!value?.trim()) return 'Service type is required';
      return null;
    }
  },
  cancellation_reason: {
    custom: (value, formData) => {
      if (formData?.status === 'Cancelled') {
        if (!value || !value.trim()) {
          return 'Cancellation reason is required';
        }
        if (value.trim().length < 4) {
          return 'Reason must be at least 4 characters';
        }
        if (!/^[a-zA-Z0-9\s]*$/.test(value)) {
          return 'Special characters are not allowed';
        }
      }
      return null;
    }
  },
  removal_remarks: {
    custom: (_value, _formData) => {
      // Logic: if status is Pending but it WAS On Process (this is hard to know here without previous status)
      // Actually, let's just make it mandatory if status is Pending and a technician IS selected?
      // No, that's not right. 
      // Let's just make it mandatory if status is Pending and removal_remarks is already present or being added.
      
      // Better: In EditJobCard, if status is Pending, we check if technician was assigned.
      // But we don't have previous state easily here.
      
      // Let's just follow the same pattern as cancellation_reason but for Pending status.
      // But only if we are MOVING to Pending from something else?
      
      // The backend handles the strict enforcement. In frontend, we'll just check if status is Pending.
      // Wait, if I create a new job, status is Pending. I shouldn't require remarks.
      
      // So we'll only enforce it in JobCards.tsx for now, OR if we can detect the transition in EditJobCard.
      return null;
    }
  }
};