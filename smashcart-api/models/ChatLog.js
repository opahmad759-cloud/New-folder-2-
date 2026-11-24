const mongoose = require("mongoose");

const chatLogSchema = new mongoose.Schema({
    question: { type: String, required: true },
    reply: { type: String, default: "" },
    // chats are deleted automatically after 90 days
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 },
});

module.exports = mongoose.model("ChatLog", chatLogSchema);