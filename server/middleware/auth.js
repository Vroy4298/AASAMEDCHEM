/**
 * middleware/auth.js
 *
 * JWT-based authentication middleware.
 *
 * HOW IT WORKS:
 *   1. Client sends JWT in the Authorization header: "Bearer <token>"
 *   2. authMiddleware verifies the token using JWT_SECRET.
 *   3. On success, req.user = { userId, role, email } is set.
 *   4. requireRole('admin') ensures only admins can access that route.
 *
 * WHY JWT (not sessions)?
 *   Stateless — the server doesn't store session data.
 *   Works well when frontend and backend are on separate domains (CORS).
 */

const jwt = require('jsonwebtoken');

/**
 * Verify JWT and attach user info to req.user
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, role, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Role guard factory. Use after authMiddleware.
 * Example: router.post('/products', authMiddleware, requireRole('admin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole };
