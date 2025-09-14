import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Tooltip,
} from '@mui/material';
import CustomPagination from './CustomPagination';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { getSearchPlaceholder } from '../utils/searchValidation';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => React.ReactNode;
}

interface ModernTableProps {
  title: string;
  columns: Column[];
  rows: any[];
  totalCount?: number;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchError?: string | null;
  onSearchKeyPress?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onSearchSubmit?: () => void;
  onSearchClear?: () => void;
  searchContext?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  page?: number;
  rowsPerPage?: number;
  onPageChange?: (page: number) => void;
}

const ModernTable: React.FC<ModernTableProps> = ({
  title,
  columns,
  rows,
  totalCount,
  searchValue,
  onSearchChange,
  searchError,
  onSearchKeyPress,
  onSearchSubmit,
  onSearchClear,
  searchContext = 'general',
  filters,
  actions,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
}) => {
  return (
    <Box>
      {/* Header with tabs and actions */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#333', fontSize: '1.1rem' }}>
          {title}
        </Typography>
        {actions && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {actions}
          </Box>
        )}
      </Box>

      {/* Filters and Search */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {filters}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {totalCount !== undefined && (
            <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
              Total Count: <strong>{totalCount}</strong>
            </Typography>
          )}
          {onSearchChange && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                size="small"
                placeholder={getSearchPlaceholder(searchContext)}
                value={searchValue || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyPress={onSearchKeyPress}
                error={!!searchError}
                helperText={searchError}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: '1.2rem', color: '#666' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  minWidth: 250,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 0,
                    backgroundColor: '#f8f9fa',
                  },
                '& .MuiFormHelperText-root': {
                  position: 'absolute',
                  bottom: '-20px',
                  margin: 0,
                  fontSize: '0.6rem',
                },
                }}
              />
              {onSearchSubmit && (
                <Tooltip title="Search">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={onSearchSubmit}
                    sx={{
                      bgcolor: '#007bff',
                      '&:hover': { bgcolor: '#0056b3' },
                      borderRadius: 0,
                      minWidth: 'auto',
                      px: 2,
                      height: '40px',
                    }}
                  >
                    <SearchIcon sx={{ fontSize: '1.2rem' }} />
                  </Button>
                </Tooltip>
              )}
              {onSearchClear && searchValue && (
                <Tooltip title="Clear search">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={onSearchClear}
                    sx={{
                      borderRadius: 0,
                      minWidth: 'auto',
                      px: 2,
                      height: '40px',
                    }}
                  >
                    <ClearIcon sx={{ fontSize: '1.2rem' }} />
                  </Button>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Table */}
      <Paper 
        elevation={0} 
        sx={{ 
          border: '1px solid #e0e0e0',
          borderRadius: 0,
          overflow: 'hidden',
          maxHeight: 'none'
        }}
      >
        <TableContainer sx={{ maxHeight: 'none' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{ 
                      minWidth: column.minWidth,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: '#333',
                      borderBottom: '1px solid #e0e0e0',
                      padding: '12px 10px',
                    }}
                  >
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow 
                  key={index}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#f8f9fa',
                    },
                    '&:last-child td': {
                      borderBottom: 0,
                    },
                  }}
                >
                  {columns.map((column) => {
                    const value = row[column.id];
                    return (
                      <TableCell 
                        key={column.id} 
                        align={column.align}
                        sx={{
                          borderBottom: '1px solid #f0f0f0',
                          padding: '10px',
                          fontSize: '0.75rem',
                        }}
                      >
                        {column.format ? column.format(value) : value}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Pagination */}
      {totalCount && totalCount > rowsPerPage && onPageChange && (
        <CustomPagination
          count={Math.ceil(totalCount / rowsPerPage)}
          page={page + 1}
          totalCount={totalCount}
          onChange={(event, value) => onPageChange(value - 1)}
        />
      )}
    </Box>
  );
};

export default ModernTable;