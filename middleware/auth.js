const jwt = require("jsonwebtoken");

const generateToken = (userId, role) =>
    jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Please log in first" });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: "Session expired. Please log in again" });
    }
};

// Usage: authorize("restaurant")  or  authorize("restaurant", "ngo")
const authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: "This action is only for: " + roles.join(", ") });
    }
    next();
};

module.exports = { authMiddleware, authorize, generateToken };