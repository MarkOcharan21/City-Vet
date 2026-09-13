const jwt = require('jsonwebtoken');

// Checks that a valid login token was sent with the request.
// Every protected route uses this before running its real logic.
function authMiddleware(req, res, next) {

  console.log("===== AUTH MIDDLEWARE =====");
  console.log("Authorization:", req.headers.authorization);

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "No token provided.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("Decoded Token:", decoded);

    req.user = decoded;

    next();

  } catch (err) {

    console.log("JWT ERROR:", err.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });

  }
}

module.exports = authMiddleware;