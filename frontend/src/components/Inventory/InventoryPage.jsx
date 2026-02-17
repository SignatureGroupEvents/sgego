import React, { useState, useRef } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Alert, CircularProgress, Snackbar, IconButton, Autocomplete,
  TextField, Chip, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, TablePagination, Grid, InputAdornment, TableSortLabel, Tooltip, Checkbox,
  useMediaQuery, useTheme, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  Upload as UploadIcon, Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon,
  Cancel as CancelIcon, FileDownload as FileDownloadIcon, Home as HomeIcon,
  Search as SearchIcon, FilterList as FilterIcon, Clear as ClearIcon, AccountTree as InheritIcon,
  KeyboardArrowLeft, KeyboardArrowRight, ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { fetchInventory, updateInventoryItem, addInventoryItem, deleteInventoryItem, bulkDeleteInventory, updateInventoryAllocation, exportInventoryCSV, exportInventoryExcel } from '../../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import { getEvent, updatePickupFieldPreferences } from '../../services/events';
import api from '../../services/api';
import EventIcon from '@mui/icons-material/Event';
import EventHeader from '../Events/EventHeader';
import CSVColumnMapper from './CSVColumnMapper';

// ✅ Use usePermissions only
import { usePermissions } from '../../hooks/usePermissions';




