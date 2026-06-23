const { compareSizes, sortSizeValues } = require('../sizeSort');

describe('sizeSort', () => {
  it('sorts numeric shoe sizes in numeric order', () => {
    expect(sortSizeValues(['10', '11', '6', '7', '8', '9'])).toEqual(['6', '7', '8', '9', '10', '11']);
  });

  it('sorts apparel abbreviations correctly', () => {
    expect(sortSizeValues(['XL', 'S', 'XXL', 'M', 'L', 'XS'])).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
  });

  it('sorts full text sizes correctly', () => {
    expect(sortSizeValues(['Large', 'Small', 'Medium'])).toEqual(['Small', 'Medium', 'Large']);
  });

  it('sorts mixed numeric and half sizes', () => {
    expect(sortSizeValues(['8', '7.5', '7', '8.5'])).toEqual(['7', '7.5', '8', '8.5']);
  });

  it('places unknown sizes after known sizes', () => {
    const sorted = sortSizeValues(['M', 'Custom', 'S']);
    expect(sorted.indexOf('S')).toBeLessThan(sorted.indexOf('M'));
    expect(sorted.indexOf('M')).toBeLessThan(sorted.indexOf('Custom'));
  });

  it('compareSizes returns 0 for equal values', () => {
    expect(compareSizes('8', '8')).toBe(0);
  });
});
