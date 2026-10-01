const express = require("express");
const cors =require("cors");
const path = require("path");
const http = require("http");
const os = require("os");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
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
const clinicQueueRoutes = require("./src/routes/clinicQueueRoutes");
const medicineRoutes = require("./src/routes/medicineRoutes");
const regimenRoutes = require("./src/routes/regimenRoutes");
const paymentMonitoringRoutes = require("./src/routes/paymentMonitoringRoutes");
const catalogRoutes = require("./src/routes/catalogRoutes");
const paymentHistoryRoutes = require("./src/routes/paymentHistoryRoutes");
const outreachRoutes = require("./src/routes/outreachRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const recordRequestRoutes = require("./src/routes/recordRequestRoutes");
const userRoutes = require("./src/routes/userRoutes");
const analyticsRoutes = require("./src/routes/analyticsRoutes");
const reportRoutes = require("./src/routes/reportRoutes");
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
app.set("trust proxy", 1);

function getLanIp() {
  try {
    const nets = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) ips.push(net.address);
      }
    }
    if (!ips.length) return "localhost";
    const privateIp = ips.find((ip) =>
      /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
    );
    return privateIp || ips[0];
  } catch {
    return "localhost";
  }
}

const LAN_IP = getLanIp();
const API_PORT = Number(process.env.PORT || 5000);




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

app.use(express.static(path.join(__dirname, "public")));

// NOTE: the SPA fallback lives at the very bottom of this file, after every API
// route is mounted. A catch-all `app.get("*")` placed up here would swallow
// every subsequent GET /api/... request and answer 404 before the routers run.

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

// ===================================
// API Routes
// ===================================

// Lightweight health check used by the frontend heartbeat to tell whether the
// API is reachable. No auth needed — returns 200 whenever the server is up.
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "ok",
    timestamp: new Date().toISOString(),
    lanIp: LAN_IP,
    port: API_PORT,
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/pets", petRoutes);

app.use("/api/drafts", draftRoutes);

app.use("/api/qr", qrRoutes);

app.use("/api/vaccinations", vaccinationRoutes);

app.use("/api/clinical", clinicalRoutes);

app.use("/api/clinic-queue", clinicQueueRoutes);

app.use("/api/medicines", medicineRoutes);

app.use("/api/regimens", regimenRoutes);

app.use("/api/payment-monitoring", paymentMonitoringRoutes);

app.use("/api/catalog", catalogRoutes);



app.use("/api/payment-history", paymentHistoryRoutes);

app.use("/api/outreach", outreachRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/record-requests", recordRequestRoutes);

app.use("/api/users", userRoutes);

app.use("/api/analytics", analyticsRoutes);

app.use("/api/reports", reportRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/announcements", announcementRoutes);

app.use("/api/audit", auditRoutes);

app.use("/api/owner", ownerProfileRoutes);

// ===================================
// SPA fallback (must stay last)
// ===================================
// Serves the built frontend for client-side routes. Registered after every API
// router on purpose: as a catch-all it intercepts any GET that no router above
// claimed, so putting it earlier would return index.html (or a 404) for real
// API endpoints instead of letting them 404 properly.
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "API route not found" });
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===================================
// Database Connection
// ===================================

(async () => {

    try {

        const connection = await db.getConnection();

        console.log(`✅ Connected to ${db.dialect === 'postgres' ? 'PostgreSQL (Supabase)' : 'MySQL'}.`);

        connection.release();

    } catch (err) {

        console.error(`❌ Failed to connect to ${db.dialect === 'postgres' ? 'PostgreSQL (Supabase)' : 'MySQL'}.`);

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

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        socket.data.user = { id: user.id, role: user.role };
        return next();
    } catch (error) {
        return next(new Error("Invalid authentication token."));
    }
});

