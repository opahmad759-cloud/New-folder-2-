const Settings = require("../models/Settings");

// returns the settings document, creating it with defaults the first time
async function getSettings() {
    return Settings.findOneAndUpdate(
        { key: "main" },
        { $setOnInsert: { key: "main" } },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
}

module.exports = { getSettings };