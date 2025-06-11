const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
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

  app.use('/api/auth', authRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/guests', guestRoutes);
  app.use('/api/checkins', checkinRoutes);
  app.use('/api/inventory', inventoryRoutes);
  
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
    
    console.log('✅ All models loaded successfully');
  } catch (error) {
    console.error('❌ Error loading models:', error.message);
    console.error('Full error:', error);
  }
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API Base: http://localhost:${PORT}`);
});