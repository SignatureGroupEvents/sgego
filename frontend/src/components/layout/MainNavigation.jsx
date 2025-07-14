import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Typography, 
  Box,
  Divider,
  Button
} from '@mui/material';
import { 
  Event as EventIcon, 
  Dashboard as DashboardIcon,
  Person as ProfileIcon,
  Info as InfoIcon,
  Logout as LogoutIcon,
  ExpandLess,
  ExpandMore,
  List as ListIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import Collapse from '@mui/material/Collapse';
import ListItemButton from '@mui/material/ListItemButton';

const MainNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const [eventsOpen, setEventsOpen] = React.useState(false);

  const handleEventsClick = () => {
    setEventsOpen((prev) => !prev);
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isEventSubpage = (subPath) => {
    // Checks if current route matches any event subpage
    return location.pathname.startsWith(subPath.replace(':id', ''));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ 
      width: 250, 
      bgcolor: 'background.paper', 
      borderRight: 1, 
      borderColor: 'divider', 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      position: 'relative',
      boxSizing: 'border-box'
    }}>
      <Typography variant="h6" sx={{ p: 2, pb: 1, fontWeight: 600, margin: 0 }}>
        Event Check-in
      </Typography>
      <Divider sx={{ margin: 0 }} />
      
      {/* Navigation Items */}
      <List sx={{ flexGrow: 1 }}>
        {/* Dashboard */}
        <ListItemButton 
          selected={isActive('/dashboard')}
          onClick={() => navigate('/dashboard')}
        >
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>

        {/* Events Dropdown */}
        <ListItemButton onClick={handleEventsClick} selected={isActive('/events') || isEventSubpage('/events/:id')}>
          <ListItemIcon>
            <EventIcon />
          </ListItemIcon>
          <ListItemText primary="Events" />
          {eventsOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={eventsOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} selected={location.pathname === '/events'} onClick={() => navigate('/events')}>
              <ListItemText primary="Events List" />
            </ListItemButton>
            <ListItemButton sx={{ pl: 4 }} selected={location.pathname.includes('/inventory')} onClick={() => navigate('/events/:id/inventory')}>
              <ListItemText primary="Inventory" />
            </ListItemButton>
            <ListItemButton sx={{ pl: 4 }} selected={location.pathname.includes('/upload')} onClick={() => navigate('/events/:id/upload')}>
              <ListItemText primary="Upload Guests" />
            </ListItemButton>
            <ListItemButton sx={{ pl: 4 }} selected={location.pathname.includes('/dashboard/advanced')} onClick={() => navigate('/events/:id/dashboard/advanced')}>
              <ListItemText primary="Advanced Analytics" />
            </ListItemButton>
          </List>
        </Collapse>

        {/* Account */}
        <ListItemButton selected={isActive('/account')} onClick={() => navigate('/account')}>
          <ListItemIcon>
            <ProfileIcon />
          </ListItemIcon>
          <ListItemText primary="Account" />
        </ListItemButton>
      </List>

      {/* Logout Button */}
      <Box sx={{ 
        p: 2, 
        borderTop: 1, 
        borderColor: 'divider',
        margin: 0,
        boxSizing: 'border-box'
      }}>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            fontWeight: 600,
            borderRadius: 2,
            py: 1.5,
            margin: 0,
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'error.contrastText'
            }
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );
};

export default MainNavigation; 