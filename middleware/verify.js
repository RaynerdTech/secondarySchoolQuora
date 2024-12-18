const jwt = require('jsonwebtoken');

const verify = (req, res, next) => {
  try {
    // Ensure cookies are available
    const { user_token } = req.cookies;
    if (!user_token) {
      return res.status(401).json({ message: "Authentication token missing" });
    }

    // Verify and decode token
    const decoded = jwt.verify(user_token, process.env.JWT_SECRET);
    console.log('Decoded Token:', decoded); // Debugging log
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
  
module.exports = verify;
