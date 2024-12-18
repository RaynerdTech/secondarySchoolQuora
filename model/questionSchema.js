const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 300,
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', // Reference to the Category schema
    required: true,
  },
  tags: {
    type: [String],
    enum: [
      "Algebra",
      "Equations",
      "Photosynthesis",
      "Newtonian",
      "Grammar",
      "Shakespeare",
      "Economics",
      "World History",
    ],
    default: [],
    validate: [arrayLimit, "{PATH} exceeds the limit of 3"],
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,  // Referencing the User model
    ref: 'User',  // Referencing the User model
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

function arrayLimit(val) {
  return val.length <= 3;
}

const Question = mongoose.model("Question", questionSchema);

module.exports = Question;