import React, { useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { sortSizeValues } from '../../utils/sizeSort';
import { mergePickupFieldPreferences } from '../../utils/pickupFieldPreferences';

const COLOR_MAP = {
  navy: '#1a2744',
  white: '#ffffff',
  black: '#1a1a1a',
  pink: '#e8a0b4',
  red: '#c62828',
  blue: '#1565c0',
  green: '#2e7d32',
  grey: '#9e9e9e',
  gray: '#9e9e9e',
  beige: '#d4c4a8',
  brown: '#6d4c2a',
  tan: '#d2b48c',
  gold: '#c9a227',
  yellow: '#f9a825',
  orange: '#ef6c00',
  purple: '#7b1fa2',
  cream: '#fffdd0',
  ivory: '#fffff0',
  charcoal: '#36454f',
  silver: '#c0c0c0',
};

const FIELD_LABELS = {
  type: 'Category',
  brand: 'Brand',
  product: 'Product',
  gender: 'Gender',
  color: 'Color',
  size: 'Size',
};

const resolveColorSwatch = (name) => {
  const key = (name || '').toLowerCase().trim();
  if (COLOR_MAP[key]) {
    return { color: COLOR_MAP[key], needsBorder: key === 'white' || key === 'cream' || key === 'ivory' };
  }
  const partial = Object.entries(COLOR_MAP).find(([k]) => key.includes(k));
  if (partial) {
    return { color: partial[1], needsBorder: partial[0] === 'white' || partial[0] === 'cream' };
  }
  return { color: '#bdbdbd', needsBorder: false };
};

const formatGenderLabel = (value) => {
  if (value === 'M') return "Men's";
  if (value === 'W') return "Women's";
  if (value === 'N/A') return 'N/A';
  return value;
};

const formatDisplayValue = (field, value) => {
  if (field === 'gender') return formatGenderLabel(value);
  return value;
};

const GENDER_ORDER = { M: 0, W: 1, 'N/A': 2 };

const sortFieldValues = (field, values) => {
  if (field === 'size') return sortSizeValues(values);
  if (field === 'gender') {
    return [...values].sort((a, b) => {
      const rankA = GENDER_ORDER[a] ?? 99;
      const rankB = GENDER_ORDER[b] ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      return String(a).localeCompare(String(b));
    });
  }
  return [...values].sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
};

const HierarchicalInventorySelector = ({ inventory, value, onChange, pickupFieldPreferences, stationPrefs }) => {
  const getDefaultPreferences = () => ({
    type: false,
    brand: true,
    product: false,
    size: false,
    gender: false,
    color: false
  });

  const prefs = pickupFieldPreferences
    || mergePickupFieldPreferences(stationPrefs?.pickupFieldPreferences)
    || getDefaultPreferences();

  const fieldOrder = [];
  if (prefs.type) fieldOrder.push('type');
  if (prefs.brand) fieldOrder.push('brand');
  if (prefs.gender) fieldOrder.push('gender');
  if (prefs.product) fieldOrder.push('product');
  if (prefs.color) fieldOrder.push('color');
  if (prefs.size) fieldOrder.push('size');

  const [selections, setSelections] = useState({
    type: '',
    brand: '',
    product: '',
    gender: '',
    size: '',
    color: ''
  });

  useEffect(() => {
    if (!value || inventory.length === 0) return;

    const selectedItem = inventory.find((item) => String(item._id) === String(value));
    if (!selectedItem) return;

    setSelections({
      type: selectedItem.type || '',
      brand: selectedItem.style || '',
      product: selectedItem.product || '',
      gender: selectedItem.gender || '',
      size: selectedItem.size || '',
      color: selectedItem.color || ''
    });
  }, [value, inventory]);

  const getUniqueValuesForLevel = (level) => {
    if (level >= fieldOrder.length) return [];

    const field = fieldOrder[level];
    const values = new Set();

    const filtered = inventory.filter((item) =>
      fieldOrder.slice(0, level).every((f, idx) => {
        const fieldName = f === 'brand' ? 'style' : f;
        const itemValue = item[fieldName] || '';
        const selectedValue = selections[fieldOrder[idx]] || '';
        return selectedValue === '' || selectedValue === itemValue;
      })
    );

    filtered.forEach((item) => {
      const fieldName = field === 'brand' ? 'style' : field;
      const itemValue = item[fieldName] || '';
      if (itemValue) values.add(itemValue);
    });

    return sortFieldValues(field, Array.from(values));
  };

  const getFilteredInventoryForSelections = (sel) =>
    inventory.filter((item) =>
      fieldOrder.every((field) => {
        const fieldName = field === 'brand' ? 'style' : field;
        const itemValue = item[fieldName] || '';
        const selectedValue = sel[field] || '';
        return selectedValue === '' || selectedValue === itemValue;
      })
    );

  const handleLevelChange = (level, newValue) => {
    const field = fieldOrder[level];
    const updatedSelections = { ...selections };
    updatedSelections[field] = newValue;

    const currentIndex = fieldOrder.indexOf(field);
    fieldOrder.slice(currentIndex + 1).forEach((f) => {
      updatedSelections[f] = '';
    });

    setSelections(updatedSelections);

    const allSelected = fieldOrder.every((f) => updatedSelections[f]);
    if (allSelected) {
      const matchingItems = getFilteredInventoryForSelections(updatedSelections);
      if (matchingItems.length >= 1) {
        if (onChange) onChange(matchingItems[0]._id);
      } else if (onChange) {
        onChange('');
      }
    } else if (onChange && value) {
      onChange('');
    }
  };

  const pillButtonSx = (selected, compact = false) => ({
    borderRadius: compact ? '8px' : '20px',
    px: compact ? 1.25 : 2,
    py: compact ? 0.75 : 1,
    minWidth: compact ? 44 : 'auto',
    height: compact ? 44 : 'auto',
    textTransform: 'none',
    border: '2px solid',
    borderColor: selected ? '#31365E' : '#e0e0e0',
    bgcolor: selected ? '#FFFAF6' : '#fff',
    color: '#31365E',
    fontWeight: selected ? 600 : 400,
    boxShadow: 'none',
    '&:hover': {
      bgcolor: selected ? '#FFFAF6' : '#f7f7f7',
      borderColor: selected ? '#31365E' : '#bdbdbd',
      boxShadow: 'none',
    },
  });

  const renderOptionButton = (field, optionValue, selected, onSelect) => {
    const compact = field === 'size';
    const display = formatDisplayValue(field, optionValue);

    if (field === 'color') {
      const swatch = resolveColorSwatch(optionValue);
      return (
        <Button
          key={optionValue}
          variant="outlined"
          onClick={() => onSelect(optionValue)}
          sx={{
            ...pillButtonSx(selected),
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box
            component="span"
            sx={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              bgcolor: swatch.color,
              border: swatch.needsBorder ? '1px solid #ccc' : 'none',
              flexShrink: 0,
            }}
          />
          {display}
        </Button>
      );
    }

    return (
      <Button
        key={optionValue}
        variant="outlined"
        onClick={() => onSelect(optionValue)}
        sx={pillButtonSx(selected, compact)}
      >
        {display}
      </Button>
    );
  };

  const renderGiftButtons = () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {inventory.map((item) => {
        const selected = value === item._id;
        const label = `${item.style || 'N/A'}${item.size ? ` (${item.size})` : ''}`;
        return (
          <Button
            key={item._id}
            variant="outlined"
            onClick={() => onChange && onChange(item._id)}
            sx={pillButtonSx(selected)}
          >
            {label}
          </Button>
        );
      })}
    </Box>
  );

  if (fieldOrder.length === 0) {
    return (
      <Box>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
          Select a gift
        </Typography>
        {inventory.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No inventory available
          </Typography>
        ) : (
          renderGiftButtons()
        )}
      </Box>
    );
  }

  return (
    <Box>
      {fieldOrder.map((field, level) => {
        const fieldLabel = FIELD_LABELS[field] || field;
        const uniqueValues = getUniqueValuesForLevel(level);
        const currentValue = selections[field] || '';

        const prevField = level > 0 ? fieldOrder[level - 1] : null;
        const prevValue = prevField ? selections[prevField] : null;
        if (level > 0 && prevValue === '') return null;

        if (uniqueValues.length === 0) return null;

        return (
          <Box key={field} sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              {fieldLabel}
              {currentValue ? ` — ${formatDisplayValue(field, currentValue)}` : ''}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {uniqueValues.map((optionValue) =>
                renderOptionButton(
                  field,
                  optionValue,
                  currentValue === optionValue,
                  (val) => handleLevelChange(level, val)
                )
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default HierarchicalInventorySelector;
