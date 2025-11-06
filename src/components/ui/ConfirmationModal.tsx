import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  isLoading = false
}) => {
  if (!isOpen) return null;

  const getIconColor = () => {
    switch (type) {
      case 'danger': return 'text-red-600';
      case 'info': return 'text-blue-600';
      default: return 'text-yellow-600';
    }
  };

  const getConfirmButtonVariant = () => {
    switch (type) {
      case 'danger': return 'destructive';
      case 'info': return 'default';
      default: return 'warning';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Content */}
          <div className="p-6">
            {/* Icon and Title */}
            <div className="flex items-center mb-4">
              <div className={`flex-shrink-0 ${getIconColor()}`}>
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">
                {title}
              </h3>
            </div>

            {/* Message */}
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                {cancelText}
              </Button>
              <Button
                variant={getConfirmButtonVariant() as any}
                onClick={onConfirm}
                disabled={isLoading}
                className="flex items-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Processing...
                  </>
                ) : (
                  confirmText
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};