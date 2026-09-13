-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  staff_name VARCHAR(150) COMMENT 'Actual staff member name (for shared staff accounts)',
  action VARCHAR(50) NOT NULL COMMENT 'CREATE, UPDATE, DELETE, LOGIN, LOGOUT, VIEW, etc.',
  entity_type VARCHAR(100) NOT NULL COMMENT 'pet, user, payment, vaccination, etc.',
  entity_id INT,
  old_value TEXT COMMENT 'JSON string of old values',
  new_value TEXT COMMENT 'JSON string of new values',
  ip_address VARCHAR(45),
  user_agent TEXT,
  description TEXT COMMENT 'Human-readable description of the action',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_entity_type (entity_type),
  INDEX idx_entity_id (entity_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
