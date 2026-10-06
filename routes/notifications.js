const express = require("express");
const Notification = require("../models/Notification");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// ========== EXTRA FEATURE 2: NOTIFICATION CENTRE ==========
router.get("/", authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.userId }).sort({ createdAt: -1 }).limit(30);
        const unread = await Notification.countDocuments({ user: req.user.userId, read: false });
        res.json({ unread, notifications });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put("/read-all", authMiddleware, async (req, res) => {
    try {
        await Notification.updateMany({ user: req.user.userId, read: false }, { read: true });
        res.json({ message: "All notifications marked as read" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;