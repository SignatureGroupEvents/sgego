import React, { useState, useRef } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Alert, CircularProgress, Snackbar, IconButton, Autocomplete,
  TextField, Chip, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, TablePagination, Grid, InputAdornment, TableSortLabel, Tooltip, Checkbox
} from '@mui/material';
import {
  Upload as UploadIcon, Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon,
  Cancel as CancelIcon, FileDownload as FileDownloadIcon, Home as HomeIcon,
  Search as SearchIcon, FilterList as FilterIcon, Clear as ClearIcon, AccountTree as InheritIcon
} from '@mui/icons-material';
import { fetchInventory, updateInventoryItem, addInventoryItem, deleteInventoryItem, bulkDeleteInventory, updateInventoryAllocation, exportInventoryCSV, exportInventoryExcel } from '../../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import { getEvent } from '../../services/events';
import api from '../../services/api';
import EventIcon from '@mui/icons-material/Event';
import EventHeader from '../Events/EventHeader';
import CSVColumnMapper from './CSVColumnMapper';

// ✅ Use usePermissions only
import { usePermissions } from '../../hooks/usePermissions';




const InventoryPage = ({ eventId, eventName }) => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
  const [newItem, setNewItem] = useState({
    type: '',
    style: '',
    product: '',
    size: '',
    gender: '',
    color: '',
    qtyWarehouse: 0,
    qtyBeforeEvent: 0,
    postEventCount: 0
  });
  const [typeInputValue, setTypeInputValue] = useState('');
  const [showTypeInput, setShowTypeInput] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [editItemModalOpen, setEditItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editItem, setEditItem] = useState({
    type: '',
    style: '',
    product: '',
    size: '',
    gender: '',
    color: '',
    qtyWarehouse: 0,
    qtyBeforeEvent: 0,
    postEventCount: 0
  });
  const [editTypeInputValue, setEditTypeInputValue] = useState('');
  const [showEditTypeInput, setShowEditTypeInput] = useState(false);

  // Pick-up modal field display preferences (stored in localStorage)
  const [pickupFieldPreferences, setPickupFieldPreferences] = useState(() => {
    const saved = localStorage.getItem('inventoryPickupFieldPreferences');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { type: false, brand: true, product: false, size: true, gender: false, color: false };
      }
    }
    // Default: show Brand and Size
    return { type: false, brand: true, product: false, size: true, gender: false, color: false };
  });

  const handlePickupFieldToggle = (field) => {
    const updated = { ...pickupFieldPreferences, [field]: !pickupFieldPreferences[field] };
    setPickupFieldPreferences(updated);
    localStorage.setItem('inventoryPickupFieldPreferences', JSON.stringify(updated));
  };

  // Predefined types in alphabetical order
  const predefinedTypes = ['Accessories', 'Apparel', 'Bags', 'Electronics', 'Hats', 'Sandals', 'Sneakers', 'Sunglasses'];
  
  // Get all unique types from inventory + predefined types, sorted alphabetically
  const allAvailableTypes = React.useMemo(() => {
    const typeSet = new Set(predefinedTypes);
    inventory.forEach(item => {
      if (item.type) typeSet.add(item.type);
    });
    return Array.from(typeSet).sort();
  }, [inventory]);
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
    setSelectedItems([]); // Clear selections when changing pages
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    setSelectedItems([]); // Clear selections when changing page size
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
    setSelectedItems([]);
  };

  // Filter and sort inventory
  const filteredAndSortedInventory = React.useMemo(() => {
    let filtered = inventory.filter(item => {
      // Search filter
      const searchMatch = searchQuery === '' || 
        item.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.style?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.size?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.color?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.gender?.toLowerCase().includes(searchQuery.toLowerCase());

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
        case 'product':
          aValue = (a.product || '').toLowerCase();
          bValue = (b.product || '').toLowerCase();
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


  const handleUploadClick = () => {
    navigate(`/events/${eventId}/inventory/upload`);
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

  // Bulk delete handlers
  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const currentPageItems = filteredAndSortedInventory
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        .map(item => item._id);
      setSelectedItems(currentPageItems);
    } else {
      setSelectedItems([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      setError('Please select at least one item to delete.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedItems.length} inventory item(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    setBulkDeleting(true);
    setError('');
    setSuccess('');

    try {
      // Delete items one by one (since bulk delete endpoint expects eventId and might have different logic)
      const deletePromises = selectedItems.map(itemId => deleteInventoryItem(itemId));
      await Promise.all(deletePromises);
      
      setSuccess(`Successfully deleted ${selectedItems.length} inventory item(s).`);
      setSelectedItems([]);
      loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete inventory items.');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Edit item handlers
  const handleEditItemClick = (item) => {
    setEditingItem(item);
    setEditItem({
      type: item.type || '',
      style: item.style || '',
      product: item.product || '',
      size: item.size || '',
      gender: item.gender || 'N/A',
      color: item.color || '',
      qtyWarehouse: item.qtyWarehouse || 0,
      qtyBeforeEvent: item.qtyBeforeEvent || item.qtyOnSite || 0,
      postEventCount: item.postEventCount || 0
    });
    setEditTypeInputValue('');
    setShowEditTypeInput(false);
    setEditItemModalOpen(true);
  };

  const handleCloseEditItemModal = () => {
    setEditItemModalOpen(false);
    setEditingItem(null);
    setEditItem({
      type: '',
      style: '',
      product: '',
      size: '',
      gender: '',
      color: '',
      qtyWarehouse: 0,
      qtyBeforeEvent: 0,
      postEventCount: 0
    });
    setEditTypeInputValue('');
    setShowEditTypeInput(false);
  };

  const handleEditTypeChange = (value) => {
    if (value === '__add_new__') {
      setShowEditTypeInput(true);
      setEditTypeInputValue('');
    } else {
      setEditItem(prev => ({ ...prev, type: value }));
      setShowEditTypeInput(false);
      setEditTypeInputValue('');
    }
  };

  const handleEditTypeInputChange = (value) => {
    setEditTypeInputValue(value);
    // Capitalize first letter
    const capitalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    
    // Check for duplicates (case-insensitive)
    const normalizedValue = capitalized.toLowerCase().trim();
    const isDuplicate = allAvailableTypes.some(
      existingType => existingType.toLowerCase().trim() === normalizedValue
    );
    
    if (isDuplicate && normalizedValue) {
      setError(`Type "${capitalized}" already exists. Please select it from the dropdown.`);
    } else {
      setError('');
      setEditItem(prev => ({ ...prev, type: capitalized }));
    }
  };

  const handleEditItemChange = (field, value) => {
    setEditItem(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEditItem = async () => {
    if (!editingItem) return;

    try {
      // Validate required fields
      if (!editItem.type || !editItem.style) {
        setError('Type and Brand are required fields.');
        return;
      }

      // Final validation for type - check for duplicates (but allow if it's the same as the original)
      const normalizedType = editItem.type.toLowerCase().trim();
      const originalNormalizedType = editingItem?.type?.toLowerCase().trim();
      
      // Only check for duplicates if the type has changed
      if (normalizedType !== originalNormalizedType) {
        const isDuplicate = allAvailableTypes.some(
          existingType => existingType.toLowerCase().trim() === normalizedType
        );
        
        if (isDuplicate) {
          setError(`Type "${editItem.type}" already exists. Please select it from the dropdown.`);
          return;
        }
      }

      // Convert numeric fields
      const itemData = {
        type: editItem.type.trim(),
        style: editItem.style.trim(),
        product: editItem.product ? editItem.product.trim() : '',
        size: editItem.size ? editItem.size.trim() : '',
        gender: editItem.gender || 'N/A',
        color: editItem.color ? editItem.color.trim() : '',
        qtyWarehouse: Number(editItem.qtyWarehouse),
        qtyBeforeEvent: Number(editItem.qtyBeforeEvent),
        postEventCount: editItem.postEventCount ? Number(editItem.postEventCount) : null
      };

      // Validate numeric values
      if (
        isNaN(itemData.qtyWarehouse) ||
        isNaN(itemData.qtyBeforeEvent) ||
        (itemData.postEventCount !== null && isNaN(itemData.postEventCount)) ||
        itemData.qtyWarehouse < 0 ||
        itemData.qtyBeforeEvent < 0 ||
        (itemData.postEventCount !== null && itemData.postEventCount < 0)
      ) {
        setError('All quantity fields must be valid numbers.');
        return;
      }

      // Update the inventory item
      await updateInventoryItem(editingItem._id, itemData);
      setSuccess('Inventory item updated successfully!');
      handleCloseEditItemModal();
      loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update inventory item.');
    }
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
      product: '',
      size: '',
      gender: '',
      color: '',
      qtyWarehouse: 0,
      qtyBeforeEvent: 0,
      postEventCount: 0
    });
    setTypeInputValue('');
    setShowTypeInput(false);
  };

  const handleCloseAddItemModal = () => {
    setAddItemModalOpen(false);
    setNewItem({
      type: '',
      style: '',
      product: '',
      size: '',
      gender: '',
      color: '',
      qtyWarehouse: 0,
      qtyBeforeEvent: 0,
      postEventCount: 0
    });
    setTypeInputValue('');
    setShowTypeInput(false);
  };

  const handleTypeChange = (value) => {
    if (value === '__add_new__') {
      setShowTypeInput(true);
      setTypeInputValue('');
    } else {
      setNewItem(prev => ({ ...prev, type: value }));
      setShowTypeInput(false);
      setTypeInputValue('');
    }
  };

  const handleTypeInputChange = (value) => {
    setTypeInputValue(value);
    // Capitalize first letter
    const capitalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    
    // Check for duplicates (case-insensitive)
    const normalizedValue = capitalized.toLowerCase().trim();
    const isDuplicate = allAvailableTypes.some(
      existingType => existingType.toLowerCase().trim() === normalizedValue
    );
    
    if (isDuplicate && normalizedValue) {
      setError(`Type "${capitalized}" already exists. Please select it from the dropdown.`);
    } else {
      setError('');
      setNewItem(prev => ({ ...prev, type: capitalized }));
    }
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
        setError('Type and Brand are required fields.');
        return;
      }

      // Final validation for type - check for duplicates
      const normalizedType = newItem.type.toLowerCase().trim();
      const isDuplicate = allAvailableTypes.some(
        existingType => existingType.toLowerCase().trim() === normalizedType && existingType !== newItem.type
      );
      
      if (isDuplicate) {
        setError(`Type "${newItem.type}" already exists. Please select it from the dropdown.`);
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
        <Button variant="contained" color="primary" onClick={handleExportCSV} startIcon={<FileDownloadIcon />}>
          Export CSV
        </Button>
        <Button variant="contained" color="secondary" onClick={handleExportExcel} startIcon={<FileDownloadIcon />}>
          Export Excel
        </Button>
      </Box>
      <Typography variant="body2" color="textSecondary" mb={2}>
        {canModifyInventory
          ? event?.isMainEvent 
            ? 'Upload a CSV file to import inventory. The table below shows all inventory items for this event and its sub-events.'
            : 'The table below shows inventory items allocated to this sub-event. Use the main event to manage all inventory.'
          : event?.isMainEvent 
            ? 'The table below shows all inventory items for this event and its sub-events.'
            : 'The table below shows inventory items allocated to this sub-event.'
        }
      </Typography>
      {canModifyInventory && event?.isMainEvent && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={handleUploadClick}
            >
              Upload Inventory
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleOpenAddItemModal}
            >
              Add Item
            </Button>
          </Box>
          {selectedItems.length > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? 'Deleting...' : `Delete ${selectedItems.length} Item(s)`}
            </Button>
          )}
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Snackbar open autoHideDuration={3000} onClose={() => setSuccess('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>{success}</Alert>
      </Snackbar>}

      {/* Pick-up Modal Field Preferences Section - Only visible to Ops and Admin */}
      {canModifyInventory && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pick-up Modal Display Settings
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Select which fields should appear in the guest pick-up modal dropdowns:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={pickupFieldPreferences.type}
                  onChange={() => handlePickupFieldToggle('type')}
                  inputProps={{ 'aria-label': 'Show Type in pick-up modal' }}
                />
                <Typography>Type</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={pickupFieldPreferences.brand}
                  onChange={() => handlePickupFieldToggle('brand')}
                  inputProps={{ 'aria-label': 'Show Brand in pick-up modal' }}
                />
                <Typography>Brand</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={pickupFieldPreferences.product}
                  onChange={() => handlePickupFieldToggle('product')}
                  inputProps={{ 'aria-label': 'Show Product in pick-up modal' }}
                />
                <Typography>Product</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={pickupFieldPreferences.size}
                  onChange={() => handlePickupFieldToggle('size')}
                  inputProps={{ 'aria-label': 'Show Size in pick-up modal' }}
                />
                <Typography>Size</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={pickupFieldPreferences.gender}
                  onChange={() => handlePickupFieldToggle('gender')}
                  inputProps={{ 'aria-label': 'Show Gender in pick-up modal' }}
                />
                <Typography>Gender</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={pickupFieldPreferences.color}
                  onChange={() => handlePickupFieldToggle('color')}
                  inputProps={{ 'aria-label': 'Show Color in pick-up modal' }}
                />
                <Typography>Color</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px"><CircularProgress /></Box>
      ) : (
        <Card>
          <CardContent>
            {/* Search and Filter Controls */}
            <Box mb={3}>
              <Grid container spacing={2} alignItems="flex-start">
                {/* Search Bar */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
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

                {/* Brand Filter */}
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Brand</InputLabel>
                    <Select
                      value={styleFilter}
                      onChange={(e) => setStyleFilter(e.target.value)}
                      label="Brand"
                    >
                      <MenuItem value="all">All Brands</MenuItem>
                      {allStyles.map(style => (
                        <MenuItem key={style} value={style}>{style}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Gender Filter */}
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
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
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

            <Box display="flex" justifyContent="flex-end" mb={1}>
              {canModifyInventory && (
                isEditMode ? (
                  <Box display="flex" gap={1}>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      onClick={handleSaveAllChanges}
                      startIcon={<SaveIcon />}
                    >
                      Save All Changes
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleExitEditMode}
                      startIcon={<CancelIcon />}
                    >
                      Cancel
                    </Button>
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleEnterEditMode}
                    startIcon={<EditIcon />}
                  >
                    Update Counts
                  </Button>
                )
              )}
            </Box>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {canModifyInventory && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={
                            filteredAndSortedInventory.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length > 0 &&
                            selectedItems.length > 0 &&
                            selectedItems.length < filteredAndSortedInventory.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length
                          }
                          checked={
                            filteredAndSortedInventory.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length > 0 &&
                            selectedItems.length === filteredAndSortedInventory.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length
                          }
                          onChange={handleSelectAll}
                          inputProps={{ 'aria-label': 'select all items' }}
                        />
                      </TableCell>
                    )}
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
                        Brand
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === 'product'}
                        direction={sortBy === 'product' ? sortOrder : 'asc'}
                        onClick={() => handleSort('product')}
                      >
                        Product
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
                      <TableCell colSpan={canModifyInventory ? 13 : 12} align="center">
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
                              backgroundColor: 'action.hover',
                              ...(item.isInherited && {
                                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.08)' }
                              })
                            }
                          }}
                        >
                          {canModifyInventory && (
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedItems.includes(item._id)}
                                onChange={() => handleSelectItem(item._id)}
                                inputProps={{ 'aria-label': `select ${item.type} ${item.style}` }}
                              />
                            </TableCell>
                          )}
                          <TableCell>{item.type}</TableCell>
                          <TableCell>{item.style}</TableCell>
                          <TableCell>{item.product || ''}</TableCell>
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
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                <IconButton color="primary" onClick={() => handleEditItemClick(item)} size="small" title="Edit item">
                                  <EditIcon />
                                </IconButton>
                                <IconButton color="error" onClick={() => handleDeleteClick(item._id)} size="small" title="Delete item">
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
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
            {/* Type Dropdown with Add New Option */}
            <FormControl fullWidth required>
              <InputLabel>Type *</InputLabel>
              {!showTypeInput ? (
                <Select
                  value={newItem.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  label="Type *"
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        zIndex: 9999
                      }
                    }
                  }}
                >
                  <MenuItem value="">
                    <em>Select Type</em>
                  </MenuItem>
                  {allAvailableTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                  <MenuItem value="__add_new__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
                    + Add New Type
                  </MenuItem>
                </Select>
              ) : (
                <TextField
                  label="Type *"
                  value={typeInputValue}
                  onChange={(e) => handleTypeInputChange(e.target.value)}
                  required
                  fullWidth
                  autoFocus
                  helperText={error && error.includes('already exists') ? error : 'Capitalize first letter automatically'}
                  error={error && error.includes('already exists')}
                />
              )}
            </FormControl>
            <TextField
              label="Brand *"
              value={newItem.style}
              onChange={(e) => handleNewItemChange('style', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Product"
              value={newItem.product}
              onChange={(e) => handleNewItemChange('product', e.target.value)}
              fullWidth
            />
            <TextField
              label="Size"
              value={newItem.size}
              onChange={(e) => handleNewItemChange('size', e.target.value)}
              fullWidth
            />
            <TextField
              label="Gender"
              value={newItem.gender}
              onChange={(e) => handleNewItemChange('gender', e.target.value)}
              fullWidth
            />
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

      {/* Edit Item Modal */}
      <Dialog
        open={editItemModalOpen}
        onClose={handleCloseEditItemModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            minWidth: 500,
            maxWidth: 600
          }
        }}
      >
        <DialogTitle>Edit Inventory Item</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
            {/* Type Dropdown with Add New Option */}
            <FormControl fullWidth required>
              <InputLabel>Type *</InputLabel>
              {!showEditTypeInput ? (
                <Select
                  value={editItem.type}
                  onChange={(e) => handleEditTypeChange(e.target.value)}
                  label="Type *"
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        zIndex: 9999
                      }
                    }
                  }}
                >
                  <MenuItem value="">
                    <em>Select Type</em>
                  </MenuItem>
                  {allAvailableTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                  <MenuItem value="__add_new__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
                    + Add New Type
                  </MenuItem>
                </Select>
              ) : (
                <TextField
                  label="Type *"
                  value={editTypeInputValue}
                  onChange={(e) => handleEditTypeInputChange(e.target.value)}
                  required
                  fullWidth
                  autoFocus
                  helperText={error && error.includes('already exists') ? error : 'Capitalize first letter automatically'}
                  error={error && error.includes('already exists')}
                />
              )}
            </FormControl>
            <TextField
              label="Brand *"
              value={editItem.style}
              onChange={(e) => handleEditItemChange('style', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Product"
              value={editItem.product}
              onChange={(e) => handleEditItemChange('product', e.target.value)}
              fullWidth
            />
            <TextField
              label="Size"
              value={editItem.size}
              onChange={(e) => handleEditItemChange('size', e.target.value)}
              fullWidth
            />
            <TextField
              label="Gender"
              value={editItem.gender}
              onChange={(e) => handleEditItemChange('gender', e.target.value)}
              fullWidth
            />
            <TextField
              label="Color"
              value={editItem.color}
              onChange={(e) => handleEditItemChange('color', e.target.value)}
              fullWidth
            />
            <TextField
              label="Qty Warehouse"
              type="number"
              value={editItem.qtyWarehouse}
              onChange={(e) => handleEditItemChange('qtyWarehouse', e.target.value)}
              fullWidth
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Qty Before Event"
              type="number"
              value={editItem.qtyBeforeEvent}
              onChange={(e) => handleEditItemChange('qtyBeforeEvent', e.target.value)}
              fullWidth
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Post Event Count"
              type="number"
              value={editItem.postEventCount}
              onChange={(e) => handleEditItemChange('postEventCount', e.target.value)}
              fullWidth
              inputProps={{ min: 0 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditItemModal} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSaveEditItem} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
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