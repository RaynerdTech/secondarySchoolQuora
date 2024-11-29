const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../model/userSchema');
const nodemailer = require('nodemailer');



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
    const {
      username,
      email,
      password,
      bio,
      avatar,
      role,
      notificationPreferences,
      preferredCategories,
      badgeData,
      classGrade,    // Added field
      schoolName,    // Added field
    } = req.body;
  
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
  
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({ message: 'Username not available' });
      }
  
      // Create a new user
      const user = new User({
        username,
        email,
        password,
        bio,
        avatar,
        role: role || 'student', // Default role
        notificationPreferences: {
          newAnswers: notificationPreferences?.newAnswers ?? true,
          upvotes: notificationPreferences?.upvotes ?? true,
          badges: notificationPreferences?.badges ?? true,
        },
        preferredCategories: preferredCategories || [],
        badgeData: {
          badgesEarned: badgeData?.badgesEarned || 0,
          badgeLevels: badgeData?.badgeLevels || [],
          progress: badgeData?.progress || {},
        },
        classGrade,   // Added field
        schoolName,   // Added field
        verified: false,  // Default to false, assuming email verification needs to be done
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


      // Send verification email to the user
      await sendVerificationEmail(user); // Send email verification after user registration
  
      // Respond with user info (excluding password)
      res.status(201).json({
        message: 'Registration successful, please verify your email.',
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
          classGrade: user.classGrade,  // Added field
          schoolName: user.schoolName,  // Added field
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  };
  
  
  
  

// Login User
const loginUser = async (req, res) => {
    const { email, username, password } = req.body;
  
    try {
      // Find the user by email or username
      const user = await User.findOne({
        $or: [{ email }, { username }],
      });
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Check if the password matches
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('Password valid:', isPasswordValid); // Debugging log
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
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


const authRegister = async (req, res) => {
  const {
    username,
    email,
    gender,
    bio,
    avatar,
    role = 'student', // Default role
    notificationPreferences,
    preferredCategories,
    badgeData,
    classGrade,    // Added field
    schoolName,    // Added field
  } = req.body;

  // Validate required fields
  if (!email) {
    return res.status(400).json({ message: "All required fields must be provided" });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.credentialAccount) {
        return res.status(400).json({
          message: "Illegal parameters: User already exists as a credential account",
        });
      }

      // If the user exists and is not a credential account, log them in
      const aboutUser = { id: existingUser.id, role: existingUser.role };
      const token = jwt.sign(aboutUser, process.env.JWT_SECRET, { expiresIn: '12h' });
      res.cookie("user_token", token, { httpOnly: true, sameSite: 'none' });
      return res.status(200).json({ message: "Login successful" });
    }

    // Create a new user
    const newUser = new User({
      username,
      email,
      gender,
      bio,
      avatar,
      role,
      notificationPreferences,
      preferredCategories,
      badgeData,
      classGrade,   // Added field
      schoolName,   // Added field
      verified: false,  // Default to false, assuming email verification needs to be done
      credentialAccount: true, // Mark as a credential account
    });

    const savedUser = await newUser.save();


    // Send verification email to the user
    await sendVerificationEmail(savedUser); // Send email verification after user registration
  

    // Create a token for the newly registered user
    const aboutUser = { id: savedUser.id, role: savedUser.role };
    const token = jwt.sign(aboutUser, process.env.JWT_SECRET, { expiresIn: '12h' });

    // Set the cookie securely
    res.cookie("user_token", token, { httpOnly: true, sameSite: 'strict' });

    return res.status(201).json({ message: "User created and login successful" });
  } catch (error) {
    console.error("Error during registration:", error);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
};

  
module.exports = {
  registerUser,
  loginUser,
  logout,
  authRegister,
  verifyEmail
};
