const mongoose = require('mongoose');
require('dotenv').config();

async function fixInventoryIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const inventoriesCollection = mongoose.connection.collection('inventories');

    // Try to drop the old index (it might not exist if already dropped)
    try {
      await inventoriesCollection.dropIndex('eventId_1_type_1_style_1_size_1_gender_1_color_1');
      console.log("🧹 Dropped old unique index: eventId_1_type_1_style_1_size_1_gender_1_color_1");
    } catch (err) {
      if (err.code === 27 || err.message.includes('index not found')) {
        console.log("ℹ️  Old index doesn't exist (may have already been dropped)");
      } else {
        throw err;
      }
    }

    // Also try to drop the index without product (in case it was created differently)
    try {
      await inventoriesCollection.dropIndex('eventId_1_type_1_style_1_product_1_gender_1_color_1');
      console.log("🧹 Dropped index: eventId_1_type_1_style_1_product_1_gender_1_color_1");
    } catch (err) {
      if (err.code === 27 || err.message.includes('index not found')) {
        console.log("ℹ️  Index doesn't exist");
      } else {
        throw err;
      }
    }

    // The new index will be created automatically when the Inventory model loads
    // But we can also create it explicitly here
    await inventoriesCollection.createIndex(
      { eventId: 1, type: 1, style: 1, product: 1, gender: 1, size: 1, color: 1 },
      { unique: true, name: 'eventId_1_type_1_style_1_product_1_gender_1_size_1_color_1' }
    );
    console.log("✅ Created new unique index: eventId_1_type_1_style_1_product_1_gender_1_size_1_color_1");

    console.log("✅ Inventory index fixed successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error fixing index:", err.message);
    console.error("Full error:", err);
    process.exit(1);
  }
}

fixInventoryIndex();

