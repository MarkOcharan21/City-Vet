import { useEffect, useRef } from "react";
import { QrCode, Loader2, X } from "lucide-react";
import QRCode from "qrcode";

export default function QrScanModal({
  isOpen,
  onClose,
  scanMode,
  scannedPets,
  onSelectBatchPet,
  onClearBatch,
  mobileScanSession,
  polling,
  onScanModeChange,
}) {
  const qrCanvasRef = useRef(null);

  useEffect(() => {
    if (!mobileScanSession || !qrCanvasRef.current) return;
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const scanUrl = `${baseUrl}/mobile-scan?session=${mobileScanSession}&mode=${scanMode}&returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    QRCode.toCanvas(qrCanvasRef.current, scanUrl, { width: 220, margin: 1, color: { dark: "#241416", light: "#ffffff" } })
      .catch((err) => console.error("QR code generation failed:", err));
  }, [mobileScanSession, scanMode]);

  if (!isOpen) return null;

  const canvasStyle = { width: "220px", height: "220px", margin: "1rem auto", background: "white", padding: "0.5rem", borderRadius: "8px", border: "1px solid #e8e2e0", display: "block" };
  const instructionStyle = { textAlign: "center", fontSize: "0.85rem", color: "#6b6062", marginBottom: "0.5rem" };
  const instructionStyleLast = { textAlign: "center", fontSize: "0.85rem", color: "#6b6062", marginBottom: "1rem" };

  return (
    <div className="logout-modal-overlay" onClick={onClose}>
      <div className="barangay-pets-modal qr-scanner-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="qr-modal-title">
        <div className="barangay-pets-modal-header">
          <div className="barangay-pets-modal-title">
            <div className="barangay-pets-modal-icon"><QrCode /></div>
            <div>
              <h3 id="qr-modal-title">Scan Pet QR with Phone</h3>
              <p>Scan the QR code below with your phone to open the mobile scanner, then scan the pet owner's QR code.</p>
            </div>
          </div>
          <button type="button" className="barangay-modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="qr-scanner-content">
          <div className="scan-mode-toggle">
            <label><input type="radio" value="single" checked={scanMode === "single"} onChange={(e) => onScanModeChange(e.target.value)} /> <span>Single Pet</span></label>
            <label><input type="radio" value="batch" checked={scanMode === "batch"} onChange={(e) => onScanModeChange(e.target.value)} /> <span>Batch (Multiple Pets)</span></label>
          </div>

          {scanMode === "batch" && scannedPets.length > 0 && (
            <div className="scanned-pets-list">
              <h4>Scanned Pets ({scannedPets.length})</h4>
              <div className="scanned-pets-items">
                {scannedPets.map((pet, idx) => (
                  <div key={pet.pet_id} className="scanned-pet-item">
                    <span className="pet-info"><strong>{pet.name}</strong> <small>{pet.pet_code} · {pet.owner_name}</small></span>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => onSelectBatchPet(pet)}>Consult</button>
                  </div>
                ))}
              </div>
              <div className="scanned-pets-actions">
                <button type="button" className="btn-secondary" onClick={onClearBatch}>Clear Batch</button>
              </div>
            </div>
          )}

          {mobileScanSession && (
            <div className="mobile-scan-qr-section">
              <div className="qr-code-display">
                <canvas ref={qrCanvasRef} width={220} height={220} style={canvasStyle} />
              </div>
              <p style={instructionStyle}>1. Open phone camera or Google Lens</p>
              <p style={instructionStyle}>2. Scan this QR code</p>
              <p style={instructionStyleLast}>3. Scan the pet owner's QR code</p>
              {polling && (
                <div className="polling-indicator" style={{ textAlign: "center", marginTop: "1rem" }}>
                  <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#c8102e" }} />
                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#6b6062" }}>Waiting for phone scan...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
