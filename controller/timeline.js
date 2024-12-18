const Question = require("../model/questionSchema");
const User = require("../model/userSchema");

const getTimeline = async (req, res) => {
  try {
    // Get the user ID from the JWT (set by verify middleware)
    const userId = req.user.id;

    // Fetch the user's preferred categories
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const preferredCategories = user.preferredCategories;
    if (!preferredCategories || preferredCategories.length === 0) {
      return res.status(400).json({ message: "No preferred categories set" });
    }

    // Fetch questions matching the preferred categories
    const questions = await Question.find({
      subject: { $in: preferredCategories }, // Match subject to preferred categories
    })
      .sort({ createdAt: -1 }) // Sort by latest questions
      .populate("user", "username avatar") // Populate user with username and avatar
      .populate("subject", "name") // Populate subject (Category name)
      .exec();

    // Respond with the questions
    res.status(200).json({ message: "Timeline fetched successfully", questions });
  } catch (error) {
    console.error("Error fetching timeline:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

module.exports = { getTimeline };


