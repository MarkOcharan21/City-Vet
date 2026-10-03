import { useCallback, useEffect, useRef, useState } from "react";
import { QrCode, X, Camera, CameraOff, CheckCircle2 } from "lucide-react";
import useQrCameraScanner, { cameraErrorMessage } from "../../hooks/useQrCameraScanner";
import api from "../../services/api";

const panelStyle = {
  width: "100%",
  maxWidth: "400px",
  margin: "0 auto",
  borderRadius: "12px",
  overflow: "hidden",
  background: "#1a1a1a",
  border: "2px solid #e8e2e0",
};

const overlayStyle = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  textAlign: "center",
};

// QR stickers encode the full booklet URL (https://<host>/qr/<TOKEN>);
// the API only wants the trailing token.
function extractQrToken(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  const withoutQuery = text.split(/[?#]/)[0];
  const tail = withoutQuery.slice(withoutQuery.lastIndexOf("/") + 1);
  try {
    return decodeURIComponent(tail).trim();
  } catch (_) {
    return tail.trim();
  }
}

export default function DirectQrScanner({
  isOpen,
  onClose,
  scanMode,
  scannedPets,
  onSelectBatchPet,
  onClearBatch,
  onScanModeChange,
  onPetScanned,
}) {
  const [error, setError] = useState(null);
  const [cameraReason, setCameraReason] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const submittingRef = useRef(false);
  const flashTimerRef = useRef(null);
  const decodedHandlerRef = useRef(null);
  const stopScannerRef = useRef(null);

  const flashPet = useCallback((petData) => {
    setLastScanned(petData);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setLastScanned(null), 2000);
  }, []);

  const handleDecoded = useCallback(
    async (decodedText) => {
      if (!decodedText || submittingRef.current) return;
      submittingRef.current = true;
      setError(null);

      try {
        const token = extractQrToken(decodedText);
        if (!token) throw new Error("Could not read a QR code. Please try again.");
        const response = await api.get(`/qr/owner/${encodeURIComponent(token)}`);
        const { owner } = response.data;
        if (!owner) throw new Error("No pet found for this QR code.");

        const petData = {
          pet_id: owner.pet_id,
          name: owner.pet_name,
          pet_code: owner.pet_code,
          owner_name: owner.full_name,
          id: owner.pet_id,
        };

        flashPet(petData);
        if (onPetScanned) onPetScanned(petData, scanMode);

        if (scanMode === "single") {
          await stopScannerRef.current?.();
        }
      } catch (err) {
        setError(err.response?.data?.message || "Could not process scanned QR.");
      } finally {
        submittingRef.current = false;
      }
    },
    [flashPet, onPetScanned, scanMode]
  );

  const handleStartError = useCallback((reason) => {
    setCameraReason(reason);
    setError(cameraErrorMessage(reason));
  }, []);

  const handleStarted = useCallback(() => {
    setCameraReason(null);
    setError(null);
  }, []);

  const forwardDecoded = useCallback((decodedText) => {
    decodedHandlerRef.current?.(decodedText);
  }, []);

  decodedHandlerRef.current = handleDecoded;

  const { elementId, status, stopScanner, restart } = useQrCameraScanner({
    active: isOpen,
    facingMode: "user",
    onDecoded: forwardDecoded,
    onStartError: handleStartError,
    onStarted: handleStarted,
  });

  stopScannerRef.current = stopScanner;

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setCameraReason(null);
      setLastScanned(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // The dark veil is only for the brief hand-off while the camera warms up -
  // leaving it up once the stream is live hides the very codes being scanned.
  const starting = status === "starting";
  const cameraBlocked = !!cameraReason && status !== "starting" && status !== "running";

  return (
    <div className="logout-modal-overlay" onClick={onClose}>
      <div
        className="barangay-pets-modal qr-scanner-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
      >
        <div className="barangay-pets-modal-header">
          <div className="barangay-pets-modal-title">
            <div className="barangay-pets-modal-icon">
              <QrCode />
            </div>
            <div>
              <h3 id="qr-modal-title">Scan Pet QR Code</h3>
              <p>Point your device camera at the pet owner's QR code.</p>
            </div>
          </div>
          <button
            type="button"
            className="barangay-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="qr-scanner-content">
          <div className="scan-mode-toggle">
            <label>
              <input
                type="radio"
                value="single"
                checked={scanMode === "single"}
                onChange={(e) => onScanModeChange(e.target.value)}
              />
              <span>Single Pet</span>
            </label>
            <label>
              <input
                type="radio"
                value="batch"
                checked={scanMode === "batch"}
                onChange={(e) => onScanModeChange(e.target.value)}
              />
              <span>Batch (Multiple Pets)</span>
            </label>
          </div>

          {error && !cameraBlocked && (
            <div
              style={{
                background: "#fbe9ec",
                border: "1px solid #f5c6cb",
                color: "#c8102e",
                padding: "0.75rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <CameraOff size={16} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{error}</span>
            </div>
          )}

          <div style={{ ...panelStyle, aspectRatio: "4 / 3", position: "relative" }}>
            <div id={elementId} style={{ width: "100%", height: "100%" }} />
            {lastScanned && (
              <div
                style={{
                  ...overlayStyle,
                  background: "rgba(255,255,255,0.98)",
                  zIndex: 10,
                  padding: "1.5rem",
                }}
              >
                <CheckCircle2 size={48} style={{ color: "#1e7a46", marginBottom: "0.75rem" }} />
                <h3 style={{ margin: "0 0 0.5rem", color: "#241416" }}>Pet Scanned</h3>
                <p style={{ margin: "0 0 0.25rem", fontWeight: 600, color: "#241416" }}>
                  {lastScanned.name}
                </p>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b6062" }}>
                  {lastScanned.pet_code} &middot; {lastScanned.owner_name}
                </p>
              </div>
            )}
            {starting && (
              <div
                style={{ ...overlayStyle, background: "rgba(26,26,26,0.7)", zIndex: 5, color: "#fff" }}
              >
                <Camera size={32} style={{ color: "#c6a15b", marginBottom: "0.5rem" }} />
                <p style={{ margin: 0, fontSize: "0.85rem" }}>Starting camera...</p>
              </div>
            )}
            {cameraBlocked && (
              <div
                style={{ ...overlayStyle, background: "rgba(26,26,26,0.85)", zIndex: 5, color: "#fff" }}
              >
                <CameraOff size={32} style={{ color: "#c6a15b", marginBottom: "0.5rem" }} />
                <p style={{ margin: 0, fontSize: "0.85rem" }}>Camera unavailable</p>
              </div>
            )}
          </div>

          {cameraReason && (
            <div style={{ marginTop: "0.85rem" }}>
              <div
                style={{
                  background: "#fbe9ec",
                  border: "1px solid #f5c6cb",
                  color: "#c8102e",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  marginBottom: "0.75rem",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <CameraOff size={16} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{error}</span>
              </div>

              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => {
                  setError(null);
                  setCameraReason(null);
                  restart();
                }}
              >
                Retry Camera
              </button>

              <details style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#6b6062" }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, color: "#241416" }}>
                  How to allow camera access
                </summary>
                <ol style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
                  <li>
                    Click the icon beside the address bar, then set <strong>Camera</strong> to{" "}
                    <strong>Allow</strong>.
                  </li>
                  <li>
                    If it is already blocked, open <code>chrome://settings/content/camera</code> and
                    remove this site from &quot;Not allowed&quot;.
                  </li>
                  <li>
                    On Windows: <strong>Settings &rarr; Privacy &amp; security &rarr; Camera</strong>{" "}
                    &rarr; turn on <strong>Camera access</strong> and allow desktop apps.
                  </li>
                  <li>Reload the page, then press Retry Camera.</li>
                  <li>The camera must not be open in another app (Zoom, Teams, video call).</li>
                </ol>
              </details>
            </div>
          )}

          {scanMode === "batch" && scannedPets.length > 0 && (
            <div className="scanned-pets-list">
              <h4>Scanned Pets ({scannedPets.length})</h4>
              <div className="scanned-pets-items">
                {scannedPets.map((pet) => (
                  <div key={pet.pet_id} className="scanned-pet-item">
                    <span className="pet-info">
                      <strong>{pet.name}</strong>{" "}
                      <small>
                        {pet.pet_code} &middot; {pet.owner_name}
                      </small>
                    </span>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => onSelectBatchPet(pet)}
                    >
                      Consult
                    </button>
                  </div>
                ))}
              </div>
              <div className="scanned-pets-actions">
                <button type="button" className="btn-secondary" onClick={onClearBatch}>
                  Clear Batch
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
