import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import api from "../../services/api";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import useMinLoading from "../../hooks/useMinLoading";
import StatusBadge from "../../components/StatusBadge";
import DigitalPetBooklet from "../../components/booklet/DigitalPetBooklet";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import toast from "react-hot-toast";

const APP_ORIGIN = import.meta.env.VITE_HOST_URL || window.location.origin;

function fmtDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function computeAge(birthdate) {
  if (!birthdate) return null;
  const birth = new Date(String(birthdate).slice(0, 10) + "T00:00:00");
  if (isNaN(birth.getTime()) || birth > new Date()) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years <= 0 && months <= 0) return "newborn";
  if (years <= 0) return `${months} mo`;
  return `${years} yr${years === 1 ? "" : "s"}`;
}

function vaccinationChip(qr) {
  if (!qr.vaccination_count) {
    return { label: "No vaccinations yet", tone: "neutral" };
  }
  if (qr.overdue_vaccinations > 0) {
    return {
      label: `${qr.overdue_vaccinations} overdue vaccination${qr.overdue_vaccinations > 1 ? "s" : ""}`,
      tone: "danger",
    };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = qr.latest_next_due ? new Date(String(qr.latest_next_due).slice(0, 10) + "T00:00:00") : null;
  if (due && !isNaN(due.getTime())) {
    const day = 24 * 60 * 60 * 1000;
    if (due - today >= 0 && due - today <= 7 * day) {
      return { label: "Due soon", tone: "warning" };
    }
  }
  return {
    label: `${qr.latest_vaccine_name || "Vaccinated"} · ${fmtDate(qr.latest_vaccine_date) || "—"}`,
    tone: "ok",
  };
}

export default function QrRecords() {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const showLoading = useMinLoading(loading);
  const [bookletData, setBookletData] = useState(null);
  const [bookletToken, setBookletToken] = useState(null);
  const [viewQr, setViewQr] = useState(null);

  useEffect(() => {
    loadQrCodes();
  }, []);

  useEffect(() => {
    if (!viewQr) return;
    const onKey = (e) => {
      if (e.key === "Escape") setViewQr(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewQr]);

  function loadQrCodes() {
    api
      .get("/qr/my-codes")
      .then((res) => setQrCodes(res.data.qrCodes))
      .finally(() => setLoading(false));
  }

  const openBooklet = async (qr) => {
    setBookletData(null);
    setBookletToken(qr.qr_token);
    try {
      const res = await api.get(`/qr/scan/${qr.qr_token}`);
      if (!res.data.success) {
        toast.error(res.data.message || "Could not load the pet booklet.");
        setBookletToken(null);
        return;
      }
      setBookletData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load the pet booklet.");
      setBookletToken(null);
    }
  };

  const closeBooklet = () => setBookletData(null);

  const refreshAfterSave = () => {
    loadQrCodes();
    if (bookletToken) openBooklet({ qr_token: bookletToken });
  };

  return (
    <div className="page" style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "1240px", padding: "24px 16px 40px" }}>
        <h1 style={{ textAlign: "center", marginBottom: "8px" }}>QR Records</h1>

        <p style={{ textAlign: "center", color: "#4b5563", maxWidth: "760px", margin: "0 auto 24px" }}>
          Your pet&apos;s QR code is its digital identity — linking to profile,
          vaccinations, and clinical records.
        </p>

        {showLoading ? (
          <LoadingSpinner text="Loading QR records..." />
        ) : (
          <div className="qr-row-list">
            {qrCodes.map((qr) => {
              const vax = vaccinationChip(qr);
              const age = computeAge(qr.birthdate);
              return (
                <div key={qr.id} className="qr-row">
                  {qr.photo ? (
                    <img
                      src={resolveMediaUrl(qr.photo)}
                      alt={qr.pet_name}
                      className="qr-row__photo"
                    />
                  ) : (
                    <div className="qr-row__photo qr-row__photo--placeholder" aria-hidden="true" />
                  )}

                  <div className="qr-row__info">
                    <div className="qr-row__title">
                      <h3>{qr.pet_name}</h3>
                      <StatusBadge status={qr.status} />
                    </div>
                    <div className="qr-row__code">{qr.pet_code || "—"}</div>
                    <div className="qr-row__meta">
                      {qr.species_name || "—"}
                      {qr.breed_name ? ` · ${qr.breed_name}` : ""}
                      {qr.sex ? ` · ${qr.sex}` : ""}
                      {qr.color ? ` · ${qr.color}` : ""}
                      {age ? ` · ${age}` : ""}
                    </div>
                    <div className="qr-row__chips">
                      <span className={`qr-chip qr-chip--${vax.tone}`}>{vax.label}</span>
                      {qr.is_lost === 1 && <span className="qr-chip qr-chip--danger">Reported Lost</span>}
                    </div>
                  </div>

                  <div className="qr-row__qr">
                    {qr.image_path ? (
                      <button
                        type="button"
                        className="qr-row__qr-button"
                        onClick={() => setViewQr(qr)}
                        title={`Click to view QR code for ${qr.pet_name}`}
                        aria-label={`Click to view QR code for ${qr.pet_name}`}
                      >
                        <img
                          src={resolveMediaUrl(qr.image_path)}
                          alt={`QR code for ${qr.pet_name}`}
                          className="qr-row__qr-img"
                        />
                        <span className="qr-row__qr-zoom">🔍</span>
                      </button>
                    ) : (
                      <span className="qr-row__qr-empty" title="No QR image available">
                        —
                      </span>
                    )}
                  </div>

                  <div className="qr-actions">
                    <button
                      type="button"
                      className="qr-action-button"
                      onClick={() => openBooklet(qr)}
                      style={{ cursor: "pointer" }}
                    >
                      📖 View Digital Pet Booklet
                    </button>

                    <a
                      href={resolveMediaUrl(qr.image_path)}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="qr-action-link"
                    >
                      ⬇ Download QR Image
                    </a>

                    <a
                      href={`${APP_ORIGIN}/public/${qr.qr_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="qr-action-link"
                    >
                      🌐 Open Public Profile
                    </a>
                  </div>
                </div>
              );
            })}

            {qrCodes.length === 0 && <p style={{ textAlign: "center" }}>No QR codes available.</p>}
          </div>
        )}
      </div>

      {bookletData && (
        <div onClick={closeBooklet} className="booklet-modal-overlay">
          <div onClick={(e) => e.stopPropagation()} className="booklet-modal-sheet">
            <DigitalPetBooklet data={bookletData} mode="owner" pets={qrCodes} activeToken={bookletToken} onSwitchPet={openBooklet} onClose={closeBooklet} onRefresh={refreshAfterSave} />
          </div>
        </div>
      )}

      {viewQr &&
        createPortal(
          <div onClick={() => setViewQr(null)} className="qr-view-overlay" role="dialog" aria-modal="true">
            <div onClick={(e) => e.stopPropagation()} className="qr-view-modal">
              <button
                type="button"
                className="qr-view-close"
                onClick={() => setViewQr(null)}
                aria-label="Close QR code view"
              >
                ✕
              </button>
              {viewQr.image_path ? (
                <div className="qr-view-img-wrap">
                  <img
                    src={resolveMediaUrl(viewQr.image_path)}
                    alt={`QR code for ${viewQr.pet_name}`}
                    className="qr-view-img"
                  />
                </div>
              ) : (
                <p style={{ textAlign: "center", color: "#4b5563", padding: "2rem 0" }}>No QR image available.</p>
              )}
              <div className="qr-view-caption">
                <h3>{viewQr.pet_name}</h3>
                {viewQr.pet_code && <div className="qr-view-code">{viewQr.pet_code}</div>}
                {viewQr.image_path && (
                  <a
                    href={resolveMediaUrl(viewQr.image_path)}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="qr-action-link"
                  >
                    ⬇ Download QR Image
                  </a>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}