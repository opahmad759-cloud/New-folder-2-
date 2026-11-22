const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function run() {
    await mongoose.connect(process.env.MONGO_URI);

    const email = process.env.ADMIN_EMAIL.toLowerCase();
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

    // if the email already exists, upgrade it to admin; otherwise create it
    const user = await User.findOneAndUpdate(
        { email },
        { name: "Admin", email, password: hash, role: "admin" },
        { upsert: true, new: true }
    );

    console.log("Admin ready:", user.email, "role:", user.role);
    await mongoose.disconnect();
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});