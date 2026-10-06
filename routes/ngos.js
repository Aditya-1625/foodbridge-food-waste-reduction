const express = require("express");
const User = require("../models/User");
const { authMiddleware, authorize } = require("../middleware/auth");
const { distanceKm } = require("../utils/helpers");

const router = express.Router();

// ========== FEATURE: NEARBY SHELTER / NGO MATCHING ==========
// GET /api/ngos/nearby?radius=25&lat=..&long=..   (restaurant only)
// If lat/long are not sent, the restaurant's saved location is used.
router.get("/nearby", authMiddleware, authorize("restaurant"), async (req, res) => {
    try {
        const me = await User.findById(req.user.userId);
        const lat = req.query.lat ? parseFloat(req.query.lat) : me.location.lat;
        const long = req.query.long ? parseFloat(req.query.long) : me.location.long;
        const radius = parseFloat(req.query.radius) || 25;

        const ngos = await User.find({ role: "ngo" }).select("-password -__v");

        const matched = ngos
            .map((n) => ({
                _id: n._id,
                name: n.name,
                address: n.address,
                city: n.city,
                phone: n.phone,
                capacity: n.capacity,
                location: n.location,
                distanceKm: Math.round(distanceKm(lat, long, n.location.lat, n.location.long) * 10) / 10
            }))
            .filter((n) => n.distanceKm <= radius)
            .sort((a, b) => a.distanceKm - b.distanceKm);

        res.json({ count: matched.length, radius, ngos: matched });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;