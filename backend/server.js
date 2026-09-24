const express = require("express");
const cors =require("cors");
const path = require("path");
const http = require("http");
const os = require("os");
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

// The phone-scan QR points the phone at the backend on the local network, so
// the staff can scan the pet's sticker with their phone and the result lands
// back on the counter PC. This picks the machine's LAN IPv4 for that link.
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

const PHONE_SCAN_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>QR Scanner · City Veterinary Office</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #7a0c1e; color: #fff; display: flex; flex-direction: column; }
  header { padding: 14px 18px; text-align: center; background: rgba(0,0,0,.18); }
  header h1 { margin: 0; font-size: 15px; letter-spacing: .02em; }
  header p { margin: 4px 0 0; font-size: 12px; opacity: .8; }
  main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 18px; gap: 16px; }
  #stage { width: 100%; max-width: 400px; }
  #reader { width: 100%; border-radius: 16px; overflow: hidden; background: #000; }
  #reader video { border-radius: 16px !important; }
  .fallback { display: none; width: 100%; max-width: 400px; flex-direction: column; align-items: center; gap: 12px; padding: 18px; background: rgba(0,0,0,.22); border-radius: 16px; text-align: center; }
  .btn { border: 0; border-radius: 12px; padding: 14px 22px; font-size: 15px; font-weight: 700; cursor: pointer; width: 100%; max-width: 300px; }
  .btn-phone { background: #fff; color: #7a0c1e; }
  #status { min-height: 46px; text-align: center; font-size: 13px; line-height: 1.55; max-width: 400px; }
  .ok { color: #c9f4c8; }
  .err { color: #ffd8d8; }
  .hint { font-size: 12px; opacity: .78; max-width: 400px; text-align: center; line-height: 1.5; margin: 0; }
  input[type=file] { display: none; }
  .spinner { width: 18px; height: 18px; border: 3px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; display: inline-block; vertical-align: -4px; margin-right: 6px; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<header>
  <h1>City Veterinary Office · QR Scanner</h1>
  <p id="sub">Scans the pet's QR code — or a payment receipt QR</p>
</header>
<main>
  <div id="stage">
    <div id="reader"></div>
  </div>
  <div class="fallback" id="fallback">
    <p class="hint">The live camera could not start on this connection. Tap the button below to open your phone's camera instead, then point it at the QR once.</p>
    <button type="button" id="openCam" class="btn btn-phone">Open phone camera</button>
  </div>
  <div id="status" class="hint"><span class="spinner"></span>Ready.<br/>Point the camera at the pet's QR code — it reads automatically.</div>
  <p class="hint">The result appears automatically on the counter screen. You can close this page afterwards.</p>
</main>
<input type="file" id="file" accept="image/*" capture="environment" />
<script src="/vendor/html5-qrcode.min.js"></script>
<script>
(function () {
  var params = new URLSearchParams(window.location.search);
  var key = (params.get('k') || '').trim();
  var statusEl = document.getElementById('status');
  var fallbackEl = document.getElementById('fallback');
  var openCamBtn = document.getElementById('openCam');
  var fileInput = document.getElementById('file');
  var subEl = document.getElementById('sub');
  var sent = false;

  if (!key) {
    statusEl.className = 'err';
    statusEl.innerHTML = 'This scanner link is missing its session. Go back and scan the QR shown on the counter screen again.';
    return;
  }

  subEl.textContent = 'Session active · scan the pet QR once';

  function status(html, cls) {
    statusEl.className = cls || '';
    statusEl.innerHTML = html;
  }

  function submit(text) {
    if (sent) return;
    var trimmed = String(text || '').trim();
    if (!trimmed) return;
    sent = true;
    status('<span class="spinner"></span>Sending to the counter\u2026');
    fetch('/api/payment-monitoring/scan-board/value', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: key, value: trimmed }),
    }).then(function (resp) {
      if (!resp.ok) {
        if (resp.status === 404) throw new Error('expired');
        throw new Error('failed');
      }
      return resp.json();
    }).then(function () {
      status('\\u2713 Sent — the pet details are now on the counter screen. You can close this page.', 'ok');
      stopCamera();
    }).catch(function (err) {
      status('Could not reach the counter session. Ask the staff to re-scan the QR on screen, then scan the pet again.', 'err');
      sent = false;
    });
  }

  var html5Qr = null;

  function stopCamera() {
    try {
      if (html5Qr && html5Qr.isScanning) { html5Qr.stop().catch(function () {}); }
    } catch (e) {}
  }

  function startCamera() {
    try {
      html5Qr = new Html5Qrcode('reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5Qr.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 230, height: 230 } },
        function (decodedText) { submit(decodedText); },
        function () {}
      ).then(function () {
        status('Live — point the camera at the pet\\'s QR code.', 'ok');
      }).catch(function () {
        showFallback();
      });
    } catch (e) {
      showFallback();
    }
  }

  function showFallback() {
    try { stopCamera(); } catch (e) {}
    document.getElementById('reader').style.display = 'none';
    fallbackEl.style.display = 'flex';
    status('Tap the button and point the phone at the pet\\'s QR code.', '');
  }

  openCamBtn.addEventListener('click', function () { fileInput.click(); });

  fileInput.addEventListener('change', function () {
    var file = fileInput.files ? fileInput.files[0] : null;
    if (!file) return;
    status('<span class="spinner"></span>Reading the QR\u2026');
    try {
      var dec = new Html5Qrcode('reader', { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      dec.scanFile(file, false).then(function (text) {
        submit(text);
      }).catch(function () {
        status('Could not read a QR in that photo. Point the camera closer and try again.', 'err');
        sent = false;
      }).finally(function () {
        fileInput.value = '';
      });
    } catch (e) {
      status('Scanner is not available on this browser. Try Chrome on Android or Safari on iPhone.', 'err');
    }
  });

  startCamera();
})();
</script>
</body>
</html>`;


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

// Standalone phone QR-scanner page assets (html5-qrcode UMD bundle).
app.use(
    "/vendor",
    express.static(path.join(__dirname, "public", "vendor"))
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
  res.json({
    success: true,
    message: "ok",
    timestamp: new Date().toISOString(),
    lanIp: LAN_IP,
    port: API_PORT,
  });
});

// Phone QR-scan page. The counter modal shows a QR encoding this URL with the
// session key; scanning it on the phone opens a camera scanner for the pet's /
// receipt's QR, whose decoded text is POSTed to the scan board above.
app.get("/phone-scan", (req, res) => {
  res.type("text/html").send(PHONE_SCAN_PAGE);
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
  await ensureDefaultMedicines();
  await ensureTableAutoIncrement('payments');
  await ensurePaymentMonitoringTable();
  await db.query("DROP TABLE IF EXISTS pm_capture_sessions").catch((e) => console.warn('⚠️ Drop pm_capture_sessions:', e.message));
  await ensureCatalogTable();
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

    // Migrate existing installations: pet_id column (payments linked to a pet).
    const [[petIdCol]] = await db.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'payment_monitoring'
         AND COLUMN_NAME = 'pet_id'`
    );
    if (!petIdCol || Number(petIdCol.c) === 0) {
      await db.query(
        `ALTER TABLE payment_monitoring
         ADD COLUMN pet_id INT(11) NULL AFTER pet_owner_id,
         ADD KEY idx_pm_pet (pet_id),
         ADD CONSTRAINT fk_pm_pet FOREIGN KEY (pet_id) REFERENCES pets (id) ON DELETE SET NULL`
      );
      console.log('✅ pet_id column added to payment_monitoring.');
    }

    console.log('✅ payment_monitoring table verified.');
  } catch (error) {
    console.warn('⚠️ Failed to ensure payment_monitoring table:', error.message);
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
