const express = require('express');
const { registerUser, loginUser, logout, authRegister, verifyEmail } = require('../controller/auth');
const verify = require('../middleware/verify');

const router = express.Router();

// Register route
router.post('/register', registerUser);

// Login route
router.post('/login', loginUser);

router.post('/logout', verify, logout);

router.post('/auth', authRegister);

router.get('/verify-email/:verificationToken', verifyEmail);

module.exports = router;
