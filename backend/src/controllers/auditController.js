const db = require('../config/db');

const STAFF_ROLES = ['Staff', 'Veterinarian'];
const STAFF_ACTIONS = ['LOGIN', 'CHECK_IN'];

const AUDIT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'VERIFY', 'CANCEL', 'RESTORE'];
const SYSTEM_ACTIONS = ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'APPROVE', 'REJECT', 'VERIFY', 'CANCEL', 'RESTORE'];

function buildStaffOnlyFilter() {
  return {
    clause: ` AND u.role IN (${STAFF_ROLES.map(() => '?').join(', ')}) AND al.action IN (${STAFF_ACTIONS.map(() => '?').join(', ')}) AND al.staff_name IS NOT NULL`,
    params: [...STAFF_ROLES, ...STAFF_ACTIONS],
  };
}

function buildComprehensiveFilter() {
  return {
    clause: ` AND al.action IN (${SYSTEM_ACTIONS.map(() => '?').join(', ')})`,
    params: [...SYSTEM_ACTIONS],
  };
}

function extractStaffNameFromDescription(description) {
  if (!description) return null;
  const checkInMatch = description.match(/Staff member "(.+?)" checked in/);
  if (checkInMatch) return checkInMatch[1];
  const loginMatch = description.match(/Staff "(.+?)" logged in/);
  if (loginMatch) return loginMatch[1];
  return null;
}

// Get all audit logs with filtering and pagination (Staff login/check-in only)
async function getAllAuditLogs(req, res) {
  try {
    const {
      page = 1,
      limit = 50,
      user_id,
      action,
      entity_type,
      entity_id,
      start_date,
      end_date,
      staff_name
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    // Always restrict to staff login activity
    const staffFilter = buildStaffOnlyFilter();
    whereConditions.push(`1=1${staffFilter.clause}`);
    params.push(...staffFilter.params);

    if (user_id) {
      whereConditions.push('al.user_id = ?');
      params.push(user_id);
    }

    if (action && STAFF_ACTIONS.includes(action)) {
      whereConditions.push('al.action = ?');
      params.push(action);
    }

    if (entity_type) {
      whereConditions.push('al.entity_type = ?');
      params.push(entity_type);
    }

    if (entity_id) {
      whereConditions.push('al.entity_id = ?');
      params.push(entity_id);
    }

    if (staff_name) {
      whereConditions.push('(al.staff_name LIKE ? OR al.description LIKE ?)');
      params.push(`%${staff_name}%`, `%${staff_name}%`);
    }

    if (start_date) {
      whereConditions.push('al.created_at >= ?');
      params.push(start_date);
    }

    if (end_date) {
      whereConditions.push('al.created_at <= ?');
      params.push(end_date);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    // Get total count
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get audit logs with user info
    const [logs] = await db.query(
      `SELECT 
        al.id,
        al.user_id,
        al.staff_name,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_value,
        al.new_value,
        al.ip_address,
        al.user_agent,
        al.description,
        al.created_at,
        COALESCE(al.staff_name, u.full_name, u.email) AS display_name,
        u.email,
        u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const normalizedLogs = logs.map((log) => ({
      ...log,
      staff_name: log.staff_name || extractStaffNameFromDescription(log.description),
      full_name: log.staff_name || log.display_name,
    }));

    res.json({
      success: true,
      logs: normalizedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
}

// Get audit log by ID
async function getAuditLogById(req, res) {
  try {
    const { id } = req.params;

    const [logs] = await db.query(
      `SELECT 
        al.id,
        al.user_id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_value,
        al.new_value,
        al.ip_address,
        al.user_agent,
        al.description,
        al.created_at,
        COALESCE(u.full_name, u.email) AS full_name,
        u.email,
        u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = ?`,
      [id]
    );

    if (logs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }

    res.json({
      success: true,
      log: logs[0]
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit log',
      error: error.message
    });
  }
}

// Get audit statistics (staff login activity only)
async function getAuditStats(req, res) {
  try {
    const staffFilter = buildStaffOnlyFilter();
    const baseJoin = `
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ${staffFilter.clause}
    `;

    const [actionStats] = await db.query(
      `SELECT al.action, COUNT(*) as count ${baseJoin} GROUP BY al.action ORDER BY count DESC`,
      staffFilter.params
    );

    const [staffStats] = await db.query(
      `SELECT COALESCE(al.staff_name, u.email) AS staff_name, COUNT(*) as count
       ${baseJoin}
       GROUP BY COALESCE(al.staff_name, u.email)
       ORDER BY count DESC
       LIMIT 10`,
      staffFilter.params
    );

    const [totalLogs] = await db.query(
      `SELECT COUNT(*) as total ${baseJoin}`,
      staffFilter.params
    );

    const [todayLogs] = await db.query(
      `SELECT COUNT(*) as total
       FROM audit_logs al
       JOIN users u ON al.user_id = u.id
       WHERE DATE(al.created_at) = CURDATE()
       ${staffFilter.clause}`,
      staffFilter.params
    );

    res.json({
      success: true,
      stats: {
        by_action: actionStats,
        top_staff: staffStats,
        total_last_30_days: totalLogs[0].total,
        today_logins: todayLogs[0].total,
        unique_staff: staffStats.length,
      }
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit statistics',
      error: error.message
    });
  }
}

// Staff check-in logging (treated as staff login with individual name)
async function staffCheckIn(req, res) {
  try {
    const user_id = req.user.id;

    const [users] = await db.query(
      `SELECT full_name
       FROM users
       WHERE id = ? AND status = 'active' AND role IN (?, ?)`,
      [user_id, ...STAFF_ROLES]
    );

    if (users.length === 0 || !users[0].full_name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Your active staff profile could not be verified.'
      });
    }

    const staffName = users[0].full_name.trim();

    await db.query(
      `INSERT INTO audit_logs (
        user_id, staff_name, action, entity_type, entity_id,
        description, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        staffName,
        'LOGIN',
        'staff',
        null,
        `Staff "${staffName}" logged in`,
        req.ip || req.connection.remoteAddress,
        req.get('user-agent')
      ]
    );

    res.json({
      success: true,
      message: 'Staff login logged successfully',
      staff_name: staffName
    });
  } catch (error) {
    console.error('Error logging staff check-in:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log staff login',
      error: error.message
    });
  }
}

// Get all activities for a specific staff/veterinarian user
async function getStaffUserActivities(req, res) {
  try {
    const { user_id } = req.params;

    const [userRows] = await db.query(
      `SELECT id, email, role, full_name FROM users WHERE id = ? AND role IN (?, ?)`,
      [user_id, ...STAFF_ROLES]
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found',
      });
    }

    const [activities] = await db.query(
      `SELECT
        al.id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.description,
        al.ip_address,
        al.staff_name,
        al.created_at
      FROM audit_logs al
      WHERE al.user_id = ?
      ORDER BY al.created_at DESC
      LIMIT 100`,
      [user_id]
    );

    res.json({
      success: true,
      staff: userRows[0],
      activities,
    });
  } catch (error) {
    console.error('Error fetching staff activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff activities',
      error: error.message,
    });
  }
}

