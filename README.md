# Web-Based QR-Enabled Pet Registration, Vaccination, and Traceability
# Management System with Data Analytics

City Veterinary Animal Clinic â€” Cabuyao City, Laguna

## What's inside

- `backend/` â€” Node.js + Express + MySQL API (7 modules from Chapter 3)
- `frontend/` â€” React (Vite) app with 3 portals: Pet Owner, Clinic Staff, Admin

schema.

## First-time setup (Windows + XAMPP)

### 1. Database
1. Start MySQL from the XAMPP Control Panel.
2. Open the XAMPP **Shell** button and run:
   ```
   mysql -u root
   ```
3. Then import the schema (exit the mysql prompt first with `EXIT;`, then from the XAMPP Shell, `cd` into the `backend` folder and run):
   ```
   mysql -u root pet_vet_system < schema.sql
   ```
   (If `pet_vet_system` doesn't exist yet, `schema.sql` creates it for you â€” you can run this directly without the `CREATE DATABASE` step.)

### 2. Backend
```
cd backend
npm install
npm run seed     # creates the default Admin login
npm run dev
```
Backend runs at `http://localhost:5000`.

Default Admin login (created by `npm run seed`):
- Email: `admin@cityvet.gov.ph`
- Password: `Admin123!`

### 3. Frontend
```
cd frontend
npm install
npm run dev
```
Frontend runs at `https://localhost:5178` (this build serves the dev server over HTTPS via the Vite config â€” visit the URL and accept the self-signed cert warning).

The unique code features and storage model (self-registration referral, PMS/QR/OR scan) are described in `IDEA.md`.

## Notes

- `backend/.env` holds your local DB credentials â€” never commit this file (it's already in `.gitignore`).
- Staff and Veterinarian accounts are created by an Admin from the **User Directory** page â€” there's no public staff signup, matching the manuscript's access-control design.
- QR code images are generated automatically when Staff verifies a pet registration, and are saved to `backend/uploads/qrcodes/`.
- This build follows the 7 modules and 3 portals defined in Chapter 3 (Module Design and Integration Planning, and the UI/UX Wireframe section). Anything not explicitly in the manuscript (e.g. the exact chart library, hosting provider) was chosen freely per the instructions, since the manuscript itself doesn't specify implementation technology.

```
pet-vet-system
â”œâ”€ backend
â”‚  â”œâ”€ .env
â”‚  â”œâ”€ .env.example
â”‚  â”œâ”€ package-lock.json
â”‚  â”œâ”€ package.json
â”‚  â”œâ”€ schema.sql
â”‚  â”œâ”€ server.js
â”‚  â”œâ”€ src
â”‚  â”‚  â”œâ”€ config
â”‚  â”‚  â”‚  â””â”€ db.js
â”‚  â”‚  â”œâ”€ controllers
â”‚  â”‚  â”‚  â”œâ”€ analyticsController.js
â”‚  â”‚  â”‚  â”œâ”€ authController.js
â”‚  â”‚  â”‚  â”œâ”€ clinicalController.js
â”‚  â”‚  â”‚  â”œâ”€ draftController.js
â”‚  â”‚  â”‚  â”œâ”€ medicineController.js
â”‚  â”‚  â”‚  â”œâ”€ paymentController.js
â”‚  â”‚  â”‚  â”œâ”€ petController.js
â”‚  â”‚  â”‚  â”œâ”€ qrController.js
â”‚  â”‚  â”‚  â”œâ”€ recordRequestController.js
â”‚  â”‚  â”‚  â”œâ”€ userController.js
â”‚  â”‚  â”‚  â””â”€ vaccinationController.js
â”‚  â”‚  â”œâ”€ middleware
â”‚  â”‚  â”‚  â”œâ”€ authMiddleware.js
â”‚  â”‚  â”‚  â””â”€ roleMiddleware.js
â”‚  â”‚  â”œâ”€ models
â”‚  â”‚  â”œâ”€ routes
â”‚  â”‚  â”‚  â”œâ”€ analyticsRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ authRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ clinicalRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ draftRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ medicineRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ paymentRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ petRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ qrRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ recordRequestRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ userRoutes.js
â”‚  â”‚  â”‚  â””â”€ vaccinationRoutes.js
â”‚  â”‚  â””â”€ utils
â”‚  â”‚     â”œâ”€ qrGenerator.js
â”‚  â”‚     â””â”€ seedAdmin.js
â”‚  â””â”€ uploads
â”‚     â””â”€ qrcodes
â”œâ”€ frontend
â”‚  â”œâ”€ .env
â”‚  â”œâ”€ index.html
â”‚  â”œâ”€ package-lock.json
â”‚  â”œâ”€ package.json
â”‚  â”œâ”€ public
â”‚  â”œâ”€ src
â”‚  â”‚  â”œâ”€ App.jsx
â”‚  â”‚  â”œâ”€ components
â”‚  â”‚  â”‚  â”œâ”€ ProtectedRoute.jsx
â”‚  â”‚  â”‚  â”œâ”€ StatusBadge.jsx
â”‚  â”‚  â”‚  â””â”€ SummaryCard.jsx
â”‚  â”‚  â”œâ”€ context
â”‚  â”‚  â”‚  â””â”€ AuthContext.jsx
â”‚  â”‚  â”œâ”€ hooks
â”‚  â”‚  â”œâ”€ index.css
â”‚  â”‚  â”œâ”€ layouts
â”‚  â”‚  â”‚  â”œâ”€ AdminLayout.jsx
â”‚  â”‚  â”‚  â”œâ”€ OwnerLayout.jsx
â”‚  â”‚  â”‚  â””â”€ StaffLayout.jsx
â”‚  â”‚  â”œâ”€ main.jsx
â”‚  â”‚  â”œâ”€ pages
â”‚  â”‚  â”‚  â”œâ”€ admin
â”‚  â”‚  â”‚  â”‚  â”œâ”€ AdminLogin.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ AnalyticsReports.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ BarangayDashboard.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ RegistrationRecords.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ SystemOverview.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ Traceability.jsx
â”‚  â”‚  â”‚  â”‚  â””â”€ UserDirectory.jsx
â”‚  â”‚  â”‚  â”œâ”€ owner
â”‚  â”‚  â”‚  â”‚  â”œâ”€ ClinicalMedicineRecords.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ DraftRegistration.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ MyPets.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ OwnerDashboard.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ OwnerLogin.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ OwnerRegister.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ PetRegistration.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ QrRecords.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ RecordRequest.jsx
â”‚  â”‚  â”‚  â”‚  â””â”€ VaccinationHistory.jsx
â”‚  â”‚  â”‚  â”œâ”€ shared
â”‚  â”‚  â”‚  â”‚  â””â”€ Homepage.jsx
â”‚  â”‚  â”‚  â””â”€ staff
â”‚  â”‚  â”‚     â”œâ”€ ClinicalRecords.jsx
â”‚  â”‚  â”‚     â”œâ”€ IssueRequestedRecord.jsx
â”‚  â”‚  â”‚     â”œâ”€ MedicineRecords.jsx
â”‚  â”‚  â”‚     â”œâ”€ PetRecords.jsx
â”‚  â”‚  â”‚     â”œâ”€ StaffDashboard.jsx
â”‚  â”‚  â”‚     â”œâ”€ StaffLogin.jsx
â”‚  â”‚  â”‚     â”œâ”€ VaccinationMonitoring.jsx
â”‚  â”‚  â”‚     â””â”€ VerifyRegistration.jsx
â”‚  â”‚  â””â”€ services
â”‚  â”‚     â””â”€ api.js
â”‚  â””â”€ vite.config.js
â””â”€ README.md

```
```
pet-vet-system revise
â”œâ”€ backend
â”‚  â”œâ”€ .env
â”‚  â”œâ”€ .env.example
â”‚  â”œâ”€ add-breed-custom.sql
â”‚  â”œâ”€ database
â”‚  â”‚  â””â”€ migrations
â”‚  â”‚     â””â”€ 001_registration_automation.sql
â”‚  â”œâ”€ package-lock.json
â”‚  â”œâ”€ package.json
â”‚  â”œâ”€ schema.sql
â”‚  â”œâ”€ server.js
â”‚  â”œâ”€ src
â”‚  â”‚  â”œâ”€ config
â”‚  â”‚  â”‚  â””â”€ db.js
â”‚  â”‚  â”œâ”€ controllers
â”‚  â”‚  â”‚  â”œâ”€ analyticsController.js
â”‚  â”‚  â”‚  â”œâ”€ authController.js
â”‚  â”‚  â”‚  â”œâ”€ clinicalController.js
â”‚  â”‚  â”‚  â”œâ”€ dashboardController.js
â”‚  â”‚  â”‚  â”œâ”€ draftController.js
â”‚  â”‚  â”‚  â”œâ”€ medicineController.js
â”‚  â”‚  â”‚  â”œâ”€ paymentController.js
â”‚  â”‚  â”‚  â”œâ”€ petController.js
â”‚  â”‚  â”‚  â”œâ”€ qrController.js
â”‚  â”‚  â”‚  â”œâ”€ recordRequestController.js
â”‚  â”‚  â”‚  â”œâ”€ userController.js
â”‚  â”‚  â”‚  â””â”€ vaccinationController.js
â”‚  â”‚  â”œâ”€ middleware
â”‚  â”‚  â”‚  â”œâ”€ authMiddleware.js
â”‚  â”‚  â”‚  â”œâ”€ roleMiddleware.js
â”‚  â”‚  â”‚  â””â”€ uploadPetPhoto.js
â”‚  â”‚  â”œâ”€ models
â”‚  â”‚  â”œâ”€ routes
â”‚  â”‚  â”‚  â”œâ”€ analyticsRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ authRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ clinicalRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ dashboardRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ draftRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ medicineRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ paymentRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ petRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ qrRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ recordRequestRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ userRoutes.js
â”‚  â”‚  â”‚  â””â”€ vaccinationRoutes.js
â”‚  â”‚  â””â”€ utils
â”‚  â”‚     â”œâ”€ qrGenerator.js
â”‚  â”‚     â””â”€ seedAdmin.js
â”‚  â””â”€ uploads
â”‚     â””â”€ qrcodes
â”‚        â”œâ”€ qr_PET-2026-000003.png
â”‚        â”œâ”€ qr_PET-2026-000004.png
â”‚        â””â”€ qr_PET-2026-000005.png
â”œâ”€ DEBUG_REPORT_PET_REGISTRATION.md
â”œâ”€ frontend
â”‚  â”œâ”€ .env
â”‚  â”œâ”€ dist
â”‚  â”‚  â”œâ”€ assets
â”‚  â”‚  â”‚  â”œâ”€ html2canvas.esm-DXEQVQnt.js
â”‚  â”‚  â”‚  â”œâ”€ index-BkDnIc9k.js
â”‚  â”‚  â”‚  â”œâ”€ index-BNpyQHRw.css
â”‚  â”‚  â”‚  â”œâ”€ index.es-CtNGsVZQ.js
â”‚  â”‚  â”‚  â””â”€ purify.es-VaSPOPhr.js
â”‚  â”‚  â””â”€ index.html
â”‚  â”œâ”€ index.html
â”‚  â”œâ”€ package-lock.json
â”‚  â”œâ”€ package.json
â”‚  â”œâ”€ public
â”‚  â”œâ”€ src
â”‚  â”‚  â”œâ”€ App.jsx
â”‚  â”‚  â”œâ”€ components
â”‚  â”‚  â”‚  â”œâ”€ analytics
â”‚  â”‚  â”‚  â”‚  â””â”€ SummaryCard.jsx
â”‚  â”‚  â”‚  â”œâ”€ PetIDCard.jsx
â”‚  â”‚  â”‚  â”œâ”€ PetIDCardBack.jsx
â”‚  â”‚  â”‚  â”œâ”€ ProtectedRoute.jsx
â”‚  â”‚  â”‚  â”œâ”€ StatusBadge.jsx
â”‚  â”‚  â”‚  â””â”€ SummaryCard.jsx
â”‚  â”‚  â”œâ”€ context
â”‚  â”‚  â”‚  â””â”€ AuthContext.jsx
â”‚  â”‚  â”œâ”€ hooks
â”‚  â”‚  â”œâ”€ index.css
â”‚  â”‚  â”œâ”€ layouts
â”‚  â”‚  â”‚  â”œâ”€ AdminLayout.jsx
â”‚  â”‚  â”‚  â”œâ”€ OwnerLayout.jsx
â”‚  â”‚  â”‚  â””â”€ StaffLayout.jsx
â”‚  â”‚  â”œâ”€ main.jsx
â”‚  â”‚  â”œâ”€ pages
â”‚  â”‚  â”‚  â”œâ”€ admin
â”‚  â”‚  â”‚  â”‚  â”œâ”€ AdminLogin.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ AnalyticsReports.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ BarangayDashboard.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ RegistrationRecords.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ SystemOverview.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ Traceability.jsx
â”‚  â”‚  â”‚  â”‚  â””â”€ UserDirectory.jsx
â”‚  â”‚  â”‚  â”œâ”€ owner
â”‚  â”‚  â”‚  â”‚  â”œâ”€ ClinicalMedicineRecords.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ DraftRegistration.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ MyPets.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ OwnerDashboard.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ OwnerLogin.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ OwnerRegister.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ PetRegistration.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ QrRecords.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ RecordRequest.jsx
â”‚  â”‚  â”‚  â”‚  â””â”€ VaccinationHistory.jsx
â”‚  â”‚  â”‚  â”œâ”€ shared
â”‚  â”‚  â”‚  â”‚  â”œâ”€ Homepage.jsx
â”‚  â”‚  â”‚  â”‚  â””â”€ PublicPetProfile.jsx
â”‚  â”‚  â”‚  â””â”€ staff
â”‚  â”‚  â”‚     â”œâ”€ ClinicalRecords.jsx
â”‚  â”‚  â”‚     â”œâ”€ IssueRequestedRecord.jsx
â”‚  â”‚  â”‚     â”œâ”€ MedicineRecords.jsx
â”‚  â”‚  â”‚     â”œâ”€ PetRecords.jsx
â”‚  â”‚  â”‚     â”œâ”€ StaffDashboard.jsx
â”‚  â”‚  â”‚     â”œâ”€ StaffLogin.jsx
â”‚  â”‚  â”‚     â”œâ”€ VaccinationMonitoring.jsx
â”‚  â”‚  â”‚     â””â”€ VerifyRegistration.jsx
â”‚  â”‚  â””â”€ services
â”‚  â”‚     â””â”€ api.js
â”‚  â””â”€ vite.config.js
â”œâ”€ package-lock.json
â”œâ”€ package.json
â””â”€ README.md

```
```
pet-vet-system revise
â”œâ”€ backend
â”‚  â”œâ”€ .env
â”‚  â”œâ”€ .env.example
â”‚  â”œâ”€ add-breed-custom.sql
â”‚  â”œâ”€ database
â”‚  â”‚  â””â”€ migrations
â”‚  â”‚     â””â”€ 001_registration_automation.sql
â”‚  â”œâ”€ package-lock.json
â”‚  â”œâ”€ package.json
â”‚  â”œâ”€ schema.sql
â”‚  â”œâ”€ server.js
â”‚  â”œâ”€ src
â”‚  â”‚  â”œâ”€ config
â”‚  â”‚  â”‚  â””â”€ db.js
â”‚  â”‚  â”œâ”€ controllers
â”‚  â”‚  â”‚  â”œâ”€ analyticsController.js
â”‚  â”‚  â”‚  â”œâ”€ authController.js
â”‚  â”‚  â”‚  â”œâ”€ clinicalController.js
â”‚  â”‚  â”‚  â”œâ”€ dashboardController.js
â”‚  â”‚  â”‚  â”œâ”€ draftController.js
â”‚  â”‚  â”‚  â”œâ”€ medicineController.js
â”‚  â”‚  â”‚  â”œâ”€ paymentController.js
â”‚  â”‚  â”‚  â”œâ”€ petController.js
â”‚  â”‚  â”‚  â”œâ”€ qrController.js
â”‚  â”‚  â”‚  â”œâ”€ recordRequestController.js
â”‚  â”‚  â”‚  â”œâ”€ userController.js
â”‚  â”‚  â”‚  â””â”€ vaccinationController.js
â”‚  â”‚  â”œâ”€ middleware
â”‚  â”‚  â”‚  â”œâ”€ authMiddleware.js
â”‚  â”‚  â”‚  â”œâ”€ roleMiddleware.js
â”‚  â”‚  â”‚  â””â”€ uploadPetPhoto.js
â”‚  â”‚  â”œâ”€ models
â”‚  â”‚  â”œâ”€ routes
â”‚  â”‚  â”‚  â”œâ”€ analyticsRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ authRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ clinicalRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ dashboardRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ draftRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ medicineRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ paymentRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ petRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ qrRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ recordRequestRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ userRoutes.js
â”‚  â”‚  â”‚  â””â”€ vaccinationRoutes.js
â”‚  â”‚  â””â”€ utils
â”‚  â”‚     â”œâ”€ qrGenerator.js
â”‚  â”‚     â””â”€ seedAdmin.js
â”‚  â””â”€ uploads
â”‚     â””â”€ qrcodes
â”‚        â”œâ”€ qr_PET-2026-000003.png
â”‚        â”œâ”€ qr_PET-2026-000004.png
â”‚        â””â”€ qr_PET-2026-000005.png
â”œâ”€ DEBUG_REPORT_PET_REGISTRATION.md
â”œâ”€ frontend
â”‚  â”œâ”€ .env
â”‚  â”œâ”€ dist
â”‚  â”‚  â”œâ”€ assets
â”‚  â”‚  â”‚  â”œâ”€ html2canvas.esm-DXEQVQnt.js
â”‚  â”‚  â”‚  â”œâ”€ index-BkDnIc9k.js
â”‚  â”‚  â”‚  â”œâ”€ index-BNpyQHRw.css
â”‚  â”‚  â”‚  â”œâ”€ index.es-CtNGsVZQ.js
â”‚  â”‚  â”‚  â””â”€ purify.es-VaSPOPhr.js
â”‚  â”‚  â””â”€ index.html
â”‚  â”œâ”€ index.html
â”‚  â”œâ”€ package-lock.json
â”‚  â”œâ”€ package.json
â”‚  â”œâ”€ public
â”‚  â”œâ”€ src
â”‚  â”‚  â”œâ”€ App.jsx
â”‚  â”‚  â”œâ”€ components
â”‚  â”‚  â”‚  â”œâ”€ analytics
â”‚  â”‚  â”‚  â”‚  â””â”€ SummaryCard.jsx
â”‚  â”‚  â”‚  â”œâ”€ PetIDCard.jsx
â”‚  â”‚  â”‚  â”œâ”€ PetIDCardBack.jsx
â”‚  â”‚  â”‚  â”œâ”€ ProtectedRoute.jsx
â”‚  â”‚  â”‚  â”œâ”€ StatusBadge.jsx
â”‚  â”‚  â”‚  â””â”€ SummaryCard.jsx
â”‚  â”‚  â”œâ”€ context
â”‚  â”‚  â”‚  â””â”€ AuthContext.jsx
â”‚  â”‚  â”œâ”€ hooks
â”‚  â”‚  â”œâ”€ index.css
â”‚  â”‚  â”œâ”€ layouts
â”‚  â”‚  â”‚  â”œâ”€ AdminLayout.jsx
â”‚  â”‚  â”‚  â”œâ”€ OwnerLayout.jsx
â”‚  â”‚  â”‚  â””â”€ StaffLayout.jsx
â”‚  â”‚  â”œâ”€ main.jsx
â”‚  â”‚  â”œâ”€ pages
â”‚  â”‚  â”‚  â”œâ”€ admin
â”‚  â”‚  â”‚  â”‚  â”œâ”€ AdminLogin.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ AnalyticsReports.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ BarangayDashboard.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ RegistrationRecords.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ SystemOverview.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ Traceability.jsx
â”‚  â”‚  â”‚  â”‚  â””â”€ UserDirectory.jsx
â”‚  â”‚  â”‚  â”œâ”€ owner
â”‚  â”‚  â”‚  â”‚  â”œâ”€ ClinicalMedicineRecords.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ DraftRegistration.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ MyPets.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ OwnerDashboard.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ OwnerLogin.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ OwnerRegister.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ PetRegistration.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ QrRecords.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ RecordRequest.jsx
â”‚  â”‚  â”‚  â”‚  â””â”€ VaccinationHistory.jsx
â”‚  â”‚  â”‚  â”œâ”€ shared
â”‚  â”‚  â”‚  â”‚  â”œâ”€ Homepage.jsx
â”‚  â”‚  â”‚  â”‚  â””â”€ PublicPetProfile.jsx
â”‚  â”‚  â”‚  â””â”€ staff
â”‚  â”‚  â”‚     â”œâ”€ ClinicalRecords.jsx
â”‚  â”‚  â”‚     â”œâ”€ IssueRequestedRecord.jsx
â”‚  â”‚  â”‚     â”œâ”€ MedicineRecords.jsx
â”‚  â”‚  â”‚     â”œâ”€ PetRecords.jsx
â”‚  â”‚  â”‚     â”œâ”€ StaffDashboard.jsx
â”‚  â”‚  â”‚     â”œâ”€ StaffLogin.jsx
â”‚  â”‚  â”‚     â”œâ”€ VaccinationMonitoring.jsx
â”‚  â”‚  â”‚     â””â”€ VerifyRegistration.jsx
â”‚  â”‚  â””â”€ services
â”‚  â”‚     â””â”€ api.js
â”‚  â””â”€ vite.config.js
â”œâ”€ package-lock.json
â”œâ”€ package.json
â””â”€ README.md

```
```
pet-vet-system revise
â”œâ”€ backend
â”‚  â”œâ”€ .env
â”‚  â”œâ”€ .env.example
â”‚  â”œâ”€ add-breed-custom.sql
â”‚  â”œâ”€ database
â”‚  â”‚  â””â”€ migrations
â”‚  â”‚     â””â”€ 001_registration_automation.sql
â”‚  â”œâ”€ package-lock.json
â”‚  â”œâ”€ package.json
â”‚  â”œâ”€ schema.sql
â”‚  â”œâ”€ server.js
â”‚  â”œâ”€ src
â”‚  â”‚  â”œâ”€ config
â”‚  â”‚  â”‚  â””â”€ db.js
â”‚  â”‚  â”œâ”€ controllers
â”‚  â”‚  â”‚  â”œâ”€ analyticsController.js
â”‚  â”‚  â”‚  â”œâ”€ announcementController.js
â”‚  â”‚  â”‚  â”œâ”€ authController.js
â”‚  â”‚  â”‚  â”œâ”€ clinicalController.js
â”‚  â”‚  â”‚  â”œâ”€ dashboardController.js
â”‚  â”‚  â”‚  â”œâ”€ draftController.js
â”‚  â”‚  â”‚  â”œâ”€ medicineController.js
â”‚  â”‚  â”‚  â”œâ”€ notificationController.js
â”‚  â”‚  â”‚  â”œâ”€ paymentController.js
â”‚  â”‚  â”‚  â”œâ”€ petController.js
â”‚  â”‚  â”‚  â”œâ”€ qrController.js
â”‚  â”‚  â”‚  â”œâ”€ recordRequestController.js
â”‚  â”‚  â”‚  â”œâ”€ userController.js
â”‚  â”‚  â”‚  â””â”€ vaccinationController.js
â”‚  â”‚  â”œâ”€ middleware
â”‚  â”‚  â”‚  â”œâ”€ authMiddleware.js
â”‚  â”‚  â”‚  â”œâ”€ roleMiddleware.js
â”‚  â”‚  â”‚  â””â”€ uploadPetPhoto.js
â”‚  â”‚  â”œâ”€ models
â”‚  â”‚  â”œâ”€ routes
â”‚  â”‚  â”‚  â”œâ”€ analyticsRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ announcementRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ authRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ clinicalRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ dashboardRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ draftRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ medicineRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ notificationRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ paymentRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ petRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ qrRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ recordRequestRoutes.js
â”‚  â”‚  â”‚  â”œâ”€ userRoutes.js
â”‚  â”‚  â”‚  â””â”€ vaccinationRoutes.js
â”‚  â”‚  â”œâ”€ services
â”‚  â”‚  â”‚  â”œâ”€ announcementService.js
â”‚  â”‚  â”‚  â”œâ”€ notificationScheduler.js
â”‚  â”‚  â”‚  â””â”€ notificationService.js
â”‚  â”‚  â””â”€ utils
â”‚  â”‚     â”œâ”€ qrGenerator.js
â”‚  â”‚     â””â”€ seedAdmin.js
â”‚  â””â”€ uploads
â”‚     â””â”€ qrcodes
â”‚        â”œâ”€ qr_PET-2026-000003.png
â”‚        â”œâ”€ qr_PET-2026-000004.png
â”‚        â””â”€ qr_PET-2026-000005.png
â”œâ”€ DEBUG_REPORT_PET_REGISTRATION.md
â”œâ”€ frontend
â”‚  â”œâ”€ .env
â”‚  â”œâ”€ dist
â”‚  â”‚  â”œâ”€ assets
â”‚  â”‚  â”‚  â”œâ”€ html2canvas.esm-DXEQVQnt.js
â”‚  â”‚  â”‚  â”œâ”€ index-BkDnIc9k.js
â”‚  â”‚  â”‚  â”œâ”€ index-BNpyQHRw.css
â”‚  â”‚  â”‚  â”œâ”€ index.es-CtNGsVZQ.js
â”‚  â”‚  â”‚  â””â”€ purify.es-VaSPOPhr.js
â”‚  â”‚  â””â”€ index.html
â”‚  â”œâ”€ index.html
â”‚  â”œâ”€ package-lock.json
â”‚  â”œâ”€ package.json
â”‚  â”œâ”€ public
â”‚  â”œâ”€ src
â”‚  â”‚  â”œâ”€ App.jsx
â”‚  â”‚  â”œâ”€ components
â”‚  â”‚  â”‚  â”œâ”€ analytics
â”‚  â”‚  â”‚  â”‚  â””â”€ SummaryCard.jsx
â”‚  â”‚  â”‚  â”œâ”€ announcements
â”‚  â”‚  â”‚  â”‚  â””â”€ AnnouncementWidget.jsx
â”‚  â”‚  â”‚  â”œâ”€ notifications
â”‚  â”‚  â”‚  â”‚  â””â”€ NotificationBell.jsx
â”‚  â”‚  â”‚  â”œâ”€ PetIDCard.jsx
â”‚  â”‚  â”‚  â”œâ”€ PetIDCardBack.jsx
â”‚  â”‚  â”‚  â”œâ”€ ProtectedRoute.jsx
â”‚  â”‚  â”‚  â”œâ”€ StatusBadge.jsx
â”‚  â”‚  â”‚  â””â”€ SummaryCard.jsx
â”‚  â”‚  â”œâ”€ context
â”‚  â”‚  â”‚  â””â”€ AuthContext.jsx
â”‚  â”‚  â”œâ”€ hooks
â”‚  â”‚  â”œâ”€ index.css
â”‚  â”‚  â”œâ”€ layouts
â”‚  â”‚  â”‚  â”œâ”€ AdminLayout.jsx
â”‚  â”‚  â”‚  â”œâ”€ OwnerLayout.jsx
â”‚  â”‚  â”‚  â””â”€ StaffLayout.jsx
â”‚  â”‚  â”œâ”€ main.jsx
â”‚  â”‚  â”œâ”€ pages
â”‚  â”‚  â”‚  â”œâ”€ admin
â”‚  â”‚  â”‚  â”‚  â”œâ”€ AdminAnnouncements.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ AdminLogin.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ AnalyticsReports.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ BarangayDashboard.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ RegistrationRecords.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ SystemOverview.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ Traceability.jsx
â”‚  â”‚  â”‚  â”‚  â””â”€ UserDirectory.jsx
â”‚  â”‚  â”‚  â”œâ”€ owner
â”‚  â”‚  â”‚  â”‚  â”œâ”€ Announcements.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ ClinicalMedicineRecords.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ DraftRegistration.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ MyPets.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ OwnerDashboard.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ OwnerLogin.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ OwnerRegister.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ PetRegistration.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ QrRecords.jsx
â”‚  â”‚  â”‚  â”‚  â”œâ”€ RecordRequest.jsx
â”‚  â”‚  â”‚  â”‚  â””â”€ VaccinationHistory.jsx
â”‚  â”‚  â”‚  â”œâ”€ shared
â”‚  â”‚  â”‚  â”‚  â”œâ”€ Homepage.jsx
â”‚  â”‚  â”‚  â”‚  â””â”€ PublicPetProfile.jsx
â”‚  â”‚  â”‚  â””â”€ staff
â”‚  â”‚  â”‚     â”œâ”€ Announcements.jsx
â”‚  â”‚  â”‚     â”œâ”€ ClinicalRecords.jsx
â”‚  â”‚  â”‚     â”œâ”€ IssueRequestedRecord.jsx
â”‚  â”‚  â”‚     â”œâ”€ MedicineRecords.jsx
â”‚  â”‚  â”‚     â”œâ”€ PetRecords.jsx
â”‚  â”‚  â”‚     â”œâ”€ StaffDashboard.jsx
â”‚  â”‚  â”‚     â”œâ”€ StaffLogin.jsx
â”‚  â”‚  â”‚     â”œâ”€ VaccinationMonitoring.jsx
â”‚  â”‚  â”‚     â””â”€ VerifyRegistration.jsx
â”‚  â”‚  â””â”€ services
â”‚  â”‚     â”œâ”€ announcementScheduler.js
â”‚  â”‚     â””â”€ api.js
â”‚  â””â”€ vite.config.js
â”œâ”€ package-lock.json
â”œâ”€ package.json
â””â”€ README.md

```