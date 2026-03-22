// backend/middleware/permissions.js
export const checkPermission = (permission) => {
  return (req, res, next) => {
    // Make sure user exists
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userPermissions = req.user.permissions || {};
    
    // Check if user has the required permission
    if (!userPermissions[permission]) {
      return res.status(403).json({ 
        message: `Access denied. You don't have permission to ${permission.replace('can', '').toLowerCase()}.` 
      });
    }
    
    next();
  };
};