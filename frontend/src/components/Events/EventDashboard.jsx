import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip, Button, Alert, Table, TableBody, TableCell, TableContainer, TablePagination, TableHead, TableRow, Paper, IconButton, LinearProgress, Drawer, CardHeader, Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails, Tabs, Tab, InputAdornment, FormControl, InputLabel, Select, MenuItem, TextField, Autocomplete, Tooltip, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { CheckCircleOutline as CheckCircleIcon, Person as PersonIcon, Groups as GroupsIcon, Assessment as AssessmentIcon, Event as EventIcon, Home as HomeIcon, Menu as MenuIcon, Upload as UploadIcon, PersonAdd as PersonAddIcon, Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon, PeopleAlt as PeopleAltIcon, HourglassEmpty as HourglassEmptyIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, CardGiftcard as GiftIcon, Search as SearchIcon, Inventory as InventoryIcon, Save as SaveIcon, Cancel as CancelIcon, Edit as EditIcon, Info as InfoIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import api, { fetchInventory } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import MainLayout from '../layout/MainLayout';
import AddSecondaryEventModal from './AddSecondaryEventModal';
import AddGuest from '../guests/AddGuest';
import InventoryPage from '../../components/inventory/InventoryPage';
import GuestCheckIn from '../guests/GuestCheckIn';
import BasicAnalytics from '../dashboard/BasicAnalytics';
import { getEvent } from '../../services/events';
import { getEventActivityFeed } from '../../services/api';
import MainNavigation from '../layout/MainNavigation';
import ManageSection from './ManageSection';
import EventHeader from './EventHeader';


const GuestTable = ({ guests, onAddGuest, onUploadGuests, event, onInventoryChange }) => {
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
            <Box display="flex" gap={1}>
              {canModifyEvents && (
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={onUploadGuests}
                  size="small"
                  sx={{ borderRadius: 2, fontWeight: 600 }}
                >
                  Upload More
                </Button>
              )}
              {canAddGuests && (
                <Button
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  onClick={onAddGuest}
                  size="small"
                  sx={{ borderRadius: 2, fontWeight: 600 }}
                >
                  Add Guest
                </Button>
              )}
            </Box>
          </Box>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Selected Gift</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Tags</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {guests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((guest) => {
                  // Find the selected gift from inventory
                  const selectedGift = guest.giftSelection ? inventory.find(item => item._id === guest.giftSelection) : null;
                  
                  return (
                    <TableRow key={guest._id} hover sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                      <TableCell>
                        {guest.hasCheckedIn ? (
                          <Button
                            variant="outlined"
                            color="success"
                            size="small"
                            startIcon={<CheckCircleIcon />}
                            disabled
                            sx={{ borderRadius: 2, fontWeight: 600 }}
                          >
                            Checked In
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            sx={{ borderRadius: 2, fontWeight: 600 }}
                            onClick={() => handleOpenCheckIn(guest)}
                          >
                            Check In
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2">{guest.firstName} {guest.lastName}</Typography>
                        {guest.jobTitle && (
                          <Typography variant="caption" color="textSecondary">
                            {guest.jobTitle}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{guest.email || 'No email'}</TableCell>
                      <TableCell>
                        {selectedGift ? (
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {selectedGift.type}
                            </Typography>
                            {selectedGift.style && (
                              <Typography variant="caption" color="textSecondary">
                                {selectedGift.style}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No gift selected
                          </Typography>
                        )}
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

// Standalone Gift Tracker Component that can be used independently
export const StandaloneGiftTracker = ({ inventory = [], loading = false, error = '', onInventoryChange }) => {
  // Group inventory by type and sum currentInventory
  const grouped = inventory.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = 0;
    acc[item.type] += item.currentInventory || 0;
    return acc;
  }, {});

  const hasGiftData = Object.keys(grouped).length > 0;
  const totalGiftsAvailable = Object.values(grouped).reduce((a, b) => a + b, 0);

  return (
    <Accordion defaultExpanded={true} sx={{ mt: 2 }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          '& .MuiAccordionSummary-content': {
            alignItems: 'center',
            gap: 1
          }
        }}
      >
        <GiftIcon color="primary" />
        <Typography variant="h6" fontWeight={600} color="primary.main">
          Gift Tracker
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {loading ? 'Loading...' : `${totalGiftsAvailable} gifts available`}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Loading inventory data...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error" gutterBottom>
              {error}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please try refreshing the page or contact support if the issue persists.
            </Typography>
          </Box>
        ) : !hasGiftData ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <GiftIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No inventory available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gift inventory data will appear here once items are added to this event.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Gift Type</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity Remaining</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(grouped)
                    .sort(([,a], [,b]) => b - a)
                    .map(([giftType, quantity]) => (
                      <TableRow key={giftType} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {giftType}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600} color="primary.main">
                            {quantity}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Total gifts available: <strong>{totalGiftsAvailable}</strong>
              </Typography>
            </Box>
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

// Event Gift Dashboard Component that accepts inventory as props
const EventGiftDashboard = ({ eventId, event, inventory = [], loading = false, error = '', onInventoryChange }) => {
  // Group inventory by type and sum currentInventory
  const grouped = inventory.reduce((acc, item) => {
    // Only group real inventory items (skip if missing required fields, e.g. no type/style/size)
    if (!item.type || !item.style) return acc;
    if (!acc[item.type]) acc[item.type] = 0;
    acc[item.type] += item.currentInventory || 0;
    return acc;
  }, {});

  const hasGiftData = Object.keys(grouped).length > 0;
  const totalGiftsAvailable = Object.values(grouped).reduce((a, b) => a + b, 0);

  return (
    <Accordion defaultExpanded={false} sx={{ mt: 2 }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          '& .MuiAccordionSummary-content': {
            alignItems: 'center',
            gap: 1
          }
        }}
      >
        <GiftIcon color="primary" />
        <Typography variant="h6" fontWeight={600} color="primary.main">
          Gift Tracker
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {loading ? 'Loading...' : `${totalGiftsAvailable} gifts available`}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Loading inventory data...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error" gutterBottom>
              {error}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please try refreshing the page or contact support if the issue persists.
            </Typography>
          </Box>
        ) : !hasGiftData ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <GiftIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No inventory available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gift inventory data will appear here once items are added to this event.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Gift Type</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity Remaining</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(grouped)
                    .sort(([,a], [,b]) => b - a)
                    .map(([giftType, quantity]) => (
                      <TableRow key={giftType} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {giftType}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600} color="primary.main">
                            {quantity}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Total gifts available: <strong>{totalGiftsAvailable}</strong>
              </Typography>
            </Box>
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

const GiftStyleBreakdownTable = () => {
  const mockGiftData = [
    { type: 'Tote Bag', style: 'Red', quantity: 18, status: 'Fulfilled' },
    { type: 'Water Bottle', style: 'Matte Black', quantity: 12, status: 'Pending' }
  ];
  const getStatusColor = (status) => {
    switch (status) {
      case 'Fulfilled': return 'success';
      case 'Pending': return 'warning';
      case 'Shipped': return 'info';
      default: return 'default';
    }
  };
  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Gift Style Breakdown
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Gift Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Style</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity Selected</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockGiftData.map((item, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{item.type}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{item.style}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600} color="primary.main">{item.quantity}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.status}
                      color={getStatusColor(item.status)}
                      size="small"
                      sx={{ borderRadius: 1 }}
                      onClick={undefined}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

// Fulfillment & Inventory Table using real inventory data
const FulfillmentInventoryTable = ({ inventory = [] }) => {
  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Fulfillment & Inventory
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Gift ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Gift Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Style</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Qty Warehouse</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Qty On Site</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Current Inventory</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventory.map((item) => (
                <TableRow key={item._id} hover>
                  <TableCell>{item.sku || item._id}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.style}</TableCell>
                  <TableCell align="right">{item.qtyWarehouse}</TableCell>
                  <TableCell align="right">{item.qtyOnSite}</TableCell>
                  <TableCell align="right">{item.currentInventory}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

// Guest List with Gift Details using real data
const GuestListWithGifts = ({ guests = [], inventory = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGiftType, setFilterGiftType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Map inventoryId to {type, style}
  const inventoryMap = inventory.reduce((acc, item) => {
    acc[item._id] = item;
    return acc;
  }, {});

  // Filtering logic (if you have guest.giftSelection, adjust as needed)
  const filteredGuests = guests.filter(guest => {
    const matchesSearch = `${guest.firstName} ${guest.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGiftType = filterGiftType === 'all' || (guest.giftSelection && inventoryMap[guest.giftSelection]?.type === filterGiftType);
    const matchesStatus = filterStatus === 'all' || guest.hasCheckedIn === (filterStatus === 'checked-in');
    return matchesSearch && matchesGiftType && matchesStatus;
  });

  // Unique gift types for filter dropdown
  const giftTypes = Array.from(new Set(inventory.map(item => item.type))).filter(Boolean);

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Guest List with Gift Details
        </Typography>
        <Box display="flex" gap={2} mb={3}>
          <TextField
            size="small"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Gift Type</InputLabel>
            <Select
              value={filterGiftType}
              label="Gift Type"
              onChange={(e) => setFilterGiftType(e.target.value)}
              MenuProps={{
                PaperProps: {
                  sx: {
                    zIndex: 9999
                  }
                }
              }}
            >
              <MenuItem value="all">All Types</MenuItem>
              {giftTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
              MenuProps={{
                PaperProps: {
                  sx: {
                    zIndex: 9999
                  }
                }
              }}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="checked-in">Checked In</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Check-in Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Gift Selected</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Style</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredGuests.map((guest) => {
                const gift = guest.giftSelection ? inventoryMap[guest.giftSelection] : null;
                return (
                  <TableRow key={guest._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{guest.firstName} {guest.lastName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{guest.email || 'No email'}</Typography>
                    </TableCell>
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
                      <Typography variant="body2" fontWeight={500}>{gift ? gift.type : 'No gift selected'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{gift ? gift.style : '-'}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

// Child Event Summary using real data
const ChildEventSummary = ({ secondaryEvents = [], guests = [], inventory = [] }) => {
  // For each child event, count guests and gifts
  const summary = secondaryEvents.map(child => {
    const childGuests = guests.filter(g => g.eventId === child._id);
    // Sum gifts for this child event
    const childInventory = inventory.filter(i => i.eventId === child._id);
    const giftCount = childInventory.reduce((sum, i) => sum + (i.currentInventory || 0), 0);
    return {
      eventName: child.eventName,
      giftCount,
      guestCount: childGuests.length,
      fulfillmentPercent: childInventory.length > 0 ? Math.round((giftCount / (childInventory.length * 100)) * 100) : 0, // Example
      status: 'Active', // You can add real status if available
    };
  });
  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Child Event Summary
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Event Name</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Gift Count</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Guest Count</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Fulfillment %</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.map((row, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{row.eventName}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600} color="primary.main">{row.giftCount}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>{row.guestCount}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600} color="info.main">{row.fulfillmentPercent}%</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={row.status} color={row.status === 'Active' ? 'success' : row.status === 'Completed' ? 'primary' : 'warning'} size="small" sx={{ borderRadius: 1 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

// Checked-in Guests Chart for AdvancedView
const CheckedInGuestsChart = ({ guests = [] }) => {
  const theme = useTheme();
  const totalGuests = guests.length;
  const checkedIn = guests.filter(g => g.hasCheckedIn).length;
  const pending = totalGuests - checkedIn;
  const pieData = [
    { name: 'Checked In', value: checkedIn, color: theme.palette.success.main },
    { name: 'Pending', value: pending, color: theme.palette.warning.main }
  ];
  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Guest Check-In Status
        </Typography>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {pieData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const AdvancedView = ({ event, guests, secondaryEvents, inventory = [], onInventoryChange }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [feedLogs, setFeedLogs] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedType, setFeedType] = useState('');
  const theme = useTheme();
  const { eventId } = event || {};

  // Fetch activity feed logs for this event
  const fetchFeed = async () => {
    if (!event?._id) return;
    setFeedLoading(true);
    try {
      const res = await getEventActivityFeed(event._id, feedType ? { type: feedType } : {});
              // Event feed logs loaded
      setFeedLogs(res.data.logs || []);
    } catch (err) {
      console.error('Error loading event feed:', err);
      setFeedLogs([]);
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [event?._id, feedType]);

  // Refresh activity feed when inventory changes
  useEffect(() => {
    if (activeTab === 2) { // Only refresh if on activity feed tab
      fetchFeed();
    }
  }, [inventory, activeTab]); // Refresh when inventory or active tab changes

  // Group inventory by type+style for analytics
  const groupedByTypeStyle = inventory.reduce((acc, item) => {
    if (!item.type || !item.style) return acc;
    const key = `${item.type} - ${item.style}`;
    if (!acc[key]) acc[key] = 0;
    acc[key] += item.currentInventory || 0;
    return acc;
  }, {});

  // For PieChart: [{ name, value }]
  const giftSelectionData = Object.entries(groupedByTypeStyle).map(([name, value]) => ({ name, value }));

  // For GiftStyleBreakdownTable: [{ type, style, quantity }]
  const giftStyleBreakdown = inventory.filter(item => item.type && item.style).map(item => ({
    type: item.type,
    style: item.style,
    quantity: item.currentInventory || 0,
    status: 'Active', // You can add real status if available
  }));

  // Use theme palette for pie chart colors
  const pieColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'
  ];

  // Calculate stats
  const totalGuests = guests.length;
  const checkedInGuests = guests.filter(g => g.hasCheckedIn).length;
  const pendingGuests = totalGuests - checkedInGuests;
  const checkInPercentage = totalGuests > 0 ? Math.round((checkedInGuests / totalGuests) * 100) : 0;

  // Handler to update notes
  const handleNoteUpdate = async (inventoryId, newNote) => {
    try {
      await api.put(`/inventory/${inventoryId}`, { notes: newNote });
      if (onInventoryChange) onInventoryChange();
      // Refresh activity feed after note update
      fetchFeed();
    } catch (err) {
      alert('Failed to update note.');
    }
  };

  return (
    <Box>
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab icon={<GiftIcon />} label="Gift Analytics" iconPosition="start" />
        <Tab icon={<InventoryIcon />} label="Inventory & Fulfillment" iconPosition="start" />
        <Tab icon={<InfoIcon />} label="Feed" iconPosition="start" />
      </Tabs>
      {activeTab === 0 && (
        <Box>
          {/* Gift Style Breakdown Table and PieChart */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Gift Selections by Style
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Gift Type</TableCell>
                      <TableCell>Style</TableCell>
                      <TableCell align="right">Quantity Remaining</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {giftStyleBreakdown.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.type}</TableCell>
                        <TableCell>{row.style}</TableCell>
                        <TableCell align="right">{row.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={giftSelectionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {giftSelectionData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      )}
      {activeTab === 1 && <FulfillmentInventoryTable inventory={inventory} />}
      {activeTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Event Activity Feed</Typography>
            <Tooltip title="Refresh Activity Feed">
              <IconButton onClick={fetchFeed} disabled={feedLoading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
    </Box>
  );
};

// Event Dashboard Wrapper that fetches inventory and passes it to EventDashboard
const EventDashboardWrapper = () => {
  const { eventId } = useParams();
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState('');

  const loadInventory = async () => {
    if (!eventId) return;
    
    setInventoryLoading(true);
    setInventoryError('');
    try {
      const response = await fetchInventory(eventId);
      setInventory(response.data.inventory || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setInventoryError('Failed to fetch inventory data');
    } finally {
      setInventoryLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [eventId]);

  return (
    <EventDashboard 
      eventId={eventId}
      inventory={inventory}
      inventoryLoading={inventoryLoading}
      inventoryError={inventoryError}
      onInventoryChange={loadInventory}
    />
  );
};

const EventDashboard = ({ eventId, inventory = [], inventoryLoading = false, inventoryError = '', onInventoryChange }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isOperationsManager, isAdmin } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [localGuests, setLocalGuests] = useState([]);
  const [error, setError] = useState('');
  const [secondaryModalOpen, setSecondaryModalOpen] = useState(false);
  const [secondaryEvents, setSecondaryEvents] = useState([]);
  const [parentEvent, setParentEvent] = useState(null);
  const [giftTrackerCollapsed, setGiftTrackerCollapsed] = useState(true); // Collapsed by default
  const [inventoryViewMode, setInventoryViewMode] = useState('basic');
  const [inventoryExpanded, setInventoryExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState('basic'); // 'basic' or 'advanced'
  const [checkInGuest, setCheckInGuest] = useState(null);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [addGuestModalOpen, setAddGuestModalOpen] = useState(false);

  // Update local guests when props change
  React.useEffect(() => {
    setLocalGuests(guests);
  }, [guests]);

  // Determine if user can modify events
  const canModifyEvents = isOperationsManager || isAdmin;

  const handleOpenCheckIn = (guest) => {
    setCheckInGuest(guest);
    setCheckInModalOpen(true);
  };

  const handleCloseCheckIn = () => {
    setCheckInGuest(null);
    setCheckInModalOpen(false);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true);
        const eventData = await getEvent(eventId);
        setEvent(eventData);
        // If this is a secondary event, fetch the parent event
        if (eventData.parentEventId) {
          try {
            const parentData = await getEvent(eventData.parentEventId);
            setParentEvent(parentData);
          } catch (error) {
            console.error('Error fetching parent event:', error);
          }
        }
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to fetch event');
      } finally {
        setLoading(false);
      }
    };

    const fetchGuests = async (mainEventId) => {
      try {
        // Updated API call to match backend route
        const response = await api.get(`/guests?eventId=${mainEventId}`);
        setGuests(response.data.guests || []);
      } catch (error) {
        console.error('Error fetching guests:', error);
      }
    };

    const fetchSecondaryEvents = async () => {
      try {
        // Determine the main event ID to fetch secondary events for
        let mainEventId = eventId;
        if (event && event.parentEventId) {
          // If we're viewing a secondary event, fetch secondary events for the parent
          mainEventId = event.parentEventId;
        } else if (event && event.isMainEvent) {
          // If we're viewing a main event, fetch its secondary events
          mainEventId = event._id;
        }
        
        const response = await api.get(`/events?parentEventId=${mainEventId}`);
        setSecondaryEvents(response.data.events || response.data);
      } catch (error) {
        // ignore for now
      }
    };

    const fetchAllData = async () => {
      try {
        await fetchEventData();
        // Use the eventId directly since we just fetched the event data
        const mainEventId = eventId;
        await Promise.all([
          fetchGuests(mainEventId),
          fetchSecondaryEvents()
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchAllData();
  }, [eventId]);

  const handleUploadGuests = () => {
    navigate(`/events/${eventId}/upload`);
  };
  const handleAddGuest = () => {
    setAddGuestModalOpen(true);
  };

  const handleGuestAdded = (newGuest) => {
    // Add the new guest to the current list
    setGuests(prev => [...prev, newGuest]);
    setLocalGuests(prev => [...prev, newGuest]);
  };

  const handleCheckInSuccess = (checkedInGuest) => {
    // Update the guest's check-in status in the local state
    setLocalGuests(prev => prev.map(guest => 
      guest._id === checkedInGuest._id 
        ? { ...guest, hasCheckedIn: true }
        : guest
    ));
  };

  if (loading) {
    return (
      <MainLayout eventName={event?.eventName || 'Loading Event...'}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress size={60} />
        </Box>
      </MainLayout>
    );
  }

  if (error || !event) {
    return (
      <MainLayout eventName={event?.eventName || 'Loading Event...'}>
        <Alert severity="error">{error || 'Event not found'}</Alert>
      </MainLayout>
    );
  }

  // Calculate stats
  const totalGuests = guests.length;
  const checkedInGuests = guests.filter(g => g.hasCheckedIn).length;
  const pendingGuests = totalGuests - checkedInGuests;
  const checkInPercentage = totalGuests > 0 ? Math.round((checkedInGuests / totalGuests) * 100) : 0;

  // After event and parentEvent are set, determine mainEvent for guest actions
  const mainEvent = event && event.isMainEvent ? event : parentEvent || event;

  return (
    <MainLayout eventName={event.eventName || 'Loading Event...'} parentEventName={parentEvent && parentEvent._id !== event._id ? parentEvent.eventName : null} parentEventId={parentEvent && parentEvent._id !== event._id ? parentEvent._id : null}>
      <EventHeader event={event} mainEvent={parentEvent || event} secondaryEvents={secondaryEvents} showDropdown={true} />
        
        {/* Event Overview Section */}
        <Box sx={{ width: '100%', px: 2, py: 2, backgroundColor: '#fdf9f6' }}>
  {viewMode === 'basic' ? (
    <BasicAnalytics 
      event={event}
      guests={guests}
      inventory={inventory}
    />
  ) : (
    <AdvancedView 
      event={event}
      guests={guests}
      secondaryEvents={secondaryEvents}
      inventory={inventory}
      onInventoryChange={onInventoryChange}
    />
  )}
</Box>

<ManageSection
  onInventory={() => navigate(`/events/${eventId}/inventory`)}
  onUpload={handleUploadGuests}
  onAddGuest={handleAddGuest}
  onAddEvent={() => setSecondaryModalOpen(true)}
  canModify={canModifyEvents}
/>

        {/* Guest Table */}
        <Card elevation={2} sx={{ borderRadius: 3, p: 2, mb: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={600} color="primary.main">
              Guest List ({localGuests.length})
            </Typography>
            <Box display="flex" gap={1}>
              {canModifyEvents && (
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={handleUploadGuests}
                  size="small"
                  sx={{ borderRadius: 2, fontWeight: 600 }}
                >
                  Upload More
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<PersonAddIcon />}
                onClick={handleAddGuest}
                size="small"
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                Add Guest
              </Button>
            </Box>
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Selected Gift</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Tags</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {localGuests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((guest) => {
                  // Find the selected gift from inventory
                  const selectedGift = guest.giftSelection ? inventory.find(item => item._id === guest.giftSelection) : null;
                  
                  return (
                    <TableRow key={guest._id} hover sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                      <TableCell>
                        {guest.hasCheckedIn ? (
                          <Button
                            variant="outlined"
                            color="success"
                            size="small"
                            startIcon={<CheckCircleIcon />}
                            disabled
                            sx={{ borderRadius: 2, fontWeight: 600 }}
                          >
                            Checked In
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            sx={{ borderRadius: 2, fontWeight: 600 }}
                            onClick={() => handleOpenCheckIn(guest)}
                          >
                            Check In
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2">{guest.firstName} {guest.lastName}</Typography>
                        {guest.jobTitle && (
                          <Typography variant="caption" color="textSecondary">
                            {guest.jobTitle}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{guest.email || 'No email'}</TableCell>
                      <TableCell>
                        {selectedGift ? (
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {selectedGift.type}
                            </Typography>
                            {selectedGift.style && (
                              <Typography variant="caption" color="textSecondary">
                                {selectedGift.style}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No gift selected
                          </Typography>
                        )}
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={localGuests.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage="Guests per page"
            sx={{ mt: 2 }}
          />
        </Card>
        

        {/* Check-in Modal */}
        <Dialog
          open={checkInModalOpen}
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
                onCheckInSuccess={handleCheckInSuccess}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Add Guest Modal */}
        <AddGuest
          open={addGuestModalOpen}
          onClose={() => setAddGuestModalOpen(false)}
          eventId={mainEvent._id}
          onGuestAdded={handleGuestAdded}
        />
      </MainLayout>
    );
};

export default EventDashboardWrapper;