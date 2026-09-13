const db = require('../config/db');

/**
 * Log an audit action to the audit_logs table
 * @param {Object} options - Audit log options
 * @param {number} options.user_id - ID of the user performing the action
 * @param {string} options.action - Action type (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, VIEW, etc.)
 * @param {string} options.entity_type - Type of entity (pet, user, payment, vaccination, etc.)
 * @param {number} options.entity_id - ID of the entity being acted upon
 * @param {Object} options.old_value - Previous values (for UPDATE actions)
 * @param {Object} options.new_value - New values
 * @param {string} options.description - Human-readable description
 * @param {string} options.ip_address - IP address of the user
 * @param {string} options.user_agent - User agent string
 */
async function logAuditAction(options) {
  try {
    const {
      user_id,
      staff_name,
      action,
      entity_type,
      entity_id,
      old_value,
      new_value,
      description,
      ip_address,
      user_agent
    } = options;

    await db.query(
      `INSERT INTO audit_logs (
        user_id, staff_name, action, entity_type, entity_id, 
        old_value, new_value, ip_address, user_agent, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id || null,
        staff_name || null,
        action,
        entity_type,
        entity_id || null,
        old_value ? JSON.stringify(old_value) : null,
        new_value ? JSON.stringify(new_value) : null,
        ip_address || null,
        user_agent || null,
        description || null
      ]
    );
  } catch (error) {
    // Don't throw errors for audit logging to avoid breaking main functionality
    console.error('Error logging audit action:', error);
  }
}

/**
 * Convenience wrapper for controllers.
 * Fills user_id, staff_name, ip_address and user_agent from the request so
 * controllers only need to pass action/entity details.
 * Always fails silently so audit logging never breaks the main operation.
 */
async function logAudit(req, options) {
  try {
    await logAuditAction({
      user_id: req.user?.id || options.user_id || null,
      staff_name: req.user?.full_name || options.staff_name || null,
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent:
        typeof req.get === 'function' ? req.get('user-agent') : req.headers?.['user-agent'],
      ...options,
    });
  } catch (error) {
    // Never throw from audit logging
    console.error('Error logging audit action:', error);
  }
}

/**
 * Middleware to automatically log requests
 * This middleware logs basic request information
 */
function auditRequest(req, res, next) {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log the response after it's sent
    if (req.user && req.method !== 'GET') {
      logAuditAction({
        user_id: req.user.id,
        action: getActionFromMethod(req.method),
        entity_type: getEntityTypeFromPath(req.path),
        entity_id: req.params.id || null,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent'),
        description: `${req.method} ${req.path}`
      });
    }
    originalSend.call(this, data);
  };
  
  next();
}

/**
 * Helper function to get action type from HTTP method
 */
function getActionFromMethod(method) {
  const actionMap = {
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE',
    'GET': 'VIEW'
  };
  return actionMap[method] || 'UNKNOWN';
}

/**
 * Helper function to get entity type from request path
 */
function getEntityTypeFromPath(path) {
  const pathParts = path.split('/').filter(part => part);
  // The entity type is usually the second part of the path (after /api)
  if (pathParts.length >= 2) {
    return pathParts[1].replace(/s$/, ''); // Remove trailing 's' for singular form
  }
  return 'UNKNOWN';
}

module.exports = {
  logAuditAction,
  logAudit,
  auditRequest
};
