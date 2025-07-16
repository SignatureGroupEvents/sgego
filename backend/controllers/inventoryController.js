const Inventory = require('../models/Inventory');
const Event = require('../models/Event');
const ActivityLog = require('../models/ActivityLog');
const csv = require('csv-parser');
const fs = require('fs');
const { Parser } = require('json2csv');

// Helper function to emit analytics update
const emitAnalyticsUpdate = (eventId) => {
  if (global.io) {
    global.io.to(`event-${eventId}`).emit('analytics:update', {
      eventId,
      timestamp: new Date().toISOString(),
      type: 'inventory_update'
    });
    console.log(`📊 Emitted analytics:update for event ${eventId} (inventory)`);
  }
};

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

    // Check if file was saved successfully
    if (!file.path) {
      return res.status(500).json({ message: 'File upload failed - no file path' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const inventoryItems = [];
    const errors = [];

    // Parse CSV
    const results = [];
    
    // Add error handling for file reading
    if (!fs.existsSync(file.path)) {
      return res.status(500).json({ message: 'Uploaded file not found on server' });
    }

    fs.createReadStream(file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        return res.status(400).json({ message: 'Error parsing CSV file: ' + error.message });
      })
      .on('end', async () => {
        try {
          if (results.length === 0) {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
            return res.status(400).json({ message: 'CSV file appears to be empty or invalid' });
          }

          for (let i = 0; i < results.length; i++) {
            const row = results[i];

            try {
              // Handle different possible column names
              const inventoryItem = {
                eventId,
                type: row.Type || row.type || row.TYPE || '',
                style: row.Style || row.style || row.STYLE || '',
                size: row.Size || row.size || row.SIZE || '',
                gender: (() => {
                  const genderValue = row.Gender || row.gender || row.GENDER || 'N/A';
                  // Map common gender values to valid enum values
                  if (genderValue.toLowerCase() === 'mens' || genderValue.toLowerCase() === 'men' || genderValue.toLowerCase() === 'male') {
                    return 'M';
                  } else if (genderValue.toLowerCase() === 'womens' || genderValue.toLowerCase() === 'women' || genderValue.toLowerCase() === 'female') {
                    return 'W';
                  } else {
                    return 'N/A';
                  }
                })(),
                color: row.Color || row.color || row.COLOR || '',
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
                }],
                allocatedEvents: [eventId], // Default allocation
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

          if (inventoryItems.length === 0) {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
            return res.status(400).json({ 
              message: 'No valid inventory items found in CSV',
              errors 
            });
          }

          // Insert inventory items
          const insertedItems = await Inventory.insertMany(inventoryItems, { ordered: false });

          // Clean up file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }

          // Emit WebSocket update for analytics
          emitAnalyticsUpdate(eventId);

          res.json({
            success: true,
            message: `${insertedItems.length} inventory items imported`,
            imported: insertedItems.length,
            errors,
            sampleFormat: {
              note: "Expected CSV columns (case insensitive). Gender accepts: M, W, N/A, Mens, Womens, Men, Women, Male, Female",
              columns: ["Type", "Style", "Size", "Gender", "Color", "Qty_Warehouse", "Qty_OnSite", "Current_Inventory", "Post_Event_Count"]
            }
          });

        } catch (error) {
          console.error('Inventory upload error:', error);
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          
          // Handle duplicate key errors specifically
          if (error.code === 11000) {
            return res.status(400).json({ 
              message: 'Duplicate inventory items found. Each combination of Type, Style, Size, Gender, and Color must be unique.',
              error: error.message 
            });
          }
          
          res.status(500).json({ 
            message: 'Error processing inventory upload: ' + error.message,
            error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
          });
        }
      });

  } catch (error) {
    console.error('Upload inventory outer error:', error);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      message: 'Error uploading inventory: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

exports.updateInventoryCount = async (req, res) => {
  try {
    const { inventoryId } = req.params;
    const { newCount, qtyWarehouse, qtyOnSite, qtyBeforeEvent, postEventCount, reason, action } = req.body;

    const inventoryItem = await Inventory.findById(inventoryId);
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Store previous values for logging
    const previousCount = inventoryItem.currentInventory;
    const previousWarehouse = inventoryItem.qtyWarehouse;
    const previousOnSite = inventoryItem.qtyOnSite;

    // Update fields if provided - handle both old and new field names
    if (typeof qtyWarehouse !== 'undefined') inventoryItem.qtyWarehouse = Number(qtyWarehouse);
    if (typeof qtyOnSite !== 'undefined') inventoryItem.qtyOnSite = Number(qtyOnSite);
    if (typeof qtyBeforeEvent !== 'undefined') inventoryItem.qtyOnSite = Number(qtyBeforeEvent); // Map qtyBeforeEvent to qtyOnSite
    if (typeof postEventCount !== 'undefined') inventoryItem.postEventCount = postEventCount ? Number(postEventCount) : null;

    // Only update currentInventory if newCount is provided (for manual adjustments)
    if (typeof newCount !== 'undefined') {
      await inventoryItem.updateInventory(
        newCount,
        action || 'manual_adjustment',
        req.user.id,
        reason
      );
    }

    // Save the updated fields
    await inventoryItem.save();

    // Log the inventory update
    await ActivityLog.create({
      eventId: inventoryItem.eventId,
      type: 'inventory_update',
      performedBy: req.user.id,
      details: {
        inventoryId: inventoryItem._id,
        type: inventoryItem.type,
        style: inventoryItem.style,
        size: inventoryItem.size,
        gender: inventoryItem.gender,
        color: inventoryItem.color,
        previousCount: previousCount,
        newCount: inventoryItem.currentInventory,
        previousWarehouse: previousWarehouse,
        newWarehouse: inventoryItem.qtyWarehouse,
        previousOnSite: previousOnSite,
        newOnSite: inventoryItem.qtyOnSite,
        previousPostEventCount: inventoryItem.postEventCount,
        action: action || 'manual_adjustment',
        reason: reason
      },
      timestamp: new Date()
    });

    // Emit WebSocket update for analytics
    emitAnalyticsUpdate(inventoryItem.eventId);

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
        color: inventoryItem.color,
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

// New: Update allocatedEvents for an inventory item
exports.updateInventoryAllocation = async (req, res) => {
  try {
    const { inventoryId } = req.params;
    const { allocatedEvents } = req.body; // array of event IDs
    const inventoryItem = await Inventory.findById(inventoryId);
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    
    // Store previous allocation for logging
    const previousAllocatedEvents = inventoryItem.allocatedEvents || [];
    
    inventoryItem.allocatedEvents = allocatedEvents;
    await inventoryItem.save();
    
    // Log the allocation update
    await ActivityLog.create({
      eventId: inventoryItem.eventId,
      type: 'allocation_update',
      performedBy: req.user.id,
      details: {
        inventoryId: inventoryItem._id,
        type: inventoryItem.type,
        style: inventoryItem.style,
        size: inventoryItem.size,
        gender: inventoryItem.gender,
        color: inventoryItem.color,
        previousAllocatedEvents: previousAllocatedEvents,
        newAllocatedEvents: allocatedEvents,
        previousCount: previousAllocatedEvents.length,
        newCount: allocatedEvents.length
      },
      timestamp: new Date()
    });
    
    res.json({ success: true, inventoryItem });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Add individual inventory item
exports.addInventoryItem = async (req, res) => {
  try {
    const { eventId } = req.params;
    const {
      type,
      style,
      size,
      gender,
      color,
      qtyWarehouse,
      qtyBeforeEvent,
      postEventCount
    } = req.body;

    // Validate required fields
    if (!type || !style) {
      return res.status(400).json({ message: 'Type and Style are required fields' });
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Create new inventory item
    const inventoryItem = new Inventory({
      eventId,
      type: type.trim(),
      style: style.trim(),
      size: size ? size.trim() : '',
      gender: gender || 'N/A',
      color: color || '',
      qtyWarehouse: Number(qtyWarehouse) || 0,
      qtyOnSite: Number(qtyBeforeEvent) || 0, // Map qtyBeforeEvent to qtyOnSite
      currentInventory: Number(qtyBeforeEvent) || 0, // Initial current inventory
      postEventCount: postEventCount ? Number(postEventCount) : null,
      allocatedEvents: [eventId], // Default allocation to this event
      inventoryHistory: [{
        action: 'initial',
        quantity: Number(qtyBeforeEvent) || 0,
        previousCount: 0,
        newCount: Number(qtyBeforeEvent) || 0,
        performedBy: req.user.id,
        reason: 'Individual item addition'
      }]
    });

    await inventoryItem.save();

    // Log the inventory addition
    await ActivityLog.create({
      eventId,
      type: 'inventory_add',
      performedBy: req.user.id,
      details: {
        inventoryId: inventoryItem._id,
        type: inventoryItem.type,
        style: inventoryItem.style,
        size: inventoryItem.size,
        gender: inventoryItem.gender,
        color: inventoryItem.color,
        qtyWarehouse: inventoryItem.qtyWarehouse,
        qtyBeforeEvent: inventoryItem.qtyOnSite,
        postEventCount: inventoryItem.postEventCount,
        action: 'individual_addition'
      },
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Inventory item added successfully',
      inventoryItem
    });

  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error (type, style, size, gender, color combination already exists)
      return res.status(400).json({ 
        message: 'An inventory item with this type, style, size, gender, and color combination already exists for this event' 
      });
    }
    res.status(400).json({ message: error.message });
  }
};

//Export Inventory to CSV
exports.exportInventoryCSV = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const inventory = await Inventory.find({ eventId, isActive: true })
      .populate('allocatedEvents', 'eventName eventContractNumber')
      .sort({ type: 1, style: 1, size: 1 });

    if (inventory.length === 0) {
      return res.status(404).json({ message: 'No inventory found for this event' });
    }

    // Transform data for CSV export
    const csvData = inventory.map(item => ({
      Type: item.type,
      Style: item.style,
      Size: item.size,
      Gender: item.gender,
      Color: item.color,
      'Qty Warehouse': item.qtyWarehouse || 0,
      'Qty On Site': item.qtyOnSite || 0,
      'Current Inventory': item.currentInventory || 0,
      'Post Event Count': item.postEventCount || '',
      'Allocated Events': item.allocatedEvents?.map(ev => ev.eventName).join(', ') || '',
      'Status': item.isActive ? 'Active' : 'Inactive',
      'Created At': new Date(item.createdAt).toLocaleDateString(),
      'Last Updated': new Date(item.updatedAt).toLocaleDateString()
    }));

    // Define the fields to include in the CSV
    const fields = [
      { label: 'Type', value: 'Type' },
      { label: 'Style', value: 'Style' },
      { label: 'Size', value: 'Size' },
      { label: 'Gender', value: 'Gender' },
      { label: 'Color', value: 'Color' },
      { label: 'Qty Warehouse', value: 'Qty Warehouse' },
      { label: 'Qty On Site', value: 'Qty On Site' },
      { label: 'Current Inventory', value: 'Current Inventory' },
      { label: 'Post Event Count', value: 'Post Event Count' },
      { label: 'Allocated Events', value: 'Allocated Events' },
      { label: 'Status', value: 'Status' },
      { label: 'Created At', value: 'Created At' },
      { label: 'Last Updated', value: 'Last Updated' }
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(csvData);

    // Set the response headers for the CSV file
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="inventory_${event.eventContractNumber}_${new Date().toISOString().split('T')[0]}.csv"`);
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Export Inventory to Excel
exports.exportInventoryExcel = async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const inventory = await Inventory.find({ eventId, isActive: true })
      .populate('allocatedEvents', 'eventName eventContractNumber')
      .sort({ type: 1, style: 1, size: 1 });

    if (inventory.length === 0) {
      return res.status(404).json({ message: 'No inventory found for this event' });
    }

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory');

    // Define columns
    worksheet.columns = [
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Style', key: 'style', width: 25 },
      { header: 'Size', key: 'size', width: 10 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Color', key: 'color', width: 10 },
      { header: 'Qty Warehouse', key: 'qtyWarehouse', width: 15 },
      { header: 'Qty On Site', key: 'qtyOnSite', width: 15 },
      { header: 'Current Inventory', key: 'currentInventory', width: 18 },
      { header: 'Post Event Count', key: 'postEventCount', width: 18 },
      { header: 'Allocated Events', key: 'allocatedEvents', width: 30 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Created At', key: 'createdAt', width: 15 },
      { header: 'Last Updated', key: 'updatedAt', width: 15 }
    ];

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    inventory.forEach(item => {
      worksheet.addRow({
        type: item.type,
        style: item.style,
        size: item.size,
        gender: item.gender,
        color: item.color,
        qtyWarehouse: item.qtyWarehouse || 0,
        qtyOnSite: item.qtyOnSite || 0,
        currentInventory: item.currentInventory || 0,
        postEventCount: item.postEventCount || '',
        allocatedEvents: item.allocatedEvents?.map(ev => ev.eventName).join(', ') || '',
        status: item.isActive ? 'Active' : 'Inactive',
        createdAt: new Date(item.createdAt).toLocaleDateString(),
        updatedAt: new Date(item.updatedAt).toLocaleDateString()
      });
    });

    // Add summary information
    worksheet.addRow([]); // Empty row
    worksheet.addRow(['Summary Information']);
    worksheet.addRow(['Total Items', inventory.length]);
    worksheet.addRow(['Active Items', inventory.filter(item => item.isActive).length]);
    worksheet.addRow(['Total Warehouse Quantity', inventory.reduce((sum, item) => sum + (item.qtyWarehouse || 0), 0)]);
    worksheet.addRow(['Total On-Site Quantity', inventory.reduce((sum, item) => sum + (item.qtyOnSite || 0), 0)]);
    worksheet.addRow(['Total Current Inventory', inventory.reduce((sum, item) => sum + (item.currentInventory || 0), 0)]);

    // Style summary section
    const summaryStartRow = inventory.length + 3;
    for (let i = summaryStartRow; i <= summaryStartRow + 5; i++) {
      const row = worksheet.getRow(i);
      if (i === summaryStartRow) {
        row.font = { bold: true };
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' }
        };
      }
    }

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="inventory_${event.eventContractNumber}_${new Date().toISOString().split('T')[0]}.xlsx"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
