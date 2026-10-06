require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const connectDB = require('./config/db');

const app = express();

const PORT = process.env.PORT || 4000;

connectDB();

app.use(cors());
app.use(express.json());

// Serve the uploads folder as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    endpoints: {
      categories: `http://localhost:${PORT}/api/categories`,
      products: `http://localhost:${PORT}/api/products`,
    },
  });
});

app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/products', require('./routes/productRoutes'));

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Central error handler
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  // Multer errors (file too large, wrong field name, etc.)
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large (max 5MB)',
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: `Unexpected file field "${error.field}". Upload the image using the "image" field.`,
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  // File filter rejection and other bad input
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON body',
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid value for "${error.path}"`,
    });
  }

  if (error) {
    const status = error.status || error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }

  next();
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});