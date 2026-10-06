const express = require("express");
const Donation = require("../models/Donation");
const User = require("../models/User");
const { authMiddleware, authorize } = require("../middleware/auth");
const { distanceKm, notify, expireOldDonations, computeUrgency } = require("../utils/helpers");

const router = express.Router();
const OPEN_REQUEST_RADIUS_KM = 50; // open requests are shown to NGOs within this distance

const populateAll = (q) =>
    q
        .populate("restaurant", "name phone address city location verificationStatus trustScore")
        .populate("acceptedBy", "name phone address city verificationStatus trustScore")
        .populate("requestedNgo", "name verificationStatus trustScore");

function addStatus(donation, status, note) {
    donation.status = status;
    donation.updatedAt = new Date();
    donation.statusHistory.push({ status, at: new Date(), note });
}

// ========== FEATURE: FOOD DETAILS + DONATION REQUEST (restaurant) ==========
router.post("/", authMiddleware, authorize("restaurant"), async (req, res) => {
    try {
        const { foodName, foodType, isVeg, quantity, unit, expiryTime, prepTime, description, pickupAddress, requestedNgo, aiRecommendation } = req.body;

        if (!foodName || !foodType || !quantity || !expiryTime) {
            return res.status(400).json({ error: "Food name, type, quantity and expiry time are required" });
        }
        if (Number(quantity) <= 0) return res.status(400).json({ error: "Quantity must be more than 0" });
        if (new Date(expiryTime) <= new Date()) {
            return res.status(400).json({ error: "Expiry time must be in the future" });
        }

        const restaurant = await User.findById(req.user.userId);

        let targetNgo = null;
        if (requestedNgo) {
            targetNgo = await User.findOne({ _id: requestedNgo, role: "ngo" });
            if (!targetNgo) return res.status(400).json({ error: "Selected NGO was not found" });
        }

        // Auto-calculate initial urgency based on expiry countdown
        const urgencyMeta = computeUrgency(expiryTime);

        const donation = new Donation({
            restaurant: restaurant._id,
            foodName, foodType,
            isVeg: isVeg !== false && isVeg !== "false",
            quantity: Number(quantity),
            unit: unit || "kg",
            expiryTime,
            prepTime: prepTime ? new Date(prepTime) : undefined,
            urgency: urgencyMeta.level,
            aiRecommendation: aiRecommendation || undefined,
            description,
            pickupAddress: pickupAddress || restaurant.address,
            requestedNgo: targetNgo ? targetNgo._id : null,
            restaurantLocation: restaurant.location,
            status: "Pending",
            statusHistory: [{ status: "Pending", note: targetNgo ? "Request sent to " + targetNgo.name : "Open request sent to nearby NGOs" }]
        });
        await donation.save();

        // Notify NGO(s) with urgency tag
        const urgencyPrefix = urgencyMeta.isEmergency ? "🚨 [EMERGENCY RESCUE] " : "";
        const msg = `${urgencyPrefix}New donation from ${restaurant.name}: ${donation.quantity} ${donation.unit} of ${donation.foodName}`;
        if (targetNgo) {
            await notify(targetNgo._id, msg, "request", donation._id);
        } else {
            const ngos = await User.find({ role: "ngo" });
            for (const n of ngos) {
                const d = distanceKm(restaurant.location.lat, restaurant.location.long, n.location.lat, n.location.long);
                if (d <= OPEN_REQUEST_RADIUS_KM) await notify(n._id, msg, "request", donation._id);
            }
        }

        res.status(201).json({ message: "Donation request created", donation });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== MY DONATIONS (restaurant: created by me, ngo: accepted by me) ==========
router.get("/mine", authMiddleware, async (req, res) => {
    try {
        await expireOldDonations();
        const filter = req.user.role === "restaurant" ? { restaurant: req.user.userId } : { acceptedBy: req.user.userId };
        const rawDonations = await populateAll(Donation.find(filter).sort({ createdAt: -1 }));
        const donations = rawDonations.map((d) => {
            const obj = d.toObject();
            obj.urgencyMeta = computeUrgency(d.expiryTime);
            obj.urgency = obj.urgencyMeta.level;
            return obj;
        });
        res.json({ count: donations.length, donations });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== FEATURE 2: EMERGENCY RESCUE DONATIONS ==========
// GET /api/donations/emergency
router.get("/emergency", authMiddleware, async (req, res) => {
    try {
        await expireOldDonations();
        const twoHoursLater = new Date(Date.now() + 2 * 3600 * 1000);
        const me = await User.findById(req.user.userId);

        const query = {
            status: "Pending",
            expiryTime: { $gt: new Date(), $lte: twoHoursLater }
        };
        if (me.role === "ngo") {
            query.declinedBy = { $ne: me._id };
            query.$or = [{ requestedNgo: me._id }, { requestedNgo: null }];
        }

        const raw = await populateAll(Donation.find(query).sort({ expiryTime: 1 }));
        const donations = raw.map((d) => {
            const obj = d.toObject();
            const loc = d.restaurantLocation || {};
            obj.distanceKm = (me.location?.lat != null && loc.lat != null)
                ? Math.round(distanceKm(me.location.lat, me.location.long, loc.lat, loc.long) * 10) / 10
                : null;
            obj.urgencyMeta = computeUrgency(d.expiryTime);
            obj.urgency = "Emergency";
            return obj;
        });

        res.json({ count: donations.length, donations });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== INCOMING REQUESTS (ngo) ==========
router.get("/incoming", authMiddleware, authorize("ngo"), async (req, res) => {
    try {
        await expireOldDonations();
        const me = await User.findById(req.user.userId);

        const donations = await populateAll(
            Donation.find({
                status: "Pending",
                declinedBy: { $ne: me._id },
                $or: [{ requestedNgo: me._id }, { requestedNgo: null }]
            }).sort({ createdAt: -1 })
        );

        const result = donations
            .map((d) => {
                const obj = d.toObject();
                const loc = d.restaurantLocation || {};
                obj.distanceKm = loc.lat != null ? Math.round(distanceKm(me.location.lat, me.location.long, loc.lat, loc.long) * 10) / 10 : null;
                obj.isDirect = !!d.requestedNgo;
                obj.urgencyMeta = computeUrgency(d.expiryTime);
                obj.urgency = obj.urgencyMeta.level;
                return obj;
            })
            // directed requests always show, open ones only if nearby
            .filter((d) => d.isDirect || d.distanceKm == null || d.distanceKm <= OPEN_REQUEST_RADIUS_KM)
            // Emergency donations are prioritized to the very top, then closest distance
            .sort((a, b) => {
                if (a.urgencyMeta.isEmergency && !b.urgencyMeta.isEmergency) return -1;
                if (!a.urgencyMeta.isEmergency && b.urgencyMeta.isEmergency) return 1;
                return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
            });

        res.json({ count: result.length, donations: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== ACCEPT (ngo) ==========
router.post("/:id/accept", authMiddleware, authorize("ngo"), async (req, res) => {
    try {
        const donation = await Donation.findOneAndUpdate(
            {
                _id: req.params.id,
                status: "Pending",
                $or: [{ requestedNgo: req.user.userId }, { requestedNgo: null }]
            },
            { acceptedBy: req.user.userId },
            { new: true }
        );
        if (!donation) return res.status(400).json({ error: "This request is no longer available" });

        const ngo = await User.findById(req.user.userId);
        addStatus(donation, "Accepted", "Accepted by " + ngo.name);
        await donation.save();
        await notify(donation.restaurant, `${ngo.name} accepted your donation of ${donation.foodName}`, "accepted", donation._id);

        res.json({ message: "Donation accepted", donation: await populateAll(Donation.findById(donation._id)) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== REJECT (ngo) ==========
router.post("/:id/reject", authMiddleware, authorize("ngo"), async (req, res) => {
    try {
        const donation = await Donation.findOne({ _id: req.params.id, status: "Pending" });
        if (!donation) return res.status(400).json({ error: "This request is no longer available" });

        const ngo = await User.findById(req.user.userId);
        if (donation.requestedNgo && String(donation.requestedNgo) === String(ngo._id)) {
            addStatus(donation, "Rejected", "Declined by " + ngo.name);
            await donation.save();
            await notify(donation.restaurant, `${ngo.name} could not accept your donation of ${donation.foodName}`, "rejected", donation._id);
        } else if (!donation.requestedNgo) {
            donation.declinedBy.push(ngo._id); // stays open for other NGOs
            await donation.save();
        } else {
            return res.status(403).json({ error: "This request was sent to another NGO" });
        }
        res.json({ message: "Request declined" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== FEATURE: STATUS TRACKING ==========
// Accepted -> PickedUp -> Completed  (only the NGO that accepted)
// Pending  -> Cancelled              (only the restaurant that created it)
router.put("/:id/status", authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const donation = await Donation.findById(req.params.id);
        if (!donation) return res.status(404).json({ error: "Donation not found" });

        const isOwner = String(donation.restaurant) === req.user.userId;
        const isNgo = donation.acceptedBy && String(donation.acceptedBy) === req.user.userId;

        if (status === "Cancelled") {
            if (!isOwner) return res.status(403).json({ error: "Only the restaurant can cancel" });
            if (donation.status !== "Pending") return res.status(400).json({ error: "Only pending requests can be cancelled" });
            addStatus(donation, "Cancelled", "Cancelled by restaurant");
            await donation.save();
            return res.json({ message: "Donation cancelled", donation });
        }

        const flow = { Accepted: "PickedUp", PickedUp: "Completed" };
        if (!isNgo) return res.status(403).json({ error: "Only the accepting NGO can update this status" });
        if (flow[donation.status] !== status) {
            return res.status(400).json({ error: `Cannot move from ${donation.status} to ${status}` });
        }

        addStatus(donation, status, status === "PickedUp" ? "Food collected from restaurant" : "Food distributed to people in need");
        if (status === "PickedUp") donation.pickupTime = new Date();
        if (status === "Completed") donation.completedTime = new Date();
        await donation.save();

        const ngo = await User.findById(req.user.userId);
        const text = status === "PickedUp"
            ? `${ngo.name} picked up ${donation.foodName}`
            : `${donation.foodName} was delivered to people in need. Thank you!`;
        await notify(donation.restaurant, text, status === "PickedUp" ? "pickedup" : "completed", donation._id);

        res.json({ message: "Status updated to " + status, donation });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== SINGLE DONATION ==========
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const donation = await populateAll(Donation.findById(req.params.id));
        if (!donation) return res.status(404).json({ error: "Donation not found" });
        res.json({ donation });
    } catch (err) {
        res.status(400).json({ error: "Invalid donation id" });
    }
});

module.exports = router;