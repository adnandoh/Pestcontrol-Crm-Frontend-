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
  Chip,
  Button,
  TextField,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import CustomPagination from './CustomPagination';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

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
          {onSearchChange && (
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
          )}
        </Box>
      </Box>

      {/* Table */}
      <Paper 
        elevation={0} 
        sx={{ 
          border: '1px solid #e0e0e0',
          borderRadius: 0,
          overflow: 'hidden'
        }}
      >
        <TableContainer>
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
          </Table>
        </TableContainer>
      </Paper>

      {/* Pagination */}
      {totalCount && totalCount > rowsPerPage && onPageChange && (
        <CustomPagination
          count={Math.ceil(totalCount / rowsPerPage)}
          page={page + 1}
          onChange={(event, value) => onPageChange(value - 1)}
        />
      )}
    </Box>
  );
};

export default ModernTable;