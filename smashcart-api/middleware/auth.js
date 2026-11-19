const jwt = require("jsonwebtoken");

// lets a request through only if it carries a valid login ticket
function requireAuth(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ message: "Please log in first" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: payload.id, role: payload.role };
        next(); // go on to the real route
    } catch (e) {
        res.status(401).json({ message: "Your session has expired. Please log in again." });
    }
}

// we will use this one for the admin pages later
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Admins only" });
    }
    next();
}

module.exports = { requireAuth, requireAdmin };