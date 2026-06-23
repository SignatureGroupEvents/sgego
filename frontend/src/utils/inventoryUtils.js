/**
 * Inventory field normalization — mirrors backend/utils/inventoryUtils.js
 */

export function normalizeInventoryGender(genderValue) {
  if (!genderValue || typeof genderValue !== 'string') return 'N/A';
  const lower = String(genderValue).trim().toLowerCase();
  if (['mens', "men's", 'men', 'male', 'm'].includes(lower)) return 'M';
  if (['womens', "women's", 'women', 'female', 'w'].includes(lower)) return 'W';
  if (lower === 'n/a' || lower === 'na') return 'N/A';
  if (lower === 'm' || lower === 'w') return lower.toUpperCase();
  return 'N/A';
}

export function normalizeInventoryFields(item) {
  return {
    type: (item.type || '').trim(),
    style: (item.style || '').trim(),
    product: item.product != null ? String(item.product).trim() : '',
    gender: normalizeInventoryGender(item.gender),
    size: item.size != null && item.size !== '' ? String(item.size).trim() : '',
    color: item.color != null ? String(item.color).trim() : ''
  };
}

export function buildInventoryUniqueKey(item) {
  const fields = normalizeInventoryFields(item);
  return `${fields.type}-${fields.style}-${fields.product}-${fields.gender}-${fields.size}-${fields.color}`;
}

export function formatGenderLabel(gender) {
  if (gender === 'M') return "Men's (M)";
  if (gender === 'W') return "Women's (W)";
  return 'N/A';
}
