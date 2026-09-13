// Usage: roleMiddleware(['Admin', 'Staff']) — only lets those roles through.
// Must be used AFTER authMiddleware, since it needs req.user.role.
function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to do this.' });
    }
    next();
  };
}

module.exports = roleMiddleware;
