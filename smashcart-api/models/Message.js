const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        email: { type: String, required: true, lowercase: true, trim: true, maxlength: 200 },
        message: { type: String, required: true, trim: true, maxlength: 2000 },
        status: { type: String, enum: ["new", "read"], default: "new" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);