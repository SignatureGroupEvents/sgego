import React from 'react';
import { BottomNavigation, BottomNavigationAction, Paper, useMediaQuery } from '@mui/material';
import { List as ListIcon, Settings as SettingsIcon, BarChart as BarChartIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const MobileBottomTabs = ({ value, onChange, hideManage = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!isMobile) return null;

  if (hideManage) {
    return (
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          borderTop: '1px solid #e0e0e0',
        }}
      >
        <BottomNavigation
          value={value}
          onChange={(event, newValue) => onChange(newValue)}
          showLabels
          sx={{
            '& .MuiBottomNavigationAction-root': {
              color: 'text.secondary',
              '&.Mui-selected': { color: 'primary.main' },
            },
          }}
        >
          <BottomNavigationAction label="List" icon={<ListIcon />} />
          <BottomNavigationAction label="Stats" icon={<BarChartIcon />} />
        </BottomNavigation>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        borderTop: '1px solid #e0e0e0',
      }}
    >
      <BottomNavigation
        value={value}
        onChange={(event, newValue) => onChange(newValue)}
        showLabels
        sx={{
          '& .MuiBottomNavigationAction-root': {
            color: 'text.secondary',
            '&.Mui-selected': { color: 'primary.main' },
          },
        }}
      >
        <BottomNavigationAction label="List" icon={<ListIcon />} />
        <BottomNavigationAction label="Manage" icon={<SettingsIcon />} />
        <BottomNavigationAction label="Stats" icon={<BarChartIcon />} />
      </BottomNavigation>
    </Paper>
  );
};

export default MobileBottomTabs;

