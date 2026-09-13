// demo:prep — one-command "make it work on this network".
//
// Detects the current LAN IPv4 address, points FRONTEND_URL / BACKEND_URL at it
// (backend/.env), regenerates every QR image (pet / outreach / pm-receipt) so
// they encode the new URL, then prints what to open.
//
// Run once whenever the machine joins a different Wi-Fi/network, BEFORE
// starting the backend and the frontend:
//
//   cd backend
//   npm run demo:prep

const os = require("os");
const fs = require("fs");
const path = require("path");

const ENV_PATH = path.join(__dirname, ".env");

function isPrivateIpv4(ip) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return false;
  const parts = ip.split(".").map(Number);
  if (parts[0] === 10) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

// Returns the most likely LAN IPv4 adapter, preferring Wi-Fi/Ethernet.
function detectLanIPv4() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const [name, addrs] of Object.entries(nets)) {
    for (const addr of addrs || []) {
      if (addr.family === "IPv4" && !addr.internal && isPrivateIpv4(addr.address)) {
        candidates.push({ name, address: addr.address });
      }
    }
  }
  const preferred = candidates.filter((c) => /wi-?fi|wireless|ethernet|wlan|lan/i.test(c.name));
  const pool = preferred.length ? preferred : candidates;
  return pool[0] || null;
}

function setEnvValue(key, value) {
  let content = fs.readFileSync(ENV_PATH, "utf8");
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) {
    content = content.replace(re, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}\n`;
  }
  fs.writeFileSync(ENV_PATH, content);
}

(async () => {
  const net = detectLanIPv4();
  if (!net) {
    console.error("No LAN IPv4 detected. Are you connected to a Wi-Fi or Ethernet network?");
    process.exit(1);
  }

  const ip = net.address;
  const frontendUrl = `http://${ip}:5178`;
  const backendUrl = `http://${ip}:5000`;

  console.log(`\nDetected LAN IP : ${ip}  (${net.name})`);
  console.log("Updating backend/.env ...");
  setEnvValue("FRONTEND_URL", frontendUrl);
  setEnvValue("BACKEND_URL", backendUrl);

  require("dotenv").config({ override: true });

  console.log("Regenerating all QR images ...\n");
  const { regenerateAllQrImages } = require("./regenerate-qrcodes");
  const counts = await regenerateAllQrImages();

  console.log("\n======================================================");
  console.log("  Open the app at :", frontendUrl);
  console.log("  Backend runs at :", backendUrl);
  console.log("  Regenerated QR  :", JSON.stringify(counts));
  console.log("======================================================\n");
  console.log("Next: start the backend (node server.js) and the frontend (npm run dev).");

  await dbEnd();
  process.exit(0);
})().catch((error) => {
  console.error("Failed:", error.message);
  process.exit(1);
});

let db;
function dbEnd() {
  if (db) return Promise.resolve();
  try {
    db = require("./src/config/db");
  } catch (_) {
    return Promise.resolve();
  }
  return db.end().catch(() => {});
}