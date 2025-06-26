import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Chip, Button, Alert, Table, TableBody, TableCell, TableContainer, TablePagination, TableHead, TableRow, Paper, IconButton, LinearProgress, Drawer, CardHeader, Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails, Tabs, Tab, InputAdornment, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { CheckCircle as CheckCircleIcon, Person as PersonIcon, Groups as GroupsIcon, Assessment as AssessmentIcon, Event as EventIcon, Home as HomeIcon, Menu as MenuIcon, Upload as UploadIcon, PersonAdd as PersonAddIcon, Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon, PeopleAlt as PeopleAltIcon, HourglassEmpty as HourglassEmptyIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, CardGiftcard as GiftIcon, Search as SearchIcon, Inventory as InventoryIcon, Save as SaveIcon, Cancel as CancelIcon, Edit as EditIcon, Info as InfoIcon } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import api, { fetchInventory } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import MainNavigation from '../MainNavigation';
import AddSecondaryEventModal from './AddSecondaryEventModal';
import { getEvent } from '../../services/events';
import InventoryPage from '../Inventory/InventoryPage';
import GuestCheckIn from '../Guest/GuestCheckIn';
import { format } from 'date-fns';
import { useTheme } from '@mui/material/styles';
import ActivityFeedList from '../Analytics/ActivityFeedList';
import axios from 'axios';

