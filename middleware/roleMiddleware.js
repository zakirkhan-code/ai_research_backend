const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Specific role middlewares
const requireResearcher = requireRole(['researcher', 'academic_manager', 'administrator']);
const requireManager = requireRole(['academic_manager', 'administrator']);
const requireAdmin = requireRole(['administrator']);

module.exports = {
  requireRole,
  requireResearcher,
  requireManager,
  requireAdmin
};