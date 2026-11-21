const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { requireAuth } = require("../middleware/auth");
const { calculateTotals } = require("../utils/pricing");
const { getSettings } = require("../utils/settings");

const router = express.Router();

// put the stock back (used when an order fails half way)
async function giveBack(lines) {
    for (const l of lines) {
        await Product.updateOne({ _id: l.product }, { $inc: { stock: l.qty } });
    }
}

// POST /api/orders  { items: [{ productId, qty }], shipping: { fullName, phone, address, city } }
router.post("/", requireAuth, async (req, res) => {
    let reserved = []; // lines whose stock we already took
    try {
        const { items, shipping } = req.body;

        // 1) check what the browser sent
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "Your cart is empty" });
        }
        const s = shipping || {};
        const ship = {
            fullName: String(s.fullName || "").trim(),
            phone: String(s.phone || "").trim(),
            address: String(s.address || "").trim(),
            city: String(s.city || "").trim(),
        };
        if (!ship.fullName || !ship.phone || !ship.address || !ship.city) {
            return res.status(400).json({ message: "Please fill in your name, phone, address and city" });
        }

        // 2) load the REAL products and prices from the database
        const lines = [];
        for (const item of items) {
            const qty = Number(item.qty);
            if (!mongoose.isValidObjectId(item.productId) || !Number.isInteger(qty) || qty < 1) {
                return res.status(400).json({ message: "Invalid item in your cart" });
            }
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(400).json({ message: "A product in your cart no longer exists" });
            }
            lines.push({
                product: product._id,
                name: product.name,
                image: product.image,
                price: product.price, // from the database, never from the browser
                qty,
            });
        }

        // 3) take the stock (only if enough is left), one product at a time
        for (const line of lines) {
            const result = await Product.updateOne(
                { _id: line.product, stock: { $gte: line.qty } },
                { $inc: { stock: -line.qty } }
            );
            if (result.modifiedCount === 0) {
                await giveBack(reserved); // return what we already took
                return res.status(409).json({ message: `Not enough stock for ${line.name}` });
            }
            reserved.push(line);
        }

        // 4) work out the totals on the server and save the order
        const settings = await getSettings();
        const totals = calculateTotals(lines, settings);
        const order = await Order.create({
            user: req.user.id,
            items: lines,
            shipping: ship,
            ...totals,
        });

        res.status(201).json(order);
    } catch (e) {
        await giveBack(reserved);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/orders/mine  -> the logged-in user's orders (newest first)
// NOTE: this must stay above "/:id", or "mine" would be read as an id
router.get("/mine", requireAuth, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (e) {
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/orders/pending-count  -> how many pending orders the logged-in user has
router.get("/pending-count", requireAuth, async (req, res) => {
    try {
        const count = await Order.countDocuments({ user: req.user.id, status: "pending" });
        res.json({ count });
    } catch (e) {
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/orders/:id  -> one order (only its owner, or an admin)
router.get("/:id", requireAuth, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid order id" });
        }
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (String(order.user) !== req.user.id && req.user.role !== "admin") {
            return res.status(403).json({ message: "This is not your order" });
        }
        res.json(order);
    } catch (e) {
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/orders/:id/cancel  -> the owner can cancel while the order is still pending
router.patch("/:id/cancel", requireAuth, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid order id" });
        }

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (String(order.user) !== req.user.id) {
            return res.status(403).json({ message: "This is not your order" });
        }
        if (order.status !== "pending") {
            return res.status(400).json({ message: "Only pending orders can be cancelled" });
        }

        // changes the status only if it is STILL pending, so the stock can never be returned twice
        const updated = await Order.findOneAndUpdate(
            { _id: order._id, status: "pending" },
            { status: "cancelled" },
            { new: true }
        );
        if (!updated) {
            return res.status(400).json({ message: "Only pending orders can be cancelled" });
        }

        await giveBack(updated.items); // put the stock back on the products
        res.json(updated);
    } catch (e) {
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;