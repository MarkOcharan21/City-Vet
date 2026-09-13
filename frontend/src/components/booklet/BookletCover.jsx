import { BadgeCheck, KeyRound, ShieldCheck } from "lucide-react";
import { computeAge, fmt } from "./bookletUtils";

const PET_STATUS = {
  Verified: { label: "VERIFIED", tone: "ok" },
  Registered: { label: "REGISTERED", tone: "warn" },
};

export default function BookletCover({ pet, photoUrl, qrUrl, authorized }) {
  const status = PET_STATUS[pet.status] || PET_STATUS.Registered;

  return (
    <section className="booklet-cover">
      <div className="booklet-cover__top">
        <div className="booklet-cover__brand">
          <img
            src="/assets/city-vet-logo.jpg"
            alt="City Veterinary Office Logo"
            className="booklet-cover__logo"
          />
          <div>
            <div className="booklet-cover__office">CITY VETERINARY OFFICE</div>
            <div className="booklet-cover__city">Cabuyao City, Laguna</div>
          </div>
        </div>
        <div className="booklet-cover__badge">
          <ShieldCheck size={16} strokeWidth={2.5} />
          <span>Verified Digital Pet Record</span>
        </div>
      </div>

      <div className="booklet-cover__main">
        <div className="booklet-cover__photo">
          <img src={photoUrl} alt={`Photo of ${pet.name}`} />
        </div>

        <div className="booklet-cover__identity">
          <h1 className="booklet-cover__name">{pet.name}</h1>

          <div className="booklet-cover__idline">
            <span className="booklet-cover__idlabel">Pet ID / Registration No.</span>
            <span className="booklet-cover__code">{pet.pet_code}</span>
          </div>

          <div className="booklet-cover__chips">
            <span className="chip chip--species">{pet.species_name}</span>
            <span className="chip chip--breed">{pet.breed_name}</span>
          </div>

          <div className="booklet-cover__stats">
            <CoverStat label="Sex" value={pet.sex || "—"} />
            <CoverStat label="Age" value={computeAge(pet.birthdate)} />
            <CoverStat label="Color / Markings" value={pet.color || "—"} />
            <CoverStat label="Registered" value={fmt(pet.registration_date)} />
          </div>

          {authorized && (
            <div className="booklet-cover__owner">
              Registered under <strong>{pet.full_name}</strong>
              {pet.contact_number ? ` • ${pet.contact_number}` : ""}
            </div>
          )}
        </div>

        <div className="booklet-cover__qr">
          {qrUrl && <img src={qrUrl} alt={`Secure QR code for ${pet.name}`} />}
          <div className="booklet-cover__qr-note">Scan to verify</div>
          <div className="booklet-cover__qr-secure">
            <KeyRound size={12} strokeWidth={2.4} /> Secure access token
          </div>
        </div>
      </div>

      <div className="booklet-cover__status">
        <span className={`status-pill status-pill--${status.tone}`}>
          <BadgeCheck size={15} strokeWidth={2.5} />
          {status.label}
        </span>
        <span className="booklet-cover__official">
          Official digital record issued by the City Veterinary Animal Clinic
        </span>
      </div>
    </section>
  );
}

function CoverStat({ label, value }) {
  return (
    <div className="cover-stat">
      <span className="cover-stat__label">{label}</span>
      <span className="cover-stat__value">{value}</span>
    </div>
  );
}