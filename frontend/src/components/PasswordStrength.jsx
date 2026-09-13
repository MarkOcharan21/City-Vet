export default function PasswordStrength({ password }) {
  function calculateStrength(password) {
    let score = 0;

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    return score;
  }

  const score = calculateStrength(password);

  const levels = [
    {
      text: "Very Weak",
      color: "#ef4444",
      width: "20%",
    },
    {
      text: "Weak",
      color: "#f97316",
      width: "40%",
    },
    {
      text: "Fair",
      color: "#eab308",
      width: "60%",
    },
    {
      text: "Good",
      color: "#22c55e",
      width: "80%",
    },
    {
      text: "Strong",
      color: "#16a34a",
      width: "100%",
    },
  ];

  if (!password) return null;

  const level = levels[Math.max(score - 1, 0)];

  return (
    <div style={{ marginTop: "10px", marginBottom: "18px" }}>
      <div
        style={{
          width: "100%",
          height: "8px",
          background: "#e5e7eb",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: level.width,
            height: "100%",
            background: level.color,
            transition: ".3s",
          }}
        />
      </div>

      <p
        style={{
          color: level.color,
          fontWeight: "600",
          marginTop: "6px",
          fontSize: "14px",
        }}
      >
        Password Strength: {level.text}
      </p>
    </div>
  );
}