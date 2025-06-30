import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  LinearProgress,
  Divider,
  Drawer,
  TextField,
  FormControlLabel,
  Switch,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Upload as UploadIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Event as EventIcon,
  CalendarToday as CalendarIcon,
  Groups as GroupsIcon,
  Assessment as AssessmentIcon,
  Home as HomeIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  CardGiftcard as GiftIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  LocalShipping as ShippingIcon,
  Inventory as InventoryIcon,
  Timeline as TimelineIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { format } from 'date-fns';
import TopNavBar from '../TopNavBar';

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
        <Box sx={{ 
          backgroundColor: `${color}.light`, 
          borderRadius: 2, 
          p: 2 
        }}>
          {React.cloneElement(icon, { 
            sx: { fontSize: 40, color: `${color}.main` } 
          })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

///This is old and not doesn't need to be used, I'm keeping it here for now for reference for certain features

const GuestTable = ({ guests, onAddGuest, onUploadGuests }) => {
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
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Tags</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {guests.map((guest) => (
                <TableRow key={guest._id} hover>
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
  );
};

// Gift Tracker Component
const GiftTracker = ({ eventId, event }) => {
  // Mock data for gift tracking
  const mockGiftData = {
    categoryTotals: {
      'Water Bottles': 42,
      'Tote Bags': 18,
      'Sunglasses': 36,
      'Hats': 24,
      'T-Shirts': 15
    },
    totalGiftsDistributed: 135
  };

  const giftSummary = mockGiftData.categoryTotals;
  const hasGiftData = Object.keys(giftSummary).length > 0;

  if (!hasGiftData) {
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
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <GiftIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No gifts have been distributed yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gift tracking data will appear here once guests start receiving gifts
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  }

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
            {mockGiftData.totalGiftsDistributed} gifts distributed
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Gift Type</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity Taken</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(giftSummary)
                .sort(([,a], [,b]) => b - a) // Sort by quantity descending
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
            Total gifts distributed: <strong>{mockGiftData.totalGiftsDistributed}</strong>
          </Typography>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

// Advanced View Components
const GiftStyleBreakdownTable = () => {
  // New mock data for gift style breakdown
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

const FulfillmentInventoryTable = ({ eventId }) => {
  // Mock data for fulfillment and inventory
  const mockInventoryData = [
    { giftType: 'Water Bottles', totalOrdered: 50, totalShipped: 42, remaining: 8, notes: 'Stainless steel backordered' },
    { giftType: 'Tote Bags', totalOrdered: 25, totalShipped: 18, remaining: 7, notes: 'Canvas style delayed' },
    { giftType: 'Sunglasses', totalOrdered: 40, totalShipped: 36, remaining: 4, notes: 'Polarized lenses in stock' },
    { giftType: 'Hats', totalOrdered: 30, totalShipped: 24, remaining: 6, notes: 'Bucket hats arriving next week' },
    { giftType: 'T-Shirts', totalOrdered: 20, totalShipped: 15, remaining: 5, notes: 'Performance fabric low stock' }
  ];

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" fontWeight={600}>
            Fulfillment & Inventory
          </Typography>
          <Box display="flex" gap={1}>
            <Chip 
              icon={<ShippingIcon />}
              label="Shipping" 
              color="info" 
              variant="outlined"
            />
            <Chip 
              icon={<InventoryIcon />}
              label="Inventory" 
              color="primary" 
              variant="outlined"
            />
          </Box>
        </Box>
        
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Gift Type</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Total Ordered</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Total Shipped</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Remaining</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockInventoryData.map((item, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {item.giftType}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>
                      {item.totalOrdered}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600} color="success.main">
                      {item.totalShipped}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600} color="warning.main">
                      {item.remaining}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {item.notes}
                    </Typography>
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

const GuestListWithGifts = ({ guests, eventId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGiftType, setFilterGiftType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock gift data for guests
  const mockGuestGifts = {
    'guest1': { giftSelected: 'Water Bottles', style: 'Stainless Steel', submissionDate: '2024-01-15' },
    'guest2': { giftSelected: 'Tote Bags', style: 'Canvas', submissionDate: '2024-01-16' },
    'guest3': { giftSelected: 'Sunglasses', style: 'Polarized', submissionDate: '2024-01-14' },
    'guest4': { giftSelected: 'Hats', style: 'Baseball Cap', submissionDate: '2024-01-17' },
    'guest5': { giftSelected: 'T-Shirts', style: 'Cotton', submissionDate: '2024-01-18' }
  };

  const giftTypes = ['Water Bottles', 'Tote Bags', 'Sunglasses', 'Hats', 'T-Shirts'];

  const filteredGuests = guests.filter(guest => {
    const guestGift = mockGuestGifts[guest._id] || {};
    const matchesSearch = `${guest.firstName} ${guest.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGiftType = filterGiftType === 'all' || guestGift.giftSelected === filterGiftType;
    const matchesStatus = filterStatus === 'all' || guest.hasCheckedIn === (filterStatus === 'checked-in');
    
    return matchesSearch && matchesGiftType && matchesStatus;
  });

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" fontWeight={600}>
            Guest List with Gift Details
          </Typography>
          <Chip 
            label={`${filteredGuests.length} of ${guests.length} guests`} 
            color="primary" 
            variant="outlined"
          />
        </Box>

        {/* Filters */}
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
                <TableCell sx={{ fontWeight: 600 }}>Submission Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredGuests.map((guest) => {
                const guestGift = mockGuestGifts[guest._id] || {};
                return (
                  <TableRow key={guest._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {guest.firstName} {guest.lastName}
                      </Typography>
                      {guest.jobTitle && (
                        <Typography variant="caption" color="text.secondary">
                          {guest.jobTitle}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {guest.email || 'No email'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={guest.hasCheckedIn ? 'Checked In' : 'Pending'}
                        color={guest.hasCheckedIn ? 'success' : 'default'}
                        size="small"
                        icon={guest.hasCheckedIn ? <CheckCircleIcon /> : <PersonIcon />}
                        sx={{ borderRadius: 1 }}
                        onClick={typeof guest.hasCheckedIn === 'function' ? guest.hasCheckedIn : undefined}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {guestGift.giftSelected || 'No gift selected'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {guestGift.style || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {guestGift.submissionDate ? format(new Date(guestGift.submissionDate), 'MMM dd, yyyy') : '-'}
                      </Typography>
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

const ChildEventSummary = ({ event, secondaryEvents }) => {
  if (!event?.isMainEvent) return null;

  // Mock data for child event summaries
  const mockChildSummaries = secondaryEvents.map(childEvent => ({
    eventName: childEvent.eventName,
    giftCount: Math.floor(Math.random() * 50) + 10,
    guestCount: Math.floor(Math.random() * 100) + 20,
    fulfillmentPercent: Math.floor(Math.random() * 40) + 60,
    status: ['Active', 'Completed', 'Pending'][Math.floor(Math.random() * 3)]
  }));

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" fontWeight={600}>
            Child Event Summary
          </Typography>
          <Chip 
            label={`${secondaryEvents.length} child events`} 
            color="primary" 
            variant="outlined"
          />
        </Box>
        
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
              {mockChildSummaries.map((summary, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {summary.eventName}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600} color="primary.main">
                      {summary.giftCount}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>
                      {summary.guestCount}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                      <Typography variant="body2" fontWeight={600}>
                        {summary.fulfillmentPercent}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={summary.fulfillmentPercent}
                        sx={{ width: 60, height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={summary.status}
                      color={summary.status === 'Active' ? 'success' : summary.status === 'Completed' ? 'primary' : 'warning'}
                      size="small"
                      sx={{ borderRadius: 1 }}
                      onClick={typeof summary.status === 'function' ? summary.status : undefined}
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

const AdvancedView = ({ event, guests, eventId, secondaryEvents }) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Mock data for charts
  const giftSelectionData = [
    { name: 'Water Bottles', value: 42, fill: '#8884d8' },
    { name: 'Tote Bags', value: 18, fill: '#82ca9d' },
    { name: 'Sunglasses', value: 36, fill: '#ffc658' },
    { name: 'Hats', value: 24, fill: '#ff7300' },
    { name: 'T-Shirts', value: 15, fill: '#00C49F' }
  ];

  const checkInTrendData = [
    { date: 'Jan 10', checkedIn: 12, total: 50 },
    { date: 'Jan 11', checkedIn: 18, total: 50 },
    { date: 'Jan 12', checkedIn: 25, total: 50 },
    { date: 'Jan 13', checkedIn: 32, total: 50 },
    { date: 'Jan 14', checkedIn: 38, total: 50 },
    { date: 'Jan 15', checkedIn: 42, total: 50 }
  ];

  return (
    <Box>
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange}
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          mb: 3,
          '& .MuiTab-root': {
            fontWeight: 600,
            textTransform: 'none',
            minHeight: 48
          }
        }}
      >
        <Tab 
          icon={<GiftIcon />} 
          label="Gift Analytics" 
          iconPosition="start"
        />
        <Tab 
          icon={<InventoryIcon />} 
          label="Inventory & Fulfillment" 
          iconPosition="start"
        />
        <Tab 
          icon={<GroupsIcon />} 
          label="Guest Details" 
          iconPosition="start"
        />
        {event?.isMainEvent && (
          <Tab 
            icon={<EventIcon />} 
            label="Child Events" 
            iconPosition="start"
          />
        )}
      </Tabs>

      {activeTab === 0 && (
        <Box>
          <GiftStyleBreakdownTable />
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid span={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Gift Selections by Type
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={giftSelectionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {giftSelectionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid span={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Check-in Trends Over Time
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={checkInTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="checkedIn" 
                        stroke="#1976d2" 
                        strokeWidth={3}
                        name="Checked In"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#666" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Total Guests"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <GiftTracker eventId={eventId} event={event} />
        </Box>
      )}

      {activeTab === 1 && (
        <FulfillmentInventoryTable eventId={eventId} />
      )}

      {activeTab === 2 && (
        <GuestListWithGifts guests={guests} eventId={eventId} />
      )}

      {activeTab === 3 && event?.isMainEvent && (
        <ChildEventSummary event={event} secondaryEvents={secondaryEvents} />
      )}
    </Box>
  );
};

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isOperationsManager, isAdmin } = useAuth();
  
  const [event, setEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [secondaryEvents, setSecondaryEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('basic'); // 'basic' or 'advanced'
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    location: '',
    includeStyles: false,
    allowMultipleGifts: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEventData();
    fetchSecondaryEvents();
  }, [eventId]);

  useEffect(() => {
    if (event) {
      fetchGuests();
    }
  }, [event]);

  const fetchEventData = async () => {
    try {
      const response = await api.get(`/events/${eventId}`);
      setEvent(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch event');
    } finally {
      setLoading(false);
    }
  };

  const fetchSecondaryEvents = async () => {
    try {
      const response = await api.get(`/events?parentEventId=${eventId}`);
      setSecondaryEvents(response.data.events || response.data || []);
    } catch (err) {
      console.error('Failed to fetch secondary events:', err);
    }
  };

  const fetchGuests = async () => {
    try {
      const response = await api.get(`/events/${eventId}/guests`);
      setGuests(response.data);
    } catch (err) {
      console.error('Failed to fetch guests:', err);
    }
  };

  const handleUploadGuests = () => {
    navigate(`/events/${eventId}/upload`);
  };

  const handleAddGuest = () => {
    navigate(`/events/${eventId}/add-guest`);
  };

  const handleCheckIn = () => {
    navigate(`/events/${eventId}/checkin`);
  };

  const handleEditEvent = () => {
    setEditDrawerOpen(true);
  };

  const handleEditClose = () => {
    setEditDrawerOpen(false);
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      await api.put(`/events/${eventId}`, editForm);
      // Refresh event data
      await fetchEventData();
      setEditDrawerOpen(false);
    } catch (error) {
      console.error('Error updating event:', error);
      setError('Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Box p={4}><Alert severity="error">{error || 'Event not found'}</Alert></Box>
    );
  }

  // Calculate stats
  const totalGuests = guests.length;
  const checkedInGuests = guests.filter(g => g.hasCheckedIn).length;
  const pendingGuests = totalGuests - checkedInGuests;
  const checkInPercentage = totalGuests > 0 ? Math.round((checkedInGuests / totalGuests) * 100) : 0;

  // Data for charts
  const pieData = [
    { name: 'Checked In', value: checkedInGuests, color: '#4caf50' },
    { name: 'Pending', value: pendingGuests, color: '#ff9800' }
  ];

  const attendeeTypeData = guests.reduce((acc, guest) => {
    const type = guest.attendeeType || 'General';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const barData = Object.entries(attendeeTypeData).map(([type, count]) => ({
    type,
    count
  }));

  return (
    <Box sx={{ p: 0 }}>
      <TopNavBar breadcrumbs={[
        { label: 'Home', to: '/events', icon: <HomeIcon /> },
        { label: event?.eventName, to: `/events/${event?._id}` },
        { label: 'Details' }
      ]} />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
            <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
              {event.eventName} Details
            </Typography>
            <Box flexGrow={1} />
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
                color="primary" 
                startIcon={<EditIcon />}
                sx={{ 
                  borderRadius: 2, 
                  fontWeight: 600,
                  px: 3,
                  py: 1.5
                }} 
                onClick={handleEditEvent}
              >
                Edit Event
              </Button>
            </Box>
          </Box>

          {/* Event Info Card */}
          <Card elevation={3} sx={{ borderRadius: 3, p: 3, mb: 4 }}>
            <Grid container spacing={3}>
              <Grid span={4}>
                <Typography variant="subtitle2" color="text.secondary">Contract</Typography>
                <Typography variant="h6" fontWeight={600}>{event.eventContractNumber}</Typography>
              </Grid>
              <Grid span={4}>
                <Typography variant="subtitle2" color="text.secondary">Dates</Typography>
                <Typography variant="h6" fontWeight={600}>{event.eventStart} - {event.eventEnd}</Typography>
              </Grid>
              <Grid span={4}>
                <Typography variant="subtitle2" color="text.secondary">Location</Typography>
                <Typography variant="h6" fontWeight={600}>{event.location}</Typography>
              </Grid>
              <Grid span={4}>
                <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                <Typography variant="h6" fontWeight={600}>{event.type}</Typography>
              </Grid>
            </Grid>
          </Card>

          {viewMode === 'basic' ? (
            // Basic View
            <Box>
              {/* Stats Cards */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid span={3}>
                  <StatCard
                    title="Total Guests"
                    value={totalGuests}
                    icon={<GroupsIcon />}
                    color="primary"
                  />
                </Grid>
                <Grid span={3}>
                  <StatCard
                    title="Checked In"
                    value={checkedInGuests}
                    subtitle={`${checkInPercentage}% complete`}
                    icon={<CheckCircleIcon />}
                    color="success"
                  />
                </Grid>
                <Grid span={3}>
                  <StatCard
                    title="Pending"
                    value={pendingGuests}
                    icon={<PersonIcon />}
                    color="warning"
                  />
                </Grid>
                <Grid span={3}>
                  <StatCard
                    title="Check-in Rate"
                    value={`${checkInPercentage}%`}
                    icon={<AssessmentIcon />}
                    color="info"
                  />
                </Grid>
              </Grid>

              {/* Progress Bar */}
              {totalGuests > 0 && (
                <Card sx={{ mb: 4 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Check-in Progress
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={checkInPercentage}
                      sx={{ height: 10, borderRadius: 1 }}
                    />
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      {checkedInGuests} of {totalGuests} guests checked in
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {/* Gift Tracker */}
              <GiftTracker eventId={eventId} event={event} />

              {/* Charts */}
              {totalGuests > 0 && (
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid span={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Check-in Status
                        </Typography>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={index} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid span={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Attendee Types
                        </Typography>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={barData}>
                            <XAxis dataKey="type" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#1976d2" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {/* Guest Table */}
              <GuestTable
                guests={guests}
                onAddGuest={handleAddGuest}
                onUploadGuests={handleUploadGuests}
              />
            </Box>
          ) : (
            // Advanced View
            <AdvancedView 
              event={event} 
              guests={guests} 
              eventId={eventId} 
              secondaryEvents={secondaryEvents}
            />
          )}
        </Box>
      </Container>
      <Drawer
        anchor="right"
        open={editDrawerOpen}
        onClose={handleEditClose}
        PaperProps={{
          sx: { width: 450 }
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ 
            p: 3, 
            borderBottom: 1, 
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Typography variant="h6" fontWeight={600} color="primary.main">
              Edit Event
            </Typography>
            <IconButton onClick={handleEditClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Content */}
          <Box sx={{ p: 3, flex: 1, overflow: 'auto' }}>
            <Stack spacing={3}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Event Configuration
              </Typography>
              
              <TextField
                label="Event Location"
                value={editForm.location}
                onChange={(e) => handleFormChange('location', e.target.value)}
                fullWidth
                placeholder="Enter event location"
                helperText="The physical location where this event will take place"
              />

              <Box sx={{ pt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Gift Settings
                </Typography>
                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editForm.includeStyles}
                        onChange={(e) => handleFormChange('includeStyles', e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          Include Styles
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Allow guests to select different style options for gifts
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start' }}
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editForm.allowMultipleGifts}
                        onChange={(e) => handleFormChange('allowMultipleGifts', e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          Allow Multiple Gifts
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Enable guests to select multiple gift items
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start' }}
                  />
                </Stack>
              </Box>
            </Stack>
          </Box>

          {/* Footer */}
          <Box sx={{ 
            p: 3, 
            borderTop: 1, 
            borderColor: 'divider',
            bgcolor: 'grey.50'
          }}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button 
                variant="outlined" 
                onClick={handleEditClose}
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                Cancel
              </Button>
              <Button 
                variant="contained" 
                onClick={handleEditSave} 
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default EventDetails;