// routes/categoryRoutes.js
const express = require('express');
const { createCategory, getAllCategories, updatePreferredCategories, getUserPreferences } = require('../controller/category');
const verify = require('../middleware/verify');

const router = express.Router();

router.post('/add-category', createCategory);
router.get('/all-categories', getAllCategories);
router.post("/update-categories", verify, updatePreferredCategories);
router.get('/categories-preferences', verify, getUserPreferences);


module.exports = router;
