const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendMail } = require("../utils/mail");

const router = express.Router();

// the login ticket: holds the user's id and role, valid for 7 days
function makeToken(user) {
    return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// what we are allowed to send back (never the password)
function publicUser(user) {
    return { id: user._id, name: user.name, email: user.email, role: user.role };
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const exists = await User.findOne({ email: cleanEmail });
        if (exists) {
            return res.status(409).json({ message: "This email is already registered" });
        }

        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email: cleanEmail, password: hash });

        res.status(201).json({ token: makeToken(user), user: publicUser(user) });
    } catch (e) {
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email: String(email).trim().toLowerCase() });
        const ok = user && (await bcrypt.compare(password, user.password));
        if (!ok) {
            // same message for both cases, so nobody can find out which emails exist
            return res.status(401).json({ message: "Wrong email or password" });
        }

        res.json({ token: makeToken(user), user: publicUser(user) });
    } catch (e) {
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const user = email ? await User.findOne({ email }) : null;

        if (user) {
            // a random one-time key; only its hash is saved in the database
            const token = crypto.randomBytes(32).toString("hex");
            user.resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
            user.resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
            await user.save();

            const link = `${process.env.CLIENT_URL}/reset-password/${token}`;
            try {
                await sendMail({
                    to: user.email,
                    subject: "Reset your SmashCart password",
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:480px">
                            <h2>Reset your password</h2>
                            <p>We got a request to reset the password of your SmashCart account. Click the button below. The link works for 15 minutes.</p>
                            <p><a href="${link}" style="display:inline-block;background:#e11d2e;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Reset password</a></p>
                            <p style="color:#666;font-size:13px">If you did not ask for this, you can ignore this email.</p>
                        </div>`,
                });
            } catch (mailErr) {
                // the customer still sees the normal message; we only log the problem here
                console.error("Could not send reset email:", mailErr.message);
                if (!process.env.BREVO_API_KEY) console.log(`Reset link (email not set up): ${link}`);
            }
        }

        // the same answer whether the email exists or not
        res.json({ message: "If this email is registered, a reset link has been sent." });
    } catch (e) {
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/auth/reset-password/:token
router.post("/reset-password/:token", async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
        const user = await User.findOne({
            resetTokenHash: hashedToken,
            resetTokenExpires: { $gt: new Date() }, // not expired yet
        });
        if (!user) {
            return res.status(400).json({ message: "This reset link is invalid or has expired" });
        }

        user.password = await bcrypt.hash(password, 10);
        user.resetTokenHash = undefined; // the link works only once
        user.resetTokenExpires = undefined;
        await user.save();

        res.json({ message: "Password changed. You can log in now." });
    } catch (e) {
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;