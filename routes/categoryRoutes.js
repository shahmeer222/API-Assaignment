const express = require('express');
const upload = require('../middleware/upload');
const { createCategory, getCategories } = require('../controllers/categoryController');

const router = express.Router();

router.post('/', upload.single('image'), createCategory);
router.get('/', getCategories);

module.exports = router;
