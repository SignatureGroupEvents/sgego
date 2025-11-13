import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography
} from '@mui/material';

const HierarchicalInventorySelector = ({ inventory, value, onChange, eventName }) => {
  // Get pick-up modal field display preferences from localStorage
  const getPickupFieldPreferences = () => {
    const saved = localStorage.getItem('inventoryPickupFieldPreferences');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { type: false, brand: true, product: false, size: true, gender: false, color: false };
      }
    }
    return { type: false, brand: true, product: false, size: true, gender: false, color: false };
  };

  const prefs = getPickupFieldPreferences();
  
  // Determine the order of fields based on what's selected
  // Order: Type -> Brand -> Gender -> Product -> Color -> Size
  const fieldOrder = [];
  if (prefs.type) fieldOrder.push('type');
  if (prefs.brand) fieldOrder.push('brand');
  if (prefs.gender) fieldOrder.push('gender');
  if (prefs.product) fieldOrder.push('product');
  if (prefs.color) fieldOrder.push('color');
  if (prefs.size) fieldOrder.push('size');

  // State for each level of selection
  const [selections, setSelections] = useState({
    type: '',
    brand: '',
    product: '',
    gender: '',
    size: '',
    color: ''
  });

  // Initialize selections from existing value if provided
  useEffect(() => {
    if (value && inventory.length > 0) {
      const selectedItem = inventory.find(item => item._id === value);
      if (selectedItem) {
        setSelections({
          type: selectedItem.type || '',
          brand: selectedItem.style || '',
          product: selectedItem.product || '',
          gender: selectedItem.gender || '',
          size: selectedItem.size || '',
          color: selectedItem.color || ''
        });
      }
    } else if (!value) {
      // Reset selections when value is cleared
      setSelections({
        type: '',
        brand: '',
        product: '',
        gender: '',
        size: '',
        color: ''
      });
    }
  }, [value, inventory]);

  // Get unique values for a specific level based on current selections
  const getUniqueValuesForLevel = (level) => {
    if (level >= fieldOrder.length) return [];
    
    const field = fieldOrder[level];
    const values = new Set();
    
    // Filter inventory based on previous selections
    const filtered = inventory.filter(item => {
      return fieldOrder.slice(0, level).every((f, idx) => {
        const fieldName = f === 'brand' ? 'style' : f;
        const itemValue = item[fieldName] || '';
        const selectedValue = selections[fieldOrder[idx]] || '';
        return selectedValue === '' || selectedValue === itemValue;
      });
    });
    
    // Get unique values for this level
    filtered.forEach(item => {
      const fieldName = field === 'brand' ? 'style' : field;
      const itemValue = item[fieldName] || '';
      if (itemValue) {
        values.add(itemValue);
      }
    });
    
    return Array.from(values).sort();
  };

  // Handle selection change at a specific level
  const handleLevelChange = (level, newValue) => {
    const field = fieldOrder[level];
    const updatedSelections = { ...selections };
    
    // Update this level
    updatedSelections[field] = newValue;
    
    // Clear all subsequent levels
    const currentIndex = fieldOrder.indexOf(field);
    fieldOrder.slice(currentIndex + 1).forEach(f => {
      updatedSelections[f] = '';
    });
    
    setSelections(updatedSelections);
    
    // If all hierarchical levels are now selected, auto-select matching inventory item
    const allSelected = fieldOrder.every(f => updatedSelections[f]);
    if (allSelected) {
      const matchingItems = getFilteredInventoryForSelections(updatedSelections);
      if (matchingItems.length === 1) {
        // Exactly one match - auto-select it
        if (onChange) onChange(matchingItems[0]._id);
      } else if (matchingItems.length > 1) {
        // Multiple matches - select the first one (or could show a warning)
        if (onChange) onChange(matchingItems[0]._id);
      } else {
        // No matches - clear selection
        if (onChange) onChange('');
      }
    } else {
      // Not all levels selected yet - clear selection
      if (onChange) onChange('');
    }
  };

  // Get filtered inventory based on specific selections
  const getFilteredInventoryForSelections = (sel) => {
    return inventory.filter(item => {
      return fieldOrder.every(field => {
        const fieldName = field === 'brand' ? 'style' : field;
        const itemValue = item[fieldName] || '';
        const selectedValue = sel[field] || '';
        return selectedValue === '' || selectedValue === itemValue;
      });
    });
  };

  // If no fields are selected, show simple dropdown
  if (fieldOrder.length === 0) {
    return (
      <FormControl fullWidth size="small">
        <InputLabel>Select a gift</InputLabel>
        <Select
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          label="Select a gift"
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {inventory.map(item => (
            <MenuItem key={item._id} value={item._id}>
              {item.style || 'N/A'}{item.size ? ` (${item.size})` : ''}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  // Render hierarchical selects
  return (
    <Box>
      {fieldOrder.map((field, level) => {
        const fieldLabel = field === 'brand' ? 'Brand' : 
                          field === 'type' ? 'Category' :
                          field.charAt(0).toUpperCase() + field.slice(1);
        const uniqueValues = getUniqueValuesForLevel(level);
        const currentValue = selections[field] || '';
        
        // Don't show this level if previous required level is not selected
        const prevField = level > 0 ? fieldOrder[level - 1] : null;
        const prevValue = prevField ? selections[prevField] : null;
        if (level > 0 && prevValue === '') {
          return null;
        }
        
        return (
          <FormControl 
            key={field} 
            fullWidth 
            size="small" 
            sx={{ mb: 1 }}
          >
            <InputLabel>{fieldLabel}</InputLabel>
            <Select
              value={currentValue}
              onChange={(e) => handleLevelChange(level, e.target.value)}
              label={fieldLabel}
            >
              <MenuItem value="">
                <em>Select {fieldLabel}</em>
              </MenuItem>
              {uniqueValues.map(val => (
                <MenuItem key={val} value={val}>
                  {val}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      })}
    </Box>
  );
};

export default HierarchicalInventorySelector;

