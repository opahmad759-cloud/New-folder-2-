const mongoose = require("mongoose");

// one single document holds all shop settings
const settingsSchema = new mongoose.Schema(
    {
        key: { type: String, default: "main", unique: true },
        deliveryFee: { type: Number, default: 300, min: 0 },
        freeDeliveryFrom: { type: Number, default: 10000, min: 0 },
        tier1MinItems: { type: Number, default: 2, min: 1 },
        tier1Percent: { type: Number, default: 5, min: 0, max: 90 },
        tier2MinItems: { type: Number, default: 5, min: 1 },
        tier2Percent: { type: Number, default: 10, min: 0, max: 90 },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);