const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },          // restaurant / NGO name
    ownerName: { type: String, trim: true },                      // contact person
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    phone: { type: String, trim: true },
    role: { type: String, enum: ["restaurant", "ngo", "admin"], required: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    location: {
        lat: { type: Number, required: true },
        long: { type: Number, required: true }
    },
    // Restaurant: licence number. NGO: registration number
    registrationNo: { type: String, trim: true },
    // NGO only: how many people the shelter can feed per day
    capacity: { type: Number, default: 0 },
    // Verification & Trust System
    verificationStatus: {
        type: String,
        enum: ["verified", "pending", "rejected"],
        default: "pending"
    },
    verificationDate: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String, trim: true },
    verificationDocs: { type: String, trim: true },
    trustScore: { type: Number, default: 5.0, min: 1.0, max: 5.0 },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    try {
        this.password = await bcrypt.hash(this.password, 10);
        next();
    } catch (err) {
        next(err);
    }
});

userSchema.methods.matchPassword = function (entered) {
    return bcrypt.compare(entered, this.password);
};

userSchema.methods.toSafeJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.__v;
    return obj;
};

module.exports = mongoose.model("User", userSchema);