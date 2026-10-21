export default function MedicineStamp({
  color,
  medicineName,
  batchNumber,
  expiryDate,
  batchLabel = "Set when dispensed",
  expiryLabel = "Not recorded",
  size = 168,
}) {
  const displayExpiry = expiryDate
    ? (() => {
        const dateOnly = String(expiryDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
        const date = dateOnly
          ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
          : new Date(expiryDate);
        return Number.isNaN(date.getTime())
          ? String(expiryDate)
          : date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
      })()
    : expiryLabel;
  const label = medicineName
    ? `Medicine label for ${medicineName}, batch ${batchNumber || batchLabel}, expires ${displayExpiry}`
    : "Medicine label";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{
        width: `min(${size}px, 100%)`,
        minWidth: 0,
        maxWidth: size,
        display: "inline-flex",
        flexDirection: "column",
        flex: "none",
        overflow: "hidden",
        border: "1px solid #cbd5e1",
        borderRadius: 3,
        background: "#eaf6fa",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
        fontFamily: "Arial, sans-serif",
        lineHeight: 1.15,
      }}
    >
      <span
        style={{
          width: "100%",
          padding: "7px 9px",
          background: color,
          color: "#fff",
          fontSize: 13,
          fontWeight: 800,
          textTransform: "uppercase",
          overflowWrap: "anywhere",
          wordBreak: "normal",
        }}
      >
        {medicineName || "Medicine"}
      </span>
      <span
        style={{
          display: "grid",
          gridTemplateColumns: "40px minmax(0, 1fr)",
          gap: "5px 7px",
          padding: "7px 9px",
          color: "#172b3b",
          fontSize: 10,
          overflowWrap: "anywhere",
        }}
      >
        <strong>Batch</strong>
        <span>{batchNumber || batchLabel}</span>
        <strong>Exp.</strong>
        <span>{displayExpiry}</span>
      </span>
    </span>
  );
}
