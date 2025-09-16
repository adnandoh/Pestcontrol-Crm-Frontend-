import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Chip,
  MenuItem,
  Box,
} from '@mui/material';

// Predefined service types for pest control
export const SERVICE_TYPES = [
  'Ants',
  'Cockroaches',
  'Termites',
  'Rodents (Mice/Rats)',
  'Spiders',
  'Wasps/Bees',
  'Bed Bugs',
  'Fleas',
  'Mosquitoes',
  'House Flies',
  'Other'
];

interface ServiceTypeSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  required?: boolean;
  label?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  sx?: any;
}

const ServiceTypeSelector: React.FC<ServiceTypeSelectorProps> = ({
  value = [],
  onChange,
  required = false,
  label = 'Service Type',
  fullWidth = true,
  disabled = false,
  error = false,
  helperText,
  sx = {},
}) => {
  const handleSelectAll = () => {
    if (value.length === SERVICE_TYPES.length) {
      // If all are selected, deselect all
      onChange([]);
    } else {
      // If not all are selected, select all
      onChange([...SERVICE_TYPES]);
    }
  };

  const handleServiceTypeChange = (event: any) => {
    const selectedValue = event.target.value;
    
    // Check if "Select All" was clicked (value contains "SELECT_ALL")
    if (selectedValue.includes('SELECT_ALL')) {
      handleSelectAll();
      return;
    }
    
    onChange(typeof selectedValue === 'string' ? selectedValue.split(',') : selectedValue);
  };

  const isAllSelected = value.length === SERVICE_TYPES.length;
  const isIndeterminate = value.length > 0 && value.length < SERVICE_TYPES.length;

  return (
    <FormControl 
      required={required}
      fullWidth={fullWidth}
      error={error}
      disabled={disabled}
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
        ...sx,
      }}
    >
      <InputLabel id="service-type-label">{label}</InputLabel>
      <Select
        labelId="service-type-label"
        multiple
        value={value}
        onChange={handleServiceTypeChange}
        input={<OutlinedInput label={label} />}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((serviceType) => (
              <Chip 
                key={serviceType} 
                label={serviceType} 
                size="small"
                sx={{
                  backgroundColor: '#e8f5e9',
                  color: '#2e7d32',
                  fontWeight: 500,
                  '& .MuiChip-deleteIcon': {
                    color: '#2e7d32',
                  },
                }}
              />
            ))}
          </Box>
        )}
        MenuProps={{
          PaperProps: {
            style: {
              maxHeight: 300,
              width: 'auto',
            },
          },
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'left',
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'left',
          },
          disableScrollLock: true,
          disableAutoFocusItem: true,
          variant: 'menu',
        }}
      >
        {/* Select All Option */}
        <MenuItem 
          value="SELECT_ALL"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSelectAll();
          }}
          sx={{
            py: 1,
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#f8f9fa',
            '&:hover': {
              backgroundColor: '#e9ecef',
            },
          }}
        >
          <Checkbox 
            checked={isAllSelected}
            indeterminate={isIndeterminate}
            sx={{
              color: '#1976d2',
              '&.Mui-checked': {
                color: '#1976d2',
              },
            }}
          />
          <ListItemText 
            primary="Select All"
            sx={{
              '& .MuiListItemText-primary': {
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#1976d2',
              },
            }}
          />
        </MenuItem>
        
        {/* Individual Service Types */}
        {SERVICE_TYPES.map((serviceType) => (
          <MenuItem 
            key={serviceType} 
            value={serviceType}
            sx={{
              py: 1,
              '&:hover': {
                backgroundColor: '#f8f9fa',
              },
              '&.Mui-selected': {
                backgroundColor: '#e8f5e9',
                '&:hover': {
                  backgroundColor: '#e0f2e1',
                },
              },
            }}
          >
            <Checkbox 
              checked={value.indexOf(serviceType) > -1}
              sx={{
                color: '#4CAF50',
                '&.Mui-checked': {
                  color: '#4CAF50',
                },
              }}
            />
            <ListItemText 
              primary={serviceType}
              sx={{
                '& .MuiListItemText-primary': {
                  fontSize: '0.95rem',
                },
              }}
            />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default ServiceTypeSelector;
