import React, { useState } from 'react';
import { Box, Chip, Button, Typography, Tooltip } from '@mui/material';

interface ServiceTypesDisplayProps {
  serviceTypes: string;
  maxDisplay?: number;
  showViewMore?: boolean;
}

const ServiceTypesDisplay: React.FC<ServiceTypesDisplayProps> = ({
  serviceTypes,
  maxDisplay = 2,
  showViewMore = true,
}) => {
  const [showAll, setShowAll] = useState(false);

  // Parse service types from string to array
  const serviceTypesArray = serviceTypes ? serviceTypes.split(', ').filter(type => type.trim()) : [];
  
  if (serviceTypesArray.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        No services
      </Typography>
    );
  }

  const displayTypes = showAll ? serviceTypesArray : serviceTypesArray.slice(0, maxDisplay);
  const hasMore = serviceTypesArray.length > maxDisplay;

  return (
    <Tooltip title={serviceTypes} arrow placement="top">
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 0.5, 
        alignItems: 'center',
        maxWidth: '250px',
        overflow: 'hidden',
        cursor: 'help'
      }}>
        {displayTypes.map((serviceType, index) => (
          <Chip
            key={index}
            label={serviceType}
            size="small"
            sx={{
              backgroundColor: '#e8f5e9',
              color: '#2e7d32',
              fontWeight: 500,
              fontSize: '0.6rem',
              height: 20,
              '& .MuiChip-label': {
                px: 1,
              },
            }}
          />
        ))}
        
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
            +{serviceTypesArray.length - maxDisplay} more
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
    </Tooltip>
  );
};

export default ServiceTypesDisplay;
