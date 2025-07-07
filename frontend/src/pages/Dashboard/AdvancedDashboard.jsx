import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Button,
  TextField,
  Grid,
  Paper,
  Container
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import GiftAnalytics from '../../components/dashboard/AdvancedDashboardTabs/GiftAnalytics';
import EventAnalytics from '../../components/dashboard/AdvancedDashboardTabs/EventAnalytics';
import ActivityFeed from '../../components/dashboard/AdvancedDashboardTabs/ActivityFeed';

const AdvancedDashboard = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const renderTabContent = () => {
    switch (tabValue) {
      case 0:
        return <GiftAnalytics />;
      case 1:
        return <EventAnalytics />;
      case 2:
        return <ActivityFeed />;
      default:
        return <GiftAnalytics />;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, backgroundColor: '#fdf9f6' }}>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            <Typography variant="h4" component="h1" gutterBottom>
              TECH CONFERENCE 2025 DASHBOARD
            </Typography>
            <Typography variant="h6" color="text.secondary">
              CONTRACT: TECH2025
            </Typography>
          </Grid>
          <Grid item>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                placeholder="Search..."
                size="small"
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{ minWidth: 200 }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#1565c0' } }}
              >
                Add/Edit Inventory
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs Section */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 64,
              fontSize: '1rem',
              fontWeight: 500,
            },
          }}
        >
          <Tab label="Gift Analytics" />
          <Tab label="Event Analytics" />
          <Tab label="Activity" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ minHeight: '500px' }}>
        {renderTabContent()}
      </Box>
    </Container>
  );
};

export default AdvancedDashboard; 