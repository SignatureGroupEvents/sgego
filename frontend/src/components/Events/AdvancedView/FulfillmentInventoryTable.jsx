import React from 'react';
import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

// Fulfillment & Inventory Table using real inventory data
const FulfillmentInventoryTable = ({ inventory = [] }) => {
    return (
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Fulfillment & Inventory
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Gift ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Gift Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Style</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Qty Warehouse</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Qty On Site</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Current Inventory</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventory.map((item) => (
                  <TableRow key={item._id} hover>
                    <TableCell>{item.sku || item._id}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>{item.style}</TableCell>
                    <TableCell align="right">{item.qtyWarehouse}</TableCell>
                    <TableCell align="right">{item.qtyOnSite}</TableCell>
                    <TableCell align="right">{item.currentInventory}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  };

export default FulfillmentInventoryTable;