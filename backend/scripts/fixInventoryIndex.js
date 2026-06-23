const mongoose = require('mongoose');
require('dotenv').config();

const CANONICAL_INDEX_NAME = 'eventId_1_type_1_style_1_product_1_gender_1_size_1_color_1';
const CANONICAL_INDEX_KEY = {
  eventId: 1,
  type: 1,
  style: 1,
  product: 1,
  gender: 1,
  size: 1,
  color: 1
};

// Known legacy unique indexes that omit fields (e.g. gender) and block M vs W rows
const LEGACY_UNIQUE_INDEX_NAMES = [
  'eventId_1_type_1_style_1_size_1_gender_1_color_1',
  'eventId_1_type_1_style_1_product_1_gender_1_color_1',
  'eventId_1_type_1_style_1_size_1_color_1',
  'eventId_1_type_1_style_1_product_1_color_1',
  'eventId_1_type_1_style_1_size_1',
  'eventId_1_type_1_style_1_product_1_size_1_color_1'
];

function indexKeySignature(index) {
  const key = index.key || {};
  return Object.keys(key)
    .filter((field) => field !== '_id')
    .sort()
    .map((field) => `${field}:${key[field]}`)
    .join(',');
}

function isCanonicalIndex(index) {
  return index.name === CANONICAL_INDEX_NAME ||
    indexKeySignature(index) === indexKeySignature({ key: CANONICAL_INDEX_KEY });
}

async function fixInventoryIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const inventoriesCollection = mongoose.connection.collection('inventories');
    const indexes = await inventoriesCollection.indexes();

    console.log('\n📋 Current indexes on inventories:');
    indexes.forEach((index) => {
      console.log(`  - ${index.name} (unique: ${!!index.unique}) keys: ${indexKeySignature(index)}`);
    });

    // Drop known legacy index names
    for (const indexName of LEGACY_UNIQUE_INDEX_NAMES) {
      try {
        await inventoriesCollection.dropIndex(indexName);
        console.log(`🧹 Dropped legacy unique index: ${indexName}`);
      } catch (err) {
        if (err.code === 27 || err.message.includes('index not found')) {
          console.log(`ℹ️  Legacy index not found (already dropped): ${indexName}`);
        } else {
          throw err;
        }
      }
    }

    // Drop any other unique indexes that are not the canonical one
    const refreshedIndexes = await inventoriesCollection.indexes();
    for (const index of refreshedIndexes) {
      if (index.name === '_id_') continue;
      if (!index.unique) continue;
      if (isCanonicalIndex(index)) continue;

      try {
        await inventoriesCollection.dropIndex(index.name);
        console.log(`🧹 Dropped non-canonical unique index: ${index.name}`);
      } catch (err) {
        console.warn(`⚠️  Could not drop index ${index.name}: ${err.message}`);
      }
    }

    // Ensure canonical unique index exists
    const finalIndexes = await inventoriesCollection.indexes();
    const hasCanonical = finalIndexes.some(isCanonicalIndex);

    if (!hasCanonical) {
      await inventoriesCollection.createIndex(CANONICAL_INDEX_KEY, {
        unique: true,
        name: CANONICAL_INDEX_NAME
      });
      console.log(`✅ Created canonical unique index: ${CANONICAL_INDEX_NAME}`);
    } else {
      console.log(`✅ Canonical unique index already present: ${CANONICAL_INDEX_NAME}`);
    }

    console.log('\n📋 Final indexes:');
    const doneIndexes = await inventoriesCollection.indexes();
    doneIndexes.forEach((index) => {
      console.log(`  - ${index.name} (unique: ${!!index.unique}) keys: ${indexKeySignature(index)}`);
    });

    console.log('\n✅ Inventory index migration complete');
    console.log("   Men's (M) and Women's (W) rows with the same brand/size/color are now allowed.");
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing index:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

fixInventoryIndex();