// Get comprehensive activity and audit logs (for Activity & Audit Trail page)
async function getComprehensiveAuditLogs(req, res) {
  try {
    const {
      page = 1,
      limit = 50,
      user_id,
      action,
      entity_type,
      entity_id,
      start_date,
      end_date,
      staff_name,
      search,
      tab = 'all' // 'all', 'system', 'audit'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    // Apply tab-based filtering
    if (tab === 'system') {
      // System activity: LOGIN, LOGOUT, CREATE, VIEW
      const systemActions = ['LOGIN', 'LOGOUT', 'CREATE', 'VIEW'];
      whereConditions.push(`al.action IN (${systemActions.map(() => '?').join(', ')})`);
      params.push(...systemActions);
    } else if (tab === 'audit') {
      // Audit trail: CREATE, UPDATE, DELETE, APPROVE, REJECT, VERIFY, CANCEL, RESTORE
      whereConditions.push(`al.action IN (${AUDIT_ACTIONS.map(() => '?').join(', ')})`);
      params.push(...AUDIT_ACTIONS);
    }
    // 'all' tab shows everything

    if (user_id) {
      whereConditions.push('al.user_id = ?');
      params.push(user_id);
    }

    if (action) {
      whereConditions.push('al.action = ?');
      params.push(action);
    }

    if (entity_type) {
      whereConditions.push('al.entity_type = ?');
      params.push(entity_type);
    }

    if (entity_id) {
      whereConditions.push('al.entity_id = ?');
      params.push(entity_id);
    }

    if (staff_name) {
      whereConditions.push('(al.staff_name LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)');
      params.push(`%${staff_name}%`, `%${staff_name}%`, `%${staff_name}%`);
    }

    if (search) {
      whereConditions.push('(al.description LIKE ? OR al.entity_type LIKE ? OR al.staff_name LIKE ? OR u.full_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (start_date) {
      whereConditions.push('al.created_at >= ?');
      params.push(start_date);
    }

    if (end_date) {
      whereConditions.push('al.created_at <= ?');
      params.push(end_date);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get audit logs with user info
    const [logs] = await db.query(
      `SELECT
        al.id,
        al.user_id,
        al.staff_name,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_value,
        al.new_value,
        al.ip_address,
        al.user_agent,
        al.description,
        al.created_at,
        COALESCE(al.staff_name, u.full_name, u.email) AS display_name,
        u.email,
        u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const normalizedLogs = logs.map((log) => ({
      ...log,
      staff_name: log.staff_name || extractStaffNameFromDescription(log.description),
      full_name: log.staff_name || log.display_name,
    }));

    res.json({
      success: true,
      logs: normalizedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching comprehensive audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
}

// Get comprehensive audit statistics
async function getComprehensiveAuditStats(req, res) {
  try {
    const [actionStats] = await db.query(
      `SELECT al.action, COUNT(*) as count
       FROM audit_logs al
       WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY al.action
       ORDER BY count DESC`
    );

    const [entityStats] = await db.query(
      `SELECT al.entity_type, COUNT(*) as count
       FROM audit_logs al
       WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY al.entity_type
       ORDER BY count DESC`
    );

    const [totalLogs] = await db.query(
      `SELECT COUNT(*) as total
       FROM audit_logs al
       WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    const [todayLogs] = await db.query(
      `SELECT COUNT(*) as total
       FROM audit_logs al
       WHERE DATE(al.created_at) = CURDATE()`
    );

    const [userStats] = await db.query(
      `SELECT COALESCE(al.staff_name, u.full_name, u.email) AS user_name, u.role, COUNT(*) as count
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY COALESCE(al.staff_name, u.full_name, u.email), u.role
       ORDER BY count DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      stats: {
        by_action: actionStats,
        by_entity: entityStats,
        total_last_30_days: totalLogs[0].total,
        today_activities: todayLogs[0].total,
        top_users: userStats,
      }
    });
  } catch (error) {
    console.error('Error fetching comprehensive audit stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit statistics',
      error: error.message
    });
  }
}

module.exports = {
  getAllAuditLogs,
  getAuditLogById,
  getAuditStats,
  staffCheckIn,
  getStaffUserActivities,
  getComprehensiveAuditLogs,
  getComprehensiveAuditStats,
};
