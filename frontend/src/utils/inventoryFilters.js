import { compareSizes } from './sizeSort';

export const INVENTORY_FILTER_FIELDS = [
  { key: 'type', label: 'Category', itemKey: 'type' },
  { key: 'style', label: 'Brand', itemKey: 'style' },
  { key: 'product', label: 'Product', itemKey: 'product' },
  { key: 'gender', label: 'Gender', itemKey: 'gender' },
  { key: 'size', label: 'Size', itemKey: 'size' },
  { key: 'color', label: 'Color', itemKey: 'color' },
];

export const INVENTORY_SORT_FIELDS = [
  { key: 'type', label: 'Category' },
  { key: 'style', label: 'Brand' },
  { key: 'product', label: 'Product' },
  { key: 'size', label: 'Size' },
  { key: 'gender', label: 'Gender' },
  { key: 'color', label: 'Color' },
  { key: 'qtyWarehouse', label: 'Qty Warehouse' },
  { key: 'qtyBeforeEvent', label: 'Qty Before Event' },
  { key: 'postEventCount', label: 'Post Event Count' },
];

export const EMPTY_COLUMN_FILTERS = {
  type: [],
  style: [],
  product: [],
  gender: [],
  size: [],
  color: [],
};

export const DEFAULT_SORT_LEVELS = [{ field: 'type', direction: 'asc' }];

export const MAX_SORT_LEVELS = 3;

const getFieldMeta = (fieldKey) =>
  INVENTORY_FILTER_FIELDS.find((field) => field.key === fieldKey);

export const getItemFilterValue = (item, fieldKey) => {
  const meta = getFieldMeta(fieldKey);
  if (!meta) return '';
  const value = item[meta.itemKey];
  return value == null || value === '' ? '' : String(value);
};

export const formatFilterValueLabel = (fieldKey, value, genderLabels = {}) => {
  const display = value === '' ? '(Blank)' : value;
  if (fieldKey === 'gender' && value && genderLabels[value]) {
    return genderLabels[value];
  }
  return display;
};

export const matchesInventorySearch = (item, searchQuery) => {
  if (!searchQuery) return true;
  const query = searchQuery.toLowerCase();
  const haystack = [
    item.type,
    item.style,
    item.product,
    item.size,
    item.color,
    item.gender,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
};

export const matchesColumnFilters = (item, columnFilters, excludeField = null) =>
  Object.entries(columnFilters || {}).every(([fieldKey, selectedValues]) => {
    if (fieldKey === excludeField || !selectedValues?.length) return true;
    return selectedValues.includes(getItemFilterValue(item, fieldKey));
  });

export const getCascadingFilterOptions = (
  inventory,
  fieldKey,
  { searchQuery = '', columnFilters = EMPTY_COLUMN_FILTERS } = {}
) => {
  const values = new Set();
  inventory.forEach((item) => {
    if (!matchesInventorySearch(item, searchQuery)) return;
    if (!matchesColumnFilters(item, columnFilters, fieldKey)) return;
    values.add(getItemFilterValue(item, fieldKey));
  });

  const options = Array.from(values);
  if (fieldKey === 'size') {
    return options.sort((a, b) => compareSizes(a, b));
  }
  return options.sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })
  );
};

export const applyInventoryFilters = (
  inventory,
  { searchQuery = '', columnFilters = EMPTY_COLUMN_FILTERS } = {}
) =>
  inventory.filter(
    (item) =>
      matchesInventorySearch(item, searchQuery) &&
      matchesColumnFilters(item, columnFilters)
  );

const compareFieldValues = (a, b, fieldKey) => {
  if (fieldKey === 'size') return compareSizes(a.size, b.size);
  if (fieldKey === 'qtyWarehouse' || fieldKey === 'qtyBeforeEvent' || fieldKey === 'postEventCount') {
    const aNum = Number(fieldKey === 'qtyBeforeEvent' ? (a.qtyBeforeEvent ?? a.qtyOnSite) : a[fieldKey]) || 0;
    const bNum = Number(fieldKey === 'qtyBeforeEvent' ? (b.qtyBeforeEvent ?? b.qtyOnSite) : b[fieldKey]) || 0;
    return aNum - bNum;
  }

  const aValue = String(
    fieldKey === 'qtyBeforeEvent'
      ? (a.qtyBeforeEvent ?? a.qtyOnSite ?? '')
      : (a[fieldKey] ?? '')
  ).toLowerCase();
  const bValue = String(
    fieldKey === 'qtyBeforeEvent'
      ? (b.qtyBeforeEvent ?? b.qtyOnSite ?? '')
      : (b[fieldKey] ?? '')
  ).toLowerCase();
  return aValue.localeCompare(bValue, undefined, { sensitivity: 'base' });
};

export const applyInventorySort = (items, sortLevels = DEFAULT_SORT_LEVELS) => {
  const levels = sortLevels?.length ? sortLevels : DEFAULT_SORT_LEVELS;
  return [...items].sort((a, b) => {
    for (const level of levels) {
      const cmp = compareFieldValues(a, b, level.field);
      if (cmp !== 0) return level.direction === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
};

export const filterAndSortInventory = (inventory, options) =>
  applyInventorySort(applyInventoryFilters(inventory, options), options.sortLevels);

export const countActiveInventoryFilters = ({
  searchQuery = '',
  columnFilters = EMPTY_COLUMN_FILTERS,
  sortLevels = DEFAULT_SORT_LEVELS,
} = {}) => {
  let count = 0;
  if (searchQuery) count += 1;
  Object.values(columnFilters).forEach((values) => {
    if (values?.length) count += 1;
  });
  const defaultSort = DEFAULT_SORT_LEVELS[0];
  const primarySort = sortLevels?.[0] || defaultSort;
  if (
    sortLevels?.length > 1 ||
    primarySort.field !== defaultSort.field ||
    primarySort.direction !== defaultSort.direction
  ) {
    count += 1;
  }
  return count;
};

export const getActiveFilterChips = (columnFilters, genderLabels = {}) => {
  const chips = [];
  INVENTORY_FILTER_FIELDS.forEach(({ key, label }) => {
    (columnFilters[key] || []).forEach((value) => {
      chips.push({
        fieldKey: key,
        fieldLabel: label,
        value,
        label: `${label}: ${formatFilterValueLabel(key, value, genderLabels)}`,
      });
    });
  });
  return chips;
};

export const toggleHeaderSort = (sortLevels, column) => {
  const levels = sortLevels?.length ? [...sortLevels] : [...DEFAULT_SORT_LEVELS];
  const existingIndex = levels.findIndex((level) => level.field === column);

  if (existingIndex === 0) {
    levels[0] = {
      field: column,
      direction: levels[0].direction === 'asc' ? 'desc' : 'asc',
    };
    return levels;
  }

  if (existingIndex > 0) {
    const [existing] = levels.splice(existingIndex, 1);
    levels.unshift(existing);
    return levels;
  }

  levels.unshift({ field: column, direction: 'asc' });
  return levels.slice(0, MAX_SORT_LEVELS);
};
