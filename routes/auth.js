const express = require("express");
const crypto = require("crypto");
const User = require("../models/User");
const { generateToken, authMiddleware } = require("../middleware/auth");

const router = express.Router();

// ========== REGISTER (restaurant or NGO) ==========
router.post("/register", async (req, res) => {
    try {
        const { name, ownerName, email, password, role, phone, address, city, lat, long, registrationNo, capacity } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: "Name, email, password and account type are required" });
        }
        if (!["restaurant", "ngo"].includes(role)) {
            return res.status(400).json({ error: "Account type must be restaurant or ngo" });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }
        const latitude = parseFloat(lat);
        const longitude = parseFloat(long);
        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
            return res.status(400).json({ error: "Location is required. Click 'Use my location' or enter latitude and longitude" });
        }

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ error: "This email is already registered" });

        const user = await User.create({
            name, ownerName, email, password, role, phone, address, city, registrationNo,
            capacity: role === "ngo" ? Number(capacity) || 0 : 0,
            location: { lat: latitude, long: longitude }
        });

        res.status(201).json({
            message: "Registration successful",
            token: generateToken(user._id, user.role),
            user: user.toSafeJSON()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== LOGIN ==========
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

        const cleanEmail = String(email).trim().toLowerCase();
        const cleanPassword = String(password);

        const user = await User.findOne({ email: cleanEmail });
        if (!user) {
            return res.status(401).json({ error: "Wrong email or password" });
        }

        const passwordMatches = (await user.matchPassword(cleanPassword)) || 
                                (await user.matchPassword(cleanPassword.trim()));
        if (!passwordMatches) {
            return res.status(401).json({ error: "Wrong email or password" });
        }
        res.json({
            message: "Login successful",
            token: generateToken(user._id, user.role),
            user: user.toSafeJSON()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== CURRENT USER ==========
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ user: user.toSafeJSON() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== SUBMIT / UPDATE VERIFICATION DETAILS ==========
router.put("/verification-details", authMiddleware, async (req, res) => {
    try {
        const { registrationNo, verificationDocs, phone, address, city } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        if (registrationNo) user.registrationNo = registrationNo.trim();
        if (verificationDocs) user.verificationDocs = verificationDocs.trim();
        if (phone) user.phone = phone.trim();
        if (address) user.address = address.trim();
        if (city) user.city = city.trim();

        // If previously rejected, allow re-requesting verification
        if (user.verificationStatus === "rejected") {
            user.verificationStatus = "pending";
            user.rejectionReason = "";
        }

        await user.save();
        res.json({
            message: "Verification information updated successfully",
            user: user.toSafeJSON()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== FORGOT PASSWORD ==========
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Please enter your registered email address" });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({ error: "No account found with this email address" });
        }

        // Generate secure 32-byte hex token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

        // Token valid for 1 hour
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
        await user.save();

        const resetUrl = `reset-password.html?token=${resetToken}`;

        res.json({
            message: "Password reset link generated successfully. Please use the link below to set a new password.",
            resetToken,
            resetUrl,
            expiresIn: "1 hour"
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== RESET PASSWORD ==========
router.post("/reset-password", async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ error: "Reset token and new password are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "New password must be at least 6 characters" });
        }

        const hashedToken = crypto.createHash("sha256").update(token.trim()).digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ error: "Password reset token is invalid or has expired. Please request a new link." });
        }

        // Updating password triggers userSchema.pre('save') which hashes with bcrypt
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({
            message: "Password has been successfully reset! You can now log in with your new credentials."
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;