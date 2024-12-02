const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcrypt'); // Import bcrypt for hashing

// Define the User schema
const UserSchema = new Schema(
  {
    username: {
      type: String,
      unique: true,
      trim: true,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email address!`,
      },
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
    },
    classGrade: {
        type: String,
        required: false, // Optional field
        trim: true,
      },
      schoolName: {
        type: String,
        required: false, // Optional field
        trim: true,
      },
      verified: {
        type: Boolean,
        default: false, // Default to false until email is verified
      },
    age: {
        type: Number,
    },
    password: {
      type: String,
      required: function() { return !this.credentialAccount; }, // Password required if not using credential account
    },
    bio: {
      type: String,
      maxlength: 150,
    },
    avatar: {
      type: String,
      default: 'https://default-avatar-url.com/avatar.png',
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    dateCreated: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
    },
    notificationPreferences: {
      newAnswers: { type: Boolean, default: true },
      upvotes: { type: Boolean, default: true },
      badges: { type: Boolean, default: true },
    },
    preferredCategories: {
      type: [String],
      default: ['Mathematics', 'English Language'], // Default must match values in the enum
      enum: {
        values: [
          'Mathematics', 
          'English Language', 
          'Biology', 
          'Chemistry', 
          'Physics', 
          'Accounting', 
          'Government', 
          'Literature', 
          'Economics', 
          'History'
        ],
        message: '{VALUE} is not a valid category', // Optional: Custom error message for enum validation
      },
    },
    badgeData: {
      badgesEarned: { type: Number, default: 0 },
      badgeLevels: { type: [String], default: [] },
      progress: {
        type: Map,
        of: Number,
        default: {},
      },
    },
    credentialAccount: { 
        type: Boolean, default: false 
    },
  },
  { 
    timestamps: true,
  }
);

// Pre-save middleware for hashing passwords
UserSchema.pre('save', async function (next) {
  try {
    if (this.isModified('password')) { // Check if password is modified
      const saltRounds = 10;
      this.password = await bcrypt.hash(this.password, saltRounds); // Hash the password
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Export the model
const User = mongoose.model('User', UserSchema);

module.exports = User;
