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
        backgroundColor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        textAlign: 'center'
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2" color="text.secondary">
          © {currentYear} Event Check-in System. All rights reserved.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          Powered by Signature Group Events
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer; 