-- Fix notifications table: restore AUTO_INCREMENT and extend type enum
-- Root cause of "Duplicate entry '0' for key 'PRIMARY'" during pet registration

-- 1. Remove the broken id=0 row (or reassign if needed)
DELETE FROM notifications WHERE id = 0;

-- 2. Fix AUTO_INCREMENT on id column
ALTER TABLE notifications
  MODIFY id INT(11) NOT NULL AUTO_INCREMENT;

-- 3. Set AUTO_INCREMENT to next available id
SET @max_id = (SELECT IFNULL(MAX(id), 0) FROM notifications);
SET @sql = CONCAT('ALTER TABLE notifications AUTO_INCREMENT = ', @max_id + 1);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Extend type enum to cover all values used in the app
ALTER TABLE notifications
  MODIFY COLUMN type
    ENUM(
      'Vaccination',
      'Payment',
      'QR',
      'LostPet',
      'System',
      'Announcement',
      'Record',
      'Registration'
    )
    NOT NULL DEFAULT 'System';
