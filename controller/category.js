const Category = require('../model/categoriesSchema');
const User = require('../model/userSchema');

const createCategory = async (req, res) => {
    try {
      const { name } = req.body;
  
      if (!name) {
        return res.status(400).json({ success: false, message: "Category name is required." });
      }
  
      const category = new Category({ name });
      await category.save();
      res.status(201).json({ success: true, message: 'Category created successfully', category });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  

const getAllCategories = async (req, res) => {
  try { 
    const categories = await Category.find(); 
    res.status(200).json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getUserPreferences = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId).populate('preferredCategories', 'id name');
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.status(200).json({
      success: true,
      preferredCategories: user.preferredCategories, // Array of populated categories
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



const updatePreferredCategories = async (req, res) => {
  const userId = req.user.id; // Extract user ID from JWT
  const { categoryId } = req.body;

  if (!categoryId) {
    return res.status(400).json({ success: false, message: "Category ID is required." });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }

    const isCategoryPreferred = user.preferredCategories.includes(categoryId);

    if (isCategoryPreferred) {
      user.preferredCategories = user.preferredCategories.filter(
        (id) => id.toString() !== categoryId
      );
    } else {
      user.preferredCategories.push(categoryId);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: isCategoryPreferred
        ? `${category.name} removed from preferred categories.`
        : `${category.name} added to preferred categories.`,
      preferredCategories: user.preferredCategories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {createCategory, getAllCategories, updatePreferredCategories, getUserPreferences}
