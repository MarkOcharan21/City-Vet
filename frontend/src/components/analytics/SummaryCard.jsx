import {
  FaDog,
  FaUserFriends,
  FaSyringe,
  FaQrcode,
} from "react-icons/fa";

export default function SummaryCards({ summary }) {
  const cards = [
    {
      title: "Registered Pets",
      value: summary.totalPets,
      icon: <FaDog size={34} />,
      color: "#0F766E",
    },
    {
      title: "Vaccinated Pets",
      value: summary.vaccinatedPets,
      icon: <FaSyringe size={34} />,
      color: "#2563EB",
    },
    {
      title: "Lost Pets",
      value: summary.lostPets,
      icon: <FaUserFriends size={34} />,
      color: "#DC2626",
    },
    {
      title: "Generated QR",
      value: summary.totalQr,
      icon: <FaQrcode size={34} />,
      color: "#7C3AED",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
        gap: "22px",
        marginBottom: "35px",
      }}
    >
      {cards.map((card) => (
        <div
          key={card.title}
          style={{
            background: "#fff",
            borderRadius: "18px",
            padding: "28px",
            boxShadow: "0 10px 25px rgba(0,0,0,.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            transition: ".25s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "translateY(-6px)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "translateY(0)")
          }
        >
          <div>
            <div
              style={{
                color: "#6B7280",
                fontSize: "15px",
              }}
            >
              {card.title}
            </div>

            <div
              style={{
                fontSize: "38px",
                fontWeight: "700",
                marginTop: "8px",
              }}
            >
              {card.value}
            </div>
          </div>

          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: card.color,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#fff",
            }}
          >
            {card.icon}
          </div>
        </div>
      ))}
    </div>
  );
}