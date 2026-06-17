import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { sortSizeValues } from '../../utils/sizeSort';
import {
  buildPickupFieldOrder,
  getLockedProduct,
  PICKUP_VARIANT_FIELDS,
} from '../../utils/pickupFieldPreferences';

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

// Maps a pickup field name to the corresponding inventory item property.
const FIELD_TO_ITEM_KEY = {
  type: 'type',
  brand: 'style',
  product: 'product',
  gender: 'gender',
  size: 'size',
  color: 'color'
};

const formatSelectedGiftLabel = (item) => {
  if (!item) return 'Unknown gift';
  const parts = [
    item.product,
    item.style,
    item.gender ? formatGenderLabel(item.gender) : null,
    item.color,
    item.size ? `Size ${item.size}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : item.type || 'Gift';
};

const emptySelections = () => ({
  type: '',
  brand: '',
  product: '',
  gender: '',
  size: '',
  color: '',
});

const HierarchicalInventorySelector = ({
  inventory,
  value,
  onChange,
  stationPrefs,
  requireRemoveToChange = false,
}) => {
  const [selections, setSelections] = useState(emptySelections);
  const lastHydratedValueRef = useRef(undefined);

  // Items still matching every selection made so far, regardless of which fields are
  // currently displayed — used to figure out which product's overrides apply.
  const candidateItems = useMemo(() => {
    return inventory.filter((item) =>
      Object.entries(FIELD_TO_ITEM_KEY).every(([field, itemKey]) => {
        const selectedValue = selections[field] || '';
        const itemValue = item[itemKey] || '';
        return selectedValue === '' || selectedValue === itemValue;
      })
    );
  }, [inventory, selections]);

  const lockedProduct = useMemo(
    () => getLockedProduct(candidateItems, selections),
    [candidateItems, selections]
  );

  const fieldOrder = useMemo(
    () => buildPickupFieldOrder(stationPrefs, {
      lockedProduct,
      candidateItems,
    }),
    [stationPrefs, lockedProduct, candidateItems]
  );

  // Only clear variant fields when overrides change which fields are shown.
  // Keep hidden identifier selections (brand, etc.) so narrowing still works.
  useEffect(() => {
    setSelections((prev) => {
      let changed = false;
      const next = { ...prev };
      PICKUP_VARIANT_FIELDS.forEach((field) => {
        if (next[field] && !fieldOrder.includes(field)) {
          next[field] = '';
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [fieldOrder]);

  // Hydrate pill selections when value is set from outside (e.g. opening modify dialog).
  // Only re-hydrate when value actually changes — not on every render while the user
  // is editing intermediate fields, which would undo in-progress changes.
  useEffect(() => {
    if (!value) {
      lastHydratedValueRef.current = value;
      return;
    }
    if (inventory.length === 0) return;
    if (value === lastHydratedValueRef.current) return;

    const selectedItem = inventory.find((item) => item._id === value);
    if (!selectedItem) return;

    setSelections({
      type: selectedItem.type || '',
      brand: selectedItem.style || '',
      product: selectedItem.product || '',
      gender: selectedItem.gender || '',
      size: selectedItem.size || '',
      color: selectedItem.color || '',
    });
    lastHydratedValueRef.current = value;
  }, [value, inventory]);

  // Options for a field are based only on prior picks in the flow — never the current
  // field's selection, so all choices stay visible and the user can change their mind.
  const getItemsForLevelOptions = (level) =>
    inventory.filter((item) =>
      fieldOrder.slice(0, level).every((f, idx) => {
        const fieldName = f === 'brand' ? 'style' : f;
        const itemValue = item[fieldName] || '';
        const selectedValue = selections[fieldOrder[idx]] || '';
        return selectedValue === '' || selectedValue === itemValue;
      })
    );

  const getUniqueValuesForLevel = (level) => {
    if (level >= fieldOrder.length) return [];

    const field = fieldOrder[level];
    const values = new Set();

    getItemsForLevelOptions(level).forEach((item) => {
      const fieldName = field === 'brand' ? 'style' : field;
      const itemValue = item[fieldName] || '';
      if (itemValue) values.add(itemValue);
    });

    return sortFieldValues(field, Array.from(values));
  };

  const getFilteredInventoryForSelections = (sel) =>
    inventory.filter((item) =>
      Object.entries(FIELD_TO_ITEM_KEY).every(([field, itemKey]) => {
        const selectedValue = sel[field] || '';
        const itemValue = item[itemKey] || '';
        return selectedValue === '' || selectedValue === itemValue;
      })
    );

  const commitSelectionIfUnique = (sel, order) => {
    if (!onChange) return;

    const matchingItems = getFilteredInventoryForSelections(sel);

    // No visible fields (e.g. product override with all options off) — commit when unique.
    if (!order.length) {
      if (matchingItems.length === 1) {
        const nextId = matchingItems[0]._id;
        if (value !== nextId) onChange(nextId);
      } else if (value) {
        onChange('');
      }
      return;
    }

    if (!order.every((f) => sel[f])) {
      if (value) onChange('');
      return;
    }

    if (matchingItems.length === 1) {
      const nextId = matchingItems[0]._id;
      if (value !== nextId) onChange(nextId);
    } else if (value) {
      onChange('');
    }
  };

  const handleLevelChange = (level, newValue) => {
    const field = fieldOrder[level];
    const updatedSelections = { ...selections };
    updatedSelections[field] = newValue;

    const currentIndex = fieldOrder.indexOf(field);
    fieldOrder.slice(currentIndex + 1).forEach((f) => {
      updatedSelections[f] = '';
    });

    setSelections(updatedSelections);
    commitSelectionIfUnique(updatedSelections, fieldOrder);
  };

  // Re-evaluate commit when field list or selections change (e.g. override with no visible fields).
  useEffect(() => {
    commitSelectionIfUnique(selections, fieldOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldOrder, selections]);

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

  const handleClearCommittedSelection = () => {
    setSelections(emptySelections());
    lastHydratedValueRef.current = '';
    onChange?.('');
  };

  if (requireRemoveToChange && value) {
    const selectedItem = inventory.find((item) => item._id === value);
    return (
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: 1.5,
          bgcolor: 'grey.50',
        }}
      >
        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
          Current gift
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {formatSelectedGiftLabel(selectedItem)}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={handleClearCommittedSelection}
          sx={{ textTransform: 'none' }}
        >
          Change gift
        </Button>
      </Box>
    );
  }

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
    if (inventory.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No inventory available
        </Typography>
      );
    }
    if (candidateItems.length === 1) {
      const item = candidateItems[0];
      const label = [item.product, item.style, item.color].filter(Boolean).join(' — ');
      return (
        <Typography variant="body2" color="text.secondary">
          {value ? `Selected: ${label}` : `Confirming: ${label}`}
        </Typography>
      );
    }
    return (
      <Box>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
          Select a gift
        </Typography>
        {renderGiftButtons()}
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
