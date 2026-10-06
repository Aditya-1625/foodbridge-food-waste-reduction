const express = require("express");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");
const { distanceKm, computeUrgency } = require("../utils/helpers");

const router = express.Router();

// ========== FEATURE 1: AI FOOD DONATION ASSISTANT ==========
// POST /api/ai/assist
router.post("/assist", authMiddleware, async (req, res) => {
    try {
        const { foodName, foodType, quantity, unit, prepTime, expiryTime, lat, long } = req.body;

        if (!foodType || !quantity || !expiryTime) {
            return res.status(400).json({ error: "Food type, quantity and expiry time are required for AI analysis" });
        }

        const qtyNum = parseFloat(quantity);
        if (Number.isNaN(qtyNum) || qtyNum <= 0) {
            return res.status(400).json({ error: "Quantity must be a positive number" });
        }

        const expDate = new Date(expiryTime);
        if (Number.isNaN(expDate.getTime())) {
            return res.status(400).json({ error: "Invalid expiry date/time format" });
        }

        const now = Date.now();
        const hoursLeft = (expDate.getTime() - now) / 3600000;
        if (hoursLeft <= 0) {
            return res.status(400).json({ error: "Food expiry time must be in the future" });
        }

        // 1. Urgency & Priority Analysis
        const urgencyMeta = computeUrgency(expDate);
        let priorityLevel = 3;
        let priorityLabel = "Priority 3 (Standard Dispatch)";
        let dispatchWindow = "Dispatch within 4-6 hours";

        if (hoursLeft <= 2) {
            priorityLevel = 1;
            priorityLabel = "Priority 1 (Emergency Rescue)";
            dispatchWindow = "Immediate pickup required (within 60-90 minutes)";
        } else if (hoursLeft <= 6) {
            priorityLevel = 2;
            priorityLabel = "Priority 2 (High Urgency)";
            dispatchWindow = "Dispatch within 2-3 hours";
        }

        // 2. Portion & Servings Calculation
        let estimatedServings = 0;
        const normalizedUnit = (unit || "kg").toLowerCase();
        if (normalizedUnit === "portions") {
            estimatedServings = Math.round(qtyNum);
        } else if (normalizedUnit === "kg") {
            const multipliers = { cooked: 3.3, raw: 2.8, packaged: 3.0, bakery: 4.0 };
            estimatedServings = Math.round(qtyNum * (multipliers[foodType] || 3.0));
        } else if (normalizedUnit === "liter") {
            estimatedServings = Math.round(qtyNum * (foodType === "cooked" ? 4.0 : 3.2));
        } else {
            estimatedServings = Math.round(qtyNum * 3.0);
        }

        // 3. Best NGO / Shelter Matching from Database
        const currentUser = await User.findById(req.user.userId);
        const userLat = lat ? parseFloat(lat) : currentUser?.location?.lat || 16.4016;
        const userLong = long ? parseFloat(long) : currentUser?.location?.long || 74.3792;

        const ngos = await User.find({ role: "ngo" }).select("name address city phone capacity location verificationStatus trustScore");

        const scoredNgos = ngos.map((ngo) => {
            const dKm = distanceKm(userLat, userLong, ngo.location.lat, ngo.location.long);
            // Scoring algorithm: higher score is better match
            // Distance weight (closer is better), capacity weight (can shelter accommodate servings), verification boost
            let score = 100 - Math.min(dKm * 2, 70);
            if (ngo.capacity && ngo.capacity >= estimatedServings) score += 20;
            if (ngo.verificationStatus === "verified") score += 15;
            return {
                _id: ngo._id,
                name: ngo.name,
                address: [ngo.address, ngo.city].filter(Boolean).join(", "),
                phone: ngo.phone,
                capacity: ngo.capacity,
                distanceKm: Math.round(dKm * 10) / 10,
                verificationStatus: ngo.verificationStatus,
                score
            };
        }).sort((a, b) => b.score - a.score);

        const topNgo = scoredNgos[0] || null;

        // 4. Food Safety, Storage & Packaging Guidelines (HACCP Standards)
        const storageGuidelines = [];
        const safetyChecklist = [];

        if (foodType === "cooked") {
            storageGuidelines.push("Maintain hot food strictly above 60°C or chill rapidly to under 4°C within 90 minutes.");
            storageGuidelines.push("Use clean, food-grade insulated thermal carriers or sanitized stainless-steel containers.");
            storageGuidelines.push("Clearly label preparation time, packing time, and primary allergens (e.g. dairy, nuts, gluten).");
            safetyChecklist.push("Visual sensory test: No sour odor or abnormal texture");
            safetyChecklist.push("Containers sealed with tamper-evident tape or secure clips");
            safetyChecklist.push("Direct hand contact avoided using clean tongs/gloves");
        } else if (foodType === "bakery") {
            storageGuidelines.push("Store in dry, clean, breathable food-grade liners at ambient 18-22°C.");
            storageGuidelines.push("Do not refrigerate crusty bread to avoid rapid retrogradation and staling.");
            storageGuidelines.push("Keep away from high humidity and strong-smelling spices or onions.");
            safetyChecklist.push("No mold spots or moisture condensation inside bags");
            safetyChecklist.push("Bakery items placed flat to avoid crushing");
        } else if (foodType === "raw") {
            storageGuidelines.push("Store fresh produce in ventilated crates at 10-15°C.");
            storageGuidelines.push("Keep raw vegetables completely segregated from cooked foods.");
            storageGuidelines.push("Protect items from direct sunlight and vehicle exhaust during transit.");
            safetyChecklist.push("Produce inspected for rot or damage");
            safetyChecklist.push("Transport boxes lined with clean parchment or crate liners");
        } else {
            storageGuidelines.push("Verify manufacturer seal integrity and ensure original packaging is intact.");
            storageGuidelines.push("Store off the floor on clean pallets or shelving away from moisture.");
            safetyChecklist.push("Packaging has no tears, punctures, or swelling");
            safetyChecklist.push("Original ingredient labels and best-before dates clearly visible");
        }

        // 5. Environmental & Social Impact Forecast
        const approxKg = normalizedUnit === "portions" ? qtyNum * 0.4 : qtyNum;
        const co2SavedKg = Math.round(approxKg * 2.5 * 10) / 10;

        // 6. Natural Language AI Synthesis
        let aiSummary = `This donation of ${quantity} ${unit} ${foodName || foodType} has an estimated rescue potential of ${estimatedServings} meals, preventing approx. ${co2SavedKg} kg of CO2 equivalent emissions. Urgency is evaluated as ${urgencyMeta.level} (${Math.round(hoursLeft * 10) / 10} hours remaining). ${topNgo ? `Recommended distribution partner: ${topNgo.name} (${topNgo.distanceKm} km away).` : ""}`;

        // Optional external Gemini API integration if GEMINI_API_KEY is configured
        if (process.env.GEMINI_API_KEY) {
            try {
                const prompt = `You are the FoodBridge AI Food Safety & Donation Expert. A restaurant is donating ${quantity} ${unit} of "${foodName || 'Surplus Food'}" (Type: ${foodType}). Preparation Time: ${prepTime || 'N/A'}. Expiry: ${expiryTime}. Give 2 concise, professional sentences on optimal distribution timing and handling.`;
                const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                if (geminiRes.ok) {
                    const data = await geminiRes.json();
                    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) aiSummary = text.trim();
                }
            } catch (e) {
                // Graceful fallback to deterministic engine
            }
        }

        res.json({
            urgency: urgencyMeta.level,
            urgencyColor: urgencyMeta.badge,
            priorityLevel,
            priorityLabel,
            dispatchWindow,
            hoursLeft: Math.round(hoursLeft * 10) / 10,
            estimatedServings,
            co2SavedKg,
            storageGuidelines,
            safetyChecklist,
            recommendedNgo: topNgo,
            allNearbyNgos: scoredNgos.slice(0, 5),
            aiSummary
        });
    } catch (err) {
        console.error("AI Assistant error:", err);
        res.status(500).json({ error: "Failed to generate AI recommendations: " + err.message });
    }
});

module.exports = router;
