// Run:  npm run seed
// Creates demo restaurants, NGOs, Admin and donations with AI, urgency and verification data.
// Demo password for every account: demo123
require("dotenv").config();
const dns = require("dns");
if (process.platform === "win32" && !process.env.VERCEL) {
    try {
        dns.setServers(["8.8.8.8", "8.8.4.4"]);
    } catch (e) {
        // fallback
    }
}
const mongoose = require("mongoose");
const User = require("./models/User");
const Donation = require("./models/Donation");
const Notification = require("./models/Notification");

const hours = (h) => new Date(Date.now() + h * 3600 * 1000);
const ago = (h) => new Date(Date.now() - h * 3600 * 1000);

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB. Resetting seed data...");
    await Promise.all([User.deleteMany({}), Donation.deleteMany({}), Notification.deleteMany({})]);

    const mk = (d) => User.create({ password: "demo123", ...d });

    // Seed Admin
    const admin = await mk({
        name: "FoodBridge Central Admin",
        ownerName: "Verification Officer",
        email: "admin@demo.com",
        role: "admin",
        phone: "9112233445",
        address: "FoodBridge HQ",
        city: "Bengaluru",
        registrationNo: "ADMIN-GOV-2026",
        location: { lat: 16.4016, long: 74.3792 },
        verificationStatus: "verified",
        verificationDate: new Date(),
        trustScore: 5.0
    });

    // Seed Restaurants
    const r1 = await mk({
        name: "Spice Garden Restaurant",
        ownerName: "Ramesh Patil",
        email: "restaurant@demo.com",
        role: "restaurant",
        phone: "9876543210",
        address: "Main Road, Nipani",
        city: "Nipani",
        registrationNo: "FSSAI-11223344",
        verificationDocs: "FSSAI Central Licence #11223344 issued Jan 2024. Health inspect valid.",
        location: { lat: 16.4016, long: 74.3792 },
        verificationStatus: "verified",
        verificationDate: ago(720),
        trustScore: 4.9
    });

    const r2 = await mk({
        name: "Hotel Annapurna",
        ownerName: "Sunita Shetty",
        email: "annapurna@demo.com",
        role: "restaurant",
        phone: "9822001122",
        address: "Bus Stand Road, Nipani",
        city: "Nipani",
        registrationNo: "FSSAI-55667788",
        verificationDocs: "FSSAI State Licence copy submitted. Awaiting physical inspection.",
        location: { lat: 16.3992, long: 74.3855 },
        verificationStatus: "pending",
        trustScore: 4.5
    });

    // Seed NGOs
    const n1 = await mk({
        name: "Asha Kiran Shelter",
        ownerName: "Meena Joshi",
        email: "ngo@demo.com",
        role: "ngo",
        phone: "9845012345",
        address: "Gandhi Nagar, Nipani",
        city: "Nipani",
        registrationNo: "NGO-KA-2041",
        verificationDocs: "Govt of Karnataka NGO Registration #2041. 12A & 80G Certified.",
        capacity: 120,
        location: { lat: 16.4101, long: 74.3688 },
        verificationStatus: "verified",
        verificationDate: ago(1200),
        trustScore: 5.0
    });

    const n2 = await mk({
        name: "Seva Foundation",
        ownerName: "Anil Kamble",
        email: "seva@demo.com",
        role: "ngo",
        phone: "9900112233",
        address: "Sankeshwar Road, Nipani",
        city: "Nipani",
        registrationNo: "NGO-KA-3310",
        verificationDocs: "Charitable Trust Deed submitted. Pending certificate renewal.",
        capacity: 200,
        location: { lat: 16.4305, long: 74.4012 },
        verificationStatus: "pending",
        trustScore: 4.6
    });

    const n3 = await mk({
        name: "Roti Bank Belagavi",
        ownerName: "Farhan Sheikh",
        email: "rotibank@demo.com",
        role: "ngo",
        phone: "9731002244",
        address: "Camp, Belagavi",
        city: "Belagavi",
        registrationNo: "NGO-KA-4120",
        verificationDocs: "Registered Food Bank Initiative #4120. Verified hygiene storage.",
        capacity: 300,
        location: { lat: 15.8497, long: 74.4977 },
        verificationStatus: "verified",
        verificationDate: ago(900),
        trustScore: 4.9
    });

    const mkD = (restaurant, extra) => Donation.create({
        restaurant: restaurant._id,
        restaurantLocation: restaurant.location,
        pickupAddress: restaurant.address,
        ...extra
    });

    const h = (status, note, hrs) => ({ status, note, at: ago(hrs) });

    // 1. Emergency Rescue Donation (< 2 hours remaining)
    await mkD(r1, {
        foodName: "Veg Biryani & Raitha (Emergency Batch)",
        foodType: "cooked",
        isVeg: true,
        quantity: 28,
        unit: "portions",
        expiryTime: hours(1.5),
        prepTime: ago(2.5),
        urgency: "Emergency",
        aiRecommendation: {
            urgencyLevel: "Emergency",
            priorityLevel: 1,
            estimatedServings: 28,
            storageAdvice: "Maintain >60°C in insulated thermal box. Immediate pickup requested.",
            suggestedNgoName: "Asha Kiran Shelter"
        },
        description: "Freshly cooked hot wedding banquet surplus. Packed in leak-proof 1kg containers.",
        status: "Pending",
        requestedNgo: n1._id,
        statusHistory: [h("Pending", "Request sent to Asha Kiran Shelter with Priority 1 Emergency tag", 0.5)]
    });

    // 2. Priority Donation (2 to 6 hours remaining)
    await mkD(r1, {
        foodName: "Fresh Chapati and Dal Tadka",
        foodType: "cooked",
        isVeg: true,
        quantity: 14,
        unit: "kg",
        expiryTime: hours(3.5),
        prepTime: ago(1.5),
        urgency: "Priority",
        aiRecommendation: {
            urgencyLevel: "Priority",
            priorityLevel: 2,
            estimatedServings: 46,
            storageAdvice: "Keep covered. Ideal redistribution within 3 hours.",
            suggestedNgoName: "Asha Kiran Shelter"
        },
        status: "Accepted",
        requestedNgo: null,
        acceptedBy: n1._id,
        statusHistory: [
            h("Pending", "Open request sent to nearby NGOs", 2),
            h("Accepted", "Accepted by Asha Kiran Shelter", 1)
        ]
    });

    // 3. Normal Urgency Donation (> 6 hours remaining)
    await mkD(r2, {
        foodName: "Organic Farm Fresh Vegetables",
        foodType: "raw",
        isVeg: true,
        quantity: 25,
        unit: "kg",
        expiryTime: hours(28),
        urgency: "Normal",
        aiRecommendation: {
            urgencyLevel: "Normal",
            priorityLevel: 3,
            estimatedServings: 70,
            storageAdvice: "Store in ventilated crates at 10-15°C away from direct sunlight.",
            suggestedNgoName: "Seva Foundation"
        },
        status: "Pending",
        requestedNgo: n2._id,
        statusHistory: [h("Pending", "Request sent to Seva Foundation", 1)]
    });

    // 4. In Progress: PickedUp
    await mkD(r1, {
        foodName: "Steamed Rice and Mixed Vegetable Sambar",
        foodType: "cooked",
        isVeg: true,
        quantity: 35,
        unit: "portions",
        expiryTime: hours(2.5),
        urgency: "Priority",
        status: "PickedUp",
        acceptedBy: n2._id,
        pickupTime: ago(0.8),
        statusHistory: [
            h("Pending", "Open request sent to nearby NGOs", 4),
            h("Accepted", "Accepted by Seva Foundation", 3),
            h("PickedUp", "Food collected from restaurant in thermal crates", 0.8)
        ]
    });

    // 5. Completed Donations across past weeks for Forecasting & Certificates
    await mkD(r1, {
        foodName: "Assorted Buns, Bread Loaves & Pastries",
        foodType: "bakery",
        isVeg: true,
        quantity: 12,
        unit: "kg",
        expiryTime: ago(20),
        urgency: "Normal",
        status: "Completed",
        acceptedBy: n1._id,
        completedTime: ago(22),
        createdAt: ago(28),
        statusHistory: [
            h("Pending", "Open request", 28),
            h("Accepted", "Accepted by Asha Kiran Shelter", 26),
            h("PickedUp", "Food collected", 24),
            h("Completed", "Distributed to shelter residents", 22)
        ]
    });

    await mkD(r1, {
        foodName: "Vegetable Pulao & Curd Raita",
        foodType: "cooked",
        isVeg: true,
        quantity: 45,
        unit: "portions",
        expiryTime: ago(40),
        urgency: "Priority",
        status: "Completed",
        acceptedBy: n2._id,
        completedTime: ago(44),
        createdAt: ago(48),
        statusHistory: [
            h("Pending", "Open request", 48),
            h("Accepted", "Accepted by Seva Foundation", 47),
            h("PickedUp", "Collected", 46),
            h("Completed", "Distributed to evening meal line", 44)
        ]
    });

    await mkD(r1, {
        foodName: "Sealed Fruit Juice & Packaged Biscuits",
        foodType: "packaged",
        isVeg: true,
        quantity: 18,
        unit: "kg",
        expiryTime: ago(90),
        urgency: "Normal",
        status: "Completed",
        acceptedBy: n1._id,
        completedTime: ago(85),
        createdAt: ago(92),
        statusHistory: [
            h("Pending", "Open request", 92),
            h("Accepted", "Accepted", 90),
            h("PickedUp", "Collected", 88),
            h("Completed", "Distributed to community center", 85)
        ]
    });

    await mkD(r1, {
        foodName: "Paneer Butter Masala & Parathas",
        foodType: "cooked",
        isVeg: true,
        quantity: 20,
        unit: "kg",
        expiryTime: ago(150),
        urgency: "Emergency",
        status: "Completed",
        acceptedBy: n1._id,
        completedTime: ago(145),
        createdAt: ago(152),
        statusHistory: [
            h("Pending", "Open request", 152),
            h("Accepted", "Accepted", 150),
            h("PickedUp", "Collected", 147),
            h("Completed", "Distributed", 145)
        ]
    });

    await Notification.create([
        { user: n1._id, message: "🚨 [EMERGENCY RESCUE] New urgent donation from Spice Garden Restaurant: 28 portions of Veg Biryani (Expiry: 1.5h)", type: "request" },
        { user: n1._id, message: "Asha Kiran Shelter accepted your donation of Fresh Chapati and Dal Tadka", type: "accepted" },
        { user: r1._id, message: "Seva Foundation picked up Steamed Rice and Sambar", type: "pickedup" },
        { user: admin._id, message: "New verification review pending: Hotel Annapurna submitted license details", type: "info" }
    ]);

    console.log("\n========================================================");
    console.log("✅ SEED DATA GENERATED SUCCESSFULLY");
    console.log("========================================================");
    console.log("  Restaurant Login: restaurant@demo.com  / demo123 (Verified)");
    console.log("  Pending Rest:     annapurna@demo.com   / demo123 (Pending)");
    console.log("  NGO Login:        ngo@demo.com         / demo123 (Verified)");
    console.log("  Pending NGO:      seva@demo.com        / demo123 (Pending)");
    console.log("  Admin Login:      admin@demo.com       / demo123 (Admin Portal)");
    console.log("========================================================\n");
    process.exit(0);
})().catch((e) => {
    console.error("Seed error:", e.message);
    process.exit(1);
});