const InventoryPage = ({ eventId, eventName }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // Show cards on screens smaller than md (960px)
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
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Pick-up modal field display preferences (stored in backend)
  const getDefaultPreferences = () => ({
    type: false,
    brand: false,
    product: false,
    size: false,
    gender: false,
    color: false
  });

  const [pickupFieldPreferences, setPickupFieldPreferences] = useState(getDefaultPreferences());
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Load preferences from event when event is fetched
  React.useEffect(() => {
    if (event?.pickupFieldPreferences) {
      // Merge with defaults to ensure all fields are present
      const prefs = { ...getDefaultPreferences(), ...event.pickupFieldPreferences };
      setPickupFieldPreferences(prefs);
    } else if (event) {
      // Event exists but no preferences set, use defaults
      setPickupFieldPreferences(getDefaultPreferences());
    }
  }, [event]);

  const handlePickupFieldToggle = (field) => {
    const updated = { ...pickupFieldPreferences, [field]: !pickupFieldPreferences[field] };
    setPickupFieldPreferences(updated);
  };

  const handleSavePickupFieldPreferences = async () => {
    if (!eventId) {
      setError('Event ID is required to save preferences.');
      return;
    }

    setSavingPreferences(true);
    setError('');
    try {
      await updatePickupFieldPreferences(eventId, pickupFieldPreferences);
      setSuccess('Pick-up modal display settings saved successfully!');
      // Reload event to get updated preferences
      const updatedEvent = await getEvent(eventId);
      setEvent(updatedEvent);
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Unable to connect to server. Please ensure the backend server is running.');
      } else {
        setError(err.response?.data?.message || 'Failed to save pick-up modal display settings.');
      }
    } finally {
      setSavingPreferences(false);
    }
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
  const { canManageInventory, canViewInventory } = usePermissions();

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
  // Determine if user can modify inventory (Admin and Ops only)
  const canModifyInventory = canManageInventory;
  // Staff can add items but not manage other aspects
  const canAddInventoryItem = canManageInventory || canViewInventory;
  // Staff can update counts but not manage other aspects
  const canUpdateInventoryCounts = canManageInventory || canViewInventory;

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

  // Count active filters for mobile display
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (typeFilter !== 'all') count++;
    if (styleFilter !== 'all') count++;
    if (genderFilter !== 'all') count++;
    if (sortBy !== 'type') count++;
    if (sortOrder !== 'asc') count++;
    return count;
  }, [searchQuery, typeFilter, styleFilter, genderFilter, sortBy, sortOrder]);

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
      setError(`Category "${capitalized}" already exists. Please select it from the dropdown.`);
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
        setError('Category and Brand are required fields.');
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
      setError(`Category "${capitalized}" already exists. Please select it from the dropdown.`);
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
        setError('Category and Brand are required fields.');
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
      {(canModifyInventory || canAddInventoryItem) && event?.isMainEvent && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {canModifyInventory && (
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={handleUploadClick}
              >
                Upload Inventory
              </Button>
            )}
            <Button
              variant="contained"
              color="secondary"
              onClick={handleOpenAddItemModal}
            >
              Add Item
            </Button>
          </Box>
          {canModifyInventory && selectedItems.length > 0 && (
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

      {/* Pick-up Modal Field Preferences: only on main event; nested events use main event's settings */}
      {canModifyInventory && event?.isMainEvent && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pick-up Modal Display Settings
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Select which fields should appear in the guest pick-up modal for this event and all nested events:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={pickupFieldPreferences.type}
                  onChange={() => handlePickupFieldToggle('type')}
                  inputProps={{ 'aria-label': 'Show Category in pick-up modal' }}
                />
                <Typography>Category</Typography>
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
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={pickupFieldPreferences.size}
                  onChange={() => handlePickupFieldToggle('size')}
                  inputProps={{ 'aria-label': 'Show Size in pick-up modal' }}
                />
                <Typography>Size</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSavePickupFieldPreferences}
                startIcon={savingPreferences ? <CircularProgress size={20} /> : <SaveIcon />}
                disabled={savingPreferences}
              >
                {savingPreferences ? 'Saving...' : 'Save Settings'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
      {canModifyInventory && event && !event.isMainEvent && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pick-up Modal Display Settings
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Pick-up modal settings are managed by the main event and apply to all nested events. Configure them from the main event&apos;s Inventory page.
            </Alert>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<HomeIcon />}
              onClick={() => navigate(`/events/${event.parentEventId}/inventory`)}
            >
              Open main event Inventory
            </Button>
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
              {/* Mobile: Collapsible Filters */}
              {isMobile ? (
                <Box>
                  {/* Search Bar - Always visible on mobile */}
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search inventory..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ mb: 2 }}
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
                  
                  {/* Collapsible Filters Accordion */}
                  <Accordion 
                    expanded={filtersExpanded} 
                    onChange={() => setFiltersExpanded(!filtersExpanded)}
                    sx={{ boxShadow: 1 }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ 
                        minHeight: 48,
                        '&.Mui-expanded': { minHeight: 48 }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <FilterIcon />
                        <Typography sx={{ flex: 1, fontWeight: 600 }}>
                          Filters
                        </Typography>
                        {activeFiltersCount > 0 && (
                          <Chip 
                            label={activeFiltersCount} 
                            size="small" 
                            color="primary"
                            sx={{ height: 20, minWidth: 20 }}
                          />
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        {/* Category Filter */}
                        <Grid size={{ xs: 12 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Category</InputLabel>
                            <Select
                              value={typeFilter}
                              onChange={(e) => setTypeFilter(e.target.value)}
                              label="Category"
                            >
                              <MenuItem value="all">All Categories</MenuItem>
                              {allTypes.map(type => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Brand Filter */}
                        <Grid size={{ xs: 12 }}>
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
                        <Grid size={{ xs: 12 }}>
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

                        {/* Sort By */}
                        <Grid size={{ xs: 6 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Sort By</InputLabel>
                            <Select
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value)}
                              label="Sort By"
                            >
                              <MenuItem value="type">Category</MenuItem>
                              <MenuItem value="style">Brand</MenuItem>
                              <MenuItem value="product">Product</MenuItem>
                              <MenuItem value="size">Size</MenuItem>
                              <MenuItem value="gender">Gender</MenuItem>
                              <MenuItem value="color">Color</MenuItem>
                              <MenuItem value="qtyWarehouse">Qty Warehouse</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Sort Order */}
                        <Grid size={{ xs: 6 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Order</InputLabel>
                            <Select
                              value={sortOrder}
                              onChange={(e) => setSortOrder(e.target.value)}
                              label="Order"
                            >
                              <MenuItem value="asc">Asc</MenuItem>
                              <MenuItem value="desc">Desc</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Clear Filters */}
                        <Grid size={{ xs: 12 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={clearAllFilters}
                            startIcon={<ClearIcon />}
                            fullWidth
                          >
                            Clear All Filters
                          </Button>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              ) : (
                /* Desktop: Full Filters Always Visible */
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

                  {/* Category Filter */}
                  <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        label="Category"
                      >
                        <MenuItem value="all">All Categories</MenuItem>
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

                  {/* Sort By */}
                  <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Sort By</InputLabel>
                      <Select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        label="Sort By"
                      >
                        <MenuItem value="type">Category</MenuItem>
                        <MenuItem value="style">Brand</MenuItem>
                        <MenuItem value="product">Product</MenuItem>
                        <MenuItem value="size">Size</MenuItem>
                        <MenuItem value="gender">Gender</MenuItem>
                        <MenuItem value="color">Color</MenuItem>
                        <MenuItem value="qtyWarehouse">Qty Warehouse</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Sort Order */}
                  <Grid size={{ xs: 12, sm: 6, md: 1 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Order</InputLabel>
                      <Select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        label="Order"
                      >
                        <MenuItem value="asc">Asc</MenuItem>
                        <MenuItem value="desc">Desc</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Clear Filters */}
                  <Grid size={{ xs: 12, sm: 6, md: 1 }}>
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
              )}
            </Box>

            <Box display="flex" justifyContent="flex-end" mb={1}>
              {canUpdateInventoryCounts && (
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

            {/* Mobile Card Layout */}
            {isMobile ? (
              <>
                {canModifyInventory && filteredAndSortedInventory.length > 0 && (
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
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
                    <Typography variant="body2" color="text.secondary">
                      Select All
                    </Typography>
                  </Box>
                )}

                {filteredAndSortedInventory.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <FilterIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      {inventory.length === 0 ? 'No inventory found.' : 'No inventory matches your filters.'}
                    </Typography>
                    {inventory.length > 0 && (
                      <>
                        <Typography color="text.secondary" paragraph>
                          Try adjusting your search or filter criteria
                        </Typography>
                        <Button variant="outlined" onClick={clearAllFilters}>
                          Clear all filters
                        </Button>
                      </>
                    )}
                  </Box>
                ) : (
                  <Grid container spacing={1}>
                    {filteredAndSortedInventory
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map(item => (
                        <Grid item xs={12} key={item._id}>
                          <Card
                            elevation={1}
                            sx={{
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              position: 'relative',
                              ...(item.isInherited && {
                                border: '1px solid',
                                borderColor: 'primary.main',
                                backgroundColor: 'rgba(25, 118, 210, 0.02)'
                              })
                            }}
                          >
                            <CardContent sx={{ flexGrow: 1, p: { xs: 1, sm: 1.5, md: 2 } }}>
                              {/* Checkbox and Actions Header */}
                              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.75}>
                                {canModifyInventory && (
                                  <Checkbox
                                    checked={selectedItems.includes(item._id)}
                                    onChange={() => handleSelectItem(item._id)}
                                    inputProps={{ 'aria-label': `select ${item.type} ${item.style}` }}
                                    size="small"
                                    sx={{ p: 0.5 }}
                                  />
                                )}
                                {canModifyInventory && !isEditMode && (
                                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                                    <IconButton 
                                      color="primary" 
                                      onClick={() => handleEditItemClick(item)} 
                                      size="small" 
                                      title="Edit item"
                                      sx={{ p: 0.5 }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton 
                                      color="error" 
                                      onClick={() => handleDeleteClick(item._id)} 
                                      size="small" 
                                      title="Delete item"
                                      sx={{ p: 0.5 }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                )}
                              </Box>

                              {/* Product Information */}
                              <Box mb={1}>
                                {/* Brand - Most Prominent */}
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, fontSize: { xs: '0.95rem', sm: '1.1rem' }, lineHeight: 1.2 }}>
                                  {item.style || 'No Brand'}
                                </Typography>
                                
                                {/* Product - Second Most Prominent */}
                                {item.product && (
                                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, fontSize: { xs: '0.8rem', sm: '0.9rem' }, color: 'text.primary', lineHeight: 1.3 }}>
                                    {item.product}
                                  </Typography>
                                )}
                                
                                {/* Category - Less Prominent */}
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: { xs: '0.65rem', sm: '0.7rem' }, opacity: 0.7 }}>
                                  {item.type || 'N/A'}
                                </Typography>
                                
                                {/* Size, Gender, Color Chips */}
                                <Box display="flex" flexWrap="wrap" gap={0.25} mt={0.5}>
                                  {item.size && (
                                    <Chip label={`Size: ${item.size}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                  )}
                                  {item.gender && item.gender !== 'N/A' && (
                                    <Chip label={item.gender} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                  )}
                                  {item.color && (
                                    <Chip label={item.color} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                  )}
                                </Box>
                              </Box>

                              {/* Quantity Information */}
                              <Box sx={{ 
                                borderTop: '1px solid',
                                borderColor: 'divider',
                                pt: { xs: 0.75, sm: 1 },
                                mt: 'auto'
                              }}>
                                <Grid container spacing={0.5}>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                      Qty Warehouse
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                      {item.qtyWarehouse || 0}
                                    </Typography>
                                  </Grid>
                                  {/* Hidden - Current Inventory calculated field that's confusing to staff */}
                                  {/* <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                      Current Inventory
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontWeight: 600,
                                        fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                        color: (item.currentInventory || 0) <= 10 ? 'error.main' : 'success.main'
                                      }}
                                    >
                                      {item.currentInventory || 0}
                                    </Typography>
                                  </Grid> */}
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                      Qty Before Event
                                    </Typography>
                                    {isEditMode ? (
                                      <TextField
                                        type="number"
                                        size="small"
                                        fullWidth
                                        inputProps={{ min: 0, style: { padding: '2px 6px', fontSize: '0.8rem' } }}
                                        value={editValuesMap[item._id]?.qtyBeforeEvent ?? (item.qtyBeforeEvent || item.qtyOnSite || 0)}
                                        onChange={e => handleEditValueChange(item._id, 'qtyBeforeEvent', e.target.value)}
                                        sx={{ mt: 0.25 }}
                                      />
                                    ) : (
                                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                        {item.qtyBeforeEvent || item.qtyOnSite || 0}
                                      </Typography>
                                    )}
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                      Post Event Count
                                    </Typography>
                                    {isEditMode ? (
                                      <TextField
                                        type="number"
                                        size="small"
                                        fullWidth
                                        inputProps={{ min: 0, style: { padding: '2px 6px', fontSize: '0.8rem' } }}
                                        value={editValuesMap[item._id]?.postEventCount ?? (item.postEventCount || 0)}
                                        onChange={e => handleEditValueChange(item._id, 'postEventCount', e.target.value)}
                                        sx={{ mt: 0.25 }}
                                      />
                                    ) : (
                                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                        {item.postEventCount || 0}
                                      </Typography>
                                    )}
                                  </Grid>
                                </Grid>
                              </Box>

                              {/* Allocated Events */}
                              {item.allocatedEvents && item.allocatedEvents.length > 0 && (
                                <Box sx={{ 
                                  borderTop: '1px solid',
                                  borderColor: 'divider',
                                  pt: { xs: 0.75, sm: 1 },
                                  mt: { xs: 0.75, sm: 1 }
                                }}>
                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.25, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                    Allocated Events
                                  </Typography>
                                  {eventsLoading ? (
                                    <CircularProgress size={14} />
                                  ) : canModifyInventory ? (
                                    <Autocomplete
                                      multiple
                                      size="small"
                                      options={filteredEvents}
                                      getOptionLabel={option => option.eventName}
                                      value={filteredEvents.filter(ev => item.allocatedEvents?.includes(ev._id))}
                                      onChange={(_, newValue) => handleAllocationChange(item, newValue)}
                                      renderInput={params => (
                                        <TextField 
                                          {...params} 
                                          variant="outlined" 
                                          size="small"
                                          placeholder="Select events..."
                                          sx={{ 
                                            '& .MuiInputBase-root': { 
                                              fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                              padding: { xs: '4px 8px', sm: '8px 12px' }
                                            }
                                          }}
                                        />
                                      )}
                                      renderTags={(value, getTagProps) =>
                                        value.map((option, index) => (
                                          <Chip 
                                            label={option.eventName} 
                                            {...getTagProps({ index })} 
                                            key={option._id}
                                            size="small"
                                            sx={{ height: { xs: 20, sm: 24 }, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                                          />
                                        ))
                                      }
                                      disableCloseOnSelect
                                    />
                                  ) : (
                                    <Box display="flex" flexWrap="wrap" gap={0.25}>
                                      {filteredEvents.filter(ev => item.allocatedEvents?.includes(ev._id)).map(ev => (
                                        <Chip key={ev._id} label={ev.eventName} size="small" sx={{ height: { xs: 20, sm: 24 }, fontSize: { xs: '0.65rem', sm: '0.75rem' } }} />
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                  </Grid>
                )}
              </>
            ) : (
              /* Desktop Table Layout */
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
                          Category
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
                      {/* <TableCell>Current Inventory</TableCell> */} {/* Hidden - calculated field that's confusing to staff */}
                      <TableCell>Post Event Count</TableCell>
                      <TableCell>Allocated Events</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAndSortedInventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canModifyInventory ? 12 : 11} align="center">
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
                                <TextField
                                  type="number"
                                  size="small"
                                  inputProps={{ min: 0, style: { width: 70, padding: '4px 8px' } }}
                                  value={editValuesMap[item._id]?.qtyBeforeEvent ?? (item.qtyBeforeEvent || item.qtyOnSite || 0)}
                                  onChange={e => handleEditValueChange(item._id, 'qtyBeforeEvent', e.target.value)}
                                />
                              ) : (
                                item.qtyBeforeEvent || item.qtyOnSite || 0
                              )}
                            </TableCell>
                            {/* <TableCell>{item.currentInventory}</TableCell> */} {/* Hidden - calculated field that's confusing to staff */}
                            <TableCell>
                              {isEditMode ? (
                                <TextField
                                  type="number"
                                  size="small"
                                  inputProps={{ min: 0, style: { width: 70, padding: '4px 8px' } }}
                                  value={editValuesMap[item._id]?.postEventCount ?? (item.postEventCount || 0)}
                                  onChange={e => handleEditValueChange(item._id, 'postEventCount', e.target.value)}
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
            )}

            {/* Mobile-friendly Pagination */}
            {isMobile ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 2, px: 2, width: '100%' }}>
                {/* Navigation Arrows */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', justifyContent: 'center' }}>
                  <IconButton
                    onClick={(e) => handleChangePage(e, page - 1)}
                    disabled={page === 0}
                    aria-label="previous page"
                    size="small"
                  >
                    <KeyboardArrowLeft />
                  </IconButton>
                  <Typography variant="body2" sx={{ minWidth: '120px', textAlign: 'center' }}>
                    Page {page + 1} of {Math.ceil(filteredAndSortedInventory.length / rowsPerPage) || 1}
                  </Typography>
                  <IconButton
                    onClick={(e) => handleChangePage(e, page + 1)}
                    disabled={page >= Math.ceil(filteredAndSortedInventory.length / rowsPerPage) - 1}
                    aria-label="next page"
                    size="small"
                  >
                    <KeyboardArrowRight />
                  </IconButton>
                </Box>
                {/* Rows per page selector */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Typography variant="body2">Show:</Typography>
                  <Select
                    value={rowsPerPage}
                    onChange={(e) => handleChangeRowsPerPage(e)}
                    size="small"
                    sx={{ minWidth: 80 }}
                  >
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                  </Select>
                  <Typography variant="body2">per page</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {filteredAndSortedInventory.length} total items
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <TablePagination
                  component="div"
                  count={filteredAndSortedInventory.length}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[10, 25, 50]}
                  labelRowsPerPage="Inventory per page"
                />
              </Box>
            )}
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
            minWidth: isMobile ? 'auto' : 500,
            maxWidth: isMobile ? '100%' : 600,
            margin: isMobile ? 1 : 'auto'
          }
        }}
      >
        <DialogTitle>Add Inventory Item</DialogTitle>
        <DialogContent>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
            gap: 2, 
            mt: 2 
          }}>
            {/* Category Dropdown with Add New Option */}
            <FormControl fullWidth required>
              <InputLabel>Category *</InputLabel>
              {!showTypeInput ? (
                <Select
                  value={newItem.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  label="Category *"
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        zIndex: 9999
                      }
                    }
                  }}
                >
                  <MenuItem value="">
                    <em>Select Category</em>
                  </MenuItem>
                  {allAvailableTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                  <MenuItem value="__add_new__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
                    + Add New Category
                  </MenuItem>
                </Select>
              ) : (
                <TextField
                  label="Category *"
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
            minWidth: isMobile ? 'auto' : 500,
            maxWidth: isMobile ? '100%' : 600,
            margin: isMobile ? 1 : 'auto'
          }
        }}
      >
        <DialogTitle>Edit Inventory Item</DialogTitle>
        <DialogContent>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
            gap: 2, 
            mt: 2 
          }}>
            {/* Category Dropdown with Add New Option */}
            <FormControl fullWidth required>
              <InputLabel>Category *</InputLabel>
              {!showEditTypeInput ? (
                <Select
                  value={editItem.type}
                  onChange={(e) => handleEditTypeChange(e.target.value)}
                  label="Category *"
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        zIndex: 9999
                      }
                    }
                  }}
                >
                  <MenuItem value="">
                    <em>Select Category</em>
                  </MenuItem>
                  {allAvailableTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                  <MenuItem value="__add_new__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
                    + Add New Category
                  </MenuItem>
                </Select>
              ) : (
                <TextField
                  label="Category *"
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