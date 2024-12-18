const Question = require("../model/questionSchema");
const Category = require('../model/categoriesSchema');

const postQuestion = async (req, res) => {
  const { content, subject, tags } = req.body;

  // Extract the user ID from the JWT payload (assuming it's stored in req.user)
  const userId = req.user.id;

  if (!userId) {
    return res.status(400).json({ success: false, message: "User not authenticated." });
  }

  if (!content || !subject) {
    return res.status(400).json({ success: false, message: "Content and subject are required." });
  }

  try {
    // Validate that the subject exists in the Category collection
    const category = await Category.findById(subject);
    if (!category) {
      return res.status(400).json({ success: false, message: "Invalid category selected." });
    }

    // Create a new question
    const question = new Question({
      content,
      subject, // Save the valid category ID
      tags,
      user: userId, // Store the user ID
    });

    // Save the question to the database
    await question.save();

    // Populate the question with the user's username and avatar, and the category name
    const populatedQuestion = await Question.findById(question._id)
      .populate('user', 'username avatar') // Populate user with username and avatar
      .populate('subject', 'name'); // Populate subject with the category name

    res.status(201).json({
      success: true,
      message: "Question posted successfully.",
      question: populatedQuestion,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to post question.", details: err.message });
  }
};




// Fetch all questions with optional search and sorting functionality
const getAllQuestions = async (req, res) => {
  try {
    const { search, subject, tags } = req.query;

    const filter = {};

    // Add search filter for question content
    if (search) {
      filter.content = { $regex: search, $options: "i" }; // Case-insensitive regex search
    }

    // If a subject name is provided, find its ObjectId
    if (subject) {
      const subjectObj = await Category.findOne({ name: subject });
      if (subjectObj) {
        filter.subject = subjectObj._id; // Use the category's ObjectId for filtering
      } else {
        return res.status(400).json({ success: false, message: "Subject not found." });
      }
    }

    // Filter by tags (ensure all specified tags exist in the question's tags array)
    if (tags) {
      const tagsArray = tags.split(","); // Convert comma-separated tags into an array
      filter.tags = { $all: tagsArray }; // Matches questions containing all tags
    }

    // Fetch questions based on the dynamic filter
    const questions = await Question.find(filter)
      .populate("user", "username avatar") // Populate user fields (username and avatar)
      .populate("subject", "name") // Populate subject (category name)
      .sort({ createdAt: -1 }); // Sort by most recent

    res.status(200).json({ success: true, questions });
  } catch (err) {
    console.error("Error fetching questions:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch questions", error: err.message });
  }
};



  // Fetch a single question by its ID
const getQuestionById = async (req, res) => {
    const { id } = req.params; // Extract the question ID from the route parameters
  
    try {
      // Find the question by its ID and populate the username of the user who posted it
      const question = await Question.findById(id).populate("user", "username avatar");
      if (!question) {
        // If no question is found, return a 404 error
        return res.status(404).json({ error: "Question not found." });
      }
      // Return the question details
      res.status(200).json({ question });
    } catch (err) {
      // Handle errors, such as invalid question ID format
      res.status(400).json({ error: "Invalid question ID.", details: err.message });
    }
  };


  //UPDATE QUESTION 
  const updateQuestion = async (req, res) => {
    try {
      const { id } = req.params; // Extract question ID from the route params
      const { content, subject, tags } = req.body; // Extract fields from the request body
      const userId = req.user.id; // Extract the user ID from the JWT payload
  
      // Validate that required fields are not empty
      if (!content || !subject) {
        return res.status(400).json({ error: "Content and subject are required fields." });
      }
  
      // Validate tags limit if provided
      if (tags && tags.length > 3) {
        return res.status(400).json({ error: "You can only provide up to 3 tags." });
      }
  
      // Validate that the subject exists in the Category collection
      const validSubject = await Category.findOne({ name: subject });
      if (!validSubject) {
        return res.status(400).json({ error: "Invalid subject. Please select a valid subject." });
      }
  
      // Find the question by ID and populate the user field
      const question = await Question.findById(id).populate("user");
      if (!question) {
        return res.status(404).json({ error: "Question not found." });
      }
  
      // Check if the user attempting to update the question is the owner
      if (String(question.user._id) !== userId) {
        return res.status(403).json({ error: "You are not authorized to update this question." });
      }
  
      // Update the question fields
      question.content = content;
      question.subject = validSubject._id; // Update subject with the valid ObjectId
      question.tags = tags || question.tags; // Keep existing tags if none are provided
  
      // Save the updated question
      const updatedQuestion = await question.save();
  
      res.status(200).json({ message: "Question updated successfully", updatedQuestion });
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(500).json({ error: "An error occurred while updating the question." });
    }
  };
  
  
  

  //DELETE QUESTION 
  const deleteQuestion = async (req, res) => {
    const { id } = req.params; // Get the question ID from the URL parameters
    const userId = req.user.id; // Extract the user ID from the JWT payload
  
    try {
      // Find the question by its ID
      const question = await Question.findById(id).populate("user");
  
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
  
      // Check if the user attempting to delete the question is the owner
      if (String(question.user._id) !== userId) { // Use _id from the populated user field
        return res.status(403).json({ error: "You are not authorized to update this question." });
      }
   
      // Delete the question
      await Question.findByIdAndDelete(id);
  
      res.status(200).json({ message: "Question deleted successfully" });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ message: "Server error while deleting question" });
    }
  };





 
  

module.exports = {postQuestion, getAllQuestions, getQuestionById, deleteQuestion, updateQuestion}