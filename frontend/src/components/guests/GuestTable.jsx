import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TablePagination,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  Tooltip
} from '@mui/material';
import {
  CheckCircleOutline as CheckCircleIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  Upload as UploadIcon,
  PersonAdd as PersonAddIcon,
  AccountTree as InheritedIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import GuestCheckIn from './GuestCheckIn';

const GuestTable = ({ guests, onAddGuest, onUploadGuests, event, onInventoryChange, inventory = [] }) => {
  const [checkInGuest, setCheckInGuest] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { isOperationsManager, isAdmin } = usePermissions();
  const { user: currentUser } = useAuth();

  // Determine if user can modify events
  const canModifyEvents = isOperationsManager || isAdmin;
  // Staff can perform check-ins and gift assignments but not modify guest lists
  const canPerformCheckins = isOperationsManager || isAdmin || currentUser?.role === 'staff';
  // Staff can add guests manually but not upload bulk
  const canAddGuests = isOperationsManager || isAdmin || currentUser?.role === 'staff';

  const handleOpenCheckIn = (guest) => {
    setCheckInGuest(guest);
    setModalOpen(true);
  };
  const handleCloseCheckIn = () => {
    setCheckInGuest(null);
    setModalOpen(false);
  };

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (guests.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <GroupsIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No guests added yet
          </Typography>
          <Typography color="textSecondary" paragraph>
            Get started by uploading a guest list or adding guests manually.
          </Typography>
          <Box display="flex" gap={2} justifyContent="center">
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={onUploadGuests}
            >
              Upload CSV/Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={<PersonAddIcon />}
              onClick={onAddGuest}
            >
              Add Guest Manually
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Guest List ({guests.length})
            </Typography>
          </Box>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Gift Selections</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell>Source</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {guests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((guest) => {
                  const isInherited = guest.isInherited;
                  
                  // Get gift selections for each event
                  const getGiftSelectionsForEvent = (eventId) => {
                    const checkin = guest.eventCheckins?.find(ec => 
                      ec.eventId?.toString() === eventId?.toString()
                    );
                    return checkin?.giftsReceived || [];
                  };

                  // Get main event and secondary events
                  const mainEvent = event?.isMainEvent ? event : event?.parentEvent;
                  const secondaryEvents = event?.secondaryEvents || [];
                  const allEvents = mainEvent ? [mainEvent, ...secondaryEvents] : [event];

                  // Format gift selections for display
                  const formatGiftSelections = (eventId, eventName) => {
                    const gifts = getGiftSelectionsForEvent(eventId);
                    if (gifts.length === 0) {
                      return `${eventName} - No gift selected`;
                    }
                    
                    const giftDetails = gifts.map(gift => {
                      // Handle both populated and unpopulated inventory items
                      let inventoryItem;
                      if (gift.inventoryId && typeof gift.inventoryId === 'object') {
                        // Populated inventory item
                        inventoryItem = gift.inventoryId;
                      } else {
                        // Unpopulated inventory item, find in inventory array
                        inventoryItem = inventory.find(item => item._id === gift.inventoryId);
                      }
                      
                      if (inventoryItem) {
                        return `${inventoryItem.type}${inventoryItem.style ? ` (${inventoryItem.style})` : ''}${gift.quantity > 1 ? ` x${gift.quantity}` : ''}`;
                      }
                      return 'Unknown gift';
                    }).join(', ');
                    
                    return `${eventName} - ${giftDetails}`;
                  };
                  
                  return (
                    <TableRow 
                      key={guest._id} 
                      hover 
                      sx={{ 
                        '&:hover': { backgroundColor: 'action.hover' },
                        ...(isInherited && {
                          backgroundColor: 'rgba(25, 118, 210, 0.04)',
                          '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.08)' }
                        })
                      }}
                    >
                      <TableCell>
                        {guest.hasCheckedIn ? (
                          <Button
                            variant="outlined"
                            color="success"
                            size="small"
                            sx={{ justifyContent: 'center', width: '75%', borderRadius: 2, fontWeight: 600, color: 'white' }}
                            startIcon={<CheckCircleIcon />}
                            disabled
                          >
                            Picked Up
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            color="success"
                            size="medium"
                            sx={{ justifyContent: 'center', width: '75%', borderRadius: 2, fontWeight: 600 }}
                            startIcon={<CheckCircleIcon />} 
                            onClick={() => handleOpenCheckIn(guest)}
                          >
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle2">{guest.firstName} {guest.lastName}</Typography>
                        </Box>
                        {guest.jobTitle && (
                          <Typography variant="caption" color="textSecondary">
                            {guest.jobTitle}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{guest.email || 'No email'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {allEvents.length > 0 ? (
                            allEvents.map((ev, index) => (
                              <Typography 
                                key={ev._id} 
                                variant="body2" 
                                sx={{ 
                                  fontSize: '0.8rem',
                                  color: index === 0 ? 'text.primary' : 'text.secondary'
                                }}
                              >
                                {formatGiftSelections(ev._id, ev.eventName)}
                              </Typography>
                            ))
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              No event information available
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{guest.attendeeType || 'General'}</TableCell>
                      <TableCell>
                        <Chip
                          label={guest.hasCheckedIn ? 'Checked In' : 'Pending'}
                          color={guest.hasCheckedIn ? 'success' : 'default'}
                          size="small"
                          icon={guest.hasCheckedIn ? <CheckCircleIcon /> : <PersonIcon />}
                          sx={{ borderRadius: 1 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {guest.tags?.map((tag, index) => (
                            <Chip
                              key={index}
                              label={tag.name}
                              size="small"
                              sx={{
                                backgroundColor: tag.color,
                                color: 'white',
                                fontSize: '0.7rem',
                                borderRadius: 1
                              }}
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {isInherited ? (
                          <Tooltip title={`From ${guest.originalEventName || 'Main Event'}`}>
                            <Chip
                              label={`${guest.originalEventName || 'Main Event'}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                              icon={<InheritedIcon />}
                              sx={{ borderRadius: 1 }}
                            />
                          </Tooltip>
                        ) : (
                          <Chip
                            label="Direct"
                            size="small"
                            color="default"
                            variant="outlined"
                            sx={{ borderRadius: 1 }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
      <TablePagination
        component="div"
        count={guests.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="Guests per page"
        sx={{ mt: 2 }}
      />
      {/* Check-in Modal */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseCheckIn}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            minWidth: 400
          }
        }}
      >
        <DialogTitle>
          Check In Guest
        </DialogTitle>
        <DialogContent>
          {checkInGuest && (
            <GuestCheckIn
              event={event}
              guest={checkInGuest}
              onClose={handleCloseCheckIn}
              onInventoryChange={onInventoryChange}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GuestTable;