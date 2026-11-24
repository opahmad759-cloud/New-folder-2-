const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: String,
        image: String,
        price: Number, // the price at the time of the order
        qty: Number,
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        items: [orderItemSchema],
        shipping: {
            fullName: { type: String, required: true },
            phone: { type: String, required: true },
            address: { type: String, required: true },
            city: { type: String, required: true },
        },
        subtotal: Number,
        discount: Number,
        discountRate: Number,
        delivery: Number,
        giftItem: {
            product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
            name: String,
            image: String,
            price: Number,
        },
        firstOrder: { type: Boolean, default: false },
        total: Number,
        paymentMethod: { type: String, enum: ["cod"], default: "cod" },
        status: {
            type: String,
            enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
            default: "pending",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);