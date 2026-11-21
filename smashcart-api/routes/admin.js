const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const mongoose = require("mongoose")
const Settings = require("../models/Settings");

const router = express.Router();

// every route in this file is for admins only
router.use(requireAuth, requireAdmin);

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
    try {
        const [totalOrders, pendingOrders, customers, revenueAgg, lowStock, recentOrders] =
            await Promise.all([
                Order.countDocuments(),
                Order.countDocuments({ status: "pending" }),
                User.countDocuments({ role: "customer" }),
                // revenue = all orders that are not cancelled
                Order.aggregate([
                    { $match: { status: { $ne: "cancelled" } } },
                    { $group: { _id: null, total: { $sum: "$total" } } },
                ]),
                Product.find({ stock: { $lte: 5 } }).select("name stock").sort({ stock: 1 }).limit(8),
                Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "name email"),
            ]);

        res.json({
            totalOrders,
            pendingOrders,
            customers,
            revenue: revenueAgg[0]?.total || 0,
            lowStock,
            recentOrders,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Could not load stats" });
    }
});

// POST /api/admin/products - add a new product
router.post("/products", async (req, res) => {
    try {
        const { name, brand, category, level, price, oldPrice, tag, image, description, stock } = req.body;

        if (!name || !brand || !category || !image) {
            return res.status(400).json({ message: "Name, brand, category and image are required" });
        }
        if (!["racket", "shuttle", "shoes", "bag"].includes(category)) {
            return res.status(400).json({ message: "Invalid category" });
        }
        if (!/^(\/|https?:\/\/)/.test(image.trim())) {
            return res.status(400).json({ message: "Image must start with / (like /images/products/racket-4.jpg) or be a full URL" });
        }
        if (!(Number(price) > 0)) {
            return res.status(400).json({ message: "Price must be a number above 0" });
        }
        if (!(Number.isInteger(Number(stock)) && Number(stock) >= 0)) {
            return res.status(400).json({ message: "Stock must be a whole number, 0 or more" });
        }

        // only pick the fields we allow (never trust the whole body)
        const product = await Product.create({
            name: name.trim(),
            brand: brand.trim(),
            category,
            level: level || undefined,
            price: Number(price),
            oldPrice: oldPrice ? Number(oldPrice) : undefined,
            tag: tag || undefined,
            image: image.trim(),
            description: description || "",
            stock: Number(stock),
        });

        res.status(201).json(product);
    } catch (err) {
        // Mongoose validation errors (like a wrong "level") come back as 400
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: Object.values(err.errors)[0].message });
        }
        console.error(err);
        res.status(500).json({ message: "Could not add product" });
    }
});

// PUT /api/admin/products/:id - edit a product
router.put("/products/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid product id" });
        }
        const { name, brand, category, level, price, oldPrice, tag, image, description, stock } = req.body;

        if (!name || !brand || !category || !image) {
            return res.status(400).json({ message: "Name, brand, category and image are required" });
        }
        if (!["racket", "shuttle", "shoes", "bag"].includes(category)) {
            return res.status(400).json({ message: "Invalid category" });
        }
        if (!/^(\/|https?:\/\/)/.test(image.trim())) {
            return res.status(400).json({ message: "Image must start with / (like /images/products/racket-4.jpg) or be a full URL" });
        }
        if (!(Number(price) > 0)) {
            return res.status(400).json({ message: "Price must be a number above 0" });
        }
        if (!(Number.isInteger(Number(stock)) && Number(stock) >= 0)) {
            return res.status(400).json({ message: "Stock must be a whole number, 0 or more" });
        }

        const update = {
            name: name.trim(),
            brand: brand.trim(),
            category,
            price: Number(price),
            oldPrice: oldPrice ? Number(oldPrice) : null, // null clears the field
            tag: tag || null,
            image: image.trim(),
            description: description || "",
            stock: Number(stock),
        };
        if (level) update.level = level; // only change level when one is given

        const product = await Product.findByIdAndUpdate(req.params.id, update, {
            returnDocument: "after",
            runValidators: true,
        });
        if (!product) return res.status(404).json({ message: "Product not found" });

        res.json(product);
    } catch (err) {
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: Object.values(err.errors)[0].message });
        }
        console.error(err);
        res.status(500).json({ message: "Could not update product" });
    }
});

