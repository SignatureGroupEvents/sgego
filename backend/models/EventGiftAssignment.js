const mongoose = require('mongoose')

const eventGiftAssignmentSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    inventoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory',
        required: true
    },
    isDefault :{
        type: Boolean,
        default: false
    },
    maxPerGuest:{
        type: Number,
        default: 1
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

eventGiftAssignmentSchema.index({eventId: 1, inventoryId: 1}, {unique: true});

module.exports = mongoose.model('EventGiftAssignment', eventGiftAssignmentSchema);