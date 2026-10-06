const Notification = require("../models/Notification");
const Donation = require("../models/Donation");

// Haversine formula: distance in km between two lat/long points
function distanceKm(lat1, lon1, lat2, lon2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Convert any unit to approximate kg and number of meals (used for impact stats)
function toKg(qty, unit) {
    if (unit === "portions") return qty * 0.4;
    return qty; // kg and liter are treated as 1:1
}
function toMeals(qty, unit) {
    if (unit === "portions") return qty;
    if (unit === "liter") return qty * 4;
    return qty * 3; // 1 kg of food ~ 3 meals
}
const CO2_PER_KG = 2.5; // rough kg CO2e avoided per kg of food saved from landfill

async function notify(userId, message, type, donationId) {
    try {
        await Notification.create({ user: userId, message, type, donation: donationId });
    } catch (e) {
        console.log("Notification error:", e.message);
    }
}

// Calculate real-time food urgency based on hours until expiry
function computeUrgency(expiryTime) {
    const ms = new Date(expiryTime) - Date.now();
    const hours = ms / 3600000;
    if (hours <= 0) {
        return { level: "Expired", badge: "red", hoursLeft: 0, isEmergency: false, label: "Expired" };
    }
    if (hours <= 2) {
        return { level: "Emergency", badge: "red", hoursLeft: Math.max(0, hours), isEmergency: true, label: "🔴 Emergency (<2h left)" };
    }
    if (hours <= 6) {
        return { level: "Priority", badge: "yellow", hoursLeft: hours, isEmergency: false, label: "🟡 Priority (2-6h left)" };
    }
    return { level: "Normal", badge: "green", hoursLeft: hours, isEmergency: false, label: "🟢 Normal (>6h left)" };
}

// Mark old pending donations as Expired
async function expireOldDonations() {
    const now = new Date();
    const old = await Donation.find({ status: "Pending", expiryTime: { $lt: now } }).select("_id");
    if (!old.length) return;
    await Donation.updateMany(
        { _id: { $in: old.map((d) => d._id) } },
        {
            status: "Expired",
            updatedAt: now,
            $push: { statusHistory: { status: "Expired", at: now, note: "Food expiry time passed" } }
        }
    );
}

module.exports = { distanceKm, toKg, toMeals, CO2_PER_KG, notify, expireOldDonations, computeUrgency };