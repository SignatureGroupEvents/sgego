import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: '#31365E',
        borderTop: 1,
        borderColor: '#31365E',
        textAlign: 'center'
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2" sx={{ color: 'white' }}>
          © {currentYear} SGEGO. All rights reserved.
        </Typography>
        <Typography variant="caption" sx={{ color: 'white', display: 'block', mt: 0.5 }}>
          Powered by Signature Group Events 
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer; 