const express = require('express');
const upload = require('../middleware/upload');
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const router = express.Router();

// Create a product (with optional image upload)
router.post('/', upload.single('image'), createProduct);

// Fetch all products
router.get('/', getProducts);

// Fetch single product details
router.get('/:id', getProductById);

// Update product details (optionally replace the image)
router.put('/:id', upload.single('image'), updateProduct);

// Delete product record and remove its image file from disk
router.delete('/:id', deleteProduct);

module.exports = router;