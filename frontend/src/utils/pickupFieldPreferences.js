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

// Product override map keys: "Shoes" when gender is N/A, or "M:Shoes" / "W:Shoes" when gender-specific.
export const getProductOverrideKey = (product, gender = null) => {
  if (!product) return '';
  if (gender === 'M' || gender === 'W') return `${gender}:${product}`;
  return product;
};

export const parseProductOverrideKey = (key) => {
  if (!key) return { product: '', gender: null };
  const match = /^([MW]):(.+)$/.exec(key);
  if (match) return { gender: match[1], product: match[2] };
  return { product: key, gender: null };
};

const formatGenderPrefixForProduct = (gender) => {
  if (gender === 'M') return "Men's";
  if (gender === 'W') return "Women's";
  return null;
};

export const formatProductOverrideLabel = (key) => {
  const { product, gender } = parseProductOverrideKey(key);
  const prefix = formatGenderPrefixForProduct(gender);
  return prefix ? `${prefix} ${product}` : product;
};

export const buildProductOverrideOptions = (inventoryItems = [], existingOverrideKeys = []) => {
  const existing = new Set(existingOverrideKeys);
  const seen = new Set();
  const options = [];

  inventoryItems.forEach((item) => {
    if (!item.product) return;
    const gender = item.gender === 'M' || item.gender === 'W' ? item.gender : null;
    const key = getProductOverrideKey(item.product, gender);
    if (seen.has(key) || existing.has(key)) return;
    seen.add(key);
    options.push({
      key,
      label: formatProductOverrideLabel(key),
      product: item.product,
      gender,
    });
  });

  return options.sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  );
};

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
export const getEffectivePrefsForProduct = (stationPrefs, productName, gender = null) => {
  const overrides = normalizeProductPickupOverrides(stationPrefs?.productPickupOverrides);
  const stationDefaults = readExplicitPrefs(stationPrefs?.pickupFieldPreferences);
  if (!productName) return stationDefaults;

  const genderKey = getProductOverrideKey(productName, gender);
  if (gender && (gender === 'M' || gender === 'W') && overrides[genderKey]) {
    return readExplicitPrefs(overrides[genderKey]);
  }
  if (overrides[productName]) {
    return readExplicitPrefs(overrides[productName]);
  }
  return stationDefaults;
};

export const getEffectivePrefsForItem = (stationPrefs, item) =>
  getEffectivePrefsForProduct(stationPrefs, item?.product, item?.gender);

const itemNeedsField = (stationPrefs, item, field) =>
  getEffectivePrefsForItem(stationPrefs, item)[field];

// Show a field only when remaining inventory rows need it — overrides can suppress
// color/size for one product while another still needs those fields.
const shouldShowField = (stationPrefs, field, candidateItems, lockedProduct, selections = {}) => {
  if (!candidateItems?.length) return false;

  if (lockedProduct) {
    return getEffectivePrefsForProduct(
      stationPrefs,
      lockedProduct,
      selections?.gender || null
    )[field];
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

// Identifier fields to keep visible when a locked product hides all configured fields,
// so staff can still switch between product lines at the same station.
const buildIdentifierFallbackFieldOrder = (inventory) => {
  if (!inventory?.length) return [];

  return PICKUP_CANONICAL_FIELD_ORDER.filter((field) => {
    if (!IDENTIFIER_FIELDS.includes(field)) return false;
    const itemKey = field === 'brand' ? 'style' : field;
    const values = new Set(inventory.map((i) => i[itemKey]).filter(Boolean));
    return values.size > 1;
  });
};

// Build which fields to show in the pickup modal.
// Only fields explicitly enabled in settings appear — never force product when unchecked.
// Canonical order: type → brand → gender → product → color → size.
export const buildPickupFieldOrder = (
  stationPrefs,
  { lockedProduct, candidateItems = [], inventory = [], selections = {} }
) => {
  const fromPrefs = PICKUP_CANONICAL_FIELD_ORDER.filter((field) =>
    shouldShowField(stationPrefs, field, candidateItems, lockedProduct, selections)
  );
  if (fromPrefs.length > 0) return fromPrefs;

  const items = inventory.length ? inventory : candidateItems;
  return buildIdentifierFallbackFieldOrder(items);
};

export const PICKUP_VARIANT_FIELDS = VARIANT_FIELDS;
export const PICKUP_IDENTIFIER_FIELDS = IDENTIFIER_FIELDS;
