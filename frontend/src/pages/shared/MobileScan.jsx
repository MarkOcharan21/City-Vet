import { useCallback, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, ArrowLeft, QrCode, Smartphone, Camera, CameraOff } from "lucide-react";
import useQrCameraScanner, { cameraErrorMessage } from "../../hooks/useQrCameraScanner";
import api from "../../services/api";
import toast from "react-hot-toast";

function MobileScan() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session") || searchParams.get("s");
  const returnTo = searchParams.get("returnTo") || "/veterinarian/clinical-records";
  const mode = searchParams.get("mode") || "single";

  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [cameraReason, setCameraReason] = useState(null);
  const submittingRef = useRef(false);
  const decodedHandlerRef = useRef(null);
  const stopScannerRef = useRef(null);

  const handleDecoded = useCallback(
    async (decodedText) => {
      if (!decodedText || submittingRef.current) return;
      submittingRef.current = true;
      setError(null);

      try {
        const response = await api.get(`/qr/scanOwnerQr/${decodedText.trim()}`);
        const { owner } = response.data;
        if (!owner) throw new Error("No pet found for this QR code.");

        const petData = {
          pet_id: owner.pet_id,
          name: owner.pet_name,
          pet_code: owner.pet_code,
          owner_name: owner.full_name,
          id: owner.pet_id,
        };

        await api.post("/clinical/mobile-scan-result", { session: sessionId, pet: petData, mode });
        toast.success(`Pet ${owner.pet_name} scanned successfully.`);

        setResult({ ...petData, success: true });

        if (mode !== "batch") {
          await stopScannerRef.current?.();
        }
      } catch (err) {
        setError(err.response?.data?.message || "Could not process scanned QR.");
        setResult(null);
      } finally {
        submittingRef.current = false;
      }
    },
    [mode, sessionId]
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
    active: !!sessionId,
    facingMode: "environment",
    onDecoded: forwardDecoded,
    onStartError: handleStartError,
    onStarted: handleStarted,
  });

  stopScannerRef.current = stopScanner;

  if (!sessionId) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
        <XCircle size={48} style={{ color: "#c8102e", marginBottom: "1rem" }} />
        <h2>Invalid Session</h2>
        <p>Please start the scan from the consultation page.</p>
        <Link to={returnTo} style={{ display: "inline-block", marginTop: "1rem", padding: "0.75rem 1.5rem", background: "#c8102e", color: "white", borderRadius: "8px", textDecoration: "none" }}>
          Back to Consultation
        </Link>
      </div>
    );
  }

  // The veil only covers the brief hand-off while the camera warms up - keeping
  // it up once the stream is live hides the very codes being scanned.
  const starting = status === "starting";
  const cameraBlocked = !!cameraReason && status !== "starting" && status !== "running";
  const overlayBase = {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    padding: "1rem",
    textAlign: "center",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4f2", fontFamily: "Inter, system-ui, sans-serif", padding: "1rem" }}>
      <div style={{ maxWidth: "420px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <Link to={returnTo} style={{ color: "#c8102e", textDecoration: "none", fontWeight: 600 }}>
            <ArrowLeft size={20} /> Back
          </Link>
        </div>

        <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#fbe9ec", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "0.75rem" }}>
              <QrCode size={28} style={{ color: "#c8102e" }} />
            </div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#241416" }}>Scan Pet QR Code</h1>
            <p style={{ margin: 0, color: "#6b6062", fontSize: "0.9rem" }}>Point camera at the pet owner's QR code</p>
            {mode === "batch" && <span style={{ display: "inline-block", marginTop: "0.5rem", padding: "0.25rem 0.75rem", background: "#f7f0e3", color: "#c6a15b", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 }}>Batch Mode - Scan Multiple</span>}
          </div>

          {error && !cameraBlocked && !result?.success && (
            <div style={{ background: "#fbe9ec", border: "1px solid #f5c6cb", color: "#c8102e", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.85rem" }}>
              {error}
            </div>
          )}

          <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", borderRadius: "12px", overflow: "hidden", background: "#1a1a1a", border: "2px solid #e8e2e0" }}>
            <div id={elementId} style={{ width: "100%", height: "100%" }} />
            {result?.success && (
              <div style={{ ...overlayBase, background: "rgba(255,255,255,0.98)", padding: "1.5rem" }}>
                <CheckCircle size={48} style={{ color: "#1e7a46", marginBottom: "0.75rem" }} />
                <h3 style={{ margin: "0 0 0.5rem", color: "#241416" }}>Pet Scanned Successfully</h3>
                <p style={{ margin: "0 0 0.25rem", fontWeight: 600, color: "#241416" }}>{result.name}</p>
                <p style={{ margin: "0 0 0.25rem", fontSize: "0.85rem", color: "#6b6062" }}>{result.pet_code} &middot; {result.owner_name}</p>
                <p style={{ margin: "1rem 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>Return to desktop to continue consultation.</p>
              </div>
            )}
            {starting && (
              <div style={{ ...overlayBase, background: "rgba(26,26,26,0.7)", color: "#fff" }}>
                <Camera size={32} style={{ color: "#c6a15b", marginBottom: "0.5rem" }} />
                <p style={{ margin: 0, fontSize: "0.85rem" }}>Starting camera...</p>
              </div>
            )}
            {cameraBlocked && (
              <div style={{ ...overlayBase, background: "rgba(245,244,242,0.95)" }}>
                <XCircle size={32} style={{ color: "#c8102e", marginBottom: "0.5rem" }} />
                <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>Camera Unavailable</p>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b6062" }}>Allow camera access, then press Retry Camera.</p>
              </div>
            )}
          </div>

          {cameraReason && (
            <div style={{ marginTop: "0.85rem" }}>
              <div style={{ background: "#fbe9ec", border: "1px solid #f5c6cb", color: "#c8102e", padding: "0.75rem", borderRadius: "8px", marginBottom: "0.75rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CameraOff size={16} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setCameraReason(null);
                  restart();
                }}
                style={{ padding: "0.45rem 0.8rem", background: "#0f3d2e", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}
              >
                Retry Camera
              </button>
            </div>
          )}

          <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#fbe9ec", borderRadius: "10px", border: "1px solid #f5c6cb" }}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", fontWeight: 600, color: "#7a0c1e" }}>How to use:</p>
            <ol style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.8rem", color: "#7a0c1e", lineHeight: 1.6 }}>
              <li>Point your phone camera at the <strong>pet owner's QR code</strong> (not this screen)</li>
              <li>Hold steady until it beeps/confirms</li>
              <li>Wait for success message</li>
              <li>Return to your desktop browser</li>
            </ol>
          </div>

          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <Link to={returnTo} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "#c8102e", color: "white", borderRadius: "8px", textDecoration: "none", fontWeight: 600 }}>
              <Smartphone size={18} /> Return to Desktop
            </Link>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.75rem", color: "#94a3b8" }}>
          City Veterinary Office &mdash; Cabuyao
        </p>
      </div>
    </div>
  );
}

export default MobileScan;