io.on("connection", (socket) => {

    const authenticatedUser = socket.data.user;
    if (authenticatedUser?.id) {
        socket.join(`user-${authenticatedUser.id}`);
    }

    console.log("Socket Connected:", socket.id);

    socket.on("join-room", () => {
        if (authenticatedUser?.id) {
            socket.join(`user-${authenticatedUser.id}`);
        }
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
  // The ensure*() helpers below are legacy MySQL-schema bootstrap guards
  // written in MySQL DDL (ALTER ... MODIFY, SHOW COLUMNS, CREATE TABLE (...),
  // DATABASE()). They are no-ops on a healthy schema either way.
  //
  // On PostgreSQL they are skipped outright rather than translated: the PG
  // schema is authoritative and was built from MySQL's SHOW CREATE TABLE, and
  // verified column-for-column (38 tables / 360 columns, nullability included)
  // by _diff_schema.cjs. Translating 25 DDL helpers would add moving parts
  // without changing the outcome.
  if (db.dialect !== 'postgres') {
    await ensureResetColumns();
    await ensureVerifyColumns();
    await ensureUserIdentityColumns();
    await ensureStatusColumn();
    await ensureAccountColumns();
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
    await ensureMedicineDosingColumns();
    await ensureDefaultMedicines();
    await ensureConditionRegimens();
    await ensureTableAutoIncrement('payments');
    await ensureConsultationBatchesTable();
    await ensureClinicQueueTable();
    await ensurePaymentMonitoringTable();
    await ensureCatalogTable();
    await ensureConsultationPaymentSchema();
    await ensureOutreachTables();
  }

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

// Start updater: verify_code columns for Owner registration OTP
async function ensureVerifyColumns() {
  try {
    const [columns] = await db.query("SHOW COLUMNS FROM users LIKE 'verify_code'");
    if (columns.length === 0) {
      await db.query(
        `ALTER TABLE users
         ADD COLUMN verify_code VARCHAR(10) DEFAULT NULL AFTER reset_code_expiry,
         ADD COLUMN verify_code_expiry DATETIME DEFAULT NULL AFTER verify_code,
         ADD COLUMN verify_sent_at DATETIME DEFAULT NULL AFTER verify_code_expiry`
      );
      console.log('✅ Added verify_code columns to users table.');
    }
  } catch (error) {
    console.warn('⚠️ Failed to ensure verify_code columns:', error.message);
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

// One-time account setup columns for Staff/Veterinarian accounts
// (account_id, setup token, last login) plus backfill of existing users.
async function ensureAccountColumns() {
  try {
    const [columns] = await db.query("SHOW COLUMNS FROM users");
    const names = columns.map((c) => c.Field);

    if (!names.includes('account_id')) {
      await db.query("ALTER TABLE users ADD COLUMN account_id VARCHAR(20) DEFAULT NULL");
      await db.query(
        "ALTER TABLE users ADD UNIQUE KEY `uk_users_account_id` (`account_id`)"
      );
      console.log('✅ Added account_id column to users table.');
    }

    if (!names.includes('setup_token')) {
      await db.query("ALTER TABLE users ADD COLUMN setup_token VARCHAR(64) DEFAULT NULL");
    }
    if (!names.includes('setup_token_expiry')) {
      await db.query("ALTER TABLE users ADD COLUMN setup_token_expiry DATETIME DEFAULT NULL");
    }
    if (!names.includes('last_login')) {
      await db.query("ALTER TABLE users ADD COLUMN last_login DATETIME DEFAULT NULL");
    }

    // Allow pending accounts (created without a password)
    const pwCol = columns.find((c) => c.Field === 'password');
    if (pwCol && pwCol.Null === 'NO') {
      await db.query("ALTER TABLE users MODIFY password VARCHAR(255) DEFAULT NULL");
      console.log('✅ Made users.password nullable for pending accounts.');
    }

    // Extend status enum with 'pending' (preserving existing active/inactive rows)
    const statusCol = columns.find((c) => c.Field === 'status');
    if (statusCol && !/pending/.test(statusCol.Type || '')) {
      await db.query(
        "ALTER TABLE users MODIFY status ENUM('pending','active','inactive') DEFAULT 'active'"
      );
      console.log('✅ Added pending status to users table.');
    }

    // Backfill account IDs for existing Staff / Vet / Admin users
    const [pendingIds] = await db.query(
      `SELECT id, role FROM users
       WHERE role IN ('Staff','Veterinarian','Admin') AND (account_id IS NULL OR account_id = '')
       ORDER BY id ASC`
    );
    for (const u of pendingIds) {
      const prefix = u.role === 'Veterinarian' ? 'VET' : u.role === 'Admin' ? 'ADM' : 'STF';
      const year = new Date().getFullYear();
      const [[{ maxSeq }]] = await db.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(account_id, '-', -1) AS UNSIGNED)), 0) AS maxSeq
         FROM users WHERE account_id LIKE ?`,
        [`${prefix}-${year}-%`]
      );
      const seq = Number(maxSeq || 0) + 1;
      await db.query(
        "UPDATE users SET account_id = ? WHERE id = ?",
        [`${prefix}-${year}-${String(seq).padStart(4, '0')}`, u.id]
      );
    }
    if (pendingIds.length > 0) {
      console.log(`✅ Backfilled account IDs for ${pendingIds.length} existing Staff/Vet/Admin users.`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to ensure account columns:', error.message);
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
    const requiredTypes = ['Announcement', 'Record', 'Registration', 'ClinicQueue'];
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
          'Registration',
          'ClinicQueue'
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

// Dosing defaults live on the medicines row so a newly added medicine can carry
// its own regimen, instead of being invisible to the auto-fill lookup.
// [name, description, category, dosage, frequency, duration, instructions]
const DEFAULT_MEDICINES = [
  ['Amoxicillin', 'Antibiotic for bacterial infections', 'Antibiotic', '1 tablet', 'Twice daily', '7 days', 'Give after meals.'],
  ['Doxycycline', 'Antibiotic for tick-borne and respiratory infections', 'Antibiotic', '1 tablet', 'Once daily', '7 days', 'Give with plenty of water.'],
  ['Metronidazole', 'Treatment for diarrhea and protozoal infections', 'Antibiotic', '1 tablet', 'Twice daily', '5 days', 'Give after meals.'],
  ['Ivermectin', 'Dewormer and mange treatment', 'Dewormer', '0.2 mL', 'Once', 'Single dose', 'May be repeated after 14 days if needed.'],
  ['Pyrantel Pamoate', 'Dewormer for roundworms and hookworms', 'Dewormer', '1 mL', 'Once', 'Single dose', 'Repeat after 2 weeks for deworming completion.'],
  ['Carprofen', 'Pain and inflammation relief', 'Pain Relief', '1 tablet', 'Once daily', '5 days', 'Give with food to avoid stomach upset.'],
  ['Chlorpheniramine', 'Antihistamine for allergies', 'Antihistamine', '1 tablet', 'Twice daily', '5 days', 'May cause drowsiness.'],
  ['Vitamin B Complex', 'Nutritional supplement', 'Supplement', '1 mL', 'Once daily', '7 days', ''],
  ['Enrofloxacin (Baytril)', 'Broad-spectrum antibiotic', 'Antibiotic', '1 tablet', 'Once daily', '7 days', 'Give with water.'],
  ['Frontline Spray', 'Flea and tick control', 'Flea & Tick', '2 sprays', 'Once', 'Monthly', 'Apply against the direction of fur growth.'],
  ['Prednisolone', 'Anti-inflammatory for skin and allergy conditions', 'Anti-inflammatory', '1 tablet', 'Once daily', '5 days', 'Taper dose as advised by the veterinarian.'],
  ['Oral Rehydration Salts', 'Fluid replacement for dehydration', 'Supportive', '1 sachet', 'Every 8 hours', '3 days', 'Mix with clean water before giving.'],
];

// Adds the dosing columns to an existing database and backfills the seeded
// medicines. Idempotent: it only touches rows that are still missing data.
async function ensureMedicineDosingColumns() {
  const newColumns = [
    ['category', 'VARCHAR(60) DEFAULT NULL'],
    ['default_dosage', 'VARCHAR(100) DEFAULT NULL'],
    ['default_frequency', 'VARCHAR(100) DEFAULT NULL'],
    ['default_duration', 'VARCHAR(100) DEFAULT NULL'],
    ['default_instructions', 'VARCHAR(255) DEFAULT NULL'],
  ];

  try {
    const [existing] = await db.query('SHOW COLUMNS FROM medicines');
    const present = new Set(existing.map((column) => column.Field));

    for (const [name, definition] of newColumns) {
      if (present.has(name)) continue;
      await db.query(`ALTER TABLE medicines ADD COLUMN \`${name}\` ${definition}`);
      console.log(`✅ Added ${name} column to medicines table.`);
    }

    // Match on name so a re-seeded or renamed row is not overwritten.
    for (const [name, , category, dosage, frequency, duration, instructions] of DEFAULT_MEDICINES) {
      await db.query(
        `UPDATE medicines
         SET category = COALESCE(category, ?),
             default_dosage = COALESCE(default_dosage, ?),
             default_frequency = COALESCE(default_frequency, ?),
             default_duration = COALESCE(default_duration, ?),
             default_instructions = COALESCE(default_instructions, ?)
         WHERE medicine_name = ?`,
        [category, dosage, frequency, duration, instructions, name],
      );
    }

    console.log('✅ Medicine dosing defaults are in place.');
  } catch (error) {
    console.warn('⚠️ Failed to ensure medicine dosing columns:', error.message);
  }
}

async function ensureDefaultMedicines() {
  try {
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM medicines');

    if (Number(total) > 0) {
      console.log('ℹ️ Medicine list already exists.');
      return;
    }

    for (const [medicineName, description, category, dosage, frequency, duration, instructions] of DEFAULT_MEDICINES) {
      await db.query(
        `INSERT INTO medicines
           (medicine_name, description, category, default_dosage, default_frequency, default_duration, default_instructions)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [medicineName, description, category, dosage, frequency, duration, instructions],
      );
    }

    console.log(`✅ Seeded ${DEFAULT_MEDICINES.length} default medicines.`);
  } catch (error) {
    console.warn('⚠️ Failed to ensure default medicines:', error.message);
  }
}

// The consultation quick templates, stored so a clinic can edit a regimen
// without a redeploy. Values are copies of the ones the workspace had hardcoded
// in JS, kept identical on purpose.
// [name, complaint, diagnosis, treatment, sort_order]
const DEFAULT_CONDITION_REGIMENS = [
  [
    'Anti-Rabies Vaccination',
    'Owner brought the pet in for anti-rabies vaccination.',
    'Healthy pet presented for routine anti-rabies vaccination. No signs of illness observed.',
    'Administered anti-rabies vaccine. Advised owner to monitor injection site and keep pet indoors for the rest of the day.',
    1,
  ],
  [
    'Deworming',
    'Owner brought the pet in for routine deworming.',
    'Routine deworming visit. Pet in generally good condition.',
    'Administered broad-spectrum dewormer. Advise repeat deworming after 3 months.',
    2,
  ],
  [
    'Skin Infection',
    'Owner reports persistent itching and hair loss.',
    'Presence of itching, redness, and hair loss on affected skin area.',
    'Prescribed medicated shampoo and antihistamines as needed. Follow-up check after 2 weeks.',
    3,
  ],
  [
    'Respiratory Infection',
    'Pet has been coughing and has nasal discharge.',
    'Coughing and nasal discharge observed; possible upper respiratory tract infection.',
    'Prescribed antibiotics for 7 days. Isolate pet from other animals until cleared.',
    4,
  ],
  [
    'Wound Care',
    'Owner reports an open wound on the pet\'s body.',
    'Open wound noted on body; cleaned and assessed during consultation.',
    'Cleaned and dressed wound. Prescribed antibiotics and pain relief as needed.',
    5,
  ],
  [
    'Flea and Tick Infestation',
    'Owner reports excessive scratching and visible fleas or ticks.',
    'Flea and tick infestation observed on physical examination.',
    'Applied topical flea and tick treatment. Advised owner to treat the pet\'s environment and recheck after 2 weeks.',
    6,
  ],
  [
    'Vomiting and Diarrhea',
    'Pet has been experiencing vomiting and diarrhea for the past day.',
    'Gastrointestinal upset; possible dietary indiscretion or infection.',
    'Prescribed anti-emetic and gastrointestinal medication. Advised bland diet and recheck if symptoms persist.',
    7,
  ],
  [
    'Ear Infection',
    'Owner reports head shaking and ear discharge.',
    'Otitis externa; ear canal inflammation with discharge observed.',
    'Prescribed ear medication and cleaning solution. Advised owner to clean ears daily for 7 days.',
    8,
  ],
  [
    'Vaccination (Routine)',
    'Owner brought the pet in for routine vaccination.',
    'Healthy pet presented for routine vaccination. No signs of illness observed.',
    'Administered core vaccine. Advised owner to monitor for adverse reactions and schedule next dose.',
    9,
  ],
];

// Which stocked catalog item represents which medicine. Only links that resolve
// to an existing medicine row are stored; the rest stay charge-only because no
// dosing data exists for them (vaccines, syringes, gauze, topicals).
// [catalog product_name, medicine_name]
const CATALOG_MEDICINE_LINKS = [
  ['Antibiotic', 'Amoxicillin'],
  ['Anti-inflammatory', 'Carprofen'],
  ['Pain Reliever / Analgesic', 'Carprofen'],
  ['Antihistamine', 'Chlorpheniramine'],
  ['Gastrointestinal Medication', 'Metronidazole'],
  ['Anti-diarrheal Medication', 'Metronidazole'],
  ['Dewormer', 'Pyrantel Pamoate'],
  ['Broad-Spectrum Dewormer', 'Ivermectin'],
  ['Flea and Tick Medication', 'Frontline Spray'],
  ['Flea/Tick Topical Treatment', 'Frontline Spray'],
  ['Vitamin B Complex', 'Vitamin B Complex'],
];

const REGIMEN_MEDICINES = {
  'Anti-Rabies Vaccination': [],
  Deworming: [['Pyrantel Pamoate', null, null, null, null]],
  'Skin Infection': [
    ['Amoxicillin', null, null, null, null],
    ['Chlorpheniramine', null, null, null, null],
  ],
  'Respiratory Infection': [
    ['Amoxicillin', null, null, null, null],
    ['Doxycycline', null, null, null, null],
  ],
  'Wound Care': [
    ['Amoxicillin', null, null, null, null],
    ['Carprofen', null, null, null, null],
  ],
  'Flea and Tick Infestation': [['Frontline Spray', null, null, null, null]],
  'Vomiting and Diarrhea': [
    ['Metronidazole', null, null, null, null],
    ['Oral Rehydration Salts', null, null, null, null],
  ],
  'Ear Infection': [['Enrofloxacin (Baytril)', null, null, null, null]],
  'Vaccination (Routine)': [],
};

/**
 * Creates the condition-regimen tables and the catalog link, then seeds them.
 * Idempotent throughout: safe to run on every boot, and it only ever fills
 * rows that are still empty so clinic edits are never overwritten.
 */
async function ensureConditionRegimens() {
  try {
    await db.query(
      `CREATE TABLE IF NOT EXISTS condition_regimens (
         id int(11) NOT NULL AUTO_INCREMENT,
         name varchar(120) NOT NULL,
         complaint varchar(255) DEFAULT NULL,
         diagnosis varchar(255) DEFAULT NULL,
         treatment varchar(255) DEFAULT NULL,
         sort_order int(11) NOT NULL DEFAULT 0,
         active tinyint(1) NOT NULL DEFAULT 1,
         created_at timestamp NOT NULL DEFAULT current_timestamp(),
         updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
         PRIMARY KEY (id),
         UNIQUE KEY name (name)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
    );

    await db.query(
      `CREATE TABLE IF NOT EXISTS condition_regimen_items (
         id int(11) NOT NULL AUTO_INCREMENT,
         regimen_id int(11) NOT NULL,
         medicine_id int(11) NOT NULL,
         dosage varchar(100) DEFAULT NULL,
         frequency varchar(100) DEFAULT NULL,
         duration varchar(100) DEFAULT NULL,
         instructions varchar(255) DEFAULT NULL,
         sort_order int(11) NOT NULL DEFAULT 0,
         created_at timestamp NOT NULL DEFAULT current_timestamp(),
         PRIMARY KEY (id),
         UNIQUE KEY regimen_medicine (regimen_id, medicine_id),
         KEY regimen_id (regimen_id),
         KEY medicine_id (medicine_id)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
    );

    const [catalogColumns] = await db.query('SHOW COLUMNS FROM catalog_products');
    if (!catalogColumns.some((column) => column.Field === 'medicine_id')) {
      await db.query('ALTER TABLE catalog_products ADD COLUMN `medicine_id` int(11) DEFAULT NULL');
      await db.query('ALTER TABLE catalog_products ADD KEY `medicine_id` (`medicine_id`)');
      console.log('✅ Added medicine_id column to catalog_products.');
    }

    // Seed templates. UNIQUE(name) makes this safe across restarts.
    for (const [name, complaint, diagnosis, treatment, sortOrder] of DEFAULT_CONDITION_REGIMENS) {
      await db.query(
        `INSERT INTO condition_regimens (name, complaint, diagnosis, treatment, sort_order, active)
         VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order)`,
        [name, complaint, diagnosis, treatment, sortOrder],
      );
    }

    let itemCount = 0;
    for (const [regimenName, medicines] of Object.entries(REGIMEN_MEDICINES)) {
      const [[regimen]] = await db.query('SELECT id FROM condition_regimens WHERE name = ?', [regimenName]);
      if (!regimen) continue;

      for (let i = 0; i < medicines.length; i += 1) {
        const [medicineName, dosage, frequency, duration, instructions] = medicines[i];
        const [[medicine]] = await db.query('SELECT id FROM medicines WHERE medicine_name = ?', [medicineName]);
        if (!medicine) {
          console.warn(`⚠️ Regimen "${regimenName}" skipped: medicine "${medicineName}" is not in the list.`);
          continue;
        }

        const [result] = await db.query(
          `INSERT INTO condition_regimen_items
             (regimen_id, medicine_id, dosage, frequency, duration, instructions, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order)`,
          [regimen.id, medicine.id, dosage, frequency, duration, instructions, i],
        );
        itemCount += result.affectedRows || 0;
      }
    }

    // Link catalog items to medicines. Matched on name; never clobbers a link a
    // clinic has already set by hand.
    let linkCount = 0;
    for (const [productName, medicineName] of CATALOG_MEDICINE_LINKS) {
      const [[medicine]] = await db.query('SELECT id FROM medicines WHERE medicine_name = ?', [medicineName]);
      if (!medicine) {
        console.warn(`⚠️ Catalog link skipped: medicine "${medicineName}" is not in the list.`);
        continue;
      }

      const [result] = await db.query(
        `UPDATE catalog_products SET medicine_id = ?
         WHERE LOWER(product_name) = LOWER(?) AND medicine_id IS NULL`,
        [medicine.id, productName],
      );
      linkCount += result.affectedRows || 0;
    }

    const [[{ regimenTotal }]] = await db.query('SELECT COUNT(*) AS regimenTotal FROM condition_regimens');
    const [[{ itemTotal }]] = await db.query('SELECT COUNT(*) AS itemTotal FROM condition_regimen_items');
    const [[{ linkedTotal }]] = await db.query(
      'SELECT COUNT(*) AS linkedTotal FROM catalog_products WHERE medicine_id IS NOT NULL',
    );

    console.log(
      `✅ Condition regimens ready: ${regimenTotal} templates, ${itemTotal} regimen medicines, ${linkedTotal} catalog links.`,
    );
  } catch (error) {
    console.warn('⚠️ Failed to ensure condition regimens:', error.message);
  }
}

async function tableExists(tableName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName],
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName],
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function indexExists(tableName, indexName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [tableName, indexName],
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function uniqueIndexExistsForColumn(tableName, columnName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND NON_UNIQUE = 0`,
    [tableName, columnName],
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function foreignKeyExists(tableName, constraintName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [tableName, constraintName],
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function addColumnIfMissing(tableName, columnName, definition) {
  if (!(await tableExists(tableName)) || (await columnExists(tableName, columnName))) return;
  try {
    await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  } catch (error) {
    console.warn(`⚠️ Failed to add ${tableName}.${columnName}:`, error.message);
  }
}

async function addIndexIfMissing(tableName, indexName, definition) {
  if (!(await tableExists(tableName)) || (await indexExists(tableName, indexName))) return;
  try {
    await db.query(`ALTER TABLE \`${tableName}\` ADD ${definition}`);
  } catch (error) {
    console.warn(`⚠️ Failed to add index ${tableName}.${indexName}:`, error.message);
  }
}

async function addForeignKeyIfMissing(tableName, constraintName, columnName, referencedTable, referencedColumn, onDelete = 'RESTRICT') {
  if (!(await tableExists(tableName)) || !(await tableExists(referencedTable))) return;
  if (!(await columnExists(tableName, columnName)) || (await foreignKeyExists(tableName, constraintName))) return;
  try {
    await db.query(
      `ALTER TABLE \`${tableName}\`
       ADD CONSTRAINT \`${constraintName}\`
       FOREIGN KEY (\`${columnName}\`) REFERENCES \`${referencedTable}\` (\`${referencedColumn}\`) ON DELETE ${onDelete}`,
    );
  } catch (error) {
    console.warn(`⚠️ Failed to add foreign key ${tableName}.${constraintName}:`, error.message);
  }
}

async function ensureConsultationBatchesTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS consultation_batches (
        id INT(11) NOT NULL AUTO_INCREMENT,
        batch_token VARCHAR(100) NOT NULL,
        created_by INT(11) NOT NULL,
        status ENUM('Active','Completed','Cancelled') NOT NULL DEFAULT 'Active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_consultation_batches_token (batch_token),
        KEY consultation_batches_created_by (created_by),
        KEY consultation_batches_status (status),
        CONSTRAINT fk_consultation_batches_created_by FOREIGN KEY (created_by) REFERENCES users (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  } catch (error) {
    console.warn('⚠️ Failed to ensure consultation_batches table:', error.message);
  }
}

async function ensurePaymentMonitoringTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS payment_monitoring (
        id INT(11) NOT NULL AUTO_INCREMENT,
        or_number VARCHAR(100) DEFAULT NULL,
        or_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        or_date DATE DEFAULT NULL,
        or_time TIME DEFAULT NULL,
        or_description VARCHAR(255) DEFAULT NULL,
        payment_items TEXT NULL,
        or_photo_path VARCHAR(500) DEFAULT NULL,
        ocr_text MEDIUMTEXT DEFAULT NULL,
        ocr_confidence DECIMAL(5,2) DEFAULT NULL,
        pet_owner_id INT(11) DEFAULT NULL,
        pet_id INT(11) DEFAULT NULL,
        payment_type ENUM('Consultation','Vaccination','Medicine') DEFAULT NULL,
        medicine_id INT(11) DEFAULT NULL,
        medicine_quantity VARCHAR(50) DEFAULT NULL,
        medicine_total DECIMAL(10,2) DEFAULT NULL,
        recorded_by INT(11) DEFAULT NULL,
        remarks VARCHAR(255) DEFAULT NULL,
        consultation_id INT(11) DEFAULT NULL,
        payment_reference VARCHAR(100) DEFAULT NULL,
        payment_status ENUM('Unpaid','Paid','Cancelled') NOT NULL DEFAULT 'Unpaid',
        total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        consultation_date DATE DEFAULT NULL,
        status_updated_by INT(11) DEFAULT NULL,
        status_updated_at DATETIME DEFAULT NULL,
        pm_token VARCHAR(64) DEFAULT NULL,
        receipt_qr_path VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_pm_or_number (or_number),
        UNIQUE KEY uk_pm_token (pm_token),
        UNIQUE KEY uk_pm_consultation_id (consultation_id),
        UNIQUE KEY uk_pm_payment_reference (payment_reference),
        KEY pet_owner_id (pet_owner_id),
        KEY medicine_id (medicine_id),
        KEY recorded_by (recorded_by),
        KEY idx_pm_pet (pet_id),
        KEY idx_pm_status (payment_status),
        KEY idx_pm_status_updated_by (status_updated_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('✅ payment_monitoring table verified.');
  } catch (error) {
    console.warn('⚠️ Failed to ensure payment_monitoring table:', error.message);
  }
}

async function ensureClinicQueueTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS clinic_queue (
        id INT(11) NOT NULL AUTO_INCREMENT,
        pet_id INT(11) NOT NULL,
        batch_id INT(11) DEFAULT NULL,
        status ENUM('Waiting','In Consultation','Completed','Cancelled') NOT NULL DEFAULT 'Waiting',
        notes VARCHAR(500) DEFAULT NULL,
        checked_in_by INT(11) NOT NULL,
        veterinarian_id INT(11) DEFAULT NULL,
        checked_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME DEFAULT NULL,
        completed_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_clinic_queue_batch_pet (batch_id, pet_id),
        KEY clinic_queue_pet_id (pet_id),
        KEY clinic_queue_status (status),
        KEY clinic_queue_batch_id (batch_id),
        KEY clinic_queue_checked_in_by (checked_in_by),
        KEY clinic_queue_veterinarian_id (veterinarian_id),
        CONSTRAINT fk_clinic_queue_pet FOREIGN KEY (pet_id) REFERENCES pets (id) ON DELETE CASCADE,
        CONSTRAINT fk_clinic_queue_checked_in_by FOREIGN KEY (checked_in_by) REFERENCES users (id),
        CONSTRAINT fk_clinic_queue_veterinarian FOREIGN KEY (veterinarian_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_clinic_queue_batch FOREIGN KEY (batch_id) REFERENCES consultation_batches (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  } catch (error) {
    console.warn('⚠️ Failed to ensure clinic_queue table:', error.message);
  }
}

async function ensureConsultationPaymentSchema() {
  try {
    await ensureConsultationBatchesTable();
    await addColumnIfMissing('consultation_batches', 'batch_token', 'VARCHAR(100) DEFAULT NULL');
    await addColumnIfMissing('consultation_batches', 'created_by', 'INT(11) NULL');
    await addColumnIfMissing('consultation_batches', 'status', "ENUM('Active','Completed','Cancelled') NOT NULL DEFAULT 'Active'");
    await addColumnIfMissing('consultation_batches', 'created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
    await addColumnIfMissing('consultation_batches', 'updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    if (!(await uniqueIndexExistsForColumn('consultation_batches', 'batch_token'))) {
      await addIndexIfMissing('consultation_batches', 'uk_consultation_batches_token', 'UNIQUE KEY `uk_consultation_batches_token` (`batch_token`)');
    }
    await addIndexIfMissing('consultation_batches', 'consultation_batches_created_by', 'KEY `consultation_batches_created_by` (`created_by`)');
    await addIndexIfMissing('consultation_batches', 'consultation_batches_status', 'KEY `consultation_batches_status` (`status`)');
    await addForeignKeyIfMissing('consultation_batches', 'fk_consultation_batches_created_by', 'created_by', 'users', 'id');

    await addColumnIfMissing('clinic_queue', 'batch_id', 'INT(11) DEFAULT NULL AFTER pet_id');
    await addIndexIfMissing('clinic_queue', 'clinic_queue_batch_id', 'KEY `clinic_queue_batch_id` (`batch_id`)');
    if (!(await uniqueIndexExistsForColumn('clinic_queue', 'batch_id'))) {
      await addIndexIfMissing('clinic_queue', 'uk_clinic_queue_batch_pet', 'UNIQUE KEY `uk_clinic_queue_batch_pet` (`batch_id`, `pet_id`)');
    }
    await addForeignKeyIfMissing('clinic_queue', 'fk_clinic_queue_batch', 'batch_id', 'consultation_batches', 'id', 'SET NULL');

    await addColumnIfMissing('consultation_records', 'queue_id', 'INT(11) DEFAULT NULL AFTER pet_id');
    await addColumnIfMissing('consultation_records', 'complaint', 'VARCHAR(255) DEFAULT NULL AFTER queue_id');
    if (!(await uniqueIndexExistsForColumn('consultation_records', 'queue_id'))) {
      await addIndexIfMissing('consultation_records', 'uk_consultation_queue_id', 'UNIQUE KEY `uk_consultation_queue_id` (`queue_id`)');
    }
    await addForeignKeyIfMissing('consultation_records', 'fk_consultation_queue', 'queue_id', 'clinic_queue', 'id', 'SET NULL');

    if (!(await tableExists('consultation_charges'))) {
      await db.query(`
        CREATE TABLE consultation_charges (
          id INT(11) NOT NULL AUTO_INCREMENT,
          consultation_id INT(11) NOT NULL,
          catalog_product_id INT(11) NOT NULL,
          description VARCHAR(255) NOT NULL,
          quantity INT(11) NOT NULL DEFAULT 1,
          unit_price DECIMAL(10,2) NOT NULL,
          line_total DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY consultation_charges_consultation_id (consultation_id),
          KEY consultation_charges_catalog_product_id (catalog_product_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);
    }
    await addIndexIfMissing('consultation_charges', 'consultation_charges_consultation_id', 'KEY `consultation_charges_consultation_id` (`consultation_id`)');
    await addIndexIfMissing('consultation_charges', 'consultation_charges_catalog_product_id', 'KEY `consultation_charges_catalog_product_id` (`catalog_product_id`)');
    await addForeignKeyIfMissing('consultation_charges', 'fk_consultation_charges_consultation', 'consultation_id', 'consultation_records', 'id', 'CASCADE');
    await addForeignKeyIfMissing('consultation_charges', 'fk_consultation_charges_catalog', 'catalog_product_id', 'catalog_products', 'id', 'RESTRICT');

    // Handoff buffer for the cross-device pet QR scan. Previously only created by a
    // manual script, so a fresh deploy failed the scan endpoints.
    if (!(await tableExists('mobile_scan_sessions'))) {
      await db.query(`
        CREATE TABLE mobile_scan_sessions (
          session_id VARCHAR(64) NOT NULL,
          pet_data MEDIUMTEXT NOT NULL,
          scan_mode VARCHAR(20) NOT NULL DEFAULT 'single',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (session_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);
    }

    await addColumnIfMissing('payment_monitoring', 'or_number', 'VARCHAR(100) DEFAULT NULL');
    await addColumnIfMissing('payment_monitoring', 'or_amount', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00');
    await addColumnIfMissing('payment_monitoring', 'or_description', 'VARCHAR(255) DEFAULT NULL');
    await addColumnIfMissing('payment_monitoring', 'payment_items', 'TEXT DEFAULT NULL');
    await addColumnIfMissing('payment_monitoring', 'pet_owner_id', 'INT(11) DEFAULT NULL');
    await addColumnIfMissing('payment_monitoring', 'pet_id', 'INT(11) DEFAULT NULL');
    await addColumnIfMissing('payment_monitoring', 'payment_type', "ENUM('Consultation','Vaccination','Medicine') DEFAULT NULL");
    await addColumnIfMissing('payment_monitoring', 'recorded_by', 'INT(11) DEFAULT NULL');
    await addColumnIfMissing('payment_monitoring', 'consultation_id', 'INT(11) DEFAULT NULL');
    await addColumnIfMissing('payment_monitoring', 'payment_reference', 'VARCHAR(100) DEFAULT NULL');
    await addColumnIfMissing('payment_monitoring', 'payment_status', "ENUM('Unpaid','Paid','Cancelled') NOT NULL DEFAULT 'Unpaid'");
    await addColumnIfMissing('payment_monitoring', 'total_amount', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00');
    await addColumnIfMissing('payment_monitoring', 'consultation_date', 'DATE DEFAULT NULL');
    await addColumnIfMissing('payment_monitoring', 'status_updated_by', 'INT(11) DEFAULT NULL');
    await addColumnIfMissing('payment_monitoring', 'status_updated_at', 'DATETIME DEFAULT NULL');
    await addColumnIfMissing('payment_monitoring', 'pm_token', 'VARCHAR(64) DEFAULT NULL');
    await addColumnIfMissing('payment_monitoring', 'receipt_qr_path', 'VARCHAR(500) DEFAULT NULL');

    const nullablePaymentColumns = [
      ['or_number', 'VARCHAR(100) DEFAULT NULL'],
      ['pet_owner_id', 'INT(11) DEFAULT NULL'],
      ['payment_type', "ENUM('Consultation','Vaccination','Medicine') DEFAULT NULL"],
      ['recorded_by', 'INT(11) DEFAULT NULL'],
    ];
    for (const [columnName, definition] of nullablePaymentColumns) {
      if (!(await columnExists('payment_monitoring', columnName))) continue;
      const [columnRows] = await db.query(
        `SELECT IS_NULLABLE FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_monitoring' AND COLUMN_NAME = ?`,
        [columnName],
      );
      if (columnRows[0]?.IS_NULLABLE === 'NO') {
        await db.query(`ALTER TABLE payment_monitoring MODIFY COLUMN \`${columnName}\` ${definition}`).catch((error) => {
          console.warn(`⚠️ Failed to make payment_monitoring.${columnName} nullable:`, error.message);
        });
      }
    }
    await db.query('UPDATE payment_monitoring SET total_amount = or_amount WHERE consultation_id IS NULL AND (total_amount IS NULL OR total_amount = 0)').catch(() => {});
    await addIndexIfMissing('payment_monitoring', 'idx_pm_pet', 'KEY `idx_pm_pet` (`pet_id`)');
    await addIndexIfMissing('payment_monitoring', 'idx_pm_status', 'KEY `idx_pm_status` (`payment_status`)');
    await addIndexIfMissing('payment_monitoring', 'idx_pm_status_updated_by', 'KEY `idx_pm_status_updated_by` (`status_updated_by`)');
    await addIndexIfMissing('payment_monitoring', 'uk_pm_token', 'UNIQUE KEY `uk_pm_token` (`pm_token`)');
    if (!(await uniqueIndexExistsForColumn('payment_monitoring', 'consultation_id'))) {
      await addIndexIfMissing('payment_monitoring', 'uk_pm_consultation_id', 'UNIQUE KEY `uk_pm_consultation_id` (`consultation_id`)');
    }
    if (!(await uniqueIndexExistsForColumn('payment_monitoring', 'payment_reference'))) {
      await addIndexIfMissing('payment_monitoring', 'uk_pm_payment_reference', 'UNIQUE KEY `uk_pm_payment_reference` (`payment_reference`)');
    }
    await addForeignKeyIfMissing('payment_monitoring', 'fk_pm_medicine', 'medicine_id', 'medicines', 'id', 'SET NULL');
    await addForeignKeyIfMissing('payment_monitoring', 'fk_pm_pet', 'pet_id', 'pets', 'id', 'SET NULL');
    await addForeignKeyIfMissing('payment_monitoring', 'fk_pm_consultation', 'consultation_id', 'consultation_records', 'id', 'SET NULL');
    await addForeignKeyIfMissing('payment_monitoring', 'fk_pm_status_updated_by', 'status_updated_by', 'users', 'id', 'SET NULL');
    await addForeignKeyIfMissing('payment_monitoring', 'fk_pm_owner', 'pet_owner_id', 'pet_owners', 'id', 'CASCADE');
    await addForeignKeyIfMissing('payment_monitoring', 'fk_pm_recorded_by', 'recorded_by', 'users', 'id', 'RESTRICT');
    console.log('✅ consultation payment schema verified.');
  } catch (error) {
    console.warn('⚠️ Failed to ensure consultation payment schema:', error.message);
  }
}

const CATALOG_CATEGORIES = [
  'Vaccines',
  'Dewormers / Antiparasitics',
  'Vitamins / Supplements',
  'Common Medicines',
  'Topical / Wound Care',
  'Other Supplies',
  'Consultation',
];

// Seeded from cvo_sample_veterinary_products_complete.txt — placeholder prices,
// to be replaced with the official CVO/Treasury schedule via the admin catalog page.
const CATALOG_SEED = [
  // Vaccines
  { category: 'Vaccines', name: 'Anti-Rabies Vaccine', species: 'Dog', price: 100, unit: 'dose', sub: 'Rabies' },
  { category: 'Vaccines', name: 'Anti-Rabies Vaccine', species: 'Cat', price: 100, unit: 'dose', sub: 'Rabies' },
  { category: 'Vaccines', name: '3-in-1 / FVRCP Vaccine', species: 'Cat', price: 500, unit: 'dose', sub: 'Core' },
  { category: 'Vaccines', name: '4-in-1 / FVRCP Vaccine', species: 'Cat', price: 600, unit: 'dose', sub: 'Core' },
  { category: 'Vaccines', name: '5-in-1 Vaccine', species: 'Dog', price: 500, unit: 'dose', sub: 'Core' },
  { category: 'Vaccines', name: '6-in-1 Vaccine', species: 'Dog', price: 600, unit: 'dose', sub: 'Core' },
  { category: 'Vaccines', name: '8-in-1 Vaccine', species: 'Dog', price: 750, unit: 'dose', sub: 'Core' },
  { category: 'Vaccines', name: 'Kennel Cough / Bordetella Vaccine', species: 'Dog', price: 800, unit: 'dose', sub: 'Respiratory' },
  // Dewormers / Antiparasitics
  { category: 'Dewormers / Antiparasitics', name: 'Dewormer', species: 'General', price: 50, unit: null, sub: 'Internal Parasites' },
  { category: 'Dewormers / Antiparasitics', name: 'Broad-Spectrum Dewormer', species: 'General', price: 100, unit: null, sub: 'Internal Parasites' },
  { category: 'Dewormers / Antiparasitics', name: 'Flea and Tick Medication', species: 'General', price: 150, unit: null, sub: 'External Parasites' },
  { category: 'Dewormers / Antiparasitics', name: 'Flea/Tick Topical Treatment', species: 'General', price: 150, unit: null, sub: 'External Parasites' },
  { category: 'Dewormers / Antiparasitics', name: 'Ear Mite Treatment', species: 'General', price: 100, unit: null, sub: 'Ear Mites' },
  // Vitamins / Supplements
  { category: 'Vitamins / Supplements', name: 'Multivitamins', species: 'General', price: 50, unit: null, sub: 'General Supplement' },
  { category: 'Vitamins / Supplements', name: 'Vitamin B Complex', species: 'General', price: 50, unit: null, sub: 'Vitamin Supplement' },
  { category: 'Vitamins / Supplements', name: 'Vitamin C Supplement', species: 'General', price: 50, unit: null, sub: 'Supplement' },
  { category: 'Vitamins / Supplements', name: 'Calcium Supplement', species: 'General', price: 80, unit: null, sub: 'Bone/Calcium Support' },
  { category: 'Vitamins / Supplements', name: 'Appetite/Recovery Supplement', species: 'General', price: 100, unit: null, sub: 'Nutritional Support' },
  { category: 'Vitamins / Supplements', name: 'Nutritional Supplement', species: 'General', price: 100, unit: null, sub: 'General Nutritional Support' },
  { category: 'Vitamins / Supplements', name: 'Puppy/Kitten Multivitamins', species: 'General', price: 100, unit: null, sub: 'Growth Support' },
  { category: 'Vitamins / Supplements', name: 'Senior Pet Supplement', species: 'General', price: 150, unit: null, sub: 'Senior Pet Support' },
  // Common Medicines
  { category: 'Common Medicines', name: 'Antibiotic', species: 'General', price: 100, unit: null, sub: 'Bacterial Infection' },
  { category: 'Common Medicines', name: 'Anti-inflammatory', species: 'General', price: 50, unit: null, sub: 'Pain/Inflammation' },
  { category: 'Common Medicines', name: 'Antihistamine', species: 'General', price: 50, unit: null, sub: 'Allergy' },
  { category: 'Common Medicines', name: 'Pain Reliever / Analgesic', species: 'General', price: 50, unit: null, sub: 'Pain Management' },
  { category: 'Common Medicines', name: 'Topical Antiseptic', species: 'General', price: 50, unit: null, sub: 'Wound Care' },
  { category: 'Common Medicines', name: 'Wound Ointment', species: 'General', price: 80, unit: null, sub: 'Minor Wounds' },
  { category: 'Common Medicines', name: 'Ear Medication', species: 'General', price: 100, unit: null, sub: 'Ear Infection/Care' },
  { category: 'Common Medicines', name: 'Eye Medication', species: 'General', price: 100, unit: null, sub: 'Eye Care' },
  { category: 'Common Medicines', name: 'Skin Medication', species: 'General', price: 100, unit: null, sub: 'Skin Conditions' },
  { category: 'Common Medicines', name: 'Gastrointestinal Medication', species: 'General', price: 100, unit: null, sub: 'Digestive Problems' },
  { category: 'Common Medicines', name: 'Anti-diarrheal Medication', species: 'General', price: 50, unit: null, sub: 'Diarrhea' },
  { category: 'Common Medicines', name: 'Anti-emetic Medication', species: 'General', price: 100, unit: null, sub: 'Vomiting/Nausea' },
  // Topical / Wound Care
  { category: 'Topical / Wound Care', name: 'Antiseptic Solution', species: 'General', price: 50, unit: null, sub: 'Wound Cleaning' },
  { category: 'Topical / Wound Care', name: 'Wound Spray', species: 'General', price: 100, unit: null, sub: 'Wound Care' },
  { category: 'Topical / Wound Care', name: 'Wound Ointment', species: 'General', price: 80, unit: null, sub: 'Wound Care' },
  { category: 'Topical / Wound Care', name: 'Healing/Protective Cream', species: 'General', price: 100, unit: null, sub: 'Skin/Wound Care' },
  { category: 'Topical / Wound Care', name: 'Ear Cleaning Solution', species: 'General', price: 100, unit: null, sub: 'Ear Hygiene' },
  { category: 'Topical / Wound Care', name: 'Eye Cleaning Solution', species: 'General', price: 100, unit: null, sub: 'Eye Hygiene' },
  // Other Common Veterinary Supplies
  { category: 'Other Supplies', name: 'Oral Syringe', species: 'General', price: 10, unit: null, sub: 'Medication Administration' },
  { category: 'Other Supplies', name: 'Disposable Syringe', species: 'General', price: 5, unit: null, sub: 'Medication/Procedure' },
  { category: 'Other Supplies', name: 'Gauze', species: 'General', price: 10, unit: null, sub: 'Wound Care' },
  { category: 'Other Supplies', name: 'Cotton / Cotton Balls', species: 'General', price: 10, unit: null, sub: 'Wound Care' },
  { category: 'Other Supplies', name: 'Disposable Gloves', species: 'General', price: 5, unit: null, sub: 'Veterinary Procedure' },
  { category: 'Other Supplies', name: 'Bandage', species: 'General', price: 20, unit: null, sub: 'Wound Care' },
  { category: 'Other Supplies', name: 'Alcohol / Disinfectant', species: 'General', price: 30, unit: null, sub: 'Cleaning' },
  // Consultation (added so the most common service is one click away)
  { category: 'Consultation', name: 'Consultation Fee', species: 'General', price: 250, unit: null, sub: 'Check-up' },
  { category: 'Consultation', name: 'Repeat Consultation', species: 'General', price: 150, unit: null, sub: 'Follow-up' },
];

async function ensureCatalogTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS catalog_products (
        id INT(11) NOT NULL AUTO_INCREMENT,
        category VARCHAR(60) NOT NULL,
        product_name VARCHAR(150) NOT NULL,
        species ENUM('Dog','Cat','General') DEFAULT 'General',
        unit VARCHAR(60) DEFAULT NULL,
        subcategory VARCHAR(150) DEFAULT NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        active TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_catalog_category (category),
        KEY idx_catalog_active (active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    // Idempotent seed — only runs when the table is empty so admin edits survive restarts.
    const [[{ n: count }]] = await db.query("SELECT COUNT(*) AS n FROM catalog_products");
    if (Number(count) === 0) {
      const values = [];
      const placeholders = [];
      for (let i = 0; i < CATALOG_SEED.length; i++) {
        const p = CATALOG_SEED[i];
        placeholders.push('(?, ?, ?, ?, ?, ?, ?)');
        values.push(
          p.category,
          p.name,
          p.species || 'General',
          p.unit || null,
          p.sub || null,
          Number(p.price).toFixed(2),
          i + 1
        );
      }
      await db.query(
        `INSERT INTO catalog_products
          (category, product_name, species, unit, subcategory, price, sort_order)
         VALUES ${placeholders.join(', ')}`,
        values
      );
      console.log(`✅ catalog_products seeded with ${CATALOG_SEED.length} products (sample prices).`);
    } else {
      console.log('✅ catalog_products table verified.');
    }
  } catch (error) {
    console.warn('⚠️ Failed to ensure catalog_products table:', error.message);
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
