import { Fragment, useEffect, useState } from "react";
import {
  Archive,
  BookOpen,
  ChevronDown,
  HeartHandshake,
  Info,
  Pill,
  QrCode,
  ShieldPlus,
  Slice,
  Stamp,
  Stethoscope,
  Syringe,
  TriangleAlert,
  User,
} from "lucide-react";

export const DIRECT_TABS = [
  { id: "pet-profile", label: "Profile", icon: Info, order: 10 },
  { id: "owner-info", label: "Owner", icon: User, order: 20 },
  { id: "emergency-info", label: "Emergency", icon: TriangleAlert, danger: true, order: 50 },
];

export const NAV_GROUPS = [
  {
    id: "records",
    label: "Records",
    icon: Archive,
    order: 30,
    children: [
      { id: "vaccination-record", label: "Vaccination", icon: Syringe },
      { id: "medical-history", label: "Medical History", icon: Stethoscope },
      { id: "medications", label: "Medications", icon: Pill },
      { id: "preventive-care", label: "Preventive Care", icon: ShieldPlus },
      { id: "procedures", label: "Procedures", icon: Slice },
    ],
  },
  {
    id: "care",
    label: "Care",
    icon: HeartHandshake,
    order: 40,
    children: [
      { id: "pet-care-guide", label: "Pet Care Guide", icon: BookOpen },
      { id: "digital-stamp", label: "Digital Stamp", icon: Stamp },
      { id: "qr-verification", label: "QR Verification", icon: QrCode },
    ],
  },
];

function activeGroupOf(id) {
  for (const g of NAV_GROUPS) if (g.children.some((c) => c.id === id)) return g.id;
  return null;
}

const TOP_ORDER = [
  { kind: "tab", id: "pet-profile" },
  { kind: "tab", id: "owner-info" },
  { kind: "group", id: "records" },
  { kind: "group", id: "care" },
  { kind: "tab", id: "emergency-info" },
];

export default function BookletTabs({ activeTab, onChange, counts = {} }) {
  const [open, setOpen] = useState(null);

  useEffect(() => {
    setOpen(activeGroupOf(activeTab));
  }, [activeTab]);

  const toggleGroup = (gid) => {
    setOpen((cur) => (cur === gid ? null : gid));
  };

  return (
    <nav className="booklet-tabs" aria-label="Booklet sections">
      <div className="booklet-tabs__row" role="tablist" aria-label="Main sections">
        {TOP_ORDER.map((node) => {
          if (node.kind === "group") {
            const g = NAV_GROUPS.find((x) => x.id === node.id);
            const isOpen = open === g.id;
            const total = g.children.reduce(
              (sum, c) => sum + (typeof counts[c.id] === "number" ? counts[c.id] : 0),
              0
            );
            const GroupIcon = g.icon;
            return (
              <button
                key={g.id}
                type="button"
                style={{ order: g.order }}
                className={`booklet-tabs__tab${isOpen ? " is-open" : ""}`}
                aria-expanded={isOpen}
                aria-controls={`group-${g.id}`}
                onClick={() => toggleGroup(g.id)}
              >
                <GroupIcon size={15} strokeWidth={2.3} aria-hidden="true" />
                <span className="booklet-tabs__label">{g.label}</span>
                {total > 0 && <span className="booklet-tabs__badge">{total}</span>}
                <ChevronDown size={14} strokeWidth={2.5} className="booklet-tabs__chevron" aria-hidden="true" />
              </button>
            );
          }
          const { id, label, icon: Icon, danger, order } = DIRECT_TABS.find((t) => t.id === node.id);
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              style={{ order }}
              aria-selected={isActive}
              className={`booklet-tabs__tab${isActive ? " is-active" : ""}${
                danger ? " is-danger" : ""
              }`}
              onClick={() => onChange(id)}
            >
              <Icon size={15} strokeWidth={2.3} aria-hidden="true" />
              <span className="booklet-tabs__label">{label}</span>
            </button>
          );
        })}
      </div>

      {NAV_GROUPS.map((g) => {
        const isOpen = open === g.id;
        return (
          <div
            key={g.id}
            id={`group-${g.id}`}
            style={{ order: g.order + 1 }}
            className={`booklet-tabs__group${isOpen ? " is-open" : ""}`}
          >
            <div className="booklet-tabs__group-inner">
              <div className="booklet-tabs__row--sub" role="tablist" aria-label={`${g.label} sections`}>
                {g.children.map(({ id, label, icon: Icon }) => {
                  const isActive = activeTab === id;
                  const count = counts[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`booklet-tabs__sub${isActive ? " is-active" : ""}`}
                      onClick={() => onChange(id)}
                    >
                      <Icon size={14} strokeWidth={2.3} aria-hidden="true" />
                      <span className="booklet-tabs__label">{label}</span>
                      {typeof count === "number" && count > 0 && (
                        <span className="booklet-tabs__badge">{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}