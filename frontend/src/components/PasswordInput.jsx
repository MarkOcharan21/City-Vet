import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({
  value,
  onChange,
  placeholder = "Password",
  name = "password",
}) {
  const [show, setShow] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
      }}
    >
      <input
        type={show ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        style={{
          width: "100%",
          height: "48px",
          padding: "0 48px 0 14px",
          border: "1px solid #D1D5DB",
          borderRadius: "10px",
          fontSize: "15px",
          outline: "none",
        }}
      />

      <button
        type="button"
        onClick={() => setShow(!show)}
        style={{
          position: "absolute",
          right: "14px",
          top: "50%",
          transform: "translateY(-50%)",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          margin: 0,
          color: "#666",
          width: "22px",
          height: "22px",
        }}
      >
        {show ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}