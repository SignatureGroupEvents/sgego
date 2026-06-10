const {
  normalizeInventoryGender,
  buildInventoryUniqueKey,
  formatGenderLabel,
  formatInventoryItemSummary
} = require('../inventoryUtils');

describe('inventoryUtils', () => {
  describe('normalizeInventoryGender', () => {
    it('normalizes men\'s variants to M', () => {
      expect(normalizeInventoryGender("Men's")).toBe('M');
      expect(normalizeInventoryGender('mens')).toBe('M');
      expect(normalizeInventoryGender('m')).toBe('M');
    });

    it('normalizes women\'s variants to W', () => {
      expect(normalizeInventoryGender("Women's")).toBe('W');
      expect(normalizeInventoryGender('womens')).toBe('W');
      expect(normalizeInventoryGender('w')).toBe('W');
    });

    it('defaults empty values to N/A', () => {
      expect(normalizeInventoryGender('')).toBe('N/A');
      expect(normalizeInventoryGender(null)).toBe('N/A');
    });
  });

  describe('buildInventoryUniqueKey', () => {
    it('treats M and W as different keys', () => {
      const base = {
        type: 'Sandals',
        style: 'Hari Mari',
        product: 'Dunes Navy',
        size: '8',
        color: 'Dunes Navy'
      };

      const mensKey = buildInventoryUniqueKey({ ...base, gender: 'M' });
      const womensKey = buildInventoryUniqueKey({ ...base, gender: 'W' });

      expect(mensKey).not.toBe(womensKey);
    });

    it('normalizes gender before building key', () => {
      const key = buildInventoryUniqueKey({
        type: 'Sandals',
        style: 'Hari Mari',
        product: 'Dunes Navy',
        gender: "Women's",
        size: '8',
        color: 'Dunes Navy'
      });

      expect(key).toContain('-W-');
    });
  });

  describe('formatGenderLabel', () => {
    it('formats gender for error messages', () => {
      expect(formatGenderLabel('M')).toBe("Men's (M)");
      expect(formatGenderLabel('W')).toBe("Women's (W)");
      expect(formatGenderLabel('N/A')).toBe('N/A');
    });
  });

  describe('formatInventoryItemSummary', () => {
    it('includes gender in summary', () => {
      const summary = formatInventoryItemSummary({
        type: 'Sandals',
        style: 'Hari Mari',
        product: 'Dunes Navy',
        gender: 'M',
        size: '8',
        color: 'Dunes Navy'
      });

      expect(summary).toContain("Men's (M)");
    });
  });
});
