import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';
import { SortOption } from '../utils/sorting';

interface SortSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly SortOption[];
  label?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  disabled?: boolean;
  sx?: any;
}

const SortSelector: React.FC<SortSelectorProps> = ({
  value,
  onChange,
  options,
  label = 'Sort by',
  fullWidth = false,
  size = 'small',
  disabled = false,
  sx = {},
}) => {
  const handleChange = (event: any) => {
    onChange(event.target.value);
  };

  return (
    <FormControl 
      fullWidth={fullWidth}
      size={size}
      disabled={disabled}
      sx={{
        minWidth: 150,
        '& .MuiOutlinedInput-root': {
          borderRadius: 1,
        },
        ...sx,
      }}
    >
      <InputLabel id="sort-selector-label">{label}</InputLabel>
      <Select
        labelId="sort-selector-label"
        value={value}
        onChange={handleChange}
        label={label}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">
                {option.label}
              </Typography>
              {option.direction === 'desc' && (
                <Typography variant="caption" color="text.secondary">
                  ↓
                </Typography>
              )}
              {option.direction === 'asc' && (
                <Typography variant="caption" color="text.secondary">
                  ↑
                </Typography>
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default SortSelector;
