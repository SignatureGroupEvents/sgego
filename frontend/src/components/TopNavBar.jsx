import React from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Typography, Box, Button, Avatar, Breadcrumbs, Link } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Logout as LogoutIcon, Person as PersonIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const TopNavBar = ({ breadcrumbs = [], leftAction }) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    return (
        <AppBar position="static" color="default" elevation={1} sx={{ mb: 2 }}>
            <Toolbar>
                {leftAction && leftAction}
                <Box sx={{ flexGrow: 1 }}>
                    <Breadcrumbs aria-label="breadcrumb">
                        {breadcrumbs.map((crumb, idx) =>
                            crumb.to ? (
                                <Link
                                    key={idx}
                                    component={RouterLink}
                                    underline="hover"
                                    color="inherit"
                                    to={crumb.to}
                                    sx={{ display: 'flex', alignItems: 'center' }}
                                >
                                    {crumb.icon && React.cloneElement(crumb.icon, { sx: { mr: 0.5, fontSize: 'inherit' } })}
                                    {crumb.label}
                                </Link>
                            ) : (
                                <Typography key={idx} color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                                    {crumb.icon && React.cloneElement(crumb.icon, { sx: { mr: 0.5, fontSize: 'inherit' } })}
                                    {crumb.label}
                                </Typography>
                            )
                        )}
                    </Breadcrumbs>
                </Box>
                {user && (
                    <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 32, height: 32 }}>{user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}</Avatar>
                        <Typography variant="body2" color="textSecondary">
                            {user.username || user.email}
                        </Typography>
                        <Button 
                            color="inherit" 
                            startIcon={<PersonIcon />} 
                            component={RouterLink}
                            to="/profile"
                            sx={{ textTransform: 'none' }}
                        >
                            Profile
                        </Button>
                        <Button color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
                            Logout
                        </Button>
                    </Box>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default TopNavBar; 