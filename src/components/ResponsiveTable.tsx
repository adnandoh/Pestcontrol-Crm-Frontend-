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
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Typography,
  Divider,
} from '@mui/material';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
}

interface ResponsiveTableProps {
  columns: Column[];
  rows: any[];
  mobileCardRender?: (row: any, index: number) => React.ReactNode;
  title?: string;
}

const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  columns,
  rows,
  mobileCardRender,
  title,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (isMobile && mobileCardRender) {
    return (
      <Box>
        {title && (
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            {title}
          </Typography>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rows.map((row, index) => mobileCardRender(row, index))}
        </Box>
      </Box>
    );
  }

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        width: '100%', 
        overflow: 'hidden',
        border: '1px solid #e0e0e0',
        borderRadius: 3,
      }}
    >
      {title && (
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', bgcolor: '#f5f5f5' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
      )}
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="responsive table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ 
                    minWidth: column.minWidth,
                    fontWeight: 600,
                    backgroundColor: '#f8f9fa',
                    borderBottom: '2px solid #e0e0e0',
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
                hover 
                role="checkbox" 
                tabIndex={-1} 
                key={index}
                sx={{
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
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
                        py: 2,
                      }}
                    >
                      {column.format && typeof value === 'number'
                        ? column.format(value)
                        : value}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ResponsiveTable;