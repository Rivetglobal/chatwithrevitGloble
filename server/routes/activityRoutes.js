const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const activityController = require("../controllers/activityController");

router.post("/heartbeat", auth, activityController.heartbeat);

module.exports = router;
