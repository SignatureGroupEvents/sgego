/**
 * Shared inventory field normalization and duplicate-detection helpers.
 */

const CANONICAL_UNIQUE_INDEX_NAME = 'eventId_1_type_1_style_1_product_1_gender_1_size_1_color_1';

function normalizeInventoryGender(genderValue) {
  if (!genderValue || typeof genderValue !== 'string') return 'N/A';
  const lower = String(genderValue).trim().toLowerCase();
  if (['mens', "men's", 'men', 'male', 'm'].includes(lower)) return 'M';
  if (['womens', "women's", 'women', 'female', 'w'].includes(lower)) return 'W';
  if (lower === 'n/a' || lower === 'na') return 'N/A';
  if (lower === 'm' || lower === 'w') return lower.toUpperCase();
  return 'N/A';
}

function normalizeInventoryFields(item) {
  return {
    type: (item.type || '').trim(),
    style: (item.style || '').trim(),
    product: item.product != null ? String(item.product).trim() : '',
    gender: normalizeInventoryGender(item.gender),
    size: item.size != null && item.size !== '' ? String(item.size).trim() : '',
    color: item.color != null ? String(item.color).trim() : ''
  };
}

function buildInventoryUniqueKey(item) {
  const fields = normalizeInventoryFields(item);
  return `${fields.type}-${fields.style}-${fields.product}-${fields.gender}-${fields.size}-${fields.color}`;
}

function formatGenderLabel(gender) {
  if (gender === 'M') return "Men's (M)";
  if (gender === 'W') return "Women's (W)";
  return 'N/A';
}

function formatInventoryItemSummary(item) {
  const fields = normalizeInventoryFields(item);
  const productPart = fields.product ? ` / ${fields.product}` : '';
  return `${fields.type} / ${fields.style}${productPart} — Size: ${fields.size || 'N/A'}, Gender: ${formatGenderLabel(fields.gender)}, Color: ${fields.color || 'N/A'}`;
}

async function findInventoryDuplicateContext(Inventory, mainEventId, item, excludeId = null) {
  const fields = normalizeInventoryFields(item);
  const idFilter = excludeId ? { _id: { $ne: excludeId } } : {};

  const exactMatch = await Inventory.findOne({
    eventId: mainEventId,
    isActive: true,
    type: fields.type,
    style: fields.style,
    product: fields.product,
    gender: fields.gender,
    size: fields.size,
    color: fields.color,
    ...idFilter
  });

  const similarItems = await Inventory.find({
    eventId: mainEventId,
    isActive: true,
    type: fields.type,
    style: fields.style,
    product: fields.product,
    size: fields.size,
    color: fields.color,
    ...idFilter
  });

  return { exactMatch, similarItems, fields };
}

function buildDuplicateInventoryResponse(context) {
  const { exactMatch, similarItems, fields } = context;

  if (exactMatch) {
    return {
      message: `An inventory item with this exact combination already exists: ${formatInventoryItemSummary(exactMatch)}.`,
      conflictingItem: {
        type: exactMatch.type,
        style: exactMatch.style,
        product: exactMatch.product,
        size: exactMatch.size,
        gender: exactMatch.gender,
        genderLabel: formatGenderLabel(exactMatch.gender),
        color: exactMatch.color,
        summary: formatInventoryItemSummary(exactMatch)
      },
      attemptedGender: fields.gender,
      attemptedGenderLabel: formatGenderLabel(fields.gender)
    };
  }

  const differentGenderMatch = similarItems.find((row) => row.gender !== fields.gender);
  if (differentGenderMatch) {
    return {
      message: `Cannot add this item. A similar item already exists (${formatInventoryItemSummary(differentGenderMatch)}), but you are adding gender ${formatGenderLabel(fields.gender)}. Men's and Women's should be separate rows — if you are seeing this error, the database may have a legacy unique index. Run: node backend/scripts/fixInventoryIndex.js`,
      conflictingItem: {
        type: differentGenderMatch.type,
        style: differentGenderMatch.style,
        product: differentGenderMatch.product,
        size: differentGenderMatch.size,
        gender: differentGenderMatch.gender,
        genderLabel: formatGenderLabel(differentGenderMatch.gender),
        color: differentGenderMatch.color,
        summary: formatInventoryItemSummary(differentGenderMatch)
      },
      attemptedGender: fields.gender,
      attemptedGenderLabel: formatGenderLabel(fields.gender),
      hint: 'legacy_index_possible'
    };
  }

  return {
    message: 'An inventory item with this type, brand, product, gender, size, and color combination already exists for this event.'
  };
}

module.exports = {
  CANONICAL_UNIQUE_INDEX_NAME,
  normalizeInventoryGender,
  normalizeInventoryFields,
  buildInventoryUniqueKey,
  formatGenderLabel,
  formatInventoryItemSummary,
  findInventoryDuplicateContext,
  buildDuplicateInventoryResponse
};
