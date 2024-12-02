const User = require('../model/userSchema');
const Question = require("../model/questionSchema");
const bcrypt = require('bcrypt');
const {sendVerificationEmail}  = require('../controller/auth')

// Get User Profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming `req.user` contains the authenticated user's details

    // Find the user by ID and exclude the password field
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch all questions posted by the user, sorted in chronological order
    const questions = await Question.find({ "user.username": user.username }).sort({ createdAt: 1 });

    // Respond with the user's profile and their questions
    res.status(200).json({
      message: 'User profile and questions fetched successfully',
      user,
      questions,
    });
  } catch (error) {
    console.error('Error fetching user profile and questions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

  // Get user by username
  const getUser = async (req, res) => {
    try {
      const { username } = req.params; // Extract username from request params
  
      // Fetch the user by username, excluding sensitive fields
      const fetchedUser = await User.findOne({ username }).select(
        '-password -notificationPreferences -preferredCategories -credentialAccount -userId -verified'
      );
  
      if (!fetchedUser) {
        return res.status(404).json({ error: "User not found" });
      }
  
      // Fetch all questions associated with the user's username, sorted chronologically
      const questions = await Question.find({ "user.username": username }).sort({ createdAt: 1 });
  
      // Respond with the user data and their questions
      res.status(200).json({
        message: "User and questions fetched successfully",
        user: fetchedUser,
        questions,
      });
    } catch (err) {
      console.error("Error fetching user and questions:", err); // Log error for debugging
      res.status(500).json({ error: "Failed to retrieve user and questions" });
    }
  };
  
  
  const updatePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const { id } = req.user;
  
    try {
      const user = await User.findById(id);
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Old password does not match" });
      }
  
      if (oldPassword === newPassword) {
        return res.status(400).json({ message: "New password cannot be the same as the old one" });
      }
  
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await User.findByIdAndUpdate(id, { password: hashedNewPassword }, { new: true });
  
      res.status(200).json({ message: "Password successfully updated" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update password" });
    }
  };


  const updateRole = async (req, res) => {
    const { username } = req.params; // Get username from route params
    const { newRole } = req.body;   // Get newRole from request body
    const { role } = req.user;      // Get the role of the logged-in user
  
    // Get valid roles from the schema
    const validRoles = User.schema.path('role').enumValues;
  
    // Check if newRole is valid
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ message: "Invalid role provided" });
    }
  
    // Check if the logged-in user has permission
    if (role !== "superAdmin" && role !== "admin") {
      return res.status(403).json({ message: "You don't have permission to update roles" });
    }
  
    try {
      // Find the user by username and update their role
      const updatedUser = await User.findOneAndUpdate(
        { username },
        { role: newRole },
        { new: true }
      );
  
      // Check if the user exists
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // Respond with success
      res.status(200).json({
        message: "User role updated successfully",
        user: {
          username: updatedUser.username,
          role: updatedUser.role,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  };

  const updateUserInfo = async (req, res) => {
    const { id } = req.user; // From JWT
    const { gender, role, password, email, username, ...updateFields } = req.body; // Extract potentially sensitive fields
    
    // Declare emailUpdated variable before using it
    let emailUpdated = false;
  
    try {
      // Prevent updates to sensitive fields
      if (role || password) {
        return res
          .status(400)
          .json({ message: "Updating role or password is not allowed via this endpoint" });
      }
  
      // Validate gender if provided
      if (gender) {
        const validGenders = User.schema.path("gender").enumValues;
        if (!validGenders.includes(gender)) {
          return res.status(400).json({ message: "Invalid gender value" });
        }
        updateFields.gender = gender;
      }
  
      // Validate email if provided
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ message: "Invalid email format" });
        }
  
        // Check for duplicate email
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser._id.toString() !== id) {
          return res.status(400).json({ message: "Email already exists" });
        }
  
        updateFields.email = email;
        emailUpdated = true; // Set emailUpdated to true
      }
  
      // Validate username if provided
      if (username) {
        // Convert both the username in the request and the one in the database to lowercase for case-insensitive comparison
        const existingUsername = await User.findOne({ 
          username: { $regex: new RegExp(`^${username}$`, 'i') } 
        });
      
        if (existingUsername && existingUsername._id.toString() !== id) {
          return res.status(400).json({ message: "Username already exists" });
        }
      
        updateFields.username = username;
      }
      
      // Ensure there are fields to update
      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
  
      // Update the user's details
      const updatedUser = await User.findByIdAndUpdate(id, updateFields, {
        new: true,
        runValidators: true, // Ensures schema-level validation
      });
  
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // Send email verification if email was updated
      if (emailUpdated) {
        await sendVerificationEmail(updatedUser); // Send verification email
      }
  
      res.status(200).json({
        message: "User info updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error(error);
      if (error.code === 11000) { 
        if (error.keyPattern?.email) {
          return res.status(400).json({ message: "Email already exists" });
        }
        if (error.keyPattern?.username) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }
      res.status(500).json({ message: "Failed to update user info" });
    }
  };

  module.exports = {
    getUserProfile,
    getUser,
    updatePassword,
    updateRole,
    updateUserInfo
  };
  