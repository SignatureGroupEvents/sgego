import React from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper 
} from '@mui/material';
import { 
  CardGiftcard as GiftIcon, 
  ExpandMore as ExpandMoreIcon 
} from '@mui/icons-material';

// Standalone Gift Tracker Component that can be used independently
const StandaloneGiftTracker = ({ inventory = [], loading = false, error = '', onInventoryChange }) => {
  // Group inventory by type and sum currentInventory
  const grouped = inventory.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = 0;
    acc[item.type] += item.currentInventory || 0;
    return acc;
  }, {});

  const hasGiftData = Object.keys(grouped).length > 0;
  const totalGiftsAvailable = Object.values(grouped).reduce((a, b) => a + b, 0);

  return (
    <Accordion defaultExpanded={true} sx={{ mt: 2 }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          '& .MuiAccordionSummary-content': {
            alignItems: 'center',
            gap: 1
          }
        }}
      >
        <GiftIcon color="primary" />
        <Typography variant="h6" fontWeight={600} color="primary.main">
          Gift Tracker
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {loading ? 'Loading...' : `${totalGiftsAvailable} gifts available`}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Loading inventory data...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error" gutterBottom>
              {error}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please try refreshing the page or contact support if the issue persists.
            </Typography>
          </Box>
        ) : !hasGiftData ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <GiftIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No inventory available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gift inventory data will appear here once items are added to this event.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Gift Type</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity Remaining</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(grouped)
                    .sort(([,a], [,b]) => b - a)
                    .map(([giftType, quantity]) => (
                      <TableRow key={giftType} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {giftType}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600} color="primary.main">
                            {quantity}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Total gifts available: <strong>{totalGiftsAvailable}</strong>
              </Typography>
            </Box>
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default StandaloneGiftTracker;