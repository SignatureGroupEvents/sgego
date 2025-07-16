const mongoose = require('mongoose');
require('dotenv').config();

async function fixEventContractIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const eventsCollection = mongoose.connection.collection('events');

    // Drop the unique index on eventContractNumber
    await eventsCollection.dropIndex('eventContractNumber_1');
    console.log("🧹 Dropped unique index on 'eventContractNumber'");

    // Create a new non-unique index for better query performance
    await eventsCollection.createIndex({ eventContractNumber: 1 });
    console.log("✅ Created new non-unique index on 'eventContractNumber'");

    console.log("✅ Event contract number index fixed successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error fixing index:", err.message);
    process.exit(1);
  }
}

fixEventContractIndex(); 