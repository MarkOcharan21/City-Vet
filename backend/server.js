const express = require("express");
const cors =require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");

require("dotenv").config();

const db = require("./src/config/db");

const allowedOrigins = (process.env.CORS_ORIGINS || `${process.env.FRONTEND_URL}`)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Development devices share the same private Wi-Fi/LAN. Keep public websites
// restricted to the configured origins, while allowing those local devices.
function isAllowedOrigin(origin) {
  if (!origin || allowedOrigins.includes(origin)) return true;

  try {
    const hostname = new URL(origin).hostname;
    return hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname.startsWith('192.168.')
      || hostname.startsWith('10.')
      || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
  } catch {
    return false;
  }
}

// ===================================
// Routes
// ===================================

const authRoutes = require("./src/routes/authRoutes");
const petRoutes = require("./src/routes/petRoutes");
const draftRoutes = require("./src/routes/draftRoutes");
const qrRoutes = require("./src/routes/qrRoutes");
const vaccinationRoutes = require("./src/routes/vaccinationRoutes");
const clinicalRoutes = require("./src/routes/clinicalRoutes");
const medicineRoutes = require("./src/routes/medicineRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const officialReceiptRoutes = require("./src/routes/officialReceiptRoutes");
const paymentMonitoringRoutes = require("./src/routes/paymentMonitoringRoutes");
const paymentHistoryRoutes = require("./src/routes/paymentHistoryRoutes");
const outreachRoutes = require("./src/routes/outreachRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const recordRequestRoutes = require("./src/routes/recordRequestRoutes");
const userRoutes = require("./src/routes/userRoutes");
const analyticsRoutes = require("./src/routes/analyticsRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const announcementRoutes = require("./src/routes/announcementRoutes");
const auditRoutes = require("./src/routes/auditRoutes");
const ownerProfileRoutes = require("./src/routes/ownerProfileRoutes");

// ===================================
// Schedulers
// ===================================

const {
    startNotificationScheduler,
} = require("./src/services/notificationScheduler");

const {
    startAnnouncementScheduler,
} = require("./src/services/announcementScheduler");

// ===================================
// App
// ===================================

const app = express();


app.use(cors({
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  credentials: true,
}));
 
app.use(express.json());

const { normalizeInputMiddleware } = require("./src/middleware/normalizeInputMiddleware");
app.use(normalizeInputMiddleware);

app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

app.get("/qr/:token", (req, res) => {
  const frontendOrigin = (process.env.FRONTEND_URL || "http://localhost:5178").replace(/\/$/, "");
  res.redirect(`${frontendOrigin}/public/${encodeURIComponent(req.params.token)}`);
});

// QR landing for outreach payment confirmations. The QR image encodes this
// path; the browser is redirected to the public confirmation form.
app.get("/oqr/:token", (req, res) => {
  const frontendOrigin = (process.env.FRONTEND_URL || "http://localhost:5178").replace(/\/$/, "");
  res.redirect(`${frontendOrigin}/outreach-confirm/${encodeURIComponent(req.params.token)}`);
});

// QR landing for payment-monitoring receipts. The QR image encodes this path;
// the browser is redirected to the staff payment monitoring page (staff signs
// in there and re-scans — or already-recognized tokens autofill the record).
app.get("/pm-receipt/:token", (req, res) => {
  const frontendOrigin = (process.env.FRONTEND_URL || "http://localhost:5178").replace(/\/$/, "");
  res.redirect(`${frontendOrigin}/staff/payment-monitoring`);
});


// ===================================
// API Routes
// ===================================

// Lightweight health check used by the frontend heartbeat to tell whether the
// API is reachable. No auth needed — returns 200 whenever the server is up.
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);

app.use("/api/pets", petRoutes);

app.use("/api/drafts", draftRoutes);

app.use("/api/qr", qrRoutes);

app.use("/api/vaccinations", vaccinationRoutes);

app.use("/api/clinical", clinicalRoutes);

app.use("/api/medicines", medicineRoutes);

app.use("/api/payments", paymentRoutes);

app.use("/api/official-receipts", officialReceiptRoutes);

app.use("/api/payment-monitoring", paymentMonitoringRoutes);

app.use("/api/payment-history", paymentHistoryRoutes);

app.use("/api/outreach", outreachRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/record-requests", recordRequestRoutes);

app.use("/api/users", userRoutes);

app.use("/api/analytics", analyticsRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/announcements", announcementRoutes);

app.use("/api/audit", auditRoutes);

app.use("/api/owner", ownerProfileRoutes);

// ===================================
// MySQL Connection
// ===================================

(async () => {

    try {

        const connection = await db.getConnection();

        console.log("✅ Connected to MySQL.");

        connection.release();

    } catch (err) {

        console.error("❌ Failed to connect to MySQL.");

        console.error("Error details:", err.message);

        console.error("Please check:");
        console.error("  1. MySQL is running in XAMPP");
        console.error("  2. Database credentials in .env file are correct");
        console.error("  3. Database exists");

    }

})();

// ===================================
// Socket.IO
// ===================================

const server = http.createServer(app);

const io = new Server(server, {
    pingInterval: 30000,
    pingTimeout: 30000,
    cors: {
        origin: (origin, callback) => {
            if (isAllowedOrigin(origin)) {
                return callback(null, true);
            }
            return callback(new Error(`Socket CORS policy does not allow access from ${origin}`));
        },
        credentials: true,
    },
});

global.io = io;

app.set("io", io);

io.on("connection", (socket) => {

    console.log("Socket Connected:", socket.id);

    socket.on("join-room", (userId) => {

        socket.join(`user-${userId}`);

        console.log(`User ${userId} joined room user-${userId}`);

    });

    socket.on("disconnect", () => {

        console.log("Socket Disconnected:", socket.id);

    });

});

// ===================================
// Start Background Schedulers
// ===================================

// Start schedulers after database is ready
async function startSchedulers() {
  await ensureResetColumns();
  await ensureUserIdentityColumns();
  await ensureStatusColumn();
  await ensureStaffNameColumn();
  await ensureAnnouncementColumns();
  await ensureNotificationTypes();
  await ensureRecordRequestsAutoIncrement();
  await ensureRecordRequestCommentsColumn();
  await ensureDraftAutoIncrement();
  await ensureMedicinesAutoIncrement();
  await ensureConsultationRecordsAutoIncrement();
  await ensurePrescriptionsAutoIncrement();
  await ensurePrescriptionItemsAutoIncrement();
  await ensureDefaultMedicines();
  await ensureTableAutoIncrement('payments');
  await ensurePaymentMonitoringTable();
  await ensureOutreachTables();

  startNotificationScheduler();
  startAnnouncementScheduler();
}

async function ensureUserIdentityColumns() {
  try {
    const [columns] = await db.query("SHOW COLUMNS FROM users");
    const names = columns.map((column) => column.Field);

    if (!names.includes('role')) {
      const rolePosition = names.includes('role_id') ? ' AFTER role_id' : '';
      await db.query(
        `ALTER TABLE users ADD COLUMN role ENUM('Owner','Staff','Veterinarian','Admin') DEFAULT 'Owner'${rolePosition}`
      );
    }

    if (!names.includes('full_name')) {
      await db.query(
        "ALTER TABLE users ADD COLUMN full_name VARCHAR(150) DEFAULT NULL AFTER password"
      );
    }

    if (names.includes('role_id')) {
      await db.query(`
        UPDATE users u
        JOIN roles r ON r.id = u.role_id
        SET u.role = r.role_name
      `);
    }

    await db.query(`
      UPDATE users u
      JOIN pet_owners po ON po.user_id = u.id
      SET u.full_name = po.full_name
      WHERE u.full_name IS NULL
    `);
  } catch (error) {
    console.warn('⚠️ Failed to ensure user identity columns:', error.message);
  }
}

async function ensureResetColumns() {
  try {
    const [columns] = await db.query("SHOW COLUMNS FROM users LIKE 'reset_code'");
    if (columns.length === 0) {
      await db.query(
        `ALTER TABLE users
         ADD COLUMN reset_code VARCHAR(10) DEFAULT NULL,
         ADD COLUMN reset_code_expiry DATETIME DEFAULT NULL`
      );
      console.log('✅ Added reset_code columns to users table.');
    }
  } catch (error) {
    console.warn('⚠️ Failed to ensure reset_code columns:', error.message);
  }
}

async function ensureStatusColumn() {
  try {
    const [columns] = await db.query("SHOW COLUMNS FROM users LIKE 'status'");
    if (columns.length === 0) {
      await db.query(
        `ALTER TABLE users ADD COLUMN status ENUM('active','inactive') DEFAULT 'active' AFTER role`
      );
      // Set all existing users to active
      await db.query(`UPDATE users SET status = 'active' WHERE status IS NULL`);
      console.log('✅ Added status column to users table.');
    }
  } catch (error) {
    console.warn('⚠️ Failed to ensure status column:', error.message);
  }
}

async function ensureStaffNameColumn() {
  try {
    const [columns] = await db.query("SHOW COLUMNS FROM audit_logs LIKE 'staff_name'");
    if (columns.length === 0) {
      await db.query(
        `ALTER TABLE audit_logs
         ADD COLUMN staff_name VARCHAR(150) DEFAULT NULL AFTER user_id`
      );
      console.log('✅ Added staff_name column to audit_logs table.');
    }

    await db.query(`
      UPDATE audit_logs
      SET staff_name = SUBSTRING_INDEX(SUBSTRING_INDEX(description, '"', 2), '"', -1)
      WHERE staff_name IS NULL
        AND description LIKE 'Staff member "%" checked in'
    `);
  } catch (error) {
    console.warn('⚠️ Failed to ensure staff_name column:', error.message);
  }
}

async function ensureAnnouncementColumns() {
  try {
    // Check if announcements table exists
    const [tables] = await db.query("SHOW TABLES LIKE 'announcements'");
    if (tables.length === 0) {
      console.log('⚠️ announcements table does not exist, skipping column check');
      return;
    }

    // Get current columns
    const [currentColumns] = await db.query("SHOW COLUMNS FROM announcements");
    const columnNames = currentColumns.map(col => col.Field);

    // Add audience column if missing
    if (!columnNames.includes('audience')) {
      try {
        await db.query("ALTER TABLE announcements ADD COLUMN audience ENUM('All','Owner','Staff','Veterinarian','Admin') DEFAULT 'All'");
        console.log('✅ Added audience column to announcements table.');
      } catch (err) {
        console.warn('⚠️ Failed to add audience column:', err.message);
      }
    }

    // Add scheduled_at column if missing
    if (!columnNames.includes('scheduled_at')) {
      try {
        await db.query("ALTER TABLE announcements ADD COLUMN scheduled_at DATETIME DEFAULT NULL");
        console.log('✅ Added scheduled_at column to announcements table.');
      } catch (err) {
        console.warn('⚠️ Failed to add scheduled_at column:', err.message);
      }
    }

    // Add is_sent column if missing
    if (!columnNames.includes('is_sent')) {
      try {
        await db.query("ALTER TABLE announcements ADD COLUMN is_sent TINYINT(1) DEFAULT 0");
        console.log('✅ Added is_sent column to announcements table.');
      } catch (err) {
        console.warn('⚠️ Failed to add is_sent column:', err.message);
      }
    }

    // Add sent_at column if missing
    if (!columnNames.includes('sent_at')) {
      try {
        await db.query("ALTER TABLE announcements ADD COLUMN sent_at DATETIME DEFAULT NULL");
        console.log('✅ Added sent_at column to announcements table.');
      } catch (err) {
        console.warn('⚠️ Failed to add sent_at column:', err.message);
      }
    }

    // Add created_by column if missing
    if (!columnNames.includes('created_by')) {
      try {
        await db.query("ALTER TABLE announcements ADD COLUMN created_by INT DEFAULT NULL");
        console.log('✅ Added created_by column to announcements table.');
      } catch (err) {
        console.warn('⚠️ Failed to add created_by column:', err.message);
      }
    }

    // Add image column if missing
    if (!columnNames.includes('image')) {
      try {
        await db.query(
          "ALTER TABLE announcements ADD COLUMN image VARCHAR(255) DEFAULT NULL AFTER message"
        );
        console.log('✅ Added image column to announcements table.');
      } catch (err) {
        console.warn('⚠️ Failed to add image column:', err.message);
      }
    }

    console.log('✅ Announcements table columns verified');
  } catch (error) {
    console.warn('⚠️ Failed to ensure announcement columns:', error.message);
  }
}

async function ensureNotificationTypes() {
  try {
    const [columns] = await db.query("SHOW COLUMNS FROM notifications LIKE 'type'");
    if (columns.length === 0) return;

    const columnType = columns[0].Type || '';
    const requiredTypes = ['Announcement', 'Record', 'Registration'];
    const missingTypes = requiredTypes.filter((type) => !columnType.includes(`'${type}'`));

    if (missingTypes.length === 0) {
      console.log('ℹ️ notifications.type enum already up to date.');
    } else {
      await db.query(`
        ALTER TABLE notifications
        MODIFY COLUMN type ENUM(
          'Vaccination',
          'Payment',
          'QR',
          'LostPet',
          'System',
          'Announcement',
          'Record',
          'Registration'
        ) NOT NULL DEFAULT 'System'
      `);
      console.log('✅ notifications.type enum updated.');
    }

    const [linkColumns] = await db.query("SHOW COLUMNS FROM notifications LIKE 'link'");
    if (linkColumns.length === 0) {
      await db.query(
        "ALTER TABLE notifications ADD COLUMN link VARCHAR(255) DEFAULT NULL AFTER type"
      );
      console.log('✅ Added link column to notifications table.');
    }
  } catch (error) {
    console.warn('⚠️ Failed to ensure notification types:', error.message);
  }
}

async function ensureRecordRequestsAutoIncrement() {
  try {
    await db.query('ALTER TABLE record_requests MODIFY id INT(11) NOT NULL AUTO_INCREMENT');

    const [[{ maxId }]] = await db.query(
      'SELECT IFNULL(MAX(id), 0) AS maxId FROM record_requests',
    );
    const nextId = Number(maxId) + 1;
    await db.query(`ALTER TABLE record_requests AUTO_INCREMENT = ${nextId}`);
    console.log('✅ record_requests AUTO_INCREMENT verified.');
  } catch (error) {
    console.warn('⚠️ Failed to ensure record_requests AUTO_INCREMENT:', error.message);
  }
}

async function ensureRecordRequestCommentsColumn() {
  try {
    const [columns] = await db.query("SHOW COLUMNS FROM record_requests LIKE 'comments'");
    if (columns.length === 0) {
      await db.query(
        'ALTER TABLE record_requests ADD COLUMN comments TEXT DEFAULT NULL AFTER format',
      );
      console.log('✅ Added comments column to record_requests table.');
    }
  } catch (error) {
    console.warn('⚠️ Failed to ensure record_requests comments column:', error.message);
  }
}

async function ensureDraftAutoIncrement() {
  try {
    const [columns] = await db.query("SHOW COLUMNS FROM draft_registrations LIKE 'id'");
    const idColumn = columns[0];

    if (!idColumn || !String(idColumn.Extra || "").includes("auto_increment")) {
      await db.query("DELETE FROM draft_registrations WHERE id = 0");
      await db.query(
        "ALTER TABLE draft_registrations MODIFY id INT(11) NOT NULL AUTO_INCREMENT",
      );
    }

    const [[{ maxId }]] = await db.query(
      "SELECT IFNULL(MAX(id), 0) AS maxId FROM draft_registrations",
    );
    const nextId = Number(maxId) + 1;
    await db.query(`ALTER TABLE draft_registrations AUTO_INCREMENT = ${nextId}`);
    console.log("✅ draft_registrations AUTO_INCREMENT verified.");
  } catch (error) {
    console.warn("⚠️ Failed to ensure draft_registrations AUTO_INCREMENT:", error.message);
  }
}

async function ensureMedicinesAutoIncrement() {
  await ensureTableAutoIncrement('medicines');
}

async function ensureConsultationRecordsAutoIncrement() {
  await ensureTableAutoIncrement('consultation_records');
}

async function ensurePrescriptionsAutoIncrement() {
  await ensureTableAutoIncrement('prescriptions');
}

async function ensurePrescriptionItemsAutoIncrement() {
  await ensureTableAutoIncrement('prescription_items');
}

async function ensureTableAutoIncrement(tableName) {
  try {
    await db.query(`ALTER TABLE ${tableName} MODIFY id INT(11) NOT NULL AUTO_INCREMENT`);

    const [[{ maxId }]] = await db.query(
      `SELECT IFNULL(MAX(id), 0) AS maxId FROM ${tableName}`,
    );
    const nextId = Number(maxId) + 1;
    await db.query(`ALTER TABLE ${tableName} AUTO_INCREMENT = ${nextId}`);
    console.log(`✅ ${tableName} AUTO_INCREMENT verified.`);
  } catch (error) {
    console.warn(`⚠️ Failed to ensure ${tableName} AUTO_INCREMENT:`, error.message);
  }
}

async function ensureDefaultMedicines() {
  const defaultMedicines = [
    ['Amoxicillin', 'Antibiotic for bacterial infections'],
    ['Doxycycline', 'Antibiotic for tick-borne and respiratory infections'],
    ['Metronidazole', 'Treatment for diarrhea and protozoal infections'],
    ['Ivermectin', 'Dewormer and mange treatment'],
    ['Pyrantel Pamoate', 'Dewormer for roundworms and hookworms'],
    ['Carprofen', 'Pain and inflammation relief'],
    ['Chlorpheniramine', 'Antihistamine for allergies'],
    ['Vitamin B Complex', 'Nutritional supplement'],
    ['Enrofloxacin (Baytril)', 'Broad-spectrum antibiotic'],
    ['Frontline Spray', 'Flea and tick control'],
    ['Prednisolone', 'Anti-inflammatory for skin and allergy conditions'],
    ['Oral Rehydration Salts', 'Fluid replacement for dehydration'],
  ];

  try {
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM medicines');

    if (Number(total) > 0) {
      console.log('ℹ️ Medicine list already exists.');
      return;
    }

    for (const [medicineName, description] of defaultMedicines) {
      await db.query(
        'INSERT INTO medicines (medicine_name, description) VALUES (?, ?)',
        [medicineName, description],
      );
    }

    console.log(`✅ Seeded ${defaultMedicines.length} default medicines.`);
  } catch (error) {
    console.warn('⚠️ Failed to ensure default medicines:', error.message);
  }
}

async function ensurePaymentMonitoringTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS payment_monitoring (
        id INT(11) NOT NULL AUTO_INCREMENT,
        or_number VARCHAR(100) NOT NULL,
        or_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        or_date DATE DEFAULT NULL,
        or_time TIME DEFAULT NULL,
        or_description VARCHAR(255) DEFAULT NULL,
        payment_items TEXT NULL,
        or_photo_path VARCHAR(500) DEFAULT NULL,
        ocr_text MEDIUMTEXT DEFAULT NULL,
        ocr_confidence DECIMAL(5,2) DEFAULT NULL,
        pet_owner_id INT(11) NOT NULL,
        payment_type ENUM('Consultation','Vaccination','Medicine') NOT NULL,
        medicine_id INT(11) DEFAULT NULL,
        medicine_quantity VARCHAR(50) DEFAULT NULL,
        medicine_total DECIMAL(10,2) DEFAULT NULL,
        recorded_by INT(11) NOT NULL,
        remarks VARCHAR(255) DEFAULT NULL,
        pm_token VARCHAR(64) DEFAULT NULL,
        receipt_qr_path VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_pm_or_number (or_number),
        UNIQUE KEY uk_pm_token (pm_token),
        KEY pet_owner_id (pet_owner_id),
        KEY medicine_id (medicine_id),
        KEY recorded_by (recorded_by),
        CONSTRAINT fk_pm_owner FOREIGN KEY (pet_owner_id) REFERENCES pet_owners (id) ON DELETE CASCADE,
        CONSTRAINT fk_pm_medicine FOREIGN KEY (medicine_id) REFERENCES medicines (id) ON DELETE SET NULL,
        CONSTRAINT fk_pm_recorded_by FOREIGN KEY (recorded_by) REFERENCES users (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    // Migrate existing installations: add the itemized "payment_items" column
    // if it does not exist yet (safe for tables created before v2).
    const [[column]] = await db.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'payment_monitoring'
         AND COLUMN_NAME = 'payment_items'`
    );
    if (!column || Number(column.c) === 0) {
      await db.query(
        `ALTER TABLE payment_monitoring
         ADD COLUMN payment_items TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL AFTER or_description`
      );
      console.log('✅ payment_items column added to payment_monitoring.');
    }

    // Migrate existing installations: QR receipt columns (pm_token + QR image).
    const [[qrCol]] = await db.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'payment_monitoring'
         AND COLUMN_NAME = 'pm_token'`
    );
    if (!qrCol || Number(qrCol.c) === 0) {
      await db.query(
        `ALTER TABLE payment_monitoring
         ADD COLUMN pm_token VARCHAR(64) NULL,
         ADD UNIQUE KEY uk_pm_token (pm_token)`
      );
      console.log('✅ pm_token column added to payment_monitoring.');
    }
    const [[qrPathCol]] = await db.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'payment_monitoring'
         AND COLUMN_NAME = 'receipt_qr_path'`
    );
    if (!qrPathCol || Number(qrPathCol.c) === 0) {
      await db.query(
        `ALTER TABLE payment_monitoring
         ADD COLUMN receipt_qr_path VARCHAR(500) NULL AFTER pm_token`
      );
      console.log('✅ receipt_qr_path column added to payment_monitoring.');
    }

    console.log('✅ payment_monitoring table verified.');
  } catch (error) {
    console.warn('⚠️ Failed to ensure payment_monitoring table:', error.message);
  }
}

async function ensureOutreachTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS outreach_programs (
        id INT(11) NOT NULL AUTO_INCREMENT,
        program_name VARCHAR(150) NOT NULL,
        event_date DATE DEFAULT NULL,
        end_date DATE DEFAULT NULL,
        barangay VARCHAR(100) DEFAULT NULL,
        venue VARCHAR(255) DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        status ENUM('Setup','Ongoing','Completed','Cancelled') NOT NULL DEFAULT 'Setup',
        qr_token VARCHAR(64) DEFAULT NULL,
        qr_image_path VARCHAR(500) DEFAULT NULL,
        created_by INT(11) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_outreach_program_qr (qr_token),
        KEY status (status),
        KEY event_date (event_date),
        CONSTRAINT fk_outreach_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS outreach_program_services (
        id INT(11) NOT NULL AUTO_INCREMENT,
        outreach_id INT(11) NOT NULL,
        service_name VARCHAR(150) NOT NULL,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        PRIMARY KEY (id),
        KEY outreach_id (outreach_id),
        CONSTRAINT fk_ops_outreach FOREIGN KEY (outreach_id) REFERENCES outreach_programs (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS outreach_transactions (
        id INT(11) NOT NULL AUTO_INCREMENT,
        outreach_id INT(11) NOT NULL,
        qr_token VARCHAR(255) NOT NULL,
        qr_image_path VARCHAR(500) DEFAULT NULL,
        pet_owner_id INT(11) DEFAULT NULL,
        pet_id INT(11) DEFAULT NULL,
        owner_name VARCHAR(150) DEFAULT NULL,
        owner_contact VARCHAR(50) DEFAULT NULL,
        pet_name VARCHAR(100) DEFAULT NULL,
        barangay VARCHAR(100) DEFAULT NULL,
        service_date DATE DEFAULT NULL,
        service_time TIME DEFAULT NULL,
        total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        status ENUM('Pending','Submitted','Verified','Rejected') NOT NULL DEFAULT 'Pending',
        submitted_at DATETIME DEFAULT NULL,
        verified_at DATETIME DEFAULT NULL,
        verified_by INT(11) DEFAULT NULL,
        rejection_reason VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_outreach_qr_token (qr_token),
        KEY outreach_id (outreach_id),
        KEY pet_owner_id (pet_owner_id),
        KEY pet_id (pet_id),
        KEY status (status),
        KEY barangay (barangay),
        CONSTRAINT fk_ot_outreach FOREIGN KEY (outreach_id) REFERENCES outreach_programs (id) ON DELETE CASCADE,
        CONSTRAINT fk_ot_owner FOREIGN KEY (pet_owner_id) REFERENCES pet_owners (id) ON DELETE SET NULL,
        CONSTRAINT fk_ot_pet FOREIGN KEY (pet_id) REFERENCES pets (id) ON DELETE SET NULL,
        CONSTRAINT fk_ot_verified_by FOREIGN KEY (verified_by) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS outreach_transaction_items (
        id INT(11) NOT NULL AUTO_INCREMENT,
        transaction_id INT(11) NOT NULL,
        service_name VARCHAR(150) NOT NULL,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        PRIMARY KEY (id),
        KEY transaction_id (transaction_id),
        CONSTRAINT fk_oti_transaction FOREIGN KEY (transaction_id) REFERENCES outreach_transactions (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    // Migrations for databases created before the program-level QR + service
    // date/time columns existed.
    const [[colCheck]] = await db.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outreach_programs' AND COLUMN_NAME = 'qr_token'`
    );
    if (!Number(colCheck.c)) {
      await db.query(
        `ALTER TABLE outreach_programs
         ADD COLUMN qr_token VARCHAR(64) DEFAULT NULL AFTER status,
         ADD COLUMN qr_image_path VARCHAR(500) DEFAULT NULL AFTER qr_token,
         ADD UNIQUE KEY uk_outreach_program_qr (qr_token)`
      );
    } else {
      const [[imgCheck]] = await db.query(
        `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outreach_programs' AND COLUMN_NAME = 'qr_image_path'`
      );
      if (!Number(imgCheck.c)) {
        await db.query("ALTER TABLE outreach_programs ADD COLUMN qr_image_path VARCHAR(500) DEFAULT NULL AFTER qr_token");
      }
    }

    const [[svcDateCheck]] = await db.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outreach_transactions' AND COLUMN_NAME = 'service_date'`
    );
    if (!Number(svcDateCheck.c)) {
      await db.query(
        "ALTER TABLE outreach_transactions ADD COLUMN service_date DATE DEFAULT NULL AFTER barangay, ADD COLUMN service_time TIME DEFAULT NULL AFTER service_date"
      );
    }

    console.log('✅ Outreach tables verified.');
  } catch (error) {
    console.warn('⚠️ Failed to ensure outreach tables:', error.message);
  }
}

// ===================================
// Start Server
// ===================================
console.log("✅ THIS IS MY UPDATED SERVER");
const PORT = process.env.PORT || 5000;

// Auto-free the port if it is already in use, so the backend can always
// start cleanly without manual netstat/taskkill steps.
function isWindows() {
  return process.platform === "win32";
}

function findPidUsingPort(port) {
  try {
    // netstat -ano lists LISTENING sockets with PID in the last column.
    const netstat = require("child_process").execSync(
      `netstat -ano | findstr :${port} | findstr LISTENING`,
      { encoding: "utf8" },
    );
    const lines = netstat.split(/\r?\n/).filter((l) => l.trim());
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts[parts.length - 1]);
      if (Number.isInteger(pid) && pid > 0) return pid;
    }
  } catch (_) {
    // netstat may fail or return nothing when the port is free.
  }
  return null;
}

