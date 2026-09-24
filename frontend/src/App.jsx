import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";
import AutoCapitalize from "./components/AutoCapitalize";

import Homepage from "./pages/shared/Homepage";
import PublicPetProfile from "./pages/shared/PublicPetProfile";
import OutreachConfirmForm from "./pages/shared/OutreachConfirmForm";

// OWNER
import OwnerLogin from "./pages/owner/OwnerLogin";
import OwnerRegister from "./pages/owner/OwnerRegister";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import PetRegistration from "./pages/owner/PetRegistration";
import DraftRegistration from "./pages/owner/DraftRegistration";
import MyPets from "./pages/owner/MyPets";
import QrRecords from "./pages/owner/QrRecords";
import VaccinationHistory from "./pages/owner/VaccinationHistory";
import ClinicalMedicineRecords from "./pages/owner/ClinicalMedicineRecords";
import RecordRequest from "./pages/owner/RecordRequest";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import AccountSetup from "./pages/auth/AccountSetup";


// STAFF
import StaffLogin from "./pages/staff/StaffLogin";
import StaffCheckIn from "./pages/staff/StaffCheckIn";
import StaffDashboard from "./pages/staff/StaffDashboard";
import PetRecords from "./pages/staff/PetRecords";
import VerifyRegistration from "./pages/staff/VerifyRegistration";
import VaccinationMonitoring from "./pages/staff/VaccinationMonitoring";
import ClinicalRecords from "./pages/staff/ClinicalRecords";
import MedicineRecords from "./pages/staff/MedicineRecords";
import IssueRequestedRecord from "./pages/staff/IssueRequestedRecord";
import PaymentMonitoring from "./pages/staff/PaymentMonitoring";
import OutreachMonitoring from "./pages/staff/OutreachMonitoring";
import PaymentHistory from "./pages/owner/PaymentHistory";
import OwnerSettings from "./pages/owner/OwnerSettings";

// ADMIN
import AdminLogin from "./pages/admin/AdminLogin";
import SystemOverview from "./pages/admin/SystemOverview";
import BarangayDashboard from "./pages/admin/BarangayDashboard";
import UserDirectory from "./pages/admin/UserDirectory";
import RegistrationRecords from "./pages/admin/RegistrationRecords";
import Traceability from "./pages/admin/Traceability";
import AnalyticsReports from "./pages/admin/AnalyticsReports";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import ActivityAuditTrail from "./pages/admin/ActivityAuditTrail";
import ProductCatalog from "./pages/admin/ProductCatalog";
import NotificationCenter from "./pages/shared/NotificationCenter";

// LAYOUTS
import OwnerLayout from "./layouts/OwnerLayout";
import StaffLayout from "./layouts/StaffLayout";
import AdminLayout from "./layouts/AdminLayout";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <AutoCapitalize />

        <Routes>
          {/* ===================== PUBLIC ===================== */}

          <Route path="/" element={<Homepage />} />

          <Route path="/public/:token" element={<PublicPetProfile />} />

<Route path="/outreach-confirm/:token" element={<OutreachConfirmForm />} />

          <Route path="/owner/login" element={<OwnerLogin />} />

          <Route path="/owner/forgot-password" element={<ForgotPassword />} />

          <Route path="/owner/reset-password" element={<ResetPassword />} />

          <Route path="/account-setup" element={<AccountSetup />} />

          <Route path="/owner/register" element={<OwnerRegister />} />

          <Route path="/staff/login" element={<StaffLogin />} />

          <Route path="/staff/check-in" element={<StaffCheckIn />} />

          <Route path="/admin/login" element={<AdminLogin />} />

          {/* ===================== OWNER ===================== */}

          <Route
            path="/owner"
            element={
              <ProtectedRoute allowedRoles={["Owner"]}>
                <OwnerLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<OwnerDashboard />} />

            <Route path="register-pet" element={<PetRegistration />} />

            <Route path="drafts" element={<DraftRegistration />} />

            <Route path="my-pets" element={<MyPets />} />

            <Route path="qr-records" element={<QrRecords />} />

            <Route
              path="vaccinations"
              element={<VaccinationHistory />}
            />

            <Route
              path="clinical-medicine"
              element={<ClinicalMedicineRecords />}
            />

            <Route
              path="payment-history"
              element={<PaymentHistory />}
            />

            <Route
              path="record-requests"
              element={<RecordRequest />}
            />

            <Route
              path="settings"
              element={<OwnerSettings />}
            />
          </Route>

          {/* ===================== STAFF ===================== */}

          <Route
            path="/staff"
            element={
              <ProtectedRoute
                allowedRoles={["Staff", "Veterinarian", "Admin"]}
              >
                <StaffLayout />
              </ProtectedRoute>
            }
          >
            <Route
              path="dashboard"
              element={<StaffDashboard />}
            />

            <Route
              path="pet-records"
              element={<PetRecords />}
            />

            <Route
              path="verify-registration"
              element={<VerifyRegistration />}
            />

            <Route
              path="vaccination-monitoring"
              element={<VaccinationMonitoring />}
            />

            <Route
              path="clinical-records"
              element={<ClinicalRecords />}
            />

            <Route
              path="medicine-records"
              element={<MedicineRecords />}
            />

            <Route
              path="issue-records"
              element={<IssueRequestedRecord />}
            />

            <Route
              path="payment-monitoring"
              element={<PaymentMonitoring />}
            />

            <Route
              path="outreach-monitoring"
              element={<OutreachMonitoring />}
            />
          </Route>

          {/* ===================== ADMIN ===================== */}

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route
              path="overview"
              element={<SystemOverview />}
            />

            <Route
              path="barangay-dashboard"
              element={<BarangayDashboard />}
            />

            <Route
              path="users"
              element={<UserDirectory />}
            />

            <Route
              path="registration-records"
              element={<RegistrationRecords />}
            />

            <Route
              path="traceability"
              element={<Traceability />}
            />

            <Route
              path="analytics"
              element={<AnalyticsReports />}
            />

            <Route
              path="announcements"
              element={<AdminAnnouncements />}
            />

            <Route
              path="activity-audit-trail"
              element={<ActivityAuditTrail />}
            />

            <Route
              path="catalog"
              element={<ProductCatalog />}
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}