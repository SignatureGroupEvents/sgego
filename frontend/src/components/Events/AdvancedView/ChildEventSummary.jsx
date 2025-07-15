import React from 'react';
import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';

// Child Event Summary using real data
const ChildEventSummary = ({ secondaryEvents = [], guests = [], inventory = [] }) => {
    // For each child event, count guests and gifts
    const summary = secondaryEvents.map(child => {
      const childGuests = guests.filter(g => g.eventId === child._id);
      // Sum gifts for this child event
      const childInventory = inventory.filter(i => i.eventId === child._id);
      const giftCount = childInventory.reduce((sum, i) => sum + (i.currentInventory || 0), 0);
      return {
        eventName: child.eventName,
        giftCount,
        guestCount: childGuests.length,
        fulfillmentPercent: childInventory.length > 0 ? Math.round((giftCount / (childInventory.length * 100)) * 100) : 0, // Example
        status: 'Active', // You can add real status if available
      };
    });
    return (
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Child Event Summary
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Event Name</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Gift Count</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Guest Count</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Fulfillment %</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{row.eventName}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} color="primary.main">{row.giftCount}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>{row.guestCount}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} color="info.main">{row.fulfillmentPercent}%</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={row.status} color={row.status === 'Active' ? 'success' : row.status === 'Completed' ? 'primary' : 'warning'} size="small" sx={{ borderRadius: 1 }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  };

  export default ChildEventSummary;