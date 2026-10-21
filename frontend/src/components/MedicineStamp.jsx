import stampImage from "../assets/Digital_Stamp_city_vet.png";

export default function MedicineStamp({ color, medicineName, size = 38 }) {
  const label = medicineName
    ? `City Vet medicine stamp for ${medicineName}`
    : "City Vet medicine stamp";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        flex: "none",
        alignItems: "center",
        justifyContent: "center",
        padding: Math.max(2, Math.round(size * 0.07)),
        border: `2px solid ${color}`,
        borderRadius: "50%",
        background: "#fff",
        boxShadow: `0 0 0 2px ${color}22`,
      }}
    >
      <img
        src={stampImage}
        alt=""
        aria-hidden="true"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </span>
  );
}
