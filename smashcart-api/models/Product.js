const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        brand: { type: String, required: true },
        category: { type: String, enum: ["racket", "shuttle", "shoes", "bag"], required: true },
        level: { type: String, default: "All levels" },
        price: { type: Number, required: true },
        oldPrice: Number,
        tag: String,
        image: String,
        description: String,
        rating: { type: Number, default: 0 },
        reviews: { type: Number, default: 0 },
        stock: { type: Number, default: 20 },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);