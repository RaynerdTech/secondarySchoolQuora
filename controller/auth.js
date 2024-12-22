const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../model/userSchema');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');


// Send email verification link
const sendVerificationEmail = async (user) => {
    const verificationToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    const verificationUrl = `${process.env.BASE_URL}/verify-email/${verificationToken}`;
  
    const transporter = nodemailer.createTransport({
      service: 'gmail', // You can use other services
      auth: {
        user: process.env.EMAIL, // Your email address
        pass: process.env.EMAIL_PASSWORD, // Your email password
      },
    });
  
    const mailOptions = {
      from: process.env.EMAIL,
      to: user.email,       
      subject: 'Email Verification',
      html: `
      <p>Thank you for registering on our platform.</p>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}" target="_blank">Click here to verify your account</a>
      <p>If you did not request this, please ignore this email.</p>
    `, // Use 'html' for rich-text content
    }; 
  
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
      } catch (error) {
        console.error('Error sending email:', error);
      }
  };


  const verifyEmail = async (req, res) => {
    try {
      // Extract the JWT from cookies
      const token = req.cookies.user_token;
  
      if (!token) {
        return res.status(400).json({
          message: "We couldn't find your token",
        });
      }
  
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
      // Find the user in the database
      const user = await User.findById(decoded.id);
  
      if (!user) {
        return res.status(404).json({
          message: "Hmm, we couldn't find your account. Are you sure you're using the correct email?",
        });
      }
  
      // Check if the user's email is already verified
      if (user.verified) {
        return res.status(400).json({
          message: "Great news! Your email is already verified. You can log in and start exploring.",
        });
      }
  
      // Mark the user as verified
      user.verified = true;
      await user.save();
  
      // Respond with success
      res.status(200).json({
        message: `🎉 Welcome aboard, ${user.username || 'user'}! Your email has been verified successfully. You can now log in and enjoy the full experience.`,
      });
    } catch (error) {
      console.error('Email verification failed:', error.message);
      res.status(500).json({
        message: "Something went wrong while verifying your email. Please try again or contact support if the issue persists.",
      });
    }
  };
  


