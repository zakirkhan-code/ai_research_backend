const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const forumRoutes = require('./routes/forumRoutes');
const userRoutes = require('./routes/userRoutes');
const documentRoutes = require('./routes/documentRoutes');
const projectRoutes = require('./routes/projectRoutes');

const app = express();

// CORS Configuration - MUST BE BEFORE OTHER MIDDLEWARE
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow any Vercel domain or localhost
    if (origin.includes('.vercel.app') || 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1')) {
      console.log('✅ CORS allowed for:', origin);
      return callback(null, true);
    }
    
    console.log('❌ CORS blocked for:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control'
  ],
  optionsSuccessStatus: 200
};

// Apply CORS middleware FIRST
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Additional CORS headers middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Set CORS headers for Vercel domains
  if (origin && (origin.includes('.vercel.app') || origin.includes('localhost'))) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request from:', origin);
    return res.status(200).end();
  }
  
  console.log('📡 Request from:', origin);
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Research Hub API is running',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
    cors: 'enabled - all vercel domains allowed'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/forums', forumRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      origin: req.headers.origin
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_research_hub';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully');
  console.log('📊 Database:', MONGODB_URI.includes('localhost') ? 'Local MongoDB' : 'MongoDB Atlas');
})
.catch(err => {
  console.error('❌ Database connection error:', err.message);
  process.exit(1);
});

// Server startup
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: ${process.env.NODE_ENV === 'production' ? 'https://airesearchbackend-production.up.railway.app' : `http://localhost:${PORT}`}`);
  console.log(`✅ CORS: All .vercel.app domains allowed`);
});