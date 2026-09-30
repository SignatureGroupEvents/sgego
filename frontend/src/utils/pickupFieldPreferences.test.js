import { describe, it, expect } from 'vitest';
import {
  buildPickupFieldOrder,
  getLockedProduct,
  getFieldsEnabledSomewhere,
} from './pickupFieldPreferences';

// Mirrors Pfizer contract 26307: station brand-only, Tumi product overrides, Maui Jim no product.
const stationPrefs = {
  pickupFieldPreferences: {
    type: false,
    brand: true,
    product: false,
    size: false,
    gender: false,
    color: false,
  },
  productPickupOverrides: {
    'Tumi Just In Case Backpack': {
      type: false,
      brand: true,
      product: true,
      size: false,
      gender: false,
      color: false,
    },
    'Tumi Just In Case Tote': {
      type: false,
      brand: true,
      product: true,
      size: false,
      gender: false,
      color: false,
    },
    'Tumi Just in Case Duffel': {
      type: false,
      brand: true,
      product: true,
      size: false,
      gender: false,
      color: false,
    },
  },
};

const inventory = [
  { _id: '1', type: 'Bags', style: 'Tumi', product: 'Tumi Just In Case Backpack', gender: 'N/A' },
  { _id: '2', type: 'Bags', style: 'Tumi', product: 'Tumi Just In Case Tote', gender: 'N/A' },
  { _id: '3', type: 'Bags', style: 'Tumi', product: 'Tumi Just in Case Duffel', gender: 'N/A' },
  { _id: '4', type: 'Sunglasses', style: 'Maui Jim', product: '', gender: 'N/A' },
];

describe('buildPickupFieldOrder — Pfizer-style mixed station', () => {
  it('does not enable type/Category anywhere when unchecked', () => {
    expect(getFieldsEnabledSomewhere(stationPrefs)).toEqual(['brand', 'product']);
    expect(getFieldsEnabledSomewhere(stationPrefs)).not.toContain('type');
  });

  it('starts with brand (and product for Tumi overrides), never Category', () => {
    const order = buildPickupFieldOrder(stationPrefs, {
      lockedProduct: null,
      candidateItems: inventory,
      inventory,
      selections: {},
    });
    expect(order).toContain('brand');
    expect(order).not.toContain('type');
  });

  it('after locking a Tumi product, shows brand+product without Category', () => {
    const selections = { brand: 'Tumi', product: 'Tumi Just In Case Backpack' };
    const candidates = inventory.filter((i) => i.style === 'Tumi' && i.product === selections.product);
    const lockedProduct = getLockedProduct(candidates, selections);
    const order = buildPickupFieldOrder(stationPrefs, {
      lockedProduct,
      candidateItems: candidates,
      inventory,
      selections,
    });
    expect(order).toEqual(['brand', 'product']);
  });

  it('after switching to Maui Jim, shows brand only — not Category', () => {
    // Stale type from a prior Tumi hydrate used to empty candidates and trigger fallback.
    const selections = { type: 'Bags', brand: 'Maui Jim', product: '' };
    const enabledFields = getFieldsEnabledSomewhere(stationPrefs);
    const candidates = inventory.filter((item) =>
      enabledFields.every((field) => {
        const key = field === 'brand' ? 'style' : field;
        const selected = selections[field] || '';
        const value = item[key] || '';
        return selected === '' || selected === value;
      })
    );
    expect(candidates.map((c) => c.style)).toEqual(['Maui Jim']);

    const lockedProduct = getLockedProduct(candidates, selections);
    const order = buildPickupFieldOrder(stationPrefs, {
      lockedProduct,
      candidateItems: candidates,
      inventory,
      selections,
    });
    expect(order).toEqual(['brand']);
    expect(order).not.toContain('type');
  });

  it('fallback with empty candidates never resurfaces unchecked Category', () => {
    const order = buildPickupFieldOrder(stationPrefs, {
      lockedProduct: null,
      candidateItems: [],
      inventory,
      selections: { type: 'Bags', brand: 'Maui Jim', product: 'Tumi Just In Case Backpack' },
    });
    expect(order).not.toContain('type');
    expect(order).toContain('brand');
  });

  it('does not show Product until brand is narrowed to override products', () => {
    const order = buildPickupFieldOrder(stationPrefs, {
      lockedProduct: null,
      candidateItems: inventory,
      inventory,
      selections: {},
    });
    // Station is brand-only; Tumi overrides enable product only after Tumi is selected
    expect(order).toEqual(['brand']);
  });

  it('after selecting Tumi brand, shows Product from overrides', () => {
    const candidates = inventory.filter((i) => i.style === 'Tumi');
    const order = buildPickupFieldOrder(stationPrefs, {
      lockedProduct: null,
      candidateItems: candidates,
      inventory,
      selections: { brand: 'Tumi' },
    });
    expect(order).toEqual(['brand', 'product']);
  });
});

describe('buildPickupFieldOrder — Alexander Group Greyson overrides (26276)', () => {
  const greysonOverride = {
    type: false,
    brand: true,
    product: true,
    gender: true,
    color: true,
    size: true,
  };
  const prefs = {
    pickupFieldPreferences: {
      type: false,
      brand: true,
      product: false,
      gender: false,
      color: false,
      size: false,
    },
    productPickupOverrides: {
      'Colorado Zip': greysonOverride,
      'Halley Zip': greysonOverride,
    },
  };
  const inv = [
    { _id: '1', type: 'Apparel', style: 'Greyson', product: 'Colorado Zip', gender: 'M', color: 'Blue', size: 'M' },
    { _id: '2', type: 'Apparel', style: 'Greyson', product: 'Colorado Zip', gender: 'M', color: 'Blue', size: 'L' },
    { _id: '3', type: 'Apparel', style: 'Greyson', product: 'Halley Zip', gender: 'W', color: 'Blue', size: 'S' },
    { _id: '4', type: 'Bags', style: 'TUMI', product: 'Tote', gender: 'N/A', color: 'Black', size: '' },
  ];

  it('starts with Brand only', () => {
    const order = buildPickupFieldOrder(prefs, {
      lockedProduct: null,
      candidateItems: inv,
      inventory: inv,
      selections: {},
    });
    expect(order).toEqual(['brand']);
  });

  it('after Greyson, shows apparel fields from product overrides', () => {
    const candidates = inv.filter((i) => i.style === 'Greyson');
    const order = buildPickupFieldOrder(prefs, {
      lockedProduct: null,
      candidateItems: candidates,
      inventory: inv,
      selections: { brand: 'Greyson' },
    });
    expect(order[0]).toBe('brand');
    expect(order).toEqual(expect.arrayContaining(['gender', 'product', 'color', 'size']));
  });

  it('after TUMI, stays Brand only (unique SKU)', () => {
    const candidates = inv.filter((i) => i.style === 'TUMI');
    const order = buildPickupFieldOrder(prefs, {
      lockedProduct: null,
      candidateItems: candidates,
      inventory: inv,
      selections: { brand: 'TUMI' },
    });
    expect(order).toEqual(['brand']);
  });
});
