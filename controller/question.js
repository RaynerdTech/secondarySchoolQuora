const Question = require("../model/questionSchema");

const postQuestion = async (req, res) => {
  const { content, subject, tags } = req.body;

  // Extract the username from the JWT payload
  const { username } = req.user;

  try {
    const question = new Question({
      content,
      subject,
      tags,
      user: { username },
    });
  
    await question.save();
    res.status(201).json({ message: "Question posted successfully.", question });
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
      // Use `populate` to include the user who posted each question
      const questions = await Question.find(filter).populate("user", "username");
  
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
      const question = await Question.findById(id).populate("user", "username");
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
      const { username } = req.user; // Extract the username from the JWT payload
  
      // Validate that required fields are not empty
      if (!content || !subject) {
        return res.status(400).json({ error: "Content and subject are required fields." });
      }
  
      // Validate tags limit if provided
      if (tags && tags.length > 3) {
        return res.status(400).json({ error: "You can only provide up to 3 tags." });
      }
  
      // Find the question by ID
      const question = await Question.findById(id);
  
      if (!question) {
        return res.status(404).json({ error: "Question not found." });
      }
  
      // Check if the user attempting to update the question is the owner
      if (question.user.username !== username) {
        return res.status(403).json({ error: "You are not authorized to update this question." });
      }
  
      // Update the question
      const updatedQuestion = await Question.findByIdAndUpdate(
        id,
        { content, subject, tags }, // Fields to update
        { new: true, runValidators: true } // Return the updated document and apply schema validation
      );
  
      res.status(200).json({ message: "Question updated successfully", updatedQuestion });
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(500).json({ error: "An error occurred while updating the question." });
    }
  };
  
  
  

  //DELETE QUESTION 
  const deleteQuestion = async (req, res) => {
    const { id } = req.params; // Get the question ID from the URL parameters
    const { username } = req.user; // Extract the username from the JWT payload
  
    try {
      // Find the question by its ID
      const question = await Question.findById(id);
  
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
  
      // Check if the user attempting to delete the question is the owner
      if (question.user.username !== username) {
        return res.status(403).json({ message: "You are not authorized to delete this question" });
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