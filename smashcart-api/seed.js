require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

const data = [
    { name: "Nanoflare 700 Pro", brand: "Yonex", level: "Advanced", category: "racket", price: 45000, oldPrice: 52000, tag: "-13%", image: "/images/products/racket-1.jpg", rating: 4.9, reviews: 128 },
    { name: "Light Series Racket", brand: "Li-Ning", level: "Beginner", category: "racket", price: 9500, image: "/images/products/racket-2.jpg", rating: 4.5, reviews: 84 },
    { name: "Astrox Racket", brand: "Yonex", level: "Advanced", category: "racket", price: 39000, image: "/images/products/racket-3.jpg", rating: 4.9, reviews: 96 },
    { name: "Black Series Racket", brand: "Li-Ning", level: "Intermediate", category: "racket", price: 7500, oldPrice: 9000, tag: "Sale", image: "/images/products/racket-4.jpg", rating: 4.5, reviews: 142 },
    { name: "Mavis 350 (Nylon)", brand: "Yonex", level: "All levels", category: "shuttle", price: 2400, image: "/images/products/shuttle-1.jpg", rating: 4.8, reviews: 211 },
    { name: "Master Ace Feather", brand: "Victor", level: "Advanced", category: "shuttle", price: 6200, image: "/images/products/shuttle-2.jpg", rating: 4.7, reviews: 310 },
    { name: "Queen Feather", brand: "Victor", level: "Intermediate", category: "shuttle", price: 3400, image: "/images/products/shuttle-3.jpg", rating: 4.6, reviews: 120 },
    { name: "Court Shoes Blue", brand: "Yonex", level: "Beginner", category: "shoes", price: 12900, oldPrice: 15000, tag: "-14%", image: "/images/products/shoes-1.jpg", rating: 4.6, reviews: 57 },
    { name: "UVO Blast IV", brand: "UVO", level: "Intermediate", category: "shoes", price: 14500, image: "/images/products/shoes-2.jpg", rating: 4.8, reviews: 73 },
    { name: "Gel-Rocket 11", brand: "ASICS", level: "Advanced", category: "shoes", price: 27000, image: "/images/products/shoes-3.jpg", rating: 4.7, reviews: 64 },
    { name: "Racket Bag 6-Pack", brand: "Kumpoo", level: "All levels", category: "bag", price: 8900, image: "/images/products/bag-1.jpg", rating: 4.5, reviews: 48 },
    { name: "Active Racket Bag", brand: "Yonex", level: "All levels", category: "bag", price: 14500, image: "/images/products/bag-2.jpg", rating: 4.7, reviews: 39 },
];

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    await Product.deleteMany({});
    await Product.insertMany(data);
    console.log(`Saved ${data.length} products`);
    await mongoose.disconnect();
}

run().catch((e) => {
    console.error(e.message);
    process.exit(1);
});