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
  Button
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
  return (
    <Box mb={3}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={canModifyUsers ? 2 : 0}
      >
        {/* Tabs on the left */}
        <Tabs value={filterStatus} onChange={(e, val) => setFilterStatus(val)}>
          <Tab label="All" value="all" />
          <Tab label="Pending" value="pending" />
          <Tab label="Expired" value="expired" />
          <Tab label="Request for Removal" value="removal_requested" />
        </Tabs>

        {/* Filters on the right */}
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ width: 250 }}>
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
            sx={{ width: 250 }}
          />
        </Box>
      </Box>


    </Box>
  );
};

export default AccountFilters;


