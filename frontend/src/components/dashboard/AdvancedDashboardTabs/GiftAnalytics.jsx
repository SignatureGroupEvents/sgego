import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

const GiftAnalytics = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={2} sx={{ p: 3, minHeight: '400px' }}>
        <Typography variant="h5" gutterBottom>
          Gift Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gift Analytics Content Goes Here
        </Typography>
      </Paper>
    </Box>
  );
};

export default GiftAnalytics; 