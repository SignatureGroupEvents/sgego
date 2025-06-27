const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Debug environment variables
console.log('🔧 Environment Variables:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  PORT:', process.env.PORT);
console.log('  MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');

const app = express();

// Define allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176'
];

// Debug CORS origins
console.log('🔧 Allowed CORS Origins:', allowedOrigins);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Test routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Event Check-in API is running!',
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    server: 'running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    port: process.env.PORT || 3001
  });
});

// Load routes
try {
  const authRoutes = require('./routes/auth');
  const eventRoutes = require('./routes/events');
  const guestRoutes = require('./routes/guests');
  const checkinRoutes = require('./routes/checkins');
  const inventoryRoutes = require('./routes/inventory');
  const userRoutes = require('./routes/users');
  const analyticsRoutes = require('./routes/analytics');

  app.use('/api/auth', authRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/guests', guestRoutes);
  app.use('/api/checkins', checkinRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/analytics', analyticsRoutes);
  
  console.log('✅ All routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('✅ MongoDB connected successfully');
  console.log('📍 Database:', mongoose.connection.name);
  
  // Load models one by one to find the problematic one
  try {
    console.log('Loading User model...');
    require('./models/User');
    console.log('✅ User model loaded');
    
    console.log('Loading Event model...');
    require('./models/Event');
    console.log('✅ Event model loaded');
    
    console.log('Loading Guest model...');
    require('./models/Guest');
    console.log('✅ Guest model loaded');
    
    console.log('Loading Inventory model...');
    require('./models/Inventory');
    console.log('✅ Inventory model loaded');
    
    console.log('Loading Checkin model...');
    require('./models/Checkin');
    console.log('✅ Checkin model loaded');
    
    console.log('Loading UserAssignment model...');
    require('./models/UserAssignment');
    console.log('✅ UserAssignment model loaded');
    
    console.log('✅ All models loaded successfully');
  } catch (error) {
    console.error('❌ Error loading models:', error.message);
    console.error('Full error:', error);
  }
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('⚠️  Starting server without MongoDB for testing...');
  
  // Load models without database connection for testing
  try {
    require('./models/User');
    require('./models/Event');
    require('./models/Guest');
    require('./models/Inventory');
    require('./models/Checkin');
    require('./models/UserAssignment');
    console.log('✅ Models loaded (database connection disabled)');
  } catch (error) {
    console.error('❌ Error loading models:', error.message);
  }
});

const PORT = process.env.PORT || 3001;

// Only start the server if this file is run directly (not imported for testing)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 API Base: http://localhost:${PORT}`);
  });
}

module.exports = app;