// DELETE /api/admin/products/:id
router.delete("/products/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid product id" });
        }
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });
        res.json({ message: "Product deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Could not delete product" });
    }
});

// GET /api/admin/orders?status=pending - all orders, newest first
router.get("/orders", async (req, res) => {
    try {
        const filter = {};
        const allowed = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
        if (req.query.status && allowed.includes(req.query.status)) {
            filter.status = req.query.status;
        }

        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .populate("user", "name email");

        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Could not load orders" });
    }
});

// which status can follow which (delivered and cancelled are final)
const NEXT_STATUS = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
};

// GET /api/admin/orders/:id - one order with customer details
router.get("/orders/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid order id" });
        }
        const order = await Order.findById(req.params.id).populate("user", "name email");
        if (!order) return res.status(404).json({ message: "Order not found" });
        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Could not load order" });
    }
});

// PATCH /api/admin/orders/:id/status - move an order forward (or cancel it)
router.patch("/orders/:id/status", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid order id" });
        }
        const { status } = req.body;

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (!(NEXT_STATUS[order.status] || []).includes(status)) {
            return res.status(400).json({ message: `Cannot change an order from ${order.status} to ${status}` });
        }

        // the status check inside the filter stops two admins (or a double click)
        // from changing the same order twice
        const updated = await Order.findOneAndUpdate(
            { _id: order._id, status: order.status },
            { status },
            { returnDocument: "after" }
        );
        if (!updated) {
            return res.status(409).json({ message: "This order was just changed. Refresh and try again." });
        }

        // cancelled order: put the items back in stock
        if (status === "cancelled") {
            await Promise.all(
                updated.items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty } }))
            );
        }

        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Could not update order" });
    }
});

// GET /api/admin/customers - every customer with order count and total spent
router.get("/customers", async (req, res) => {
    try {
        const [users, totals] = await Promise.all([
            // never send the password hash: select only what we show
            User.find({ role: "customer" }).select("name email").sort({ _id: -1 }),
            Order.aggregate([
                {
                    $group: {
                        _id: "$user",
                        orders: { $sum: 1 },
                        // cancelled orders do not count as money spent
                        spent: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$total", 0] } },
                    },
                },
            ]),
        ]);

        const byUser = new Map(totals.map((t) => [String(t._id), t]));

        const customers = users.map((u) => {
            const t = byUser.get(String(u._id));
            return {
                _id: u._id,
                name: u.name,
                email: u.email,
                joined: u._id.getTimestamp(), // an ObjectId contains its creation time
                orders: t ? t.orders : 0,
                spent: t ? t.spent : 0,
            };
        });

        res.json(customers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Could not load customers" });
    }
});

// PATCH /api/admin/products/:id/stock - set the stock number only
router.patch("/products/:id/stock", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid product id" });
        }
        const stock = Number(req.body.stock);
        if (!Number.isInteger(stock) || stock < 0) {
            return res.status(400).json({ message: "Stock must be a whole number, 0 or more" });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { stock },
            { returnDocument: "after" }
        ).select("name stock");
        if (!product) return res.status(404).json({ message: "Product not found" });

        res.json(product);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Could not update stock" });
    }
});

// PUT /api/admin/settings
router.put("/settings", async (req, res) => {
    try {
        const keys = ["deliveryFee", "freeDeliveryFrom", "tier1MinItems", "tier1Percent", "tier2MinItems", "tier2Percent"];
        const data = {};
        for (const k of keys) {
            const n = Number(req.body[k]);
            if (!Number.isFinite(n) || n < 0) {
                return res.status(400).json({ message: `${k} must be a number, 0 or more` });
            }
            data[k] = n;
        }
        if (!Number.isInteger(data.tier1MinItems) || !Number.isInteger(data.tier2MinItems) || data.tier1MinItems < 1) {
            return res.status(400).json({ message: "Item counts must be whole numbers, 1 or more" });
        }
        if (data.tier2MinItems <= data.tier1MinItems) {
            return res.status(400).json({ message: "The bigger discount must start at more items than the smaller one" });
        }
        if (data.tier1Percent > 90 || data.tier2Percent > 90) {
            return res.status(400).json({ message: "Discount cannot be more than 90%" });
        }

        const s = await Settings.findOneAndUpdate(
            { key: "main" },
            { $set: data },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true }
        );
        res.json(s);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Could not save settings" });
    }
});

module.exports = router;