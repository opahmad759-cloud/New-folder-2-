const express = require("express");
const { getSettings } = require("../utils/settings");

const router = express.Router();

// GET /api/settings
router.get("/", async (req, res) => {
    try {
        const s = await getSettings();
        res.json({
            deliveryFee: s.deliveryFee,
            freeDeliveryFrom: s.freeDeliveryFrom,
            tier1MinItems: s.tier1MinItems,
            tier1Percent: s.tier1Percent,
            tier2MinItems: s.tier2MinItems,
            tier2Percent: s.tier2Percent,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Could not load settings" });
    }
});

module.exports = router;