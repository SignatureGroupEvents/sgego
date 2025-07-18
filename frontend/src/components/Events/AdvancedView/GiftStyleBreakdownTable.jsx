import React from 'react';
import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';

const GiftStyleBreakdownTable = () => {
    const mockGiftData = [
        { type: 'Tote Bag', style: 'Red', quantity: 18, status: 'Fulfilled' },
        { type: 'Water Bottle', style: 'Matte Black', quantity: 12, status: 'Pending' }
    ];
    const getStatusColor = (status) => {
        switch (status) {
            case 'Fulfilled': return 'success';
            case 'Pending': return 'warning';
            case 'Shipped': return 'info';
            default: return 'default';
        }
    };
    return (
        <Card sx={{ mb: 4 }}>
            <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                    Gift Style Breakdown
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell sx={{ fontWeight: 600 }}>Gift Type</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Style</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity Selected</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {mockGiftData.map((item, index) => (
                                <TableRow key={index} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>{item.type}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{item.style}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight={600} color="primary.main">{item.quantity}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={item.status}
                                            color={getStatusColor(item.status)}
                                            size="small"
                                            sx={{ borderRadius: 1 }}
                                            onClick={undefined}
                                        />
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

export default GiftStyleBreakdownTable;