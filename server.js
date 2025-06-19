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

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/forums', forumRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);

// Health check route

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Research Hub API is running',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_research_hub')
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('Database connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
