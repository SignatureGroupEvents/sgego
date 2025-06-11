const Inventory = require('../models/Inventory');
const Event = require('../models/Event');
const csv = require('csv-parser');
const fs = require('fs');

exports.getInventory = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const inventory = await Inventory.find({ eventId, isActive: true })
      .sort({ type: 1, style: 1, size: 1 });

    // Group by type for easier display
    const groupedInventory = inventory.reduce((acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = [];
      }
      acc[item.type].push(item);
      return acc;
    }, {});

    res.json({ inventory, groupedInventory });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.uploadInventory = async (req, res) => {
  try {
    const { eventId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const inventoryItems = [];
    const errors = [];

    // Parse CSV
    const results = [];
    fs.createReadStream(file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            
            try {
              // Handle different possible column names
              const inventoryItem = {
                eventId,
                type: row.Type || row.type || row.TYPE || '',
                style: row.Style || row.style || row.STYLE || '',
                size: row.Size || row.size || row.SIZE || '',
                gender: row.Gender || row.gender || row.GENDER || 'N/A',
                qtyWarehouse: parseInt(row.Qty_Warehouse || row.qty_warehouse || row.QTY_WAREHOUSE || 0),
                qtyOnSite: parseInt(row.Qty_OnSite || row.qty_onsite || row.QTY_ONSITE || 0),
                currentInventory: parseInt(row.Current_Inventory || row.current_inventory || row.CURRENT_INVENTORY || 0),
                postEventCount: row.Post_Event_Count ? parseInt(row.Post_Event_Count) : null,
                inventoryHistory: [{
                  action: 'initial',
                  quantity: parseInt(row.Current_Inventory || row.current_inventory || row.CURRENT_INVENTORY || 0),
                  previousCount: 0,
                  newCount: parseInt(row.Current_Inventory || row.current_inventory || row.CURRENT_INVENTORY || 0),
                  performedBy: req.user.id,
                  reason: 'Initial inventory upload'
                }]
              };

              if (!inventoryItem.type || !inventoryItem.style) {
                errors.push(`Row ${i + 1}: Missing type or style`);
                continue;
              }

              inventoryItems.push(inventoryItem);
            } catch (error) {
              errors.push(`Row ${i + 1}: ${error.message}`);
            }
          }

          // Insert inventory items
          const insertedItems = await Inventory.insertMany(inventoryItems, { ordered: false });

          // Clean up file
          fs.unlinkSync(file.path);

          res.json({
            success: true,
            message: `${insertedItems.length} inventory items imported`,
            imported: insertedItems.length,
            errors,
            sampleFormat: {
              note: "Expected CSV columns (case insensitive)",
              columns: ["Type", "Style", "Size", "Gender", "Qty_Warehouse", "Qty_OnSite", "Current_Inventory", "Post_Event_Count"]
            }
          });

        } catch (error) {
          fs.unlinkSync(file.path);
          res.status(400).json({ message: error.message });
        }
      });

  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(400).json({ message: error.message });
  }
};

exports.updateInventoryCount = async (req, res) => {
  try {
    const { inventoryId } = req.params;
    const { newCount, reason, action } = req.body;

    const inventoryItem = await Inventory.findById(inventoryId);
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    await inventoryItem.updateInventory(
      newCount, 
      action || 'manual_adjustment', 
      req.user.id, 
      reason
    );

    res.json({
      success: true,
      message: 'Inventory updated successfully',
      inventoryItem
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getInventoryHistory = async (req, res) => {
  try {
    const { inventoryId } = req.params;
    
    const inventoryItem = await Inventory.findById(inventoryId)
      .populate('inventoryHistory.performedBy', 'username');

    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    res.json({
      item: {
        type: inventoryItem.type,
        style: inventoryItem.style,
        size: inventoryItem.size,
        currentInventory: inventoryItem.currentInventory
      },
      history: inventoryItem.inventoryHistory.sort((a, b) => b.timestamp - a.timestamp)
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete Methods

exports.deleteInventoryItem = async (req, res) => {
  try {
    const inventoryItem = await Inventory.findById(req.params.inventoryId);

    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Check if item has been distributed
    const Checkin = require('../models/Checkin');
    const distributedCount = await Checkin.countDocuments({
      'giftsDistributed.inventoryId': req.params.inventoryId,
      isValid: true
    });

    if (distributedCount > 0) {
      return res.status(400).json({
        message: `Cannot delete ${inventoryItem.style} - it has been distributed ${distributedCount} times. Mark as inactive instead.`
      });
    }

    await Inventory.findByIdAndDelete(req.params.inventoryId);

    res.json({
      success: true,
      message: `Inventory item "${inventoryItem.style}" has been deleted`
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deactivateInventoryItem = async (req, res) => {
  try {
    const inventoryItem = await Inventory.findById(req.params.inventoryId);

    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    inventoryItem.isActive = false;
    await inventoryItem.save();

    res.json({
      success: true,
      message: `Inventory item "${inventoryItem.style}" has been deactivated`
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.bulkDeleteInventory = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { force } = req.body; // force=true to delete all, false to only delete unused

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (force) {
      // Delete all inventory for this event
      const result = await Inventory.deleteMany({ eventId });
      return res.json({
        success: true,
        message: `All ${result.deletedCount} inventory items deleted for event "${event.eventName}"`
      });
    } else {
      // Only delete unused inventory
      const Checkin = require('../models/Checkin');
      
      // Get all inventory items for this event
      const inventoryItems = await Inventory.find({ eventId });
      
      const results = {
        deleted: [],
        skipped: []
      };

      for (const item of inventoryItems) {
        const distributedCount = await Checkin.countDocuments({
          'giftsDistributed.inventoryId': item._id,
          isValid: true
        });

        if (distributedCount === 0) {
          await Inventory.findByIdAndDelete(item._id);
          results.deleted.push(item.style);
        } else {
          results.skipped.push({
            style: item.style,
            reason: `Distributed ${distributedCount} times`
          });
        }
      }

      res.json({
        success: true,
        message: `Deleted ${results.deleted.length} unused items, skipped ${results.skipped.length} distributed items`,
        results
      });
    }

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};