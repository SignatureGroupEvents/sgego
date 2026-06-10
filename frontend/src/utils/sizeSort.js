/**
 * Natural size ordering for apparel and numeric sizes.
 * Handles: 6,7,8,9,10,11 | XS,S,M,L,XL,XXL | Small, Medium, Large | 2XL, 3XL
 */

const APPAREL_SIZE_RANK = {
  xxxs: 1,
  xxs: 2,
  xs: 3,
  'x-small': 3,
  xsmall: 3,
  'extra small': 3,
  s: 4,
  small: 4,
  sm: 4,
  m: 5,
  medium: 5,
  med: 5,
  l: 6,
  large: 6,
  lg: 6,
  xl: 7,
  'x-large': 7,
  xlarge: 7,
  'extra large': 7,
  xxl: 8,
  'xx-large': 8,
  xxlarge: 8,
  '2xl': 8,
  xxxl: 9,
  'xxx-large': 9,
  '3xl': 9,
  xxxxl: 10,
  '4xl': 10,
  '5xl': 11,
  '6xl': 12,
  os: 50,
  'o/s': 50,
  'one size': 50,
  'n/a': 99,
  na: 99,
};

function normalizeSize(size) {
  return String(size ?? '').trim().toLowerCase();
}

function getSizeSortKey(size) {
  const normalized = normalizeSize(size);
  if (!normalized) return { group: 3, primary: Infinity, secondary: '', raw: '' };

  const xlNumberMatch = normalized.match(/^(\d+)xl$/);
  if (xlNumberMatch) {
    return {
      group: 0,
      primary: 6 + Number(xlNumberMatch[1]),
      secondary: '',
      raw: normalized,
    };
  }

  if (APPAREL_SIZE_RANK[normalized] !== undefined) {
    return {
      group: 0,
      primary: APPAREL_SIZE_RANK[normalized],
      secondary: '',
      raw: normalized,
    };
  }

  const numericMatch = normalized.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (numericMatch) {
    return {
      group: 1,
      primary: Number(numericMatch[1]),
      secondary: (numericMatch[2] || '').trim(),
      raw: normalized,
    };
  }

  return { group: 2, primary: 0, secondary: normalized, raw: normalized };
}

export function compareSizes(a, b) {
  const keyA = getSizeSortKey(a);
  const keyB = getSizeSortKey(b);

  if (keyA.group !== keyB.group) return keyA.group - keyB.group;

  if (keyA.primary !== keyB.primary) return keyA.primary - keyB.primary;

  const secondaryCmp = keyA.secondary.localeCompare(keyB.secondary, undefined, { sensitivity: 'base' });
  if (secondaryCmp !== 0) return secondaryCmp;

  return keyA.raw.localeCompare(keyB.raw, undefined, { sensitivity: 'base' });
}

export function sortSizeValues(values) {
  return [...values].sort(compareSizes);
}

export function sortInventoryItems(items) {
  return [...items].sort((a, b) => {
    const typeCmp = (a.type || '').localeCompare(b.type || '', undefined, { sensitivity: 'base' });
    if (typeCmp !== 0) return typeCmp;

    const styleCmp = (a.style || '').localeCompare(b.style || '', undefined, { sensitivity: 'base' });
    if (styleCmp !== 0) return styleCmp;

    return compareSizes(a.size, b.size);
  });
}
