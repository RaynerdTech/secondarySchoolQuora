const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const authRoutes = require('./route/auth');
const userRoutes = require('./route/user');
const questionRoutes = require('./route/question');
const dotenv = require('dotenv');
const cors = require('cors');


dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      'https://edu-connect-7fh6.vercel.app', 
      'http://localhost:5173'
    ],
    credentials: true, // Allow cookies to be sent and received
  })
);


// Routes
app.use(authRoutes);
app.use(userRoutes);
app.use(questionRoutes);

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("Mongoose is connected"))
  .catch(err => console.log("Error connecting to MongoDB:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`app is running on port ${PORT}`);
});
