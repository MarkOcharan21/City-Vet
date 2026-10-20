# City Vet — System Demo Script (Live, 80 min)

## Goal
Produce `City Vet - System Demo Script.txt` sa project root — isang per-member live demo script (Taglish) na sumusunod sa isang alaga ("LUNA") sa buong sistema, para sa 4 na miyembro.

## Confirmed details (from user)
- Style: **Live demo** (may backup screenshots).
- Time: **1 hr 20 min** = 80 min.
- Output: **txt demo script file** (approved).

## Who presents what (roles = app's real roles)

| Member | Role | Time | Segments |
|---|---|---|---|
| A | Pet Owner + Staff verify | 15 min | Owner register (GPS + Village/Block/Lot) → Pet register (validation) → QR code → Digital Pet Booklet → offline draft → staff VerifyRegistration |
| B | Staff (front desk) | 15 min | Staff dashboard → Check-in via QR scan/search → Vaccination monitoring (next due) → preview of payment monitoring → record requests/announcements 1-liners |
| C | Veterinarian | 15 min | Vet dashboard → 4-step consultation wizard (pet → exam → treatment plan → review) → auto dosage prescription → clinical record → booklet update → notification |
| D | Admin | 15 min | Payment monitoring (OR) → Traceability map (GPS/geocoded pins) → Analytics/Barangay reports → audit trail/user mgmt/announcements 1-liners → closing summary |

Fixed 5-min opener (setup + "follow Luna" framing) + 15-min buffer/Q&A = 80 min.

## File structure (City Vet - System Demo Script.txt)
1. Header + time budget table
2. Setup checklist pre-defense (4 accounts, seeded pet "LUNA", tabs per role, phone QR test, backup screenshots, hotspot)
3. Opener script (5 min)
4. Member A section: narration / click-steps / value line / handoff line
5. Member B section: (same structure)
6. Member C section: (same structure)
7. Member D section: (same structure, includes closing summary)
8. Panel Q&A cheat sheet (17/17, 8/8, N=55 50+5, 4.25 end user, 4.95 expert, 5.00 usability, 4.04 vaccination; offline draft; GPS→geocode→barangay fallback)
9. Emergency backup plan (internet loss / feature failure)
10. Rehearsal tips (2 dry runs, click-script, single speaker, QR scan practice)

## Module accuracy notes (verified in codebase)
- Consultation = 4-step wizard (ConsultationLog/ClinicalRecords.jsx stepper: pet → assessment → plan → review).
- Owner registration has GPS + Village/Subdivision + Block/Lot fields; map pins use stored GPS/geocoded coords (Traceability.jsx).
- Payment via Treasury OR; offline draft is device-local (DraftRegistration).
- Pages: OwnerRegister, PetRegistration, QrRecords, DigitalPetBooklet, DraftRegistration, StaffVerifyRegistration, StaffCheckIn, VaccinationMonitoring, ConsultationLog, ClinicalRecords, PaymentMonitoring, Traceability, AnalyticsReports, BarangayDashboard, ActivityAuditTrail, UserDirectory, Announcements, NotificationCenter, MobileScan.

## Execution step
After plan approval (exit plan mode): write `City Vet - System Demo Script.txt` to project root with the full content above.