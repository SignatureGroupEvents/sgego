export const PICKUP_FIELD_LABELS = {
  type: 'Category',
  brand: 'Brand',
  product: 'Product',
  gender: 'Gender',
  color: 'Color',
  size: 'Size',
};

export const getDefaultPickupFieldPreferences = () => ({
  type: false,
  brand: true,
  product: false,
  size: false,
  gender: false,
  color: false,
});

export const mergePickupFieldPreferences = (preferences) => ({
  ...getDefaultPickupFieldPreferences(),
  ...(preferences && typeof preferences === 'object' ? preferences : {}),
});

export const getEnabledPickupFieldLabels = (preferences) =>
  Object.entries(PICKUP_FIELD_LABELS)
    .filter(([key]) => mergePickupFieldPreferences(preferences)[key])
    .map(([, label]) => label);

export const hasPickupGiftSelectionFields = (preferences) => {
  const prefs = mergePickupFieldPreferences(preferences);
  return prefs.type || prefs.brand || prefs.product || prefs.gender || prefs.size || prefs.color;
};

// Canonical display order — gender always comes before product.
export const PICKUP_CANONICAL_FIELD_ORDER = ['type', 'brand', 'gender', 'product', 'color', 'size'];

const IDENTIFIER_FIELDS = ['type', 'brand', 'gender', 'product'];
const VARIANT_FIELDS = ['color', 'size'];

// Mongoose Map fields may arrive as a Map instance before JSON serialization.
export const normalizeProductPickupOverrides = (overrides) => {
  if (!overrides) return {};
  if (overrides instanceof Map) {
    return Object.fromEntries(overrides);
  }
  return typeof overrides === 'object' ? overrides : {};
};

// True when station defaults or any per-product override enable at least one pickup field.
export const stationHasPickupFields = (stationPrefs) => {
  if (hasPickupGiftSelectionFields(stationPrefs?.pickupFieldPreferences)) {
    return true;
  }
  const overrides = normalizeProductPickupOverrides(stationPrefs?.productPickupOverrides);
  return Object.values(overrides).some((override) => hasPickupGiftSelectionFields(override));
};

// Read explicit boolean flags from a prefs object without injecting merge defaults.
const readExplicitPrefs = (preferences) => {
  const result = {
    type: false,
    brand: false,
    product: false,
    gender: false,
    color: false,
    size: false,
  };
  if (!preferences || typeof preferences !== 'object') return result;
  Object.keys(result).forEach((field) => {
    if (typeof preferences[field] === 'boolean') {
      result[field] = preferences[field];
    }
  });
  return result;
};

// Union enabled fields across product overrides (OR logic).
export const unionOverridePrefs = (stationPrefs, productNames) => {
  const overrides = normalizeProductPickupOverrides(stationPrefs?.productPickupOverrides);
  const union = readExplicitPrefs(null);
  (productNames || []).forEach((product) => {
    if (!product || !overrides[product]) return;
    const o = readExplicitPrefs(overrides[product]);
    Object.keys(union).forEach((field) => {
      union[field] = union[field] || o[field];
    });
  });
  return union;
};

// Effective prefs for a product line: per-product override, else station defaults.
export const getEffectivePrefsForProduct = (stationPrefs, productName) => {
  const overrides = normalizeProductPickupOverrides(stationPrefs?.productPickupOverrides);
  const stationDefaults = readExplicitPrefs(stationPrefs?.pickupFieldPreferences);
  if (productName && overrides[productName]) {
    return readExplicitPrefs(overrides[productName]);
  }
  return stationDefaults;
};

export const getEffectivePrefsForItem = (stationPrefs, item) =>
  getEffectivePrefsForProduct(stationPrefs, item?.product);

const itemNeedsField = (stationPrefs, item, field) =>
  getEffectivePrefsForItem(stationPrefs, item)[field];

// Show a field only when remaining inventory rows need it — overrides can suppress
// color/size for one product while another still needs those fields.
const shouldShowField = (stationPrefs, field, candidateItems, lockedProduct) => {
  if (!candidateItems?.length) return false;

  if (lockedProduct) {
    return getEffectivePrefsForProduct(stationPrefs, lockedProduct)[field];
  }

  const needing = candidateItems.filter((item) => itemNeedsField(stationPrefs, item, field));
  if (needing.length === 0) return false;

  const notNeeding = candidateItems.filter((item) => !itemNeedsField(stationPrefs, item, field));
  if (notNeeding.length === 0) return true;

  if (field === 'product') {
    const products = new Set(candidateItems.map((i) => i.product).filter(Boolean));
    return products.size > 1;
  }

  if (field === 'brand' || field === 'type' || field === 'gender') {
    const itemKey = field === 'brand' ? 'style' : field;
    const values = new Set(candidateItems.map((i) => i[itemKey]).filter(Boolean));
    return values.size > 1 && needing.length > 0;
  }

  return false;
};

// Resolve the effective pickup field preferences for a specific inventory item,
// falling back to the station's default preferences when no override exists.
export const resolvePickupPrefs = (item, stationPrefs) => {
  if (!item?.product) {
    return readExplicitPrefs(stationPrefs?.pickupFieldPreferences);
  }
  return getEffectivePrefsForItem(stationPrefs, item);
};

// Product is "locked" once explicitly selected or narrowed to a single product line.
export const getLockedProduct = (candidateItems, selections) => {
  if (selections?.product) return selections.product;
  const products = [...new Set(candidateItems.map((item) => item.product).filter(Boolean))];
  return products.length === 1 ? products[0] : null;
};

// Build which fields to show in the pickup modal.
// Only fields explicitly enabled in settings appear — never force product when unchecked.
// Canonical order: type → brand → gender → product → color → size.
export const buildPickupFieldOrder = (
  stationPrefs,
  { lockedProduct, candidateItems = [] }
) =>
  PICKUP_CANONICAL_FIELD_ORDER.filter((field) =>
    shouldShowField(stationPrefs, field, candidateItems, lockedProduct)
  );

export const PICKUP_VARIANT_FIELDS = VARIANT_FIELDS;
export const PICKUP_IDENTIFIER_FIELDS = IDENTIFIER_FIELDS;