function killPid(pid) {
  try {
    require("child_process").execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    return true;
  } catch (_) {
    return false;
  }
}

function startListening() {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Free an already-running process on the port, then wait until the socket is
// actually released so server.listen() does not race with the OS.
async function freePortIfBusy() {
  if (!isWindows()) return;
  const pid = findPidUsingPort(PORT);
  if (pid) {
    console.warn(`⚠️ Port ${PORT} is in use by PID ${pid}. Stopping it automatically...`);
    if (killPid(pid)) {
      console.log(`✅ Stopped PID ${pid}. Waiting for port ${PORT} to be released...`);
    }
  }

  // Poll up to ~5s until the port is truly free before binding.
  for (let i = 0; i < 20; i++) {
    if (!findPidUsingPort(PORT)) return;
    await sleep(250);
  }
  console.warn(`⚠️ Port ${PORT} is still busy after cleanup; will attempt to listen anyway.`);
}

(async () => {
  try {
    await startSchedulers();

    // Free an already-running backend before binding, so `npm run dev`
    // always starts cleanly with no manual netstat/taskkill needed.
    await freePortIfBusy();

    server.on("error", (error) => {
      console.error(`❌ Could not start on port ${PORT}.`);
      console.error(`   If the port is still in use, stop the other backend process first:`);
      console.error(`   netstat -ano | findstr :${PORT}`);
      console.error(`   taskkill /PID <PID> /F`);
      process.exit(1);
    });

    startListening();
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
})();
