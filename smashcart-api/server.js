require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Product = require("./models/Product");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/users", require("./routes/users"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/admin", require("./routes/admin"));

app.get("/", (req, res) => res.send("SmashCart API is running"));

// GET /api/products?category=racket&brand=Yonex&level=Advanced&maxPrice=20000
app.get("/api/products", async (req, res) => {
  const { category, brand, level, maxPrice } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (level) filter.level = level;
  if (maxPrice) filter.price = { $lte: Number(maxPrice) };

  const products = await Product.find(filter).sort({ createdAt: 1 });
  res.json(products);
});

// GET /api/products/:id  -> one product       ← paste the new block here
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (e) {
    res.status(400).json({ message: "Invalid product id" });
  }
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(5000, () => console.log("API running on http://localhost:5000"));
  })
  .catch((e) => console.error("MongoDB error:", e.message));