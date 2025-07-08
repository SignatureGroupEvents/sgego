import React from 'react';
import { Box, Container } from '@mui/material';
import Header from './Header';
import Footer from './Footer';
import BreadcrumbsNav from './BreadcrumbsNav';

const MainLayout = ({ children, eventName, userName }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      backgroundColor: 'background.default'
    }}>
      {/* Header */}
      <Header />
      
      {/* Main Content Area */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        minHeight: 0 // Important for proper flex behavior
      }}>
        <Container 
          maxWidth="xl" 
          sx={{ 
            flex: 1,
            py: 3,
            px: { xs: 2, sm: 3, md: 4 },
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Breadcrumbs */}
          <BreadcrumbsNav eventName={eventName} userName={userName} />
          
          {/* Page Content */}
          <Box sx={{ flex: 1 }}>
            {children}
          </Box>
        </Container>
      </Box>
      
      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default MainLayout; 