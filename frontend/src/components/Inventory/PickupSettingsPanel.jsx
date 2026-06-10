import React from 'react';
import {
  Box,
  Typography,
  Checkbox,
  Button,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import {
  PICKUP_FIELD_LABELS,
  getEnabledPickupFieldLabels,
  mergePickupFieldPreferences,
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
}) => {
  const prefs = mergePickupFieldPreferences(preferences);
  const enabledLabels = getEnabledPickupFieldLabels(prefs);

  const handleToggle = (field) => {
    if (readOnly || !onPreferencesChange) return;
    onPreferencesChange({ ...prefs, [field]: !prefs[field] });
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
