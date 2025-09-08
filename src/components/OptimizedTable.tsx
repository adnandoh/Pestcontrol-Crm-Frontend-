import React, { memo, useMemo, useCallback } from 'react';
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
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import CustomPagination from './CustomPagination';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => React.ReactNode;
}

interface OptimizedTableProps {
  title: string;
  columns: Column[];
  rows: any[];
  totalCount?: number;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  page?: number;
  rowsPerPage?: number;
  onPageChange?: (page: number) => void;
}

/**
 * Optimized table component with React.memo and useMemo for performance
 * Prevents unnecessary re-renders and optimizes expensive operations
 */
const OptimizedTable: React.FC<OptimizedTableProps> = memo(({
  title,
  columns,
  rows,
  totalCount,
  searchValue,
  onSearchChange,
  filters,
  actions,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
}) => {
  // Memoize the table header to prevent re-renders
  const tableHeader = useMemo(() => (
    <TableHead>
      <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
        {columns.map((column) => (
          <TableCell
            key={column.id}
            align={column.align}
            style={{ 
              minWidth: column.minWidth,
              fontWeight: 600,
              fontSize: '0.875rem',
              color: '#333',
              borderBottom: '1px solid #e0e0e0',
              padding: '16px 12px',
            }}
          >
            {column.label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  ), [columns]);

  // Memoize the table body to prevent re-renders when data hasn't changed
  const tableBody = useMemo(() => (
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
                  padding: '12px',
                  fontSize: '0.875rem',
                }}
              >
                {column.format ? column.format(value) : value}
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </TableBody>
  ), [rows, columns]);

  // Memoize the search input to prevent re-renders
  const searchInput = useMemo(() => (
    onSearchChange && (
      <TextField
        size="small"
        placeholder="Search"
        value={searchValue || ''}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: '1.2rem', color: '#666' }} />
            </InputAdornment>
          ),
        }}
        sx={{
          minWidth: 200,
          '& .MuiOutlinedInput-root': {
            borderRadius: 0,
            backgroundColor: '#f8f9fa',
          },
        }}
      />
    )
  ), [searchValue, onSearchChange]);

  // Memoize the pagination component
  const pagination = useMemo(() => (
    totalCount && totalCount > rowsPerPage && onPageChange && (
      <CustomPagination
        count={Math.ceil(totalCount / rowsPerPage)}
        page={page + 1}
        totalCount={totalCount}
        onChange={(event, value) => onPageChange(value - 1)}
      />
    )
  ), [totalCount, rowsPerPage, page, onPageChange]);

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
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#333' }}>
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
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              Total Count: <strong>{totalCount}</strong>
            </Typography>
          )}
          {searchInput}
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
            {tableHeader}
            {tableBody}
          </Table>
        </TableContainer>
      </Paper>

      {/* Pagination */}
      {pagination}
    </Box>
  );
});

// Set display name for debugging
OptimizedTable.displayName = 'OptimizedTable';

export default OptimizedTable;
