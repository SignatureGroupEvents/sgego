const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sevent', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Inventory = require('../models/Inventory');

async function migrateInventoryFields() {
  try {
    console.log('Starting inventory field migration...');
    
    // Find all inventory items that have qtyOnSite field
    const itemsToUpdate = await Inventory.find({
      qtyOnSite: { $exists: true }
    });
    
    console.log(`Found ${itemsToUpdate.length} items to migrate`);
    
    let updatedCount = 0;
    
    for (const item of itemsToUpdate) {
      // Copy qtyOnSite value to qtyBeforeEvent if qtyBeforeEvent doesn't exist
      if (item.qtyBeforeEvent === undefined) {
        item.qtyBeforeEvent = item.qtyOnSite;
      }
      
      // Remove the old qtyOnSite field by setting it to undefined
      item.qtyOnSite = undefined;
      
      // Save the updated item
      await item.save();
      updatedCount++;
      
      console.log(`Migrated item: ${item.type} - ${item.style} (ID: ${item._id})`);
    }
    
    console.log(`Migration completed! Updated ${updatedCount} items.`);
    
    // Verify the migration
    const remainingItemsWithOldField = await Inventory.find({
      qtyOnSite: { $exists: true }
    });
    
    if (remainingItemsWithOldField.length > 0) {
      console.log(`Warning: ${remainingItemsWithOldField.length} items still have qtyOnSite field`);
    } else {
      console.log('All items successfully migrated!');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the migration
migrateInventoryFields(); 