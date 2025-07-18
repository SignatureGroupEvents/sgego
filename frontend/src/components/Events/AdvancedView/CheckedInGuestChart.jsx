import React from 'react';
import { Card, CardContent, Typography, useTheme } from '@mui/material';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

// Checked-in Guests Chart for AdvancedView
const CheckedInGuestsChart = ({ guests = [] }) => {
    const theme = useTheme();
    const totalGuests = guests.length;
    const checkedIn = guests.filter(g => g.hasCheckedIn).length;
    const pending = totalGuests - checkedIn;
    const pieData = [
      { name: 'Checked In', value: checkedIn, color: theme.palette.success.main },
      { name: 'Pending', value: pending, color: theme.palette.warning.main }
    ];
    return (
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Guest Check-In Status
          </Typography>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {pieData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  export default CheckedInGuestsChart;