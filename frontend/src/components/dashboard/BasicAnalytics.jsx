import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const dummyChartData = [
  { name: 'Apr', value: 40 },
  { name: 'May', value: 44 },
  { name: 'Jun', value: 42 },
  { name: 'Jul', value: 41 },
  { name: 'Aug', value: 44 },
  { name: 'Sep', value: 40 },
];

const BasicAnalytics = ({ event = {}, guests = [], inventory = [] }) => {
  const totalGuests = guests.length || 40;
  const checkedInGuests = guests.filter(g => g.hasCheckedIn).length || 2;

  return (
    <Box sx={{ width: '100%', py: 4, backgroundColor: '#fdf9f6' }}>
      {/* Title + Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} color="primary">
          {event?.name || 'Tech Conference 2025 Dashboard'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'grey.700' }}>
          Contract: {event?.contractNumber || 'TECH2025'}
        </Typography>
      </Box>

      {/* Analytics Grid */}
      <Grid container spacing={3}>
        {/* Attendance Card */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 4,
              borderRadius: 3,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Typography variant="subtitle2" sx={{ color: 'grey.700', fontWeight: 700, mb: 1 }}>
              TOTAL ATTENDANCE:
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
              {checkedInGuests} / {totalGuests}
            </Typography>
            <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
              CHECKED IN
            </Typography>
          </Paper>
        </Grid>

        {/* Line Chart */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              borderRadius: 3,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Check-ins Over Time
              </Typography>
              <Typography variant="caption" sx={{ color: 'grey.600' }}>
                1 Check-in per minute
              </Typography>
            </Box>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={dummyChartData}>
                <XAxis dataKey="name" />
                <YAxis domain={[38, 46]} />
                <Tooltip formatter={(value) => [`Tasks: ${value}`]} />
                <Legend verticalAlign="top" height={24} iconType="plainline" />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#e91e63"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, letterSpacing: 1, cursor: 'pointer' }}
                onClick={() => window.location.href = `/events/${event?._id || 'demo'}/dashboard/advanced`}
              >
                ADVANCED
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BasicAnalytics;
