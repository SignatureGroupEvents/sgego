const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const envContent = `NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/sevent
JWT_SECRET=your_super_secret_jwt_key_for_development_12345
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:3000
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
`;

async function setupEnvironment() {
  console.log('🔧 Setting up development environment...');
  
  // Create .env file if it doesn't exist
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file with development settings');
  } else {
    console.log('⚠️  .env file already exists');
  }
  
  // Load environment variables
  require('dotenv').config();
  
  // Connect to MongoDB
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check if admin user exists
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    
    if (!adminUser) {
      // Create admin user
      const adminUser = new User({
        email: 'admin@example.com',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        isActive: true
      });
      
      await adminUser.save();
      console.log('✅ Created admin user:');
      console.log('   Email: admin@example.com');
      console.log('   Password: admin123');
      console.log('   Role: admin');
    } else {
      console.log('✅ Admin user already exists');
    }
    
    // Check if operations manager exists
    const opsUser = await User.findOne({ email: 'ops@example.com' });
    
    if (!opsUser) {
      // Create operations manager user
      const opsUser = new User({
        email: 'ops@example.com',
        username: 'operations',
        password: 'ops123',
        role: 'operations_manager',
        isActive: true
      });
      
      await opsUser.save();
      console.log('✅ Created operations manager user:');
      console.log('   Email: ops@example.com');
      console.log('   Password: ops123');
      console.log('   Role: operations_manager');
    } else {
      console.log('✅ Operations manager user already exists');
    }
    
    console.log('\n🎉 Setup complete! You can now:');
    console.log('1. Start the backend: npm run dev');
    console.log('2. Start the frontend: cd ../frontend && npm run dev');
    console.log('3. Login with admin@example.com / admin123');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n💡 Make sure MongoDB is running on localhost:27017');
    console.log('   Or update MONGODB_URI in .env to point to your MongoDB instance');
  } finally {
    await mongoose.disconnect();
  }
}

setupEnvironment(); 