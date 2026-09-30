import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

let instanceCount = 0;

function nextElementId() {
  instanceCount += 1;
  return `qr-reader-${instanceCount}`;
}

function isScanning(scanner) {
  if (!scanner) return false;
  try {
    if (typeof scanner.getStateManager === "function") {
      return scanner.getStateManager().isScanning();
    }
  } catch (_) {
    // fall through to the legacy flags
  }
  return !!(scanner.isScanning || scanner.isRunning);
}

function killStream(scanner) {
  const mediaStream = scanner?.renderedCamera?.mediaStream;
  if (!mediaStream || typeof mediaStream.getTracks !== "function") return;
  try {
    mediaStream.getTracks().forEach((track) => track.stop());
  } catch (_) {
    // nothing else to do
  }
}

async function safeStop(scanner) {
  if (!scanner) return;
  try {
    if (isScanning(scanner)) {
      await Promise.race([
        Promise.resolve().then(() => scanner.stop()),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    }
  } catch (_) {
    // the library throws plain strings on invalid state transitions
  }
  if (isScanning(scanner)) {
    killStream(scanner);
  }
}

// Kept free of "enter the code below" hints: only some callers still offer that
// fallback, and pointing at a control that is not on screen reads as a bug.
const CAMERA_ERROR_MESSAGES = {
  insecure:
    "Camera access needs a secure connection. Open this page over HTTPS (or localhost) to use the scanner.",
  denied:
    "Camera access was blocked. Click the icon beside the address bar, set Camera to Allow, then press Retry.",
  "no-camera":
    "No camera was found on this device. Check that nothing is covering the lens, then press Retry.",
  "in-use":
    "The camera is already in use by another app. Close it (video calls, Zoom, Teams), then press Retry.",
  unknown: "Could not start the camera. Close any other app using it, then press Retry.",
};

function classifyStartError(err) {
  const name = err?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
    return "denied";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") {
    return "no-camera";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "in-use";
  }
  return "unknown";
}

export function cameraErrorMessage(reason) {
  return CAMERA_ERROR_MESSAGES[reason] || CAMERA_ERROR_MESSAGES.unknown;
}

/**
 * Wraps html5-qrcode so the library owns a dedicated, React-free host element.
 *
 * The library wipes its host with `innerHTML = ""` on every `start()` call, so
 * no React-rendered node may live inside it. Render `elementId` on an empty div
 * and place any overlay as a sibling instead.
 *
 * `onStartError(reason, err)` gets one of "insecure", "denied", "no-camera",
 * "in-use" or "unknown" - use `cameraErrorMessage(reason)` for the copy.
 */
export default function useQrCameraScanner({
  active = true,
  facingMode = "user",
  scanConfig,
  onDecoded,
  onStartError,
  onStarted,
} = {}) {
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState("idle");
  const [permission, setPermission] = useState("prompt");
  const [attempt, setAttempt] = useState(0);

  const elementIdRef = useRef(null);
  if (elementIdRef.current === null) {
    elementIdRef.current = nextElementId();
  }

  const scannerRef = useRef(null);
  const startTokenRef = useRef(0);
  const decodedRef = useRef(onDecoded);
  const startErrorRef = useRef(onStartError);
  const startedRef = useRef(onStarted);
  const configRef = useRef(scanConfig);
  decodedRef.current = onDecoded;
  startErrorRef.current = onStartError;
  startedRef.current = onStarted;
  configRef.current = scanConfig;

  const handleDecoded = useCallback((decodedText) => {
    if (decodedRef.current) decodedRef.current(decodedText);
  }, []);

  const stopScanner = useCallback(async () => {
    startTokenRef.current += 1;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    setStatus("idle");
    await safeStop(scanner);
  }, []);

  const restart = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!active) {
      startTokenRef.current += 1;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      setScanning(false);
      setStatus("idle");
      safeStop(scanner);
      return undefined;
    }

    const token = startTokenRef.current + 1;
    startTokenRef.current = token;

    if (!document.getElementById(elementIdRef.current)) return undefined;

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setScanning(false);
      setStatus("insecure");
      setPermission("prompt");
      if (startErrorRef.current) startErrorRef.current("insecure", null);
      return undefined;
    }

    setPermission("prompt");
    setStatus("starting");
    setScanning(true);

    const scanner = new Html5Qrcode(elementIdRef.current);
    scannerRef.current = scanner;

    // A fixed 280px box overflows a phone viewfinder, and the library only
    // clamps the width - an oversized height silently breaks the scan guide.
    // Deriving it from the live viewfinder keeps the guide inside the frame.
    const config = configRef.current || {
      fps: 10,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const side = Math.max(120, Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72));
        return { width: side, height: side };
      },
    };

    const isStale = () => startTokenRef.current !== token;

    const begin = (cameraConfig) =>
      Promise.resolve().then(() =>
        scanner.start(cameraConfig, config, handleDecoded, () => {})
      );

    const markStarted = () => {
      if (isStale()) {
        safeStop(scanner);
        return;
      }
      setStatus("running");
      setPermission("granted");
      setScanning(true);
      if (startedRef.current) startedRef.current();
    };

    const markFailed = (err) => {
      if (isStale()) return;
      const reason = classifyStartError(err);
      setStatus(reason);
      setPermission(reason === "denied" ? "denied" : "granted");
      setScanning(false);
      if (startErrorRef.current) startErrorRef.current(reason, err);
    };

    begin({ facingMode })
      .then(markStarted)
      .catch((err) => {
        if (isStale()) {
          safeStop(scanner);
          return;
        }
        // A refused permission will not get better on a second attempt, and
        // re-prompting for it just stalls the modal.
        const reason = classifyStartError(err);
        if (reason === "denied" || reason === "insecure") {
          markFailed(err);
          return;
        }
        // Machines without a front camera reject the facingMode constraint, so
        // fall back to letting the library pick whichever camera exists.
        return begin({}).then(markStarted).catch(markFailed);
      });

    return () => {
      startTokenRef.current += 1;
      const current = scannerRef.current;
      scannerRef.current = null;
      safeStop(current);
    };
  }, [active, facingMode, handleDecoded, attempt]);

  return {
    elementId: elementIdRef.current,
    scanning,
    status,
    permission,
    stopScanner,
    restart,
  };
}
