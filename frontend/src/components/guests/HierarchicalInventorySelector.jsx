import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { sortSizeValues } from '../../utils/sizeSort';
import {
  buildPickupFieldOrder,
  getLockedProduct,
  getFieldsEnabledSomewhere,
  canAutoCommitMatchingItems,
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

const idsEqual = (a, b) => String(a ?? '') === String(b ?? '');

const HierarchicalInventorySelector = ({
  inventory,
  value,
  onChange,
  stationPrefs,
  pickupFieldPreferences,
  requireRemoveToChange = false,
}) => {
  // Prefer full station prefs (defaults + product overrides). Fall back to flat prefs
  // for any callers that still pass pickupFieldPreferences only.
  const effectiveStationPrefs = stationPrefs
    || (pickupFieldPreferences ? { pickupFieldPreferences } : null);

  const [selections, setSelections] = useState(emptySelections);
  const lastHydratedValueRef = useRef(undefined);

  const enabledFields = useMemo(
    () => getFieldsEnabledSomewhere(effectiveStationPrefs),
    [effectiveStationPrefs]
  );

  // Narrow only by fields that are actually enabled in station defaults or overrides.
  // Unchecked fields (e.g. type/Category) must never filter candidates — a stale type
  // from a prior Tumi pick was emptying the list and resurfacing Category in the fallback.
  const candidateItems = useMemo(() => {
    return inventory.filter((item) =>
      enabledFields.every((field) => {
        const itemKey = FIELD_TO_ITEM_KEY[field];
        const selectedValue = selections[field] || '';
        const itemValue = item[itemKey] || '';
        return selectedValue === '' || selectedValue === itemValue;
      })
    );
  }, [inventory, selections, enabledFields]);

  const lockedProduct = useMemo(
    () => getLockedProduct(candidateItems, selections),
    [candidateItems, selections]
  );

  const fieldOrder = useMemo(
    () => buildPickupFieldOrder(effectiveStationPrefs, {
      lockedProduct,
      candidateItems,
      inventory,
      selections,
    }),
    [effectiveStationPrefs, lockedProduct, candidateItems, inventory, selections]
  );

  // Only clear variant fields (color/size) that are no longer shown. Identifier
  // selections (brand/product/gender) are cleared when the user changes an earlier
  // field via handleLevelChange.
  useEffect(() => {
    setSelections((prev) => {
      let changed = false;
      const next = { ...prev };
      ['color', 'size'].forEach((field) => {
        if (next[field] && !fieldOrder.includes(field)) {
          next[field] = '';
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [fieldOrder]);

  // Hydrate fields from station defaults AND currently visible fieldOrder.
  // Station-defaults-only broke Tumi overrides (product cleared after commit).
  // resolvePickupPrefs-only resurfaced Greyson override fields after brand-only commit.
  useEffect(() => {
    if (!value) {
      lastHydratedValueRef.current = value;
      return;
    }
    if (inventory.length === 0) return;
    if (idsEqual(value, lastHydratedValueRef.current)) return;

    const selectedItem = inventory.find((item) => idsEqual(item._id, value));
    if (!selectedItem) return;

    const stationDefaults = {
      type: false,
      brand: false,
      product: false,
      size: false,
      gender: false,
      color: false,
      ...(effectiveStationPrefs?.pickupFieldPreferences &&
      typeof effectiveStationPrefs.pickupFieldPreferences === 'object'
        ? effectiveStationPrefs.pickupFieldPreferences
        : {}),
    };
    const shouldHydrate = (field) =>
      !!(stationDefaults[field] || fieldOrder.includes(field));

    setSelections({
      type: shouldHydrate('type') ? (selectedItem.type || '') : '',
      brand: shouldHydrate('brand') ? (selectedItem.style || '') : '',
      product: shouldHydrate('product') ? (selectedItem.product || '') : '',
      gender: shouldHydrate('gender') ? (selectedItem.gender || '') : '',
      size: shouldHydrate('size') ? (selectedItem.size || '') : '',
      color: shouldHydrate('color') ? (selectedItem.color || '') : '',
    });
    lastHydratedValueRef.current = value;
  }, [value, inventory, effectiveStationPrefs, fieldOrder]);

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

  // Narrow inventory using only fields that are currently visible in the flow.
  const getFilteredInventoryForSelections = (sel, order = fieldOrder) =>
    inventory.filter((item) =>
      order.every((field) => {
        const itemKey = FIELD_TO_ITEM_KEY[field];
        const selectedValue = sel[field] || '';
        const itemValue = item[itemKey] || '';
        return selectedValue === '' || selectedValue === itemValue;
      })
    );

  // When brand-only prefs leave multiple SKUs (Greyson), commit one matching row.
  // When overrides still require Product (Tumi), wait — do not auto-pick the first SKU.
  const pickCommittedItem = (matchingItems) =>
    matchingItems.length ? matchingItems[0] : null;

  const commitSelectionIfReady = (sel, order) => {
    if (!onChange) return;

    const matchingItems = getFilteredInventoryForSelections(sel, order);

    // No visible fields — only auto-commit when a single item remains (gift buttons otherwise).
    if (!order.length) {
      if (matchingItems.length === 1) {
        const nextId = matchingItems[0]._id;
        if (!idsEqual(value, nextId)) onChange(nextId);
      } else if (value) {
        onChange('');
      }
      return;
    }

    if (!order.every((f) => sel[f])) {
      if (value) onChange('');
      return;
    }

    if (!canAutoCommitMatchingItems(matchingItems, effectiveStationPrefs, sel)) {
      if (value) onChange('');
      return;
    }

    const item = pickCommittedItem(matchingItems);
    if (item) {
      if (!idsEqual(value, item._id)) onChange(item._id);
    } else if (value) {
      onChange('');
    }
  };

  const handleLevelChange = (level, newValue) => {
    const field = fieldOrder[level];
    const updatedSelections = { ...selections };
    updatedSelections[field] = newValue;

    // Keep only this field and earlier visible fields. Clears hidden stale values
    // (type) and later picks (product) when switching brand.
    const keep = new Set(fieldOrder.slice(0, level + 1));
    Object.keys(FIELD_TO_ITEM_KEY).forEach((f) => {
      if (!keep.has(f)) updatedSelections[f] = '';
    });

    setSelections(updatedSelections);
    commitSelectionIfReady(updatedSelections, fieldOrder);
  };

  // Re-evaluate commit when field list or selections change.
  useEffect(() => {
    commitSelectionIfReady(selections, fieldOrder);
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
    const selectedItem = inventory.find((item) => idsEqual(item._id, value));
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

  const renderCommittedSelection = (selectedItem, { showChangeButton = true } = {}) => (
    <Box
      sx={{
        border: '1px solid',
        borderColor: value ? 'primary.light' : 'divider',
        borderRadius: 1,
        p: 1.5,
        mb: fieldOrder.length > 0 ? 2 : 0,
        bgcolor: value ? 'rgba(25, 118, 210, 0.06)' : 'grey.50',
      }}
    >
      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
        {value ? 'Selected gift' : 'Confirming gift'}
      </Typography>
      <Typography variant="body2" sx={{ mb: showChangeButton ? 1.5 : 0 }}>
        {formatSelectedGiftLabel(selectedItem)}
      </Typography>
      {showChangeButton && (
        <Button
          variant="outlined"
          size="small"
          onClick={handleClearCommittedSelection}
          sx={{ textTransform: 'none' }}
        >
          Change gift
        </Button>
      )}
    </Box>
  );

  const renderFieldPills = () => (
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

  const renderGiftButtons = () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {inventory.map((item) => {
        const selected = idsEqual(value, item._id);
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
      return renderCommittedSelection(item);
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

  const selectedItem = value ? inventory.find((item) => idsEqual(item._id, value)) : null;

  return (
    <Box>
      {renderFieldPills()}
      {selectedItem && (
        <Button
          variant="text"
          size="small"
          onClick={handleClearCommittedSelection}
          sx={{ textTransform: 'none', mt: 0.5, px: 0 }}
        >
          Change gift
        </Button>
      )}
    </Box>
  );
};

export default HierarchicalInventorySelector;
