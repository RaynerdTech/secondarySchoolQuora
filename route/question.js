const express = require('express');
const verify = require('../middleware/verify');
// Importing the controller function
const {postQuestion, getQuestionById, getAllQuestions, deleteQuestion, updateQuestion, getRecentContributions } = require('../controller/question');
const router = express.Router();

// Define the route to get all questions with the user who owns them
router.get('/questions', getAllQuestions);
router.post('/create-question', verify, postQuestion);   
router.get('/question/:id', getQuestionById);
router.delete('/delete-question/:id', verify, deleteQuestion);
router.put('/update-question/:id', verify, updateQuestion);



module.exports = router; 
    