import React from 'react';
import { TextField, TextFieldProps, Box, Typography } from '@mui/material';

/**
 * Fixed TextField component that prevents label cut-off issues
 * Uses a custom approach with separate label and input
 */
interface FixedTextFieldProps extends Omit<TextFieldProps, 'label'> {
  label: string;
  required?: boolean;
}

const FixedTextField: React.FC<FixedTextFieldProps> = ({ 
  label, 
  required = false, 
  sx, 
  ...props 
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const [hasValue, setHasValue] = React.useState(false);
  
  const showLabel = isFocused || hasValue;
  
  React.useEffect(() => {
    if (props.value) {
      setHasValue(String(props.value).length > 0);
    }
  }, [props.value]);

  return (
    <Box sx={{ 
      position: 'relative', 
      width: '100%', 
      overflow: 'visible',
      ...sx 
    }}>
      {/* Custom Label */}
      <Typography
        variant="body2"
        sx={{
          position: 'absolute',
          top: showLabel ? '-12px' : '16px',
          left: '14px',
          backgroundColor: showLabel ? '#ffffff' : 'transparent',
          padding: showLabel ? '0 8px' : '0',
          color: showLabel ? '#1976d2' : '#666666',
          fontSize: showLabel ? '0.75rem' : '1rem',
          fontWeight: showLabel ? 500 : 400,
          transition: 'all 0.2s ease-in-out',
          zIndex: 10,
          pointerEvents: 'none',
          transform: showLabel ? 'scale(0.75)' : 'scale(1)',
          transformOrigin: 'left top',
          whiteSpace: 'nowrap',
          overflow: 'visible',
          maxWidth: 'none',
          width: 'auto',
          lineHeight: 1,
        }}
      >
        {label}
        {required && <span style={{ color: '#d32f2f', marginLeft: '4px' }}>*</span>}
      </Typography>
      
      {/* Input Field */}
      <TextField
        {...props}
        variant="outlined"
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        onChange={(e) => {
          setHasValue(e.target.value.length > 0);
          props.onChange?.(e);
        }}
        sx={{
          width: '100%',
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
          '& .MuiOutlinedInput-input': {
            padding: '16.5px 14px',
            paddingTop: showLabel ? '24px' : '16.5px',
            paddingBottom: '16.5px',
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: isFocused ? '#1976d2' : '#c4c4c4',
            borderWidth: isFocused ? '2px' : '1px',
          },
          '& .MuiInputLabel-root': {
            display: 'none', // Hide the default label
          },
          ...sx,
        }}
      />
    </Box>
  );
};

export default FixedTextField;
