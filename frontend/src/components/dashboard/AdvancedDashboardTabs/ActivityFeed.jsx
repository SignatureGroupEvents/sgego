import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

const ActivityFeed = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={2} sx={{ p: 3, minHeight: '400px' }}>
        <Typography variant="h5" gutterBottom>
          Activity Feed
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Activity Feed Content Goes Here
        </Typography>
      </Paper>
    </Box>
  );
};

export default ActivityFeed; 