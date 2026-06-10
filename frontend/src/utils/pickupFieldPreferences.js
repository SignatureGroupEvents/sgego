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
