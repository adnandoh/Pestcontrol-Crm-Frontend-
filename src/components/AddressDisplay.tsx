import React, { useState } from 'react';
import { Box, Button, Typography, Tooltip } from '@mui/material';

interface AddressDisplayProps {
  address: string;
  maxWords?: number;
  showViewMore?: boolean;
}

const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  maxWords = 4,
  showViewMore = true,
}) => {
  const [showAll, setShowAll] = useState(false);

  // Handle empty or null address
  if (!address || address.trim() === '') {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        No address
      </Typography>
    );
  }

  // Split address into words
  const addressWords = address.trim().split(/\s+/);
  
  // If address has 4 or fewer words, show it all with tooltip
  if (addressWords.length <= maxWords) {
    return (
      <Tooltip title={address} arrow placement="top">
        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: '0.75rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '200px',
            cursor: 'help'
          }}
        >
          {address}
        </Typography>
      </Tooltip>
    );
  }

  const displayWords = showAll ? addressWords : addressWords.slice(0, maxWords);
  const hasMore = addressWords.length > maxWords;
  const truncatedAddress = displayWords.join(' ');
  const remainingWords = addressWords.length - maxWords;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
      <Tooltip title={address} arrow placement="top">
        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: '0.75rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '200px',
            cursor: 'help'
          }}
        >
          {truncatedAddress}
        </Typography>
      </Tooltip>
      
      {hasMore && showViewMore && !showAll && (
        <Button
          size="small"
          onClick={() => setShowAll(true)}
          sx={{
            minWidth: 'auto',
            px: 1,
            py: 0,
            fontSize: '0.6rem',
            textTransform: 'none',
            color: '#1976d2',
            fontWeight: 500,
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.04)',
            },
          }}
        >
          ... +{remainingWords} more
        </Button>
      )}
      
      {hasMore && showViewMore && showAll && (
        <Button
          size="small"
          onClick={() => setShowAll(false)}
          sx={{
            minWidth: 'auto',
            px: 1,
            py: 0,
            fontSize: '0.6rem',
            textTransform: 'none',
            color: '#1976d2',
            fontWeight: 500,
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.04)',
            },
          }}
        >
          show less
        </Button>
      )}
    </Box>
  );
};

export default AddressDisplay;
