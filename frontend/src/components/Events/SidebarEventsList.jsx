import React, { useEffect, useState } from 'react';
import { List, ListItem, ListItemText, ListItemIcon, Collapse, IconButton, Typography, Box } from '@mui/material';
import { ExpandLess, ExpandMore, Event as EventIcon, SubdirectoryArrowRight as SubEventIcon } from '@mui/icons-material';
import { getEvents } from '../../services/events';

const SidebarEventsList = ({ onSelectEvent }) => {
  const [events, setEvents] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const allEvents = await getEvents();
        setEvents(allEvents.events || allEvents); // support both {events:[]} and []
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  const mainEvents = events.filter(ev => ev.isMainEvent);
  const secondaryEvents = parentId => events.filter(ev => ev.parentEventId === parentId);

  const toggleExpand = eventId => {
    setExpanded(prev => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  if (loading) {
    return <Typography sx={{ p: 2 }}>Loading events...</Typography>;
  }

  return (
    <Box sx={{ width: 300, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider', height: '100vh', overflowY: 'auto' }}>
      <Typography variant="h6" sx={{ p: 2, pb: 1 }}>Events</Typography>
      <List>
        {mainEvents.map(main => {
          const secondaries = secondaryEvents(main._id);
          const hasSecondaries = secondaries.length > 0;
          return (
            <React.Fragment key={main._id}>
              <ListItem button onClick={() => onSelectEvent(main)}>
                <ListItemIcon>
                  <EventIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary={main.eventName} />
                {hasSecondaries && (
                  <IconButton size="small" onClick={e => { e.stopPropagation(); toggleExpand(main._id); }}>
                    {expanded[main._id] ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                )}
              </ListItem>
              {hasSecondaries && (
                <Collapse in={expanded[main._id]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {secondaries.map(sec => (
                      <ListItem button key={sec._id} sx={{ pl: 6 }} onClick={() => onSelectEvent(sec)}>
                        <ListItemIcon>
                          <SubEventIcon color="secondary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={sec.eventName} />
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );
};

export default SidebarEventsList; 