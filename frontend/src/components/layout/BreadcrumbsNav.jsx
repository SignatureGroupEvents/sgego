import React from 'react';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import { useLocation, useParams, useNavigate } from 'react-router-dom';

const routeNameMap = {
  'dashboard': 'Dashboard',
  'events': 'Events',
  'account': 'Account',
  'inventory': 'Inventory',
  'advanced': 'Advanced Analytics',
  'details': 'Details',
  'upload': 'Upload Guests',
  'edit': 'Edit',
};

function getBreadcrumbs(location, params, extra) {
  const pathnames = location.pathname.split('/').filter(Boolean);
  const crumbs = [];
  let path = '';
  pathnames.forEach((part, idx) => {
    path += '/' + part;
    let label = routeNameMap[part] || part;
    // Special handling for eventId, userId, etc.
    if (part === params.eventId && extra?.eventName) label = extra.eventName;
    if (part === params.userId && extra?.userName) label = extra.userName;
    if (part === params.eventId && !extra?.eventName) label = `Event: ${part}`;
    if (part === params.userId && !extra?.userName) label = `User: ${part}`;
    crumbs.push({ label, path, isLast: idx === pathnames.length - 1 });
  });
  return crumbs;
}

const MAIN_PAGES = [
  '/dashboard',
  '/events',
  '/account',
  '/help',
  '/analytics',
  '/inventory',
  '/dashboard/advanced',
];

const BreadcrumbsNav = ({ eventName, userName, parentEventName, parentEventId }) => {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const pathnames = location.pathname.split('/').filter(Boolean);

  // Hide breadcrumb on all main pages
  if (
    MAIN_PAGES.some(
      (main) => location.pathname === main || location.pathname.startsWith(main + '/')
    ) && pathnames.length === 1
  ) {
    return null;
  }

  // Show 'Account / Edit Account' for /account/edit or /account/edit/:userId
  if (
    (location.pathname === '/account/edit') ||
    (pathnames[0] === 'account' && pathnames[1] === 'edit')
  ) {
    return (
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2, mt: 1 }}>
        <Link color="inherit" underline="hover" onClick={() => navigate('/account')} sx={{ cursor: 'pointer', fontWeight: 500 }}>
          Account
        </Link>
        <Typography color="text.primary" fontWeight={600}>Edit Account</Typography>
      </Breadcrumbs>
    );
  }

  // Show 'Events / [Event Name]' for /events/:eventId or /events/:eventId/dashboard
  if (
    pathnames[0] === 'events' &&
    (pathnames.length === 2 || (pathnames.length === 3 && pathnames[2] === 'dashboard'))
  ) {
    const eventLabel = eventName || 'Loading Event...';
    
    // If we have a parent event name, show the hierarchy
    if (parentEventName && parentEventName !== eventLabel) {
      return (
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2, mt: 1 }}>
          <Link color="inherit" underline="hover" onClick={() => navigate('/events')} sx={{ cursor: 'pointer', fontWeight: 500 }}>
            Events
          </Link>
          <Link color="inherit" underline="hover" onClick={() => navigate(`/events/${parentEventId || params.eventId}`)} sx={{ cursor: 'pointer', fontWeight: 500 }}>
            {parentEventName}
          </Link>
          <Typography color="text.primary" fontWeight={700}>{eventLabel}</Typography>
        </Breadcrumbs>
      );
    }
    
    // No parent event, show simple breadcrumb
    return (
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2, mt: 1 }}>
        <Link color="inherit" underline="hover" onClick={() => navigate('/events')} sx={{ cursor: 'pointer', fontWeight: 500 }}>
          Events
        </Link>
        <Typography color="text.primary" fontWeight={700}>{eventLabel}</Typography>
      </Breadcrumbs>
    );
  }

  // For subpages
  if (
    pathnames[0] === 'events' && pathnames[1] && pathnames.length >= 3
  ) {
    const eventLabel = eventName || 'Loading Event...';
    const eventId = params.eventId || pathnames[1];
    let subpageIdx = 2;
    if (pathnames[2] === 'dashboard' && pathnames.length > 3) subpageIdx = 3;
    const subpage = routeNameMap[pathnames[subpageIdx]] || pathnames[subpageIdx];
    
    // If we have a parent event name, show the hierarchy
    if (parentEventName && parentEventName !== eventLabel) {
      return (
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2, mt: 1 }}>
          <Link color="inherit" underline="hover" onClick={() => navigate('/events')} sx={{ cursor: 'pointer', fontWeight: 500 }}>
            Events
          </Link>
          <Link color="inherit" underline="hover" onClick={() => navigate(`/events/${parentEventId || eventId}`)} sx={{ cursor: 'pointer', fontWeight: 500 }}>
            {parentEventName}
          </Link>
          <Link color="inherit" underline="hover" onClick={() => navigate(`/events/${eventId}`)} sx={{ cursor: 'pointer', fontWeight: 500 }}>
            {eventLabel}
          </Link>
          {subpage && (
            <Typography color="text.primary" fontWeight={700}>{subpage}</Typography>
          )}
        </Breadcrumbs>
      );
    }
    
    // No parent event, show simple breadcrumb
    return (
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2, mt: 1 }}>
        <Link color="inherit" underline="hover" onClick={() => navigate('/events')} sx={{ cursor: 'pointer', fontWeight: 500 }}>
          Events
        </Link>
        <Link color="inherit" underline="hover" onClick={() => navigate(`/events/${eventId}`)} sx={{ cursor: 'pointer', fontWeight: 500 }}>
          {eventLabel}
        </Link>
        {subpage && (
          <Typography color="text.primary" fontWeight={700}>{subpage}</Typography>
        )}
      </Breadcrumbs>
    );
  }

  const crumbs = getBreadcrumbs(location, params, { eventName, userName });
  if (crumbs.length === 0) return null;

  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2, mt: 1 }}>
      {crumbs.map((crumb, idx) =>
        crumb.isLast ? (
          <Typography color="text.primary" key={crumb.path} fontWeight={700}>
            {crumb.label}
          </Typography>
        ) : (
          <Link
            key={crumb.path}
            color="inherit"
            underline="hover"
            onClick={() => navigate(crumb.path)}
            sx={{ cursor: 'pointer', fontWeight: 500 }}
          >
            {crumb.label}
          </Link>
        )
      )}
    </Breadcrumbs>
  );
};

export default BreadcrumbsNav; 