const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
    {
        status: String,
        at: { type: Date, default: Date.now },
        note: String
    },
    { _id: false }
);

const donationSchema = new mongoose.Schema({
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // ---- Food details ----
    foodName: { type: String, required: true, trim: true },
    foodType: { type: String, enum: ["cooked", "raw", "packaged", "bakery"], required: true },
    isVeg: { type: Boolean, default: true },
    quantity: { type: Number, required: true, min: 0.1 },
    unit: { type: String, enum: ["kg", "liter", "portions"], default: "kg" },
    expiryTime: { type: Date, required: true },
    prepTime: { type: Date },
    description: { type: String, trim: true },
    pickupAddress: { type: String, trim: true },

    // ---- Urgency & AI Features ----
    urgency: {
        type: String,
        enum: ["Normal", "Priority", "Emergency"],
        default: "Normal"
    },
    aiRecommendation: {
        urgencyLevel: String,
        priorityLevel: Number,
        estimatedServings: Number,
        storageAdvice: String,
        suggestedNgoName: String
    },

    // ---- Donation request ----
    // requestedNgo set  -> request sent to ONE chosen NGO
    // requestedNgo null -> open request, visible to every NGO nearby
    requestedNgo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    declinedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // ---- Status tracking ----
    status: {
        type: String,
        enum: ["Pending", "Accepted", "PickedUp", "Completed", "Rejected", "Cancelled", "Expired"],
        default: "Pending"
    },
    statusHistory: [historySchema],

    restaurantLocation: { lat: Number, long: Number },
    pickupTime: Date,
    completedTime: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Donation", donationSchema);