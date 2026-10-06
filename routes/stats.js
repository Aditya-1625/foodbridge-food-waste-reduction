const express = require("express");
const Donation = require("../models/Donation");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");
const { toKg, toMeals, CO2_PER_KG } = require("../utils/helpers");

const router = express.Router();

// ========== IMPACT ANALYTICS (Personal dashboard numbers) ==========
router.get("/impact", authMiddleware, async (req, res) => {
    try {
        const filter = req.user.role === "restaurant" ? { restaurant: req.user.userId } : { acceptedBy: req.user.userId };
        const all = await Donation.find(filter);
        const completed = all.filter((d) => d.status === "Completed");

        const kg = completed.reduce((s, d) => s + toKg(d.quantity, d.unit), 0);
        const meals = completed.reduce((s, d) => s + toMeals(d.quantity, d.unit), 0);

        // breakdown by food type (all non-cancelled)
        const byType = {};
        all.filter((d) => !["Cancelled", "Rejected", "Expired"].includes(d.status)).forEach((d) => {
            byType[d.foodType] = (byType[d.foodType] || 0) + 1;
        });

        // last 7 days (kg of food donated per day)
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const day = new Date();
            day.setHours(0, 0, 0, 0);
            day.setDate(day.getDate() - i);
            days.push({ date: day, label: day.toLocaleDateString("en-IN", { weekday: "short" }), kg: 0 });
        }
        all.filter((d) => !["Cancelled", "Rejected", "Expired"].includes(d.status)).forEach((d) => {
            const created = new Date(d.createdAt);
            created.setHours(0, 0, 0, 0);
            const slot = days.find((x) => x.date.getTime() === created.getTime());
            if (slot) slot.kg += toKg(d.quantity, d.unit);
        });

        const count = (s) => all.filter((d) => d.status === s).length;
        res.json({
            totalDonations: all.length,
            completed: completed.length,
            active: count("Pending") + count("Accepted") + count("PickedUp"),
            pending: count("Pending"),
            kgSaved: Math.round(kg * 10) / 10,
            mealsProvided: Math.round(meals),
            co2SavedKg: Math.round(kg * CO2_PER_KG * 10) / 10,
            byType,
            last7Days: days.map((d) => ({ label: d.label, kg: Math.round(d.kg * 10) / 10 }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== FEATURE 3: FOOD WASTE FORECASTING & ANALYTICS ==========
// GET /api/stats/forecast (restaurant & admin)
router.get("/forecast", authMiddleware, async (req, res) => {
    try {
        const filter = req.user.role === "restaurant" ? { restaurant: req.user.userId } : {};
        const donations = await Donation.find(filter).sort({ createdAt: 1 });

        const totalCount = donations.length;
        const completed = donations.filter((d) => d.status === "Completed");
        const expired = donations.filter((d) => d.status === "Expired");

        const totalKg = donations.reduce((sum, d) => sum + toKg(d.quantity, d.unit), 0);
        const completedKg = completed.reduce((sum, d) => sum + toKg(d.quantity, d.unit), 0);
        const avgSurplusKg = totalCount > 0 ? Math.round((totalKg / totalCount) * 10) / 10 : 0;

        // Food types breakdown by kg and count
        const typeBreakdown = {};
        donations.forEach((d) => {
            const kg = toKg(d.quantity, d.unit);
            if (!typeBreakdown[d.foodType]) {
                typeBreakdown[d.foodType] = { count: 0, kg: 0 };
            }
            typeBreakdown[d.foodType].count += 1;
            typeBreakdown[d.foodType].kg += kg;
        });

        const topWastedTypes = Object.entries(typeBreakdown)
            .map(([type, stats]) => ({
                foodType: type,
                count: stats.count,
                kg: Math.round(stats.kg * 10) / 10,
                percentage: totalKg > 0 ? Math.round((stats.kg / totalKg) * 100) : 0
            }))
            .sort((a, b) => b.kg - a.kg);

        // Monthly trends
        const monthlyMap = {};
        donations.forEach((d) => {
            const date = new Date(d.createdAt);
            const key = date.toLocaleString("en-IN", { month: "short", year: "numeric" });
            if (!monthlyMap[key]) monthlyMap[key] = { label: key, kg: 0, count: 0, completed: 0 };
            const kg = toKg(d.quantity, d.unit);
            monthlyMap[key].kg += kg;
            monthlyMap[key].count += 1;
            if (d.status === "Completed") monthlyMap[key].completed += 1;
        });
        const monthlyTrends = Object.values(monthlyMap).map((m) => ({
            ...m,
            kg: Math.round(m.kg * 10) / 10
        }));

        // Day of week distribution (0 = Sun, 1 = Mon ... 6 = Sat)
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayCounts = Array(7).fill(0);
        const dayKg = Array(7).fill(0);
        donations.forEach((d) => {
            const dayIdx = new Date(d.createdAt).getDay();
            dayCounts[dayIdx] += 1;
            dayKg[dayIdx] += toKg(d.quantity, d.unit);
        });

        const peakDayIdx = dayKg.indexOf(Math.max(...dayKg));
        const peakDayName = dayNames[peakDayIdx];

        // Predictive Forecasting logic based on actual historical data
        const hasEnoughData = completed.length >= 3;
        let forecast = null;

        if (hasEnoughData) {
            // Calculate weighted recent average (last 3-5 donations)
            const recent = completed.slice(-5);
            const recentAvgKg = recent.reduce((s, d) => s + toKg(d.quantity, d.unit), 0) / recent.length;

            // Trend direction (compare recent average with total average)
            const trendMultiplier = avgSurplusKg > 0 ? recentAvgKg / avgSurplusKg : 1.0;
            const predictedNextSurplusKg = Math.round(recentAvgKg * (trendMultiplier > 1.2 ? 1.15 : 1.0) * 10) / 10;
            const recommendedDonationKg = Math.max(2, Math.round(predictedNextSurplusKg * 0.9 * 10) / 10);

            const rescueEfficiency = Math.round((completed.length / (totalCount - donations.filter(d => d.status === "Cancelled").length || 1)) * 100);

            forecast = {
                canPredict: true,
                predictedSurplusKg: predictedNextSurplusKg,
                recommendedDonationKg: recommendedDonationKg,
                recommendedDonationServings: Math.round(recommendedDonationKg * 3.2),
                peakSurplusDay: peakDayName,
                recommendedListingWindow: "Between 2:00 PM - 4:00 PM or 9:00 PM - 10:30 PM",
                rescueEfficiency: Math.min(100, Math.max(0, rescueEfficiency)),
                trendDirection: trendMultiplier >= 1.05 ? "Increasing" : trendMultiplier <= 0.95 ? "Decreasing" : "Stable",
                confidenceScore: Math.min(95, 60 + completed.length * 5),
                predictionMessage: `Based on ${completed.length} completed donation records, your peak surplus occurs around ${peakDayName}. Recommended surplus listing quantity is ~${recommendedDonationKg} kg.`
            };
        } else {
            forecast = {
                canPredict: false,
                confidenceScore: 0,
                predictionMessage: `Predictive surplus forecasting requires at least 3 completed donations to calculate seasonal moving averages. Currently completed: ${completed.length} donation(s).`
            };
        }

        res.json({
            totalDonations: totalCount,
            completedCount: completed.length,
            expiredCount: expired.length,
            totalKgDonated: Math.round(totalKg * 10) / 10,
            completedKgSaved: Math.round(completedKg * 10) / 10,
            avgSurplusKg,
            topWastedTypes,
            monthlyTrends,
            dayOfWeekStats: dayNames.map((name, i) => ({ day: name, count: dayCounts[i], kg: Math.round(dayKg[i] * 10) / 10 })),
            forecast
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== FEATURE 5: FOOD RESCUE IMPACT CERTIFICATE & DIGITAL PROFILE ==========
// GET /api/stats/certificate (restaurant & ngo)
router.get("/certificate", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-password -__v");
        if (!user) return res.status(404).json({ error: "User not found" });

        const isRestaurant = user.role === "restaurant";
        const filter = isRestaurant
            ? { restaurant: user._id, status: "Completed" }
            : { acceptedBy: user._id, status: "Completed" };

        const completedDonations = await Donation.find(filter).sort({ completedTime: -1 });

        const totalKg = completedDonations.reduce((sum, d) => sum + toKg(d.quantity, d.unit), 0);
        const totalMeals = completedDonations.reduce((sum, d) => sum + toMeals(d.quantity, d.unit), 0);
        const co2SavedKg = Math.round(totalKg * CO2_PER_KG * 10) / 10;

        // Generate verified certificate serial number
        const certId = `FB-CERT-${new Date().getFullYear()}-${user._id.toString().slice(-6).toUpperCase()}`;

        // Monthly impact history for digital profile
        const monthlyMap = {};
        completedDonations.forEach((d) => {
            const date = new Date(d.completedTime || d.createdAt);
            const key = date.toLocaleString("en-IN", { month: "short", year: "numeric" });
            if (!monthlyMap[key]) monthlyMap[key] = { month: key, kg: 0, meals: 0, count: 0 };
            const kg = toKg(d.quantity, d.unit);
            monthlyMap[key].kg += kg;
            monthlyMap[key].meals += toMeals(d.quantity, d.unit);
            monthlyMap[key].count += 1;
        });

        const monthlyImpact = Object.values(monthlyMap);

        res.json({
            certificateId: certId,
            organizationName: user.name,
            ownerName: user.ownerName || user.name,
            role: user.role,
            roleTitle: isRestaurant ? "Certified Food Rescue Donor" : "Certified Food Rescue Partner",
            verificationStatus: user.verificationStatus || "pending",
            trustScore: user.trustScore || 5.0,
            city: user.city || "India",
            memberSince: user.createdAt,
            issueDate: new Date(),
            impact: {
                totalFoodRescuedKg: Math.round(totalKg * 10) / 10,
                totalMealsSupported: Math.round(totalMeals),
                co2EmissionsPreventedKg: co2SavedKg,
                completedRescuesCount: completedDonations.length,
                successfulPickupsCount: completedDonations.length
            },
            monthlyImpact,
            accreditation: {
                standard: "FoodBridge Global Food Loss & Waste Standard 2026",
                verificationAuthority: "FoodBridge Verification Authority",
                status: user.verificationStatus === "verified" ? "Officially Verified & Accredited" : "Community Partner (Verification Pending)"
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Public numbers for the landing page (no login needed)
router.get("/public", async (req, res) => {
    try {
        const [restaurants, ngos, completed] = await Promise.all([
            User.countDocuments({ role: "restaurant" }),
            User.countDocuments({ role: "ngo" }),
            Donation.find({ status: "Completed" })
        ]);
        res.json({
            restaurants,
            ngos,
            donationsCompleted: completed.length,
            mealsProvided: Math.round(completed.reduce((s, d) => s + toMeals(d.quantity, d.unit), 0))
        });
    } catch (err) {
        res.json({ restaurants: 0, ngos: 0, donationsCompleted: 0, mealsProvided: 0 });
    }
});

module.exports = router;