const StatCard = ({ title, value, subtitle, icon, color = 'primary' }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h3" component="div" color={color}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ backgroundColor: `${color}.light`, borderRadius: 2, p: 1.5 }}>
          {React.cloneElement(icon, { sx: { fontSize: 28, color: `${color}.main` } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const GuestTable = ({ guests, onAddGuest, onUploadGuests, event, onInventoryChange }) => {
  const [checkInGuest, setCheckInGuest] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

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
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={onUploadGuests}
                size="small"
              >
                Upload More
              </Button>
              <Button
                variant="outlined"
                startIcon={<PersonAddIcon />}
                onClick={onAddGuest}
                size="small"
              >
                Add Guest
              </Button>
            </Box>
          </Box>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell /> {/* Check-in action column */}
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Tags</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {guests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((guest) => (
                  <TableRow key={guest._id} hover>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleOpenCheckIn(guest)}
                      >
                        Check In
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">
                        {guest.firstName} {guest.lastName}
                      </Typography>
                      {guest.jobTitle && (
                        <Typography variant="caption" color="textSecondary">
                          {guest.jobTitle}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{guest.email || 'No email'}</TableCell>
                    <TableCell>{guest.company || '-'}</TableCell>
                    <TableCell>{guest.attendeeType || 'General'}</TableCell>
                    <TableCell>
                      <Chip
                        label={guest.hasCheckedIn ? 'Checked In' : 'Pending'}
                        color={guest.hasCheckedIn ? 'success' : 'default'}
                        size="small"
                        icon={guest.hasCheckedIn ? <CheckCircleIcon /> : <PersonIcon />}
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
                              fontSize: '0.7rem'
                            }}
                          />
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
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
      {modalOpen && checkInGuest && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', bgcolor: 'rgba(0,0,0,0.2)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card sx={{ minWidth: 400, p: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Check In Guest</Typography>
                <Button onClick={handleCloseCheckIn} size="small">Close</Button>
              </Box>
              <GuestCheckIn event={event} guest={checkInGuest} onClose={handleCloseCheckIn} onInventoryChange={onInventoryChange} />
            </CardContent>
          </Card>
        </Box>
      )}
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
  useEffect(() => {
    if (!event?._id) return;
    const fetchFeed = async () => {
      setFeedLoading(true);
      try {
        const res = await api.get(`/analytics/events/${event._id}/activity`, {
          params: feedType ? { type: feedType } : {}
        });
        console.log('Event feed logs loaded:', res.data.logs);
        setFeedLogs(res.data.logs || []);
      } catch (err) {
        console.error('Error loading event feed:', err);
        setFeedLogs([]);
      } finally {
        setFeedLoading(false);
      }
    };
    fetchFeed();
  }, [event?._id, feedType]);

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
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      )}
      {activeTab === 1 && <FulfillmentInventoryTable inventory={inventory} />}
      {activeTab === 2 && (
        <ActivityFeedList logs={feedLogs} loading={feedLoading} filterType={feedType} onFilterTypeChange={setFeedType} />
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
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [guests, setGuests] = useState([]);
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

  const handleOpenCheckIn = (guest) => {
    setCheckInGuest(guest);
    setCheckInModalOpen(true);
  };

  const handleCloseCheckIn = () => {
    setCheckInGuest(null);
    setCheckInModalOpen(false);
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
        const response = await api.get(`/events?parentEventId=${eventId}`);
        setSecondaryEvents(response.data.events || response.data);
      } catch (error) {
        // ignore for now
      }
    };

    fetchEventData().then(() => {
      // Wait for event to be set
      setTimeout(() => {
        const mainEventId = event && event.isMainEvent ? event._id : event?.parentEventId || eventId;
        fetchGuests(mainEventId);
      }, 0);
    });
    fetchSecondaryEvents();
  }, [eventId]);

  const handleUploadGuests = () => {
    navigate(`/events/${eventId}/upload`);
  };
  const handleAddGuest = () => {
    navigate(`/events/${eventId}/add-guest`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <MainNavigation />
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress size={60} />
        </Box>
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <MainNavigation />
        <Box sx={{ flex: 1, p: 4 }}>
          <Alert severity="error">{error || 'Event not found'}</Alert>
        </Box>
      </Box>
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
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <MainNavigation />
      <Box sx={{ flex: 1, overflow: 'auto', p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
          <Box flexGrow={1}>
            <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
              {event.eventName} Dashboard
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500 }}>
              📋 Contract: {event.eventContractNumber}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="textSecondary">Basic</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={viewMode === 'advanced'}
                    onChange={(e) => setViewMode(e.target.checked ? 'advanced' : 'basic')}
                    color="primary"
                  />
                }
                label=""
              />
              <Typography variant="body2" color="textSecondary">Advanced</Typography>
            </Box>
            <Button
              variant="outlined"
              onClick={() => navigate(`/events/${eventId}/inventory`)}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              View Inventory
            </Button>
          </Box>
        </Box>
        
        {/* Event Overview Section */}
        <Card sx={{ mb: 4, p: 2, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <CardHeader
            title={
              <Typography variant="h6" fontWeight={600} sx={{ color: '#1a1a1a' }}>
                Event Overview {viewMode === 'advanced' && '(Advanced View)'}
              </Typography>
            }
            subheader={
              <Typography variant="body2" color="textSecondary">
                {viewMode === 'basic' 
                  ? 'Key metrics and statistics for this event'
                  : 'Detailed analytics and insights for this event'
                }
              </Typography>
            }
          />
          {/* Stat Cards (modern, clean look) */}
          <Box sx={{ display: 'flex', gap: 4, mb: 4, flexWrap: 'wrap' }}>
            <Card sx={{ flex: 1, minWidth: 220, maxWidth: 400, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', borderRadius: 3, p: 3, display: 'flex', alignItems: 'center', height: 120 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <GroupsIcon sx={{ fontSize: 40, color: '#1976d2' }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ color: '#222', lineHeight: 1 }}>{totalGuests}</Typography>
                <Typography variant="subtitle1" sx={{ color: '#444', fontWeight: 500 }}>Total Guests</Typography>
              </Box>
            </Card>
            <Card sx={{ flex: 1, minWidth: 220, maxWidth: 400, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', borderRadius: 3, p: 3, display: 'flex', alignItems: 'center', height: 120 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: '#43a047' }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ color: '#222', lineHeight: 1 }}>{checkedInGuests}</Typography>
                <Typography variant="subtitle1" sx={{ color: '#444', fontWeight: 500 }}>Checked In</Typography>
              </Box>
            </Card>
            <Card sx={{ flex: 1, minWidth: 220, maxWidth: 400, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', borderRadius: 3, p: 3, display: 'flex', alignItems: 'center', height: 120 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <PersonIcon sx={{ fontSize: 40, color: '#ff9800' }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ color: '#222', lineHeight: 1 }}>{pendingGuests}</Typography>
                <Typography variant="subtitle1" sx={{ color: '#444', fontWeight: 500 }}>Pending</Typography>
              </Box>
            </Card>
          </Box>
          {/* ViewMode switch and tab content remain below */}
          {viewMode === 'basic' ? (
            // Basic View - Simple stats
            <div>
              {/* Gift Tracker for Basic View */}
              <EventGiftDashboard 
                eventId={eventId} 
                event={event} 
                inventory={inventory}
                loading={inventoryLoading}
                error={inventoryError}
                onInventoryChange={onInventoryChange}
              />
            </div>
          ) : (
            <AdvancedView event={event} guests={guests} secondaryEvents={secondaryEvents} inventory={inventory} onInventoryChange={onInventoryChange} />
          )}
        </Card>
        {/* Add Secondary Event Button and Modal */}
        <AddSecondaryEventModal
          open={secondaryModalOpen}
          onClose={() => setSecondaryModalOpen(false)}
          parentEventId={eventId}
          parentContractNumber={event.eventContractNumber}
          parentEventStart={event.eventStart}
          parentEventEnd={event.eventEnd}
          onEventAdded={() => {
            setSecondaryModalOpen(false);
            // Refresh secondary events after add
            api.get(`/events?parentEventId=${eventId}`).then(res => setSecondaryEvents(res.data.events || res.data));
          }}
        />
        
        {/* Guest Table */}
        <Card elevation={2} sx={{ borderRadius: 3, p: 2, mb: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={600} color="primary.main">
              Guest List ({guests.length})
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={handleUploadGuests}
                size="small"
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                Upload More
              </Button>
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
                  <TableCell>Company</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Tags</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {guests.slice(0, 10).map((guest) => (
                  <TableRow key={guest._id} hover sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        sx={{ borderRadius: 2, fontWeight: 600 }}
                        onClick={() => handleOpenCheckIn(guest)}
                      >
                        Check In
                      </Button>
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
                    <TableCell>{guest.company || '-'}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
        {/* --- ADDITIONAL EVENTS SECTION --- */}
        {secondaryEvents.length > 0 && (
          <Card elevation={2} sx={{ mb: 3, borderRadius: 3, p: 2, background: 'linear-gradient(135deg, #FFFAF6 0%, #f8f9fa 100%)', border: '1px solid #e9ecef', boxShadow: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>
              📅 Additional Events
            </Typography>
            <Grid container spacing={1}>
              {secondaryEvents.map((secondaryEvent) => (
                <Grid item key={secondaryEvent._id}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(`/events/${secondaryEvent._id}/dashboard`)}
                    sx={{
                      fontSize: '0.85rem',
                      borderRadius: 2,
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      fontWeight: 600,
                      textTransform: 'none',
                      px: 2,
                      py: 0.5,
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        color: '#fff',
                        boxShadow: 2
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    {secondaryEvent.eventName}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Card>
        )}
        <Button
          variant="contained"
          startIcon={<EventIcon />}
          onClick={() => setSecondaryModalOpen(true)}
          sx={{ mb: 4, borderRadius: 2, fontWeight: 600 }}
        >
          ➕ Add Additional Event
        </Button>

        {/* Check-in Modal */}
        {checkInModalOpen && checkInGuest && (
          <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', bgcolor: 'rgba(0,0,0,0.2)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Card sx={{ minWidth: 400, p: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Check In Guest</Typography>
                  <Button onClick={handleCloseCheckIn} size="small">Close</Button>
                </Box>
                <GuestCheckIn 
                  event={event} 
                  guest={checkInGuest} 
                  onClose={handleCloseCheckIn} 
                  onInventoryChange={onInventoryChange}
                />
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default EventDashboardWrapper;