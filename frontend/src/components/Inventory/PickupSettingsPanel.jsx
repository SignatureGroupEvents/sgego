import React, { useState } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  Button,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  TextField,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import {
  PICKUP_FIELD_LABELS,
  getEnabledPickupFieldLabels,
  mergePickupFieldPreferences,
  buildProductOverrideOptions,
  formatProductOverrideLabel,
} from '../../utils/pickupFieldPreferences';

const PickupSettingsPanel = ({
  title,
  subtitle,
  preferences,
  onPreferencesChange,
  onSave,
  saving = false,
  readOnly = false,
  showSummaryChips = false,
  saveLabel = 'Save Settings',
  inventoryItems = [],
  overrides = {},
  onOverridesChange,
}) => {
  const prefs = mergePickupFieldPreferences(preferences);
  const enabledLabels = getEnabledPickupFieldLabels(prefs);
  const [addProductValue, setAddProductValue] = useState(null);

  const handleToggle = (field) => {
    if (readOnly || !onPreferencesChange) return;
    onPreferencesChange({ ...prefs, [field]: !prefs[field] });
  };

  const overrideProducts = Object.keys(overrides || {});

  const availableProductOptions = React.useMemo(
    () => buildProductOverrideOptions(inventoryItems, overrideProducts),
    [inventoryItems, overrideProducts]
  );

  const handleOverrideToggle = (product, field) => {
    if (readOnly || !onOverridesChange) return;
    const current = mergePickupFieldPreferences(overrides[product]);
    onOverridesChange({
      ...overrides,
      [product]: { ...current, [field]: !current[field] },
    });
  };

  const handleRemoveOverride = (product) => {
    if (readOnly || !onOverridesChange) return;
    const next = { ...overrides };
    delete next[product];
    onOverridesChange(next);
  };

  const handleAddOverride = () => {
    if (readOnly || !onOverridesChange || !addProductValue) return;
    onOverridesChange({
      ...overrides,
      [addProductValue.key]: { ...prefs },
    });
    setAddProductValue(null);
  };

  return (
    <Box>
      {title && (
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
      )}
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {subtitle}
        </Typography>
      )}
      {showSummaryChips && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
          {enabledLabels.length > 0 ? (
            enabledLabels.map((label) => (
              <Chip key={label} label={label} size="small" color="primary" variant="outlined" />
            ))
          ) : (
            <Chip label="No fields selected" size="small" variant="outlined" />
          )}
        </Box>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {Object.entries(PICKUP_FIELD_LABELS).map(([field, label]) => (
          <Box key={field} sx={{ display: 'flex', alignItems: 'center' }}>
            <Checkbox
              checked={!!prefs[field]}
              onChange={() => handleToggle(field)}
              disabled={readOnly}
              inputProps={{ 'aria-label': `Show ${label} in pick-up modal` }}
            />
            <Typography>{label}</Typography>
          </Box>
        ))}
      </Box>
      {onOverridesChange && (
        <Accordion sx={{ mt: 2, '&:before': { display: 'none' } }} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography fontWeight={600}>Product overrides</Typography>
              {overrideProducts.length > 0 && (
                <Chip label={overrideProducts.length} size="small" />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Override which fields appear for specific products. Products without an override use the
              station defaults above.
            </Typography>
            {overrideProducts.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No product overrides configured.
              </Typography>
            ) : (
              overrideProducts.map((productKey, index) => {
                const overridePrefs = mergePickupFieldPreferences(overrides[productKey]);
                const productLabel = formatProductOverrideLabel(productKey);
                return (
                  <Box key={productKey}>
                    {index > 0 && <Divider sx={{ my: 1.5 }} />}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography fontWeight={600}>{productLabel}</Typography>
                      {!readOnly && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveOverride(productKey)}
                          aria-label={`Remove override for ${productLabel}`}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      {Object.entries(PICKUP_FIELD_LABELS).map(([field, label]) => (
                        <Box key={field} sx={{ display: 'flex', alignItems: 'center' }}>
                          <Checkbox
                            checked={!!overridePrefs[field]}
                            onChange={() => handleOverrideToggle(productKey, field)}
                            disabled={readOnly}
                            inputProps={{ 'aria-label': `Show ${label} in pick-up modal for ${productLabel}` }}
                          />
                          <Typography>{label}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                );
              })
            )}
            {!readOnly && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <Autocomplete
                  size="small"
                  options={availableProductOptions}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, value) => option.key === value.key}
                  value={addProductValue}
                  onChange={(_, value) => setAddProductValue(value)}
                  renderInput={(params) => (
                    <TextField {...params} label="Product" placeholder="Select a product" />
                  )}
                  sx={{ minWidth: 280 }}
                  disabled={availableProductOptions.length === 0}
                />
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddOverride}
                  disabled={!addProductValue}
                >
                  Add product override
                </Button>
              </Box>
            )}
            {!readOnly && availableProductOptions.length === 0 && overrideProducts.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                No products available for this station.
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>
      )}
      {!readOnly && onSave && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={onSave}
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={saving}
          >
            {saving ? 'Saving...' : saveLabel}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PickupSettingsPanel;
