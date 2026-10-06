const mongoose = require('mongoose');
const Product = require('../models/productModel');
const { deleteFile } = require('../utils/fileHelper');

///////////////////////////////
// Helpers
///////////////////////////////

// Images are stored as "uploads/<filename>" in the database
const toImagePath = (filename) => `uploads/${filename}`;

// Pulls just the filename out of a stored image path
const toImageFilename = (image) => {
  if (!image) return null;
  return image.split('/').pop();
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Turns mongoose validation errors into a single readable message
const getValidationMessage = (error) => {
  if (error.errors) {
    return Object.values(error.errors)
      .map((e) => e.message)
      .join(', ');
  }
  return error.message;
};

///////////////////////////////
// POST /api/products
///////////////////////////////

const createProduct = async (req, res) => {
  try {
    const { name, description, price, category } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required',
      });
    }

    if (price === undefined || price === '') {
      return res.status(400).json({
        success: false,
        message: 'Product price is required',
      });
    }

    if (isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Product price must be a valid number greater than or equal to 0',
      });
    }

    if (category && !isValidObjectId(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category id',
      });
    }

    const image = req.file ? toImagePath(req.file.filename) : null;

    const product = await Product.create({
      name: name.trim(),
      description,
      price: Number(price),
      category: category || undefined,
      image,
    });

    await product.populate('category', 'name');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    // Do not leave the uploaded file behind if the product was not saved
    if (req.file) {
      deleteFile(req.file.filename);
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: getValidationMessage(error),
        error: 'ValidationError',
      });
    }

    res.status(400).json({
      success: false,
      message: 'Product creation failed',
      error: error.message,
    });
  }
};

///////////////////////////////
// GET /api/products
///////////////////////////////

const getProducts = async (req, res) => {
  try {
    const filter = {};

    if (req.query.category) {
      if (!isValidObjectId(req.query.category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category id',
        });
      }
      filter.category = req.query.category;
    }

    const products = await Product.find(filter)
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message,
    });
  }
};

///////////////////////////////
// GET /api/products/:id
///////////////////////////////

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product id',
      });
    }

    const product = await Product.findById(id).populate('category', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message,
    });
  }
};

///////////////////////////////
// PUT /api/products/:id
///////////////////////////////

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product id',
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      // Nothing to clean up, the new upload never belonged to a saved product
      if (req.file) {
        deleteFile(req.file.filename);
      }
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const { name, description, price, category } = req.body || {};

    // Build the update object from the fields that were actually sent
    const updates = {};

    if (name !== undefined) {
      if (!name || !name.trim()) {
        if (req.file) deleteFile(req.file.filename);
        return res.status(400).json({
          success: false,
          message: 'Product name cannot be empty',
        });
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (price !== undefined && price !== '') {
      if (isNaN(Number(price)) || Number(price) < 0) {
        if (req.file) deleteFile(req.file.filename);
        return res.status(400).json({
          success: false,
          message: 'Product price must be a valid number greater than or equal to 0',
        });
      }
      updates.price = Number(price);
    }

    if (category !== undefined) {
      // An empty string clears the category
      if (category === '' || category === null) {
        updates.category = null;
      } else if (!isValidObjectId(category)) {
        if (req.file) deleteFile(req.file.filename);
        return res.status(400).json({
          success: false,
          message: 'Invalid category id',
        });
      } else {
        updates.category = category;
      }
    }

    // A new image was uploaded -> replace the old one
    const oldImageFilename = toImageFilename(product.image);
    let newImageFilename = null;

    if (req.file) {
      newImageFilename = req.file.filename;
      updates.image = toImagePath(newImageFilename);
    }

    if (Object.keys(updates).length === 0) {
      if (req.file) deleteFile(req.file.filename);
      return res.status(400).json({
        success: false,
        message: 'No fields to update. Provide at least one of: name, description, price, category, image',
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updates, {
      returnDocument: 'after',
      runValidators: true,
    }).populate('category', 'name');

    if (!updatedProduct) {
      if (req.file) deleteFile(req.file.filename);
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Remove the previous image only after the update succeeded
    if (newImageFilename && oldImageFilename && oldImageFilename !== newImageFilename) {
      deleteFile(oldImageFilename);
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    // Update failed, so the newly uploaded file is no longer needed
    if (req.file) {
      deleteFile(req.file.filename);
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: getValidationMessage(error),
        error: 'ValidationError',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message,
    });
  }
};

///////////////////////////////
// DELETE /api/products/:id
///////////////////////////////

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product id',
      });
    }

    const product = await Product.findById(id).populate('category', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    await product.deleteOne();

    // Remove the image file from disk
    const imageFilename = toImageFilename(product.image);
    if (imageFilename) {
      deleteFile(imageFilename);
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message,
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};