import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
  Divider
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Event as EventIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '../../services/events';

const UpcomingEventsCalendar = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await getEvents();
      const allEvents = response.events || [];
      // Filter for main events only and upcoming events
      const upcomingEvents = allEvents.filter(event => 
        event.isMainEvent && 
        new Date(event.eventStart) >= new Date(new Date().setHours(0, 0, 0, 0))
      );
      setEvents(upcomingEvents);
    } catch (error) {
      console.error('Error loading events for calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.eventStart);
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleDateClick = (date) => {
    const eventsForDate = getEventsForDate(date);
    if (eventsForDate.length > 0) {
      // Navigate to the first event on that date
      navigate(`/events/${eventsForDate[0]._id}`);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const renderCalendarDays = () => {
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <Box 
          key={`empty-${i}`} 
          sx={{ 
            aspectRatio: '1',
            minHeight: { xs: 40, sm: 50, md: 60 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            opacity: 0.3
          }} 
        />
      );
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const eventsForDate = getEventsForDate(date);
      const hasEvents = eventsForDate.length > 0;
      
      days.push(
        <Box
          key={day}
          sx={{
            aspectRatio: '1',
            minHeight: { xs: 40, sm: 50, md: 60 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: hasEvents ? 'pointer' : 'default',
            border: isToday(date) ? '2px solid' : '1px solid',
            borderColor: isToday(date) ? 'primary.main' : 'divider',
            borderRadius: 1,
            backgroundColor: isToday(date) ? 'primary.light' : 'transparent',
            '&:hover': hasEvents ? {
              backgroundColor: 'action.hover',
              borderColor: 'primary.main'
            } : {},
            opacity: isPastDate(date) ? 0.4 : 1,
            position: 'relative',
            transition: 'all 0.2s ease',
            p: { xs: 0.25, sm: 0.5 }
          }}
          onClick={() => hasEvents && handleDateClick(date)}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: isToday(date) ? 600 : 400,
              color: isToday(date) ? 'primary.main' : 'text.primary',
              fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' }
            }}
          >
            {day}
          </Typography>
          {hasEvents && (
            <Box sx={{ 
              display: 'flex', 
              gap: 0.25, 
              mt: { xs: 0.25, sm: 0.5 },
              position: 'absolute',
              bottom: { xs: 1, sm: 2 }
            }}>
              {eventsForDate.slice(0, 2).map((event, idx) => (
                <Box
                  key={event._id}
                  sx={{
                    width: { xs: 3, sm: 4 },
                    height: { xs: 3, sm: 4 },
                    borderRadius: '50%',
                    backgroundColor: 'primary.main'
                  }}
                />
              ))}
              {eventsForDate.length > 2 && (
                <Typography 
                  variant="caption" 
                  color="primary.main"
                  sx={{ fontSize: { xs: '0.5rem', sm: '0.6rem' } }}
                >
                  +{eventsForDate.length - 2}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      );
    }
    
    return days;
  };

  const upcomingEvents = events
    .slice(0, 5) // Show only next 5 events
    .sort((a, b) => new Date(a.eventStart) - new Date(b.eventStart));

  const renderEventCard = (event) => (
    <Card
      key={event._id}
      elevation={1}
      sx={{
        mb: 1.5,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)'
        }
      }}
      onClick={() => navigate(`/events/${event._id}`)}
    >
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
          {event.eventName}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Contract: {event.eventContractNumber}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            {new Date(event.eventStart).toLocaleDateString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography 
            variant={isMobile ? 'subtitle1' : 'h6'} 
            fontWeight={700} 
            color="primary.main"
            sx={{ fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' } }}
          >
            📅 Upcoming Events
          </Typography>
        </Box>

        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {/* Calendar */}
          <Grid xs={12} md={6}>
            <Paper elevation={1} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, borderRadius: 2, backgroundColor: 'background.paper' }}>
              {/* Calendar Header */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <IconButton 
                  size={isMobile ? 'small' : 'medium'} 
                  onClick={handlePrevMonth}
                  sx={{ p: { xs: 0.5, sm: 1 } }}
                >
                  <ChevronLeftIcon fontSize={isMobile ? 'small' : 'medium'} />
                </IconButton>
                <Typography 
                  variant={isMobile ? 'subtitle1' : 'h6'} 
                  fontWeight={600}
                  sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' } }}
                >
                  {isMobile 
                    ? `${monthNames[currentDate.getMonth()].substring(0, 3)} ${currentDate.getFullYear()}`
                    : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                  }
                </Typography>
                <IconButton 
                  size={isMobile ? 'small' : 'medium'} 
                  onClick={handleNextMonth}
                  sx={{ p: { xs: 0.5, sm: 1 } }}
                >
                  <ChevronRightIcon fontSize={isMobile ? 'small' : 'medium'} />
                </IconButton>
              </Box>

              {/* Day Names */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)',
                mb: 1,
                gap: { xs: 0.25, sm: 0.5 }
              }}>
                {dayNames.map(day => (
                  <Box key={day} sx={{ textAlign: 'center', py: { xs: 0.5, sm: 1 } }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: 'text.secondary',
                        fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' }
                      }}
                    >
                      {isMobile ? day.substring(0, 1) : day}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Calendar Days */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: { xs: 0.25, sm: 0.5 }
              }}>
                {renderCalendarDays()}
              </Box>
            </Paper>
          </Grid>

          {/* My Upcoming Events Table/Cards */}
          <Grid xs={12} md={6}>
            <Paper elevation={1} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, borderRadius: 2, backgroundColor: 'background.paper' }}>
              <Typography 
                variant={isMobile ? 'subtitle1' : 'h6'} 
                fontWeight={600} 
                mb={2} 
                color="primary.main"
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' } }}
              >
                My Upcoming Events
              </Typography>
              {upcomingEvents.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No upcoming events
                </Typography>
              ) : isMobile ? (
                <Box>
                  {upcomingEvents.map(event => renderEventCard(event))}
                </Box>
              ) : (
                <TableContainer component={Paper} elevation={0} sx={{ backgroundColor: 'transparent' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 1, width: '40%' }}>Event Name</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 1, width: '30%' }}>Contract #</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 1, width: '30%' }}>Start Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {upcomingEvents.map((event) => (
                        <TableRow
                          key={event._id}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'action.hover'
                            }
                          }}
                          onClick={() => navigate(`/events/${event._id}`)}
                        >
                          <TableCell sx={{ py: 1.5, fontSize: '0.875rem', width: '40%' }}>
                            <Typography variant="body2" fontWeight={500}>
                              {event.eventName}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5, fontSize: '0.875rem', width: '30%' }}>
                            <Typography variant="body2" color="text.secondary">
                              {event.eventContractNumber}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5, fontSize: '0.875rem', width: '30%' }}>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(event.eventStart).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default UpcomingEventsCalendar; 