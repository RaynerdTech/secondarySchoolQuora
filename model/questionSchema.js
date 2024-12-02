const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 300,
  },
  subject: {
    type: String,
    enum: [
      "Mathematics",
      "English Language",
      "Biology",
      "Chemistry",
      "Physics",
      "Accounting",
      "Government",
      "Literature",
      "Economics",
      "History",
    ],
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
    username: { type: String, required: true }, // Store only the username
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