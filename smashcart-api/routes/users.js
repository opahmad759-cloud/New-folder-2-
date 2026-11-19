const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function publicUser(user) {
    return { id: user._id, name: user.name, email: user.email, role: user.role };
}

// PATCH /api/users/me  { name }
router.patch("/me", requireAuth, async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        if (name.length < 5) {
            return res.status(400).json({ message: "Please enter your name (at least 5 letters)" });
        }

        const user = await User.findByIdAndUpdate(req.user.id, { name }, { new: true });
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({ user: publicUser(user) });
    } catch (e) {
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/users/me/password  { currentPassword, newPassword }
router.patch("/me/password", requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Please fill in both passwords" });
        }
        if (String(newPassword).length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters" });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const ok = await bcrypt.compare(currentPassword, user.password);
        if (!ok) {
            return res.status(400).json({ message: "Your current password is wrong" });
        }
        if (currentPassword === newPassword) {
            return res.status(400).json({ message: "The new password must be different from the current one" });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: "Password changed" });
    } catch (e) {
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;