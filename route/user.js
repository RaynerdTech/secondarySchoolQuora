const express = require('express');
const { getUserProfile, getUser, updatePassword, updateRole, updateUserInfo, getRecentContributions } = require('../controller/user');
const verify = require('../middleware/verify');

const router = express.Router();

// Register route
router.get('/profile', verify, getUserProfile);
router.get('/get-user/:username', getUser);
router.put('/update-password', verify, updatePassword);
router.put('/update-role/:username', verify, updateRole);
router.put('/update-info', verify, updateUserInfo);
router.get('/recent-contributions', verify, getRecentContributions);

module.exports = router;
   