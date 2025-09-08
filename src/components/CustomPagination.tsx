import React from 'react';
import { Box, Pagination, Typography } from '@mui/material';
import { PAGE_SIZE } from '../utils/pagination';

interface CustomPaginationProps {
  count: number;
  page: number;
  totalCount: number;
  onChange: (event: React.ChangeEvent<unknown>, value: number) => void;
  showBorder?: boolean;
}

const CustomPagination: React.FC<CustomPaginationProps> = ({
  count,
  page,
  totalCount,
  onChange,
  showBorder = true,
}) => {
  if (count <= 1) return null;

  const startIndex = (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center',
      mt: 3,
      py: 2,
      ...(showBorder && { borderTop: '1px solid #e0e0e0' })
    }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Showing {startIndex}-{endIndex} of {totalCount} items
      </Typography>
      <Pagination 
        count={count} 
        page={page}
        onChange={onChange}
        shape="rounded" 
        size="medium"
        sx={{
          '& .MuiPaginationItem-root': {
            borderRadius: 0,
            border: '1px solid #d0d0d0',
            color: '#666',
            fontWeight: 500,
            minWidth: '32px',
            height: '32px',
            margin: '0 2px',
            '&:hover': {
              backgroundColor: '#f5f5f5',
              borderColor: '#999',
            },
            '&.Mui-selected': {
              backgroundColor: '#007bff',
              color: 'white',
              borderColor: '#007bff',
              '&:hover': {
                backgroundColor: '#0056b3',
                borderColor: '#0056b3',
              },
            },
          },
          '& .MuiPaginationItem-previousNext': {
            '& svg': {
              fontSize: '1.2rem',
            },
          },
        }}
      />
    </Box>
  );
};

export default CustomPagination;