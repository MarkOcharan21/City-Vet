-- Fix draft_registrations table: restore AUTO_INCREMENT
-- Root cause of "Duplicate entry '0' for key 'PRIMARY'" when saving drafts

DELETE FROM draft_registrations WHERE id = 0;

ALTER TABLE draft_registrations
  MODIFY id INT(11) NOT NULL AUTO_INCREMENT;

SET @max_id = (SELECT IFNULL(MAX(id), 0) FROM draft_registrations);
SET @sql = CONCAT('ALTER TABLE draft_registrations AUTO_INCREMENT = ', @max_id + 1);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
