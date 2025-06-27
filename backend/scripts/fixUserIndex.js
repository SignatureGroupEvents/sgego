const mongoose = require('mongoose');
require('dotenv').config();

async function fixUsernameIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const usersCollection = mongoose.connection.collection('users');

    // Drop old index
    await usersCollection.dropIndex('username_1');
    console.log("🧹 Dropped old index on 'username'");

    // Create new sparse unique index
    await usersCollection.createIndex({ username: 1 }, { unique: true, sparse: true });
    console.log("✅ Created new sparse unique index on 'username'");

    process.exit();
  } catch (err) {
    console.error("❌ Error fixing index:", err.message);
    process.exit(1);
  }
}

fixUsernameIndex();
