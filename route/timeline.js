const express = require("express");
const verify = require("../middleware/verify"); // Middleware to verify JWT
const { getTimeline } = require("../controller/timeline");

const router = express.Router();

router.get("/timeline", verify, getTimeline);

module.exports = router;
