import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';

/**
 * Styled TextField component with proper label handling to prevent cut-off
 * Provides consistent styling across all forms in the application
 * 
 * Key Features:
 * - Prevents label cut-off with proper legend width
 * - Transparent background for labels to avoid visual conflicts
 * - Proper padding and spacing for optimal UX
 * - Consistent styling across all form fields
 */
const StyledTextField: React.FC<TextFieldProps> = ({ sx, variant = 'outlined', ...props }) => {
  return (
    <TextField
      {...props}
      variant={variant}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 1,
          backgroundColor: '#fafafa',
          '&:hover': {
            backgroundColor: '#f5f5f5',
          },
          '&.Mui-focused': {
            backgroundColor: '#ffffff',
          },
        },
        '& .MuiInputLabel-root': {
          backgroundColor: 'transparent',
          padding: '0 8px',
          '&.Mui-focused': {
            backgroundColor: 'transparent',
            color: '#1976d2',
          },
          '&.MuiInputLabel-shrink': {
            backgroundColor: 'transparent',
            transform: 'translate(14px, -9px) scale(0.75)',
            maxWidth: 'calc(100% - 32px)',
          },
        },
        '& .MuiOutlinedInput-notchedOutline': {
          '& legend': {
            width: '100%',
            maxWidth: 'none',
          },
        },
        '& .MuiOutlinedInput-input': {
          padding: '16.5px 14px',
        },
        ...sx,
      }}
    />
  );
};

export default StyledTextField;
