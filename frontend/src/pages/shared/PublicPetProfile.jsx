import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import DigitalPetBooklet from "../../components/booklet/DigitalPetBooklet";

export default function PublicPetProfile() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [petData, setPetData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPet();
  }, [token]);

  async function loadPet() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/qr/public/${token}`);
      if (!response.data.success) {
        setError(response.data.message || "Pet record not found.");
        return;
      }
      setPetData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Pet record not found.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <h2 style={{ textAlign: "center", padding: "60px 0" }}>Loading...</h2>;
  }

  if (error) {
    return (
      <div style={{ maxWidth: "520px", margin: "60px auto", textAlign: "center", padding: "0 16px" }}>
        <div style={{ fontSize: "44px" }}>🐾</div>
        <h2>{error}</h2>
        <p style={{ color: "#6B7280" }}>
          This QR code may no longer be active. Please contact the City Veterinary Office for assistance.
        </p>
      </div>
    );
  }

  const bookletData = {
    pet: petData.pet,
    vaccinations: petData.vaccinations || [],
    latestVaccination: petData.latestVaccination || null,
    consultations: [],
    prescriptions: [],
    payments: [],
    preventiveCare: petData.preventiveCare || [],
    procedures: petData.procedures || [],
  };

  return <DigitalPetBooklet data={bookletData} mode="public" />;
}