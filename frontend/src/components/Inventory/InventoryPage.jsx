import React, { useState, useRef } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Alert, CircularProgress, Snackbar, IconButton, Autocomplete,
  TextField, Chip, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, TablePagination, Grid, InputAdornment, TableSortLabel, Tooltip
} from '@mui/material';
import {
  Upload as UploadIcon, Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon,
  Cancel as CancelIcon, FileDownload as FileDownloadIcon, Home as HomeIcon,
  Search as SearchIcon, FilterList as FilterIcon, Clear as ClearIcon, AccountTree as InheritIcon
} from '@mui/icons-material';
import { uploadInventoryCSV, fetchInventory, updateInventoryItem, addInventoryItem, deleteInventoryItem, updateInventoryAllocation, exportInventoryCSV, exportInventoryExcel } from '../../services/api';
import { useParams } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import { getEvent } from '../../services/events';
import api from '../../services/api';
import EventIcon from '@mui/icons-material/Event';
import EventHeader from '../events/EventHeader';
import CSVColumnMapper from '../Inventory/CSVColumnMapper';

// ✅ Use usePermissions only
import { usePermissions } from '../../hooks/usePermissions';




const InventoryPage = ({ eventId, eventName }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();
  const [editRowId, setEditRowId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [event, setEvent] = useState(null);
  const [parentEvent, setParentEvent] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValuesMap, setEditValuesMap] = useState({});
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [pendingCsvFile, setPendingCsvFile] = useState(null);
  const [newItem, setNewItem] = useState({
    type: '',
    style: '',
    size: '',
    gender: '',
    color: '',
    qtyWarehouse: 0,
    qtyBeforeEvent: 0,
    postEventCount: 0
  });
  const { isOperationsManager, isAdmin } = usePermissions();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [sortBy, setSortBy] = useState('type');
  const [sortOrder, setSortOrder] = useState('asc');

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  // Determine if user can modify inventory
  const canModifyInventory = isOperationsManager || isAdmin;

  // Add to state variables
  const [isInherited, setIsInherited] = useState(false);
  const [originalEventName, setOriginalEventName] = useState('');

  // Add function to determine which events to display
  const getEventsToDisplay = () => {
    if (event?.isMainEvent) {
      // Main event view: show all events (main + secondary)
      const mainEvent = event;
      const secondaryEvents = event?.secondaryEvents || [];
      return [mainEvent, ...secondaryEvents];
    } else {
      // Secondary event view: show only this event
      return [event];
    }
  };

  // Get all unique values for filter dropdowns
  const allTypes = React.useMemo(() => {
    const typeSet = new Set();
    inventory.forEach(item => {
      if (item.type) typeSet.add(item.type);
    });
    return Array.from(typeSet).sort();
  }, [inventory]);

  const allStyles = React.useMemo(() => {
    const styleSet = new Set();
    inventory.forEach(item => {
      if (item.style) styleSet.add(item.style);
    });
    return Array.from(styleSet).sort();
  }, [inventory]);

  const allGenders = React.useMemo(() => {
    const genderSet = new Set();
    inventory.forEach(item => {
      if (item.gender) genderSet.add(item.gender);
    });
    return Array.from(genderSet).sort();
  }, [inventory]);

  const handleSort = (column) => {
    const isAsc = sortBy === column && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortBy(column);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStyleFilter('all');
    setGenderFilter('all');
    setSortBy('type');
    setSortOrder('asc');
    setPage(0);
  };

  // Filter and sort inventory
  const filteredAndSortedInventory = React.useMemo(() => {
    let filtered = inventory.filter(item => {
      // Search filter
      const searchMatch = searchQuery === '' || 
        item.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.style?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.size?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.color?.toLowerCase().includes(searchQuery.toLowerCase());

      // Type filter
      const typeMatch = typeFilter === 'all' || item.type === typeFilter;

      // Style filter
      const styleMatch = styleFilter === 'all' || item.style === styleFilter;

      // Gender filter
      const genderMatch = genderFilter === 'all' || item.gender === genderFilter;

      return searchMatch && typeMatch && styleMatch && genderMatch;
    });

    // Sort inventory
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'type':
          aValue = (a.type || '').toLowerCase();
          bValue = (b.type || '').toLowerCase();
          break;
        case 'style':
          aValue = (a.style || '').toLowerCase();
          bValue = (b.style || '').toLowerCase();
          break;
        case 'size':
          aValue = (a.size || '').toLowerCase();
          bValue = (b.size || '').toLowerCase();
          break;
        case 'gender':
          aValue = (a.gender || '').toLowerCase();
          bValue = (b.gender || '').toLowerCase();
          break;
        case 'color':
          aValue = (a.color || '').toLowerCase();
          bValue = (b.color || '').toLowerCase();
          break;
        case 'qtyWarehouse':
          aValue = Number(a.qtyWarehouse) || 0;
          bValue = Number(b.qtyWarehouse) || 0;
          break;
        default:
          aValue = a[sortBy] || '';
          bValue = b[sortBy] || '';
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [inventory, searchQuery, typeFilter, styleFilter, genderFilter, sortBy, sortOrder]);

  const loadInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchInventory(eventId);
      setInventory(res.data.inventory || []);
    } catch (err) {
      setError('Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadInventory();
    // Fetch event details for breadcrumbs
    getEvent(eventId).then(ev => {
      setEvent(ev);
      if (ev && ev.parentEventId) {
        getEvent(ev.parentEventId).then(setParentEvent);
      } else {
        setParentEvent(null);
      }
    });
    // Fetch all events for allocation dropdown
    setEventsLoading(true);
    api.get('/events').then(res => {
      const all = res.data.events || res.data;
      setAllEvents(all);
      // Filter: main event and its children
      let mainEvent = all.find(ev => ev._id === eventId) || all.find(ev => ev._id === (event && event._id));
      if (!mainEvent) mainEvent = all.find(ev => ev._id === (parentEvent && parentEvent._id));
      if (!mainEvent) mainEvent = all.find(ev => ev._id === (event && event.parentEventId));
      if (!mainEvent) mainEvent = all.find(ev => ev._id === (parentEvent && parentEvent.parentEventId));
      if (!mainEvent) mainEvent = all.find(ev => ev._id === eventId);
      if (!mainEvent) mainEvent = all[0];
      const children = all.filter(ev => ev.parentEventId === mainEvent._id);
      setFilteredEvents([mainEvent, ...children]);
      setEventsLoading(false);
    });
    // eslint-disable-next-line
  }, [eventId]);


  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Instead of uploading immediately, show the column mapper
    setPendingCsvFile(file);
    setShowColumnMapper(true);

    // Clear the file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMappingComplete = async (mapping, file) => {
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      // Call the updated API function with mapping
      const response = await uploadInventoryCSV(eventId, file, mapping);
      // Handle the new detailed response
      if (response.data.results) {
        const { newItemsAdded, duplicatesSkipped, totalProcessed } = response.data.results;
        setSuccess(
          `Upload complete: ${newItemsAdded} new items added` +
          (duplicatesSkipped > 0 ? `, ${duplicatesSkipped} duplicates skipped` : '') +
          ` (${totalProcessed} total processed)`
        );
      } else {
        setSuccess('Inventory uploaded successfully!');
      }
      loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload inventory.');
    } finally {
      setUploading(false);
      setShowColumnMapper(false);
      setPendingCsvFile(null);
    }
  };


  const handleEditClick = (item) => {
    setEditRowId(item._id);
    setEditValues({
      qtyWarehouse: item.qtyWarehouse,
      qtyOnSite: item.qtyOnSite,
      currentInventory: item.currentInventory,
    });
  };

  const handleEditChange = (field, value) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async (item) => {
    // Convert to numbers and validate
    const values = {
      qtyWarehouse: Number(editValues.qtyWarehouse),
      qtyOnSite: Number(editValues.qtyOnSite),
      currentInventory: Number(editValues.currentInventory),
    };
    if (
      isNaN(values.qtyWarehouse) ||
      isNaN(values.qtyOnSite) ||
      isNaN(values.currentInventory) ||
      values.currentInventory === null ||
      values.currentInventory === undefined
    ) {
      setError('All inventory fields must be valid numbers.');
      return;
    }
    try {
      await updateInventoryItem(item._id, values);
      setSuccess('Inventory item updated!');
      setEditRowId(null);
      loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update inventory item.');
    }
  };

  const handleEditCancel = () => {
    setEditRowId(null);
    setEditValues({});
  };

  const handleEnterEditMode = () => {
    setIsEditMode(true);
    // Initialize edit values for all inventory items
    const initialEditValues = {};
    inventory.forEach(item => {
      initialEditValues[item._id] = {
        qtyBeforeEvent: item.qtyBeforeEvent || item.qtyOnSite || 0,
        postEventCount: item.postEventCount || 0,
      };
    });
    setEditValuesMap(initialEditValues);
  };

  const handleExitEditMode = () => {
    setIsEditMode(false);
    setEditValuesMap({});
  };

  const handleEditValueChange = (itemId, field, value) => {
    setEditValuesMap(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const handleSaveAllChanges = async () => {
    try {
      // Save all changes
      const savePromises = Object.entries(editValuesMap).map(([itemId, values]) => {
        const numericValues = {
          qtyBeforeEvent: Number(values.qtyBeforeEvent),
          postEventCount: Number(values.postEventCount),
        };

        // Validate values
        if (
          isNaN(numericValues.qtyBeforeEvent) ||
          isNaN(numericValues.postEventCount) ||
          numericValues.qtyBeforeEvent < 0 ||
          numericValues.postEventCount < 0
        ) {
          throw new Error(`Invalid values for item ${itemId}`);
        }

        return updateInventoryItem(itemId, numericValues);
      });

      await Promise.all(savePromises);
      setSuccess('All inventory items updated successfully!');
      setIsEditMode(false);
      setEditValuesMap({});
      loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update inventory items.');
    }
  };

  const handleDeleteClick = (itemId) => {
    setDeletingId(itemId);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteInventoryItem(deletingId);
      setSuccess('Inventory item deleted!');
      setDeletingId(null);
      loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete inventory item.');
    }
  };

  const handleDeleteCancel = () => {
    setDeletingId(null);
  };

  const handleAllocationChange = async (item, newAllocatedEvents) => {
    try {
      await updateInventoryAllocation(item._id, newAllocatedEvents.map(ev => ev._id));
      setSuccess('Inventory allocation updated!');
      loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update allocation.');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await exportInventoryCSV(eventId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory_${event?.eventContractNumber || eventId}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('CSV exported successfully!');
    } catch (err) {
      setError('Failed to export CSV.');
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await exportInventoryExcel(eventId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory_${event?.eventContractNumber || eventId}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Excel file exported successfully!');
    } catch (err) {
      setError('Failed to export Excel file.');
    }
  };

  const handleOpenAddItemModal = () => {
    setAddItemModalOpen(true);
    setNewItem({
      type: '',
      style: '',
      size: '',
      gender: '',
      color: '',
      qtyWarehouse: 0,
      qtyBeforeEvent: 0,
      postEventCount: 0
    });
  };

  const handleCloseAddItemModal = () => {
    setAddItemModalOpen(false);
    setNewItem({
      type: '',
      style: '',
      size: '',
      gender: '',
      color: '',
      qtyWarehouse: 0,
      qtyBeforeEvent: 0,
      postEventCount: 0
    });
  };

  const handleNewItemChange = (field, value) => {
    setNewItem(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddItem = async () => {
    try {
      // Validate required fields
      if (!newItem.type || !newItem.style) {
        setError('Type and Style are required fields.');
        return;
      }

      // Convert numeric fields
      const itemData = {
        ...newItem,
        qtyWarehouse: Number(newItem.qtyWarehouse),
        qtyBeforeEvent: Number(newItem.qtyBeforeEvent),
        postEventCount: Number(newItem.postEventCount)
      };

      // Validate numeric values
      if (
        isNaN(itemData.qtyWarehouse) ||
        isNaN(itemData.qtyBeforeEvent) ||
        isNaN(itemData.postEventCount) ||
        itemData.qtyWarehouse < 0 ||
        itemData.qtyBeforeEvent < 0 ||
        itemData.postEventCount < 0
      ) {
        setError('All quantity fields must be valid numbers.');
        return;
      }

      // Add the new item to the inventory
      await addInventoryItem(eventId, itemData);
      setSuccess('Inventory item added successfully!');
      handleCloseAddItemModal();
      loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add inventory item.');
    }
  };

  return (
    <MainLayout eventName={eventName} parentEventName={parentEvent && parentEvent._id !== event?._id ? parentEvent.eventName : null} parentEventId={parentEvent && parentEvent._id !== event?._id ? parentEvent._id : null}>
      <EventHeader event={event} mainEvent={parentEvent || event} secondaryEvents={allEvents.filter(ev => (parentEvent ? ev.parentEventId === (parentEvent._id) : ev.parentEventId === (event && event._id)) && ev._id !== (parentEvent ? parentEvent._id : event && event._id))} />
      <Typography variant="h4" gutterBottom>Inventory</Typography>
      <Box display="flex" gap={2} mb={2}>
        {canModifyInventory && (
          isEditMode ? (
            <>
              <Button variant="contained" color="success" onClick={handleSaveAllChanges} startIcon={<SaveIcon />}>
                Save All Changes
              </Button>
              <Button variant="outlined" onClick={handleExitEditMode} startIcon={<CancelIcon />}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="contained" color="primary" onClick={handleEnterEditMode} startIcon={<EditIcon />}>
              Edit
            </Button>
          )
        )}
        <Button variant="contained" color="primary" onClick={handleExportCSV} startIcon={<FileDownloadIcon />}>
          Export CSV
        </Button>
        <Button variant="contained" color="secondary" onClick={handleExportExcel} startIcon={<FileDownloadIcon />}>
          Export Excel
        </Button>
      </Box>
      <Typography variant="body2" color="textSecondary" mb={2}>
        {canModifyInventory
          ? 'Upload a CSV file to import inventory. The table below shows all shared inventory items across all events.'
          : 'The table below shows all shared inventory items across all events.'
        }
      </Typography>
      {canModifyInventory && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'space-between' }}>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            component="label"
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Inventory CSV'}
            <input
              type="file"
              accept=".csv"
              hidden
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleOpenAddItemModal}
          >
            Add Item
          </Button>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Snackbar open autoHideDuration={3000} onClose={() => setSuccess('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>{success}</Alert>
      </Snackbar>}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px"><CircularProgress /></Box>
      ) : (
        <Card>
          <CardContent>
            {/* Search and Filter Controls */}
            <Box mb={3}>
              <Grid container spacing={2} alignItems="flex-start">
                {/* Search Bar */}
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search inventory..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery && (
                        <InputAdornment position="end">
                          <Button
                            size="small"
                            onClick={() => setSearchQuery('')}
                            sx={{ minWidth: 'auto', p: 0.5 }}
                          >
                            <ClearIcon fontSize="small" />
                          </Button>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>

                {/* Type Filter */}
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      label="Type"
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      {allTypes.map(type => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Style Filter */}
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Style</InputLabel>
                    <Select
                      value={styleFilter}
                      onChange={(e) => setStyleFilter(e.target.value)}
                      label="Style"
                    >
                      <MenuItem value="all">All Styles</MenuItem>
                      {allStyles.map(style => (
                        <MenuItem key={style} value={style}>{style}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Gender Filter */}
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Gender</InputLabel>
                    <Select
                      value={genderFilter}
                      onChange={(e) => setGenderFilter(e.target.value)}
                      label="Gender"
                    >
                      <MenuItem value="all">All Genders</MenuItem>
                      {allGenders.map(gender => (
                        <MenuItem key={gender} value={gender}>{gender}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Clear Filters */}
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={clearAllFilters}
                    startIcon={<ClearIcon />}
                    sx={{ 
                      minWidth: 'auto',
                      height: '40px',
                      mt: 0.5
                    }}
                  >
                    Clear
                  </Button>
                </Grid>
              </Grid>
            </Box>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === 'type'}
                        direction={sortBy === 'type' ? sortOrder : 'asc'}
                        onClick={() => handleSort('type')}
                      >
                        Type
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === 'style'}
                        direction={sortBy === 'style' ? sortOrder : 'asc'}
                        onClick={() => handleSort('style')}
                      >
                        Style
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === 'size'}
                        direction={sortBy === 'size' ? sortOrder : 'asc'}
                        onClick={() => handleSort('size')}
                      >
                        Size
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === 'gender'}
                        direction={sortBy === 'gender' ? sortOrder : 'asc'}
                        onClick={() => handleSort('gender')}
                      >
                        Gender
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === 'color'}
                        direction={sortBy === 'color' ? sortOrder : 'asc'}
                        onClick={() => handleSort('color')}
                      >
                        Color
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === 'qtyWarehouse'}
                        direction={sortBy === 'qtyWarehouse' ? sortOrder : 'asc'}
                        onClick={() => handleSort('qtyWarehouse')}
                      >
                        Qty Warehouse
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Qty Before Event</TableCell>
                    <TableCell>Current Inventory</TableCell>
                    <TableCell>Post Event Count</TableCell>
                    <TableCell>Allocated Events</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAndSortedInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center">
                        {inventory.length === 0 ? 'No inventory found.' : 'No inventory matches your filters.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedInventory
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map(item => (
                        <TableRow 
                          key={item._id}
                          sx={{
                            '&:hover': {
                              cursor: 'pointer',
                              backgroundColor: 'action.hover',
                              ...(item.isInherited && {
                                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.08)' }
                              })
                            }
                          }}
                        >
                          <TableCell>{item.type}</TableCell>
                          <TableCell>{item.style}</TableCell>
                          <TableCell>{item.size}</TableCell>
                          <TableCell>{item.gender}</TableCell>
                          <TableCell>{item.color}</TableCell>
                          <TableCell>{item.qtyWarehouse}</TableCell>
                          <TableCell>
                            {isEditMode ? (
                              <input
                                type="number"
                                min="0"
                                required
                                value={editValuesMap[item._id]?.qtyBeforeEvent || item.qtyBeforeEvent || item.qtyOnSite || 0}
                                onChange={e => handleEditValueChange(item._id, 'qtyBeforeEvent', e.target.value)}
                                style={{ width: 70 }}
                              />
                            ) : (
                              item.qtyBeforeEvent || item.qtyOnSite || 0
                            )}
                          </TableCell>
                          <TableCell>{item.currentInventory}</TableCell>
                          <TableCell>
                            {isEditMode ? (
                              <input
                                type="number"
                                min="0"
                                required
                                value={editValuesMap[item._id]?.postEventCount || item.postEventCount || 0}
                                onChange={e => handleEditValueChange(item._id, 'postEventCount', e.target.value)}
                                style={{ width: 70 }}
                              />
                            ) : (
                              item.postEventCount || 0
                            )}
                          </TableCell>
                          <TableCell>
                            {eventsLoading ? (
                              <CircularProgress size={20} />
                            ) : (canModifyInventory) ? (
                              <Autocomplete
                                multiple
                                size="small"
                                options={filteredEvents}
                                getOptionLabel={option => option.eventName}
                                value={filteredEvents.filter(ev => item.allocatedEvents?.includes(ev._id))}
                                onChange={(_, newValue) => handleAllocationChange(item, newValue)}
                                renderInput={params => <TextField {...params} variant="outlined" label="Allocated Events" />}
                                renderTags={(value, getTagProps) =>
                                  value.map((option, index) => (
                                    <Chip label={option.eventName} {...getTagProps({ index })} key={option._id} />
                                  ))
                                }
                                disableCloseOnSelect
                                sx={{ minWidth: 200 }}
                              />
                            ) : (
                              <Box display="flex" flexWrap="wrap" gap={0.5}>
                                {filteredEvents.filter(ev => item.allocatedEvents?.includes(ev._id)).map(ev => (
                                  <Chip key={ev._id} label={ev.eventName} size="small" />
                                ))}
                              </Box>
                            )}
                          </TableCell>

                          <TableCell align="center">
                            {canModifyInventory && !isEditMode && (
                              <IconButton color="error" onClick={() => handleDeleteClick(item._id)} size="small"><DeleteIcon /></IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* No results message */}
            {filteredAndSortedInventory.length === 0 && inventory.length > 0 && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <FilterIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No inventory matches your filters
                </Typography>
                <Typography color="text.secondary" paragraph>
                  Try adjusting your search or filter criteria
                </Typography>
                <Button variant="outlined" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              </Box>
            )}

            <TablePagination
              component="div"
              count={filteredAndSortedInventory.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50]}
              labelRowsPerPage="Inventory per page"
              sx={{ mt: 2 }}
            />
            {/* Delete Confirmation Dialog */}
            <Dialog
              open={!!deletingId}
              onClose={handleDeleteCancel}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>Delete Inventory Item?</DialogTitle>
              <DialogContent>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Are you sure you want to delete this inventory item? This action cannot be undone.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleDeleteCancel} variant="outlined">
                  Cancel
                </Button>
                <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                  Delete
                </Button>
              </DialogActions>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Add Item Modal */}
      <Dialog
        open={addItemModalOpen}
        onClose={handleCloseAddItemModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            minWidth: 500,
            maxWidth: 600
          }
        }}
      >
        <DialogTitle>Add Inventory Item</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
            <TextField
              label="Type *"
              value={newItem.type}
              onChange={(e) => handleNewItemChange('type', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Style *"
              value={newItem.style}
              onChange={(e) => handleNewItemChange('style', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Size"
              value={newItem.size}
              onChange={(e) => handleNewItemChange('size', e.target.value)}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Gender</InputLabel>
              <Select
                value={newItem.gender}
                onChange={(e) => handleNewItemChange('gender', e.target.value)}
                label="Gender"
                MenuProps={{
                  PaperProps: {
                    sx: {
                      zIndex: 9999
                    }
                  }
                }}
              >
                <MenuItem value="">
                  <em>Select gender (optional)</em>
                </MenuItem>
                <MenuItem value="M">Male (M)</MenuItem>
                <MenuItem value="W">Female (W)</MenuItem>
                <MenuItem value="N/A">Not Applicable (N/A)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Color"
              value={newItem.color}
              onChange={(e) => handleNewItemChange('color', e.target.value)}
              fullWidth
            />
            <TextField
              label="Qty Warehouse"
              type="number"
              value={newItem.qtyWarehouse}
              onChange={(e) => handleNewItemChange('qtyWarehouse', e.target.value)}
              fullWidth
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Qty Before Event"
              type="number"
              value={newItem.qtyBeforeEvent}
              onChange={(e) => handleNewItemChange('qtyBeforeEvent', e.target.value)}
              fullWidth
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Post Event Count"
              type="number"
              value={newItem.postEventCount}
              onChange={(e) => handleNewItemChange('postEventCount', e.target.value)}
              fullWidth
              inputProps={{ min: 0 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddItemModal} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleAddItem} variant="contained" color="primary">
            Add Item
          </Button>
        </DialogActions>
      </Dialog>
      {/* Add this right before </MainLayout> */}
      <CSVColumnMapper
        open={showColumnMapper}
        onClose={() => setShowColumnMapper(false)}
        csvFile={pendingCsvFile}
        onMappingComplete={handleMappingComplete}
        eventId={eventId}
      />
    </MainLayout>
  );
};

function InventoryPageWrapper() {
  const { eventId } = useParams();
  const [event, setEvent] = React.useState(null);
  React.useEffect(() => {
    getEvent(eventId).then(setEvent);
  }, [eventId]);
  return <InventoryPage eventId={eventId} eventName={event?.eventName || 'Loading Event...'} />;
}

export default InventoryPageWrapper; 