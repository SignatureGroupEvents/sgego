import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import {
  INVENTORY_FILTER_FIELDS,
  INVENTORY_SORT_FIELDS,
  MAX_SORT_LEVELS,
  getCascadingFilterOptions,
  countActiveInventoryFilters,
  getActiveFilterChips,
  formatFilterValueLabel,
} from '../../utils/inventoryFilters';

const filterSectionSx = {
  mt: 2,
  borderRadius: 2,
  backgroundColor: '#f5f6f7',
  border: '1px solid #e0e0e0',
  overflow: 'hidden',
};

const InventoryFilterBar = ({
  inventory,
  searchQuery,
  onSearchQueryChange,
  columnFilters,
  onColumnFiltersChange,
  sortLevels,
  onSortLevelsChange,
  onClearAll,
  isMobile = false,
  filtersExpanded = false,
  onFiltersExpandedChange,
  genderLabels = {},
}) => {
  const activeSectionCount = countActiveInventoryFilters({
    searchQuery: '',
    columnFilters,
    sortLevels,
  });
  const activeChips = getActiveFilterChips(columnFilters, genderLabels);

  const handleColumnFilterChange = (fieldKey, values) => {
    onColumnFiltersChange({
      ...columnFilters,
      [fieldKey]: values,
    });
  };

  const handleRemoveChip = (chip) => {
    onColumnFiltersChange({
      ...columnFilters,
      [chip.fieldKey]: (columnFilters[chip.fieldKey] || []).filter((value) => value !== chip.value),
    });
  };

  const handleSortFieldChange = (index, field) => {
    const next = [...sortLevels];
    next[index] = { ...next[index], field };
    onSortLevelsChange(next);
  };

  const handleSortDirectionChange = (index, direction) => {
    const next = [...sortLevels];
    next[index] = { ...next[index], direction };
    onSortLevelsChange(next);
  };

  const handleAddSortLevel = () => {
    if (sortLevels.length >= MAX_SORT_LEVELS) return;
    const usedFields = new Set(sortLevels.map((level) => level.field));
    const nextField =
      INVENTORY_SORT_FIELDS.find((field) => !usedFields.has(field.key))?.key || 'style';
    onSortLevelsChange([...sortLevels, { field: nextField, direction: 'asc' }]);
  };

  const handleRemoveSortLevel = (index) => {
    if (sortLevels.length <= 1) return;
    onSortLevelsChange(sortLevels.filter((_, i) => i !== index));
  };

  const renderColumnFilter = (field) => {
    const options = getCascadingFilterOptions(inventory, field.key, {
      searchQuery,
      columnFilters,
    });

    return (
      <Autocomplete
        key={field.key}
        multiple
        size="small"
        options={options}
        value={columnFilters[field.key] || []}
        onChange={(_, values) => handleColumnFilterChange(field.key, values)}
        getOptionLabel={(option) => formatFilterValueLabel(field.key, option, genderLabels)}
        renderInput={(params) => (
          <TextField {...params} label={field.label} placeholder={`All ${field.label}s`} />
        )}
        limitTags={1}
        disableCloseOnSelect
      />
    );
  };

  const renderColumnFilters = () => (
    <Box>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
        Column filters
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Select multiple values per column. Options update based on your other filters.
      </Typography>
      <Grid container spacing={2}>
        {INVENTORY_FILTER_FIELDS.map((field) => (
          <Grid key={field.key} size={{ xs: 12, sm: 6, md: 4 }}>
            {renderColumnFilter(field)}
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderSortControls = () => (
    <Box>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
        Sort order
      </Typography>
      {sortLevels.map((level, index) => (
        <Box
          key={`${level.field}-${index}`}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1,
            flexWrap: 'wrap',
          }}
        >
          {index > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>
              then
            </Typography>
          )}
          <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150, flex: isMobile ? 1 : 'none' }}>
            <InputLabel>{index === 0 ? 'Sort by' : 'Then by'}</InputLabel>
            <Select
              value={level.field}
              label={index === 0 ? 'Sort by' : 'Then by'}
              onChange={(e) => handleSortFieldChange(index, e.target.value)}
            >
              {INVENTORY_SORT_FIELDS.map((field) => (
                <MenuItem key={field.key} value={field.key}>
                  {field.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>Order</InputLabel>
            <Select
              value={level.direction}
              label="Order"
              onChange={(e) => handleSortDirectionChange(index, e.target.value)}
            >
              <MenuItem value="asc">Ascending</MenuItem>
              <MenuItem value="desc">Descending</MenuItem>
            </Select>
          </FormControl>
          {index > 0 && (
            <IconButton
              size="small"
              color="error"
              onClick={() => handleRemoveSortLevel(index)}
              aria-label={`Remove sort level ${index + 1}`}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ))}
      {sortLevels.length < MAX_SORT_LEVELS && (
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAddSortLevel}
          sx={{ textTransform: 'none', mt: 0.5 }}
        >
          Add sort level
        </Button>
      )}
    </Box>
  );

  const renderFilterSectionBody = () => (
    <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
      {renderColumnFilters()}
      <Divider sx={{ my: 2.5 }} />
      {renderSortControls()}
      <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={onClearAll}
          startIcon={<ClearIcon />}
          fullWidth={isMobile}
        >
          Clear all filters & sort
        </Button>
      </Box>
    </Box>
  );

  const renderFilterSectionHeader = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <FilterIcon color="action" />
      <Typography fontWeight={600}>Filters & sort</Typography>
      {activeSectionCount > 0 && (
        <Chip label={activeSectionCount} size="small" color="primary" sx={{ height: 20, minWidth: 20 }} />
      )}
    </Box>
  );

  return (
    <Box mb={2}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search inventory..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
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
                onClick={() => onSearchQueryChange('')}
                sx={{ minWidth: 'auto', p: 0.5 }}
              >
                <ClearIcon fontSize="small" />
              </Button>
            </InputAdornment>
          ),
        }}
      />

      {(activeChips.length > 0 || searchQuery) && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
          {activeChips.map((chip) => (
            <Chip
              key={`${chip.fieldKey}-${chip.value}`}
              label={chip.label}
              size="small"
              onDelete={() => handleRemoveChip(chip)}
            />
          ))}
          {searchQuery && (
            <Chip
              label={`Search: ${searchQuery}`}
              size="small"
              onDelete={() => onSearchQueryChange('')}
            />
          )}
        </Box>
      )}

      <Box sx={filterSectionSx}>
        {isMobile ? (
          <Accordion
            expanded={filtersExpanded}
            onChange={() => onFiltersExpandedChange?.(!filtersExpanded)}
            disableGutters
            elevation={0}
            sx={{
              backgroundColor: 'transparent',
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                px: 2,
                minHeight: 52,
                '&.Mui-expanded': { minHeight: 52 },
              }}
            >
              {renderFilterSectionHeader()}
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0, pt: 0 }}>
              {renderFilterSectionBody()}
            </AccordionDetails>
          </Accordion>
        ) : (
          <>
            <Box
              sx={{
                px: 2.5,
                py: 1.5,
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: '#eef0f2',
              }}
            >
              {renderFilterSectionHeader()}
            </Box>
            {renderFilterSectionBody()}
          </>
        )}
      </Box>
    </Box>
  );
};

export default InventoryFilterBar;
