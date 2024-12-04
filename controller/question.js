const Question = require("../model/questionSchema");

const postQuestion = async (req, res) => {
  const { content, subject, tags } = req.body;

  // Extract the user ID from the JWT payload (assuming it's stored in req.user)
  const userId = req.user.id;

  if (!userId) {
    return res.status(400).json({ error: "User not authenticated." });
  }

  try {
    // Create a new question with the user ID reference
    const question = new Question({
      content,
      subject,
      tags,
      user: userId,  // Store only the user ID, not the username or avatar
    });

    // Save the question to the database
    await question.save();

    // Populate the question with the user's username and avatar after saving it
    const populatedQuestion = await Question.findById(question._id)
      .populate('user', 'username avatar');  // Populate with the user's username and avatar fields

    res.status(201).json({ message: "Question posted successfully.", question: populatedQuestion });
  } catch (err) {
    res.status(400).json({ error: "Failed to post question.", details: err.message });
  }
};



// Fetch all questions with optional search and sorting functionality
const getAllQuestions = async (req, res) => {
  try {
    // Extracting query parameters from the request (e.g., /questions?search=math&subject=Physics)
    const { search, subject, tags } = req.query;

    // Building a dynamic filter object based on the query parameters
    const filter = {};

    // If a search term is provided, add a regex filter to match question content (case-insensitively)
    if (search) {
      filter.content = { $regex: search, $options: "i" }; // Matches any content containing the search term
    }

    // If a subject (category) is provided, filter by it
    if (subject) {
      filter.subject = subject; // Filters for the exact subject name (e.g., "Physics")
    }

    // If tags are provided, ensure questions include all specified tags
    if (tags) {
      const tagsArray = tags.split(","); // Convert the comma-separated tags into an array
      filter.tags = { $all: tagsArray }; // Ensures all specified tags exist in the question's tags array
    }

    // Fetch questions from the database with the dynamic filter
    // Use `populate` to include the user who posted each question and sort by `createdAt` (ascending or descending)
    const questions = await Question.find(filter)
      .populate('user', 'username avatar') // Populate user info (username & avatar)
      .sort({ createdAt: -1 }); // Sort by createdAt in descending order (most recent first)

    // Return the retrieved questions in the response
    res.status(200).json({ success: true, questions });
  } catch (err) {
    // Handle errors (e.g., database connection issues)
    console.error("Error fetching questions:", err);
    res.status(500).json({ success: false, message: "Failed to fetch questions" });
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
  
      // Find the question by ID and populate the user field
      const question = await Question.findById(id).populate("user");
  
      if (!question) {
        return res.status(404).json({ error: "Question not found." });
      }
  
      console.log("Fetched Question:", question);
  
      // Check if the user attempting to update the question is the owner
      if (String(question.user._id) !== userId) { // Use _id from the populated user field
        return res.status(403).json({ error: "You are not authorized to update this question." });
      }
  
      // Update the question fields
      question.content = content;
      question.subject = subject;
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