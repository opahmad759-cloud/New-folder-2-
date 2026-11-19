const express = require("express");
const rateLimit = require("express-rate-limit");
const Message = require("../models/Message");

const router = express.Router();

// at most 5 messages per hour from the same address
const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many messages. Please try again later." },
});

const THANKS = "Thank you! We will get back to you soon.";

// POST /api/messages  { name, email, message }   (anyone can send, no login needed)
router.post("/", limiter, async (req, res) => {
    try {
        const { name, email, message, website } = req.body;

        // "website" is a hidden field that real people never fill in, only spam bots do
        if (website) return res.status(201).json({ message: THANKS });

        const clean = {
            name: String(name || "").trim(),
            email: String(email || "").trim().toLowerCase(),
            message: String(message || "").trim(),
        };

        if (!clean.name || !clean.email || !clean.message) {
            return res.status(400).json({ message: "Please fill in your name, email and message" });
        }
        if (!/^\S+@\S+\.\S+$/.test(clean.email)) {
            return res.status(400).json({ message: "Please enter a valid email address" });
        }
        if (clean.message.length < 10) {
            return res.status(400).json({ message: "Your message is too short (at least 10 characters)" });
        }
        if (clean.message.length > 2000) {
            return res.status(400).json({ message: "Your message is too long (at most 2000 characters)" });
        }

        await Message.create(clean);
        res.status(201).json({ message: THANKS });
    } catch (e) {
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;