// Register User
const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const existingUsername = await User.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') },
    });

    if (existingUsername) {
      return res.status(400).json({ message: 'Username not available' });
    }

    // Create a new user
    const user = new User({
      username,
      email,
      password,
    });

    // Save the user to the database
    await user.save();

    // Generate a JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Set token in cookies
    res.cookie('user_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
    });

    console.log("Token set in cookie:", token);

    // Send verification email to the user
    await sendVerificationEmail(user);

    // Respond with user info and the token
    res.status(201).json({
      message: 'Registration successful, please verify your email.',
      token, // Include the token in the response
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        role: user.role,
        notificationPreferences: user.notificationPreferences,
        preferredCategories: user.preferredCategories,
        badgeData: user.badgeData,
        classGrade: user.classGrade, // Added field
        schoolName: user.schoolName, // Added field
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

  
  
  
  

// Login User
     const isValidEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };
    
    const loginUser = async (req, res) => {
      const { email, username, password } = req.body;
    
      try {
        // Determine if the input is an email or username
        let user;
        if (isValidEmail(email) || username) {
          // Search by email if valid
          if (isValidEmail(email)) {
            user = await User.findOne({
              email: email.trim().toLowerCase(),
            });
          } else {
            // Search by username if not an email
            user = await User.findOne({
              username: username.trim(),
            });
          }
        }
    
        console.log('User found:', user);
    
        // If no user is found
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
    
        // Check if the account is a credential account
        if (user.credentialAccount) {
          // For credential accounts, only email or username is required
          if (!email && !username) {
            return res.status(400).json({ message: 'Email or username is required' });
          }
        } else {
          // For non-credential accounts, validate the password
          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
          }
        }
    
        // Update lastLogin
        user.lastLogin = new Date();
        await user.save();
    
        // Generate a JWT token
        const token = jwt.sign(
          { id: user._id, role: user.role, username: user.username },
          process.env.JWT_SECRET,
          { expiresIn: '1d' }
        );
    
        // Set token in cookies
        res.cookie('user_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'none',
        });
    
        // Respond with success
        res.status(200).json({
          message: 'Login successful',
          token,
          user: {
            lastLogin: user.lastLogin,
          },
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
      }
    };
    

             
//LOGOUT 
const logout = (req, res) => {
    try {
        // Clear the cookie to log the user out
        res.clearCookie('user_token');
        return res.status(200).json({ message: `Successfully logged out, ${req.user.role}` });
    } catch (error) {
        // Handle server errors
        console.log(error)
        return res.status(500).json({ error: "Failed to logout, please try again later" });
    }
};  


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // Your Google Client ID

const authRegister = async (req, res) => {
  const { idToken, username, email } = req.body;

  // Validate required fields
  if (!idToken || !email || !username) {
    return res.status(400).json({ message: "All required fields must be provided" });
  }

  try {
    // Verify the idToken using Google's OAuth2Client
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID, // Your Google Client ID
    });

    const payload = ticket.getPayload();
    const googleUserId = payload.sub; // Google user ID (unique)

    // Check if the email already exists
    let existingUser = await User.findOne({ email });

    if (existingUser) {
      // If the user exists and is already a Google credential account, log them in
      if (existingUser.credentialAccount) {
        const aboutUser = { id: existingUser.id, role: existingUser.role, username: existingUser.username };
        const token = jwt.sign(aboutUser, process.env.JWT_SECRET, { expiresIn: '12h' });

        // Set token in cookies
        res.cookie("user_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'none',
        });

        return res.status(200).json({
          message: "Login successful",
          token,
          user: existingUser,
        });
      } else {
        return res.status(400).json({
          message: "Illegal parameters: User already exists as a credential account",
        });
      }
    }

    // Check if the username already exists (case-insensitive)
    const existingUsername = await User.findOne({
      username: { $regex: new RegExp(`^${username.trim()}$`, 'i') },
    });

    if (existingUsername) {
      return res.status(400).json({ message: "Username not available" });
    }

    // Create a new user
    const newUser = new User({
      username,
      email,
      googleUserId, // Store Google user ID
      credentialAccount: true, // Mark as a credential account
      lastLogin: new Date(),
    });

    const savedUser = await newUser.save();

    // Send verification email to the user
    await sendVerificationEmail(savedUser);

    // Create a token for the newly registered user
    const aboutUser = { id: savedUser.id, role: savedUser.role, username: savedUser.username };
    const token = jwt.sign(aboutUser, process.env.JWT_SECRET, { expiresIn: '12h' });

    // Set the cookie securely
    res.cookie("user_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
    });

    return res.status(201).json({
      message: "Registration successful, please verify your email.",
      token,
      user: savedUser,
    });
  } catch (error) {
    console.error("Error during registration:", error);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
};


  
// Send Password Reset Email
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const resetUrl = `${process.env.BASE_URL}/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <p>You requested to reset your password.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" target="_blank">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    }; 

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Password reset link sent to your email.' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  // Ensure the new passwords match
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    // Verify the token and decode user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Compare the new password with the old one in the database
    const isPasswordSame = await bcrypt.compare(newPassword, user.password);

    if (isPasswordSame) {
      return res.status(400).json({ message: 'New password cannot be the same as the old password' });
    }

    // Update the password directly without re-hashing it
    user.password = newPassword; // Directly set the new password (no hashing)
    
    // Save the updated password to the database
    await user.save();

    res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Error during password reset:', error);
    res.status(400).json({ message: 'Invalid or expired token.' });
  }
};



  
module.exports = {
  registerUser,
  loginUser,
  logout,
  authRegister,
  verifyEmail,
  sendVerificationEmail,
  resetPassword,
  forgotPassword
};
