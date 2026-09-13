-- Fix notifications.type enum to cover all type strings used in controllers
ALTER TABLE `notifications`
  MODIFY COLUMN `type`
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
