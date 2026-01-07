import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  useTheme,
  useMediaQuery,
  Stack
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const AccountFilters = ({
  filterStatus,
  setFilterStatus,
  filterRole,
  setFilterRole,
  searchQuery,
  setSearchQuery,
  searchValue,
  setSearchValue,
  canModifyUsers
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box mb={3}>
      <Box
        display="flex"
        flexDirection={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        gap={{ xs: 2, md: 0 }}
        mb={canModifyUsers ? 2 : 0}
      >
        {/* Tabs */}
        <Box sx={{ 
          width: { xs: '100%', md: 'auto' },
          overflowX: { xs: 'auto', md: 'visible' },
          '& .MuiTabs-scrollButtons': {
            display: { xs: 'flex', md: 'none' }
          }
        }}>
          <Tabs 
            value={filterStatus} 
            onChange={(e, val) => setFilterStatus(val)}
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons={isMobile ? 'auto' : false}
            allowScrollButtonsMobile
          >
            <Tab label="All" value="all" />
            <Tab label="Pending" value="pending" />
            <Tab label="Expired" value="expired" />
            <Tab label="Request for Removal" value="removal_requested" />
          </Tabs>
        </Box>

        {/* Filters */}
        <Box 
          display="flex" 
          flexDirection={{ xs: 'column', sm: 'row' }}
          gap={2}
          width={{ xs: '100%', md: 'auto' }}
        >
          <FormControl 
            size="small" 
            sx={{ 
              width: { xs: '100%', sm: 250 },
              minWidth: { xs: '100%', sm: 250 }
            }}
          >
            <InputLabel>Role</InputLabel>
            <Select
              value={filterRole}
              label="Role"
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="operations_manager">Operations Manager</MenuItem>
              <MenuItem value="staff">Staff</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Search User"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            sx={{ 
              width: { xs: '100%', sm: 250 },
              minWidth: { xs: '100%', sm: 250 }
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default AccountFilters;


