const Category = require("../models/categoryModel");
const { deleteFile } = require("../utils/fileHelper");

const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body || {};
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Category name is required",
            });
        }

        let image = null;
        if (req.file) {
            image = "uploads/" + req.file.filename;
        }

        const category = await Category.create({
            name,
            description,
            image,
        });

        res.status(201).json({
            success: true,
            message: "Category created successfully",
            category,
        });
    } catch (error) {
        if (req.file) {
            deleteFile(req.file.filename);
        }
        res.status(400).json({
            success: false,
            message: "Category creation failed",
            error: error.message,
        });
    }
};

const getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: categories.length,
            categories,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch categories",
            error: error.message,
        });
    }
};

module.exports = { createCategory, getCategories };
