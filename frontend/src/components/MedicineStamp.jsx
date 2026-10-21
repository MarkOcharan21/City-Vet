export default function MedicineStamp({
  color,
  medicineName,
  batchNumber,
  expiryDate,
  size = 132,
}) {
  const label = medicineName
    ? `Medicine label for ${medicineName}, batch ${batchNumber || "not recorded"}, expires ${expiryDate || "not recorded"}`
    : "Medicine label";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{
        width: size,
        minWidth: size,
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
          padding: "5px 7px",
          overflow: "hidden",
          background: color,
          color: "#fff",
          fontSize: 12,
          fontWeight: 800,
          textOverflow: "ellipsis",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {medicineName || "Medicine"}
      </span>
      <span
        style={{
          display: "grid",
          gridTemplateColumns: "35px minmax(0, 1fr)",
          gap: "3px 5px",
          padding: "5px 7px",
          color: "#172b3b",
          fontSize: 9,
        }}
      >
        <strong>Batch</strong>
        <span style={{ overflowWrap: "anywhere" }}>
          {batchNumber || "—"}
        </span>
        <strong>Exp.</strong>
        <span style={{ overflowWrap: "anywhere" }}>
          {expiryDate || "—"}
        </span>
      </span>
    </span>
  );
}
