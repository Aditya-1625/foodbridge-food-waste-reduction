const express = require("express");
const User = require("../models/User");
const Donation = require("../models/Donation");
const { authMiddleware, authorize } = require("../middleware/auth");
const { notify } = require("../utils/helpers");

const router = express.Router();

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(authorize("admin"));

// ========== ADMIN OVERVIEW STATS ==========
router.get("/overview", async (req, res) => {
    try {
        const [totalRestaurants, totalNgos, totalDonations, pendingVerifications, verifiedCount] = await Promise.all([
            User.countDocuments({ role: "restaurant" }),
            User.countDocuments({ role: "ngo" }),
            Donation.countDocuments(),
            User.countDocuments({ role: { $in: ["restaurant", "ngo"] }, verificationStatus: "pending" }),
            User.countDocuments({ role: { $in: ["restaurant", "ngo"] }, verificationStatus: "verified" })
        ]);

        res.json({
            totalRestaurants,
            totalNgos,
            totalDonations,
            pendingVerifications,
            verifiedCount
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== LIST ALL ORGANIZATIONS FOR VERIFICATION ==========
router.get("/verifications", async (req, res) => {
    try {
        const { status, role } = req.query;
        const filter = { role: { $in: ["restaurant", "ngo"] } };
        if (status) filter.verificationStatus = status;
        if (role) filter.role = role;

        const users = await User.find(filter)
            .select("-password -__v")
            .sort({ createdAt: -1 });

        // Calculate completed donations for each organization
        const enriched = await Promise.all(
            users.map(async (u) => {
                const completedCount = await Donation.countDocuments(
                    u.role === "restaurant"
                        ? { restaurant: u._id, status: "Completed" }
                        : { acceptedBy: u._id, status: "Completed" }
                );
                const userObj = u.toObject();
                userObj.completedDonationsCount = completedCount;
                return userObj;
            })
        );

        res.json({ count: enriched.length, organizations: enriched });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== APPROVE OR REJECT VERIFICATION ==========
// PUT /api/admin/verify/:userId
router.put("/verify/:userId", async (req, res) => {
    try {
        const { status, reason, trustScore } = req.body;
        if (!["verified", "rejected", "pending"].includes(status)) {
            return res.status(400).json({ error: "Status must be 'verified', 'rejected', or 'pending'" });
        }

        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        user.verificationStatus = status;
        user.verificationDate = new Date();
        user.verifiedBy = req.user.userId;
        if (status === "rejected") {
            user.rejectionReason = reason || "Documentation or licensing requirements not met.";
        } else if (status === "verified") {
            user.rejectionReason = "";
        }
        if (typeof trustScore === "number" && trustScore >= 1 && trustScore <= 5) {
            user.trustScore = trustScore;
        }
        await user.save();

        // Send real-time notification to the user
        const notificationMsg = status === "verified"
            ? "Congratulations! Your FoodBridge organization profile has been officially verified."
            : `Your verification request was reviewed and marked as rejected: ${user.rejectionReason}`;

        await notify(user._id, notificationMsg, status === "verified" ? "accepted" : "rejected");

        res.json({
            message: `Organization marked as ${status}`,
            user: user.toSafeJSON()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
