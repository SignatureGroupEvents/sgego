import React from 'react';
import { Box, Typography } from '@mui/material';
import MainNavigation from '../components/layout/MainNavigation';
import BreadcrumbsNav from '../components/layout/BreadcrumbsNav';

const PageTemplate = ({ title = 'Page Title', children }) => {
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <MainNavigation />
      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
        <BreadcrumbsNav />
        <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
          {title}
        </Typography>
        {children}
      </Box>
    </Box>
  );
};

export default PageTemplate;
