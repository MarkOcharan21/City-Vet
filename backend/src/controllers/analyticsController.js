const db = require("../config/db");
const { vetNameExpr } = require("../utils/vetNameFormat");
const { dateFormat, mondayIndex } = require("../config/sql");
const { geocode, buildSearchAddress } = require("../utils/geocode");

const BARANGAY_LIST = [
  'Baclaran', 'Banaybanay', 'Banlic', 'Bigaa', 'Butong', 'Casile', 'Diezmo',
  'Gulod', 'Mamatid', 'Marinig', 'Niugan', 'Pittland', 'Pulo', 'Sala',
  'San Isidro', 'Barangay Uno (Pob.)', 'Barangay Dos (Pob.)', 'Barangay Tres (Pob.)'
];

// POST /api/analytics/geocode
// Lets registration/staff forms look up a pin for a Cabuyao address (or pre-fill
// it when the browser GPS is unavailable). Server-side so it is throttled and
// cached per the utility module instead of punching Nominatim from the browser.
async function geocodeAddress(req, res) {
    try {
        const { address, barangay, subdivision, block, lot } = req.body || {};
        const queryText = buildSearchAddress({ address, barangay, subdivision, block, lot });
        if (!queryText) {
            return res.json({ success: false, message: 'Provide an address or barangay to geocode.' });
        }
        const geo = await geocode(queryText);
        if (!geo) {
            return res.json({ success: false, message: 'Could not resolve that Cabuyao address.' });
        }
        res.json({ success: true, lat: geo.lat, lon: geo.lon, display_name: geo.display_name });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

function normalizeFilter(filter) {
    const valid = ["today", "week", "month", "year", "all"];
    return valid.includes(filter) ? filter : "all";
}

function dateWhere(column, filter) {
    // CURRENT_DATE, EXTRACT() and `date + integer` behave the same on MySQL and
    // PostgreSQL, so only the weekday helper needs a dialect switch.
    // mondayIndex() is 0 for Monday .. 6 for Sunday.
    const monday = mondayIndex();
    switch (normalizeFilter(filter)) {
        case "today":
            return `${column} >= CURRENT_DATE AND ${column} < CURRENT_DATE + 1`;
        // This Week â€” from Monday of the current week up to (but not including) next Monday.
        case "week":
            return `${column} >= CURRENT_DATE - ${monday} AND ${column} < CURRENT_DATE + (7 - ${monday})`;
        case "month":
            return `EXTRACT(YEAR FROM ${column}) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM ${column}) = EXTRACT(MONTH FROM CURRENT_DATE)`;
        case "year":
            return `EXTRACT(YEAR FROM ${column}) = EXTRACT(YEAR FROM CURRENT_DATE)`;
        default:
            return "1=1";
    }
}

function filterLabel(filter) {
    switch (normalizeFilter(filter)) {
        case "today":
            return "Today";
        case "week":
            return "This Week";
        case "month":
            return "This Month";
        case "year":
            return "This Year";
        default:
            return "All Time";
    }
}

function dateRangeCondition(column, from, to) {
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const parts = [];
    if (from && dateRe.test(from)) {
        parts.push(`${column} >= '${from}'`);
    }
    if (to && dateRe.test(to)) {
        parts.push(`${column} <= '${to} 23:59:59'`);
    }
    return parts.length ? parts.join(" AND ") : "1=1";
}

function rangeLabel(from, to) {
    if (!from && !to) return null;
    const fmt = (d) => {
        const date = new Date(`${d}T00:00:00`);
        if (Number.isNaN(date.getTime())) return d;
        return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    };
    if (from && to) return `${fmt(from)} to ${fmt(to)}`;
    if (from) return `From ${fmt(from)}`;
    return `Up to ${fmt(to)}`;
}

async function getDashboardAnalytics(req, res) {
    try {
        const filter = normalizeFilter(req.query.filter);
        const from = String(req.query.from || "").trim() || null;
        const to = String(req.query.to || "").trim() || null;
        const hasRange = !!(from || to);
        const condition = hasRange
            ? (col) => dateRangeCondition(col, from, to)
            : (col) => dateWhere(col, filter);
        const petDate = condition("p.created_at");
        const petDateSimple = condition("pets.created_at");
        const vaccDate = condition("date_administered");
        const paymentDate = condition("py.created_at");
        const paymentSummaryDate = condition("payments.created_at");
        const qrDate = condition("issue_date");
        const lostDate = condition("COALESCE(lost_date, created_at)");

        const [[totalPets]] = await db.query(`
            SELECT COUNT(*) AS total
            FROM pets
            WHERE ${petDateSimple}
            AND status = 'Verified'
        `);

        const [[vaccinatedPets]] = await db.query(`
            SELECT COUNT(DISTINCT pet_id) AS total
            FROM vaccination_records
            WHERE ${vaccDate}
        `);

        const [[lostPets]] = await db.query(`
            SELECT COUNT(*) AS total
            FROM pets
            WHERE is_lost = 1
            AND status = 'Verified'
            AND ${lostDate}
        `);

        const [[totalQr]] = await db.query(`
            SELECT COUNT(*) AS total
            FROM qr_codes
            WHERE ${qrDate}
        `);

        const [species] = await db.query(`
            SELECT
                s.species_name AS species,
                COUNT(*) AS total
            FROM pets p
            JOIN species s ON p.species_id = s.id
            WHERE ${petDate}
            AND p.status = 'Verified'
            GROUP BY s.species_name
            ORDER BY total DESC
        `);

        const [dogsData] = await db.query(`
            SELECT
                p.sex AS sex,
                COUNT(*) AS total
            FROM pets p
            JOIN species s ON p.species_id = s.id
            WHERE s.species_name = 'Dog'
            AND ${petDate}
            AND p.status = 'Verified'
            GROUP BY p.sex
            ORDER BY p.sex
        `);

        const [catsData] = await db.query(`
            SELECT
                p.sex AS sex,
                COUNT(*) AS total
            FROM pets p
            JOIN species s ON p.species_id = s.id
            WHERE s.species_name = 'Cat'
            AND ${petDate}
            AND p.status = 'Verified'
            GROUP BY p.sex
            ORDER BY p.sex
        `);

        const dogTotal = dogsData.reduce((sum, d) => sum + Number(d.total), 0);
        const catTotal = catsData.reduce((sum, c) => sum + Number(c.total), 0);

        const [petsBySex] = await db.query(`
            SELECT sex, COUNT(*) AS total
            FROM pets
            WHERE ${petDateSimple}
            AND status = 'Verified'
            GROUP BY sex
            ORDER BY sex
        `);

        const dogsBySex = dogsData.map((d) => ({ sex: d.sex, total: Number(d.total) }));
        const catsBySex = catsData.map((c) => ({ sex: c.sex, total: Number(c.total) }));

        const [payments] = await db.query(`
            SELECT
                payment_status,
                COUNT(*) AS total
            FROM payments
            WHERE ${paymentSummaryDate}
            GROUP BY payment_status
        `);

        const [vaccinations] = await db.query(`
            SELECT
                ${dateFormat("date_administered", "month")} AS month,
                COUNT(*) AS total
            FROM vaccination_records
            WHERE ${vaccDate}
            GROUP BY 1
            ORDER BY MIN(date_administered)
        `);

        const [qrStats] = await db.query(`
            SELECT
                status,
                COUNT(*) AS total
            FROM qr_codes
            WHERE ${qrDate}
            GROUP BY status
        `);

        const [barangays] = await db.query(`
            SELECT
                po.barangay,
                COUNT(p.id) AS total
            FROM pets p
            JOIN pet_owners po ON p.pet_owner_id = po.id
            WHERE po.barangay IS NOT NULL
            AND po.barangay != ''
            AND ${petDate}
            AND p.status = 'Verified'
            GROUP BY po.barangay
            ORDER BY total DESC
            LIMIT 10
        `);

        const [registrationStatus] = await db.query(`
            SELECT
                status,
                COUNT(*) AS total
            FROM pets
            WHERE ${petDateSimple}
            GROUP BY status
            ORDER BY total DESC
        `);

        const [registrations] = await db.query(`
            SELECT
                ${dateFormat("created_at", "month")} AS month,
                COUNT(*) AS total
            FROM pets
            WHERE ${petDateSimple}
            GROUP BY 1
            ORDER BY MIN(created_at)
        `);

        const [vaccinationStatus] = await db.query(`
            SELECT
                CASE
                    WHEN latest.next_due_date IS NULL THEN 'No Record'
                    WHEN latest.next_due_date < CURRENT_DATE THEN 'Overdue'
                    WHEN latest.next_due_date <= CURRENT_DATE + 30 THEN 'Due Soon'
                    ELSE 'Up to Date'
                END AS status,
                COUNT(*) AS total
            FROM pets p
            LEFT JOIN (
                SELECT vr1.pet_id, vr1.next_due_date
                FROM vaccination_records vr1
                JOIN (
                    SELECT best_pet_id AS pet_id, MAX(id) AS max_id
                    FROM vaccination_records vr2
                    JOIN (
                        SELECT pet_id AS best_pet_id, MAX(date_administered) AS latest_date
                        FROM vaccination_records
                        GROUP BY pet_id
                    ) latest_date ON latest_date.best_pet_id = vr2.pet_id
                        AND vr2.date_administered = latest_date.latest_date
                    GROUP BY best_pet_id
                ) latest_id ON latest_id.pet_id = vr1.pet_id AND latest_id.max_id = vr1.id
            ) latest ON p.id = latest.pet_id
            WHERE ${petDate}
            AND p.status = 'Verified'
            GROUP BY
                CASE
                    WHEN latest.next_due_date IS NULL THEN 'No Record'
                    WHEN latest.next_due_date < CURRENT_DATE THEN 'Overdue'
                    WHEN latest.next_due_date <= CURRENT_DATE + 30 THEN 'Due Soon'
                    ELSE 'Up to Date'
                END
            ORDER BY total DESC
        `);

        const [paymentRevenue] = await db.query(`
            SELECT
                ${dateFormat("created_at", "month")} AS month,
                COALESCE(SUM(amount), 0) AS total
            FROM payments
            WHERE payment_status = 'Paid'
            AND ${paymentSummaryDate}
            GROUP BY 1
            ORDER BY MIN(created_at)
        `);

        const [recentPets] = await db.query(`
            SELECT
                pet_code,
                name,
                created_at
            FROM pets
            WHERE ${petDateSimple}
            ORDER BY created_at DESC
            LIMIT 5
        `);

        const [recentVaccinations] = await db.query(`
            SELECT
                p.pet_code,
                p.name AS pet_name,
                v.vaccine_name,
                vr.date_administered
            FROM vaccination_records vr
            JOIN pets p ON vr.pet_id = p.id
            JOIN vaccines v ON vr.vaccine_id = v.id
            WHERE ${vaccDate}
            ORDER BY vr.date_administered DESC
            LIMIT 5
        `);

        const [recentPayments] = await db.query(`
            SELECT
                p.name AS pet_name,
                py.amount,
                py.payment_status,
                py.created_at
            FROM payments py
            JOIN pets p ON py.pet_id = p.id
            WHERE ${paymentDate}
            ORDER BY py.created_at DESC
            LIMIT 5
        `);

        const [recentQr] = await db.query(`
            SELECT
                p.pet_code,
                p.name,
                qc.issue_date
            FROM qr_codes qc
            JOIN pets p ON qc.pet_id = p.id
            WHERE ${qrDate}
            ORDER BY qc.issue_date DESC
            LIMIT 5
        `);

        const dogMale = dogsBySex.find((d) => d.sex === 'Male')?.total || 0;
        const dogFemale = dogsBySex.find((d) => d.sex === 'Female')?.total || 0;
        const catMale = catsBySex.find((c) => c.sex === 'Male')?.total || 0;
        const catFemale = catsBySex.find((c) => c.sex === 'Female')?.total || 0;

        res.json({
            success: true,
            filter,
            from,
            to,
            filterLabel: hasRange ? rangeLabel(from, to) : filterLabel(filter),
            summary: {
                totalPets: totalPets.total,
                vaccinatedPets: vaccinatedPets.total,
                lostPets: lostPets.total,
                totalQr: totalQr.total,
                dogsTotal: dogTotal,
                catsTotal: catTotal,
                dogMale: dogMale,
                dogFemale: dogFemale,
                catMale: catMale,
                catFemale: catFemale,
            },
            species,
            dogsBySex,
            catsBySex,
            petsBySex,
            payments,
            vaccinations,
            qrStats,
            barangays,
            registrationStatus,
            registrations,
            vaccinationStatus,
            paymentRevenue,
            recentPets,
            recentVaccinations,
            recentPayments,
            recentQr,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

async function getSummary(req, res) {
    try {
        const [[totalPets]] = await db.query(`
            SELECT COUNT(*) AS total
            FROM pets
        `);

        const [[verifiedPets]] = await db.query(`
            SELECT COUNT(*) AS total
            FROM pets
            WHERE status = 'Verified'
        `);

        const [[dueVaccinations]] = await db.query(`
            SELECT COUNT(DISTINCT p.id) AS total
            FROM pets p
            LEFT JOIN vaccination_records vr ON p.id = vr.pet_id
            WHERE vr.next_due_date IS NOT NULL
            AND vr.next_due_date <= CURRENT_DATE
        `);

        const [[pendingPayments]] = await db.query(`
            SELECT COUNT(*) AS total
            FROM payments
            WHERE payment_status = 'Pending'
        `);

        const [[paidPayments]] = await db.query(`
            SELECT COUNT(*) AS total
            FROM payments
            WHERE payment_status = 'Paid'
        `);

        res.json({
            success: true,
            summary: {
                total_pets: totalPets.total,
                verified_pets: verifiedPets.total,
                due_vaccinations: dueVaccinations.total,
                pending_payments: pendingPayments.total,
                paid_payments: paidPayments.total,
            },
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

async function getCharts(req, res) {
    try {
        const [petsBySex] = await db.query(`
            SELECT sex, COUNT(*) AS total
            FROM pets
            WHERE status = 'Verified'
            GROUP BY sex
            ORDER BY sex
        `);

        const [dogsData] = await db.query(`
            SELECT p.sex AS sex, COUNT(*) AS total
            FROM pets p
            JOIN species s ON p.species_id = s.id
            WHERE s.species_name = 'Dog'
            AND p.status = 'Verified'
            GROUP BY p.sex
            ORDER BY p.sex
        `);

        const [catsData] = await db.query(`
            SELECT p.sex AS sex, COUNT(*) AS total
            FROM pets p
            JOIN species s ON p.species_id = s.id
            WHERE s.species_name = 'Cat'
            AND p.status = 'Verified'
            GROUP BY p.sex
            ORDER BY p.sex
        `);

        const dogTotal = dogsData.reduce((sum, d) => sum + Number(d.total), 0);
        const catTotal = catsData.reduce((sum, c) => sum + Number(c.total), 0);

        res.json({
            success: true,
            petsBySex,
            dogsBySex: dogsData.map((d) => ({ sex: d.sex, total: Number(d.total) })),
            catsBySex: catsData.map((c) => ({ sex: c.sex, total: Number(c.total) })),
            dogsTotal: dogTotal,
            catsTotal: catTotal,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

async function getTraceability(req, res) {
    try {
        const { petId } = req.params;

        const [[pet]] = await db.query(`
            SELECT p.*, po.full_name as owner_name, po.contact_number, po.address, po.barangay,
                   po.subdivision, po.block, po.lot,
                   loc.latitude, loc.longitude, loc.accuracy_meters AS loc_accuracy, loc.source AS loc_source,
                   s.species_name, COALESCE(b.breed_name, p.breed_custom) AS breed_name
            FROM pets p
            JOIN pet_owners po ON p.pet_owner_id = po.id
            LEFT JOIN owner_locations loc ON loc.id = (
                SELECT l.id FROM owner_locations l
                WHERE l.pet_owner_id = po.id AND l.status = 'active'
                ORDER BY l.recorded_at DESC, l.id DESC
                LIMIT 1
            )
            LEFT JOIN species s ON p.species_id = s.id
            LEFT JOIN breeds b ON p.breed_id = b.id
            WHERE p.id = ?
        `, [petId]);

        if (!pet) {
            return res.status(404).json({
                success: false,
                message: "Pet not found",
            });
        }

        const [qr] = await db.query(`
            SELECT * FROM qr_codes WHERE pet_id = ?
        `, [petId]);

        const [vaccinations] = await db.query(`
            SELECT vr.*, v.vaccine_name
            FROM vaccination_records vr
            JOIN vaccines v ON vr.vaccine_id = v.id
            WHERE vr.pet_id = ?
            ORDER BY vr.date_administered DESC
        `, [petId]);

        const [consultations] = await db.query(`
            SELECT cr.*, ${vetNameExpr('vet_name')}
            FROM consultation_records cr
            LEFT JOIN users u ON cr.vet_id = u.id
            WHERE cr.pet_id = ?
            ORDER BY cr.consultation_date DESC
        `, [petId]);

        const [payments] = await db.query(`
            SELECT py.*, pt.type_name
            FROM payments py
            JOIN payment_types pt ON py.payment_type_id = pt.id
            WHERE py.pet_id = ?
            ORDER BY py.created_at DESC
        `, [petId]);

        res.json({
            success: true,
            pet: {
                id: pet.id,
                name: pet.name,
                pet_code: pet.pet_code,
                status: pet.status,
                registration_date: pet.registration_date,
                species_name: pet.species_name,
                breed_name: pet.breed_name,
                sex: pet.sex,
                color: pet.color,
                birthdate: pet.birthdate,
                photo: pet.photo,
                owner_name: pet.owner_name,
                contact_number: pet.contact_number,
                address: pet.address,
                barangay: pet.barangay,
                subdivision: pet.subdivision,
                block: pet.block,
                lot: pet.lot,
                lat: pet.latitude,
                lng: pet.longitude,
                loc_accuracy: pet.loc_accuracy,
                loc_source: pet.loc_source,
            },
            qr,
            vaccinations,
            consultations,
            payments,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

// GET /api/analytics/barangay-heatmap
// Aggregated pet counts + vaccination risk per barangay (Admin Traceability heatmap)
async function getBarangayHeatmap(req, res) {
    try {
        const [rows] = await db.query(`
            SELECT
                b.barangay_name,
                COALESCE(data.total_pets, 0) AS total_pets,
                COALESCE(data.vaccinated_pets, 0) AS vaccinated_pets,
                COALESCE(data.overdue_pets, 0) AS overdue_pets,
                COALESCE(data.unvaccinated_pets, 0) AS unvaccinated_pets,
                COALESCE(data.lost_pets, 0) AS lost_pets
            FROM (SELECT ? AS barangay_name UNION ALL SELECT ? UNION ALL SELECT ? UNION ALL SELECT ? UNION ALL SELECT ? UNION ALL SELECT ? UNION ALL SELECT ? UNION ALL SELECT ? UNION ALL SELECT ? UNION ALL SELECT ? UNION ALL SELECT ? UNION ALL SELECT ? UNION ALL SELECT ? UNION ALL SELECT ? UNION ALL SELECT ? UNION ALL SELECT ? UNION ALL SELECT ? UNION ALL SELECT ?) b
            LEFT JOIN (
                SELECT
                    po.barangay,
                    COUNT(p.id) AS total_pets,
                    COALESCE(SUM(
                        CASE
                            WHEN vax.pet_id IS NOT NULL
                            AND (vax.next_due_date IS NULL OR vax.next_due_date >= CURRENT_DATE)
                            THEN 1 ELSE 0
                        END
                    ), 0) AS vaccinated_pets,
                    COALESCE(SUM(
                        CASE
                            WHEN vax.next_due_date IS NOT NULL
                            AND vax.next_due_date < CURRENT_DATE
                            THEN 1 ELSE 0
                        END
                    ), 0) AS overdue_pets,
                    COALESCE(SUM(CASE WHEN vax.pet_id IS NULL THEN 1 ELSE 0 END), 0) AS unvaccinated_pets,
                    COALESCE(SUM(CASE WHEN p.is_lost = 1 THEN 1 ELSE 0 END), 0) AS lost_pets
                FROM pet_owners po
                JOIN pets p ON p.pet_owner_id = po.id
                LEFT JOIN (
                    SELECT vr1.pet_id, vr1.next_due_date
                    FROM vaccination_records vr1
                    INNER JOIN (
                        SELECT pet_id, MAX(date_administered) AS latest_date
                        FROM vaccination_records
                        GROUP BY pet_id
                    ) vr2 ON vr1.pet_id = vr2.pet_id
                        AND vr1.date_administered = vr2.latest_date
                ) vax ON vax.pet_id = p.id
                WHERE po.barangay IS NOT NULL AND po.barangay != ''
                GROUP BY po.barangay
            ) data ON data.barangay = b.barangay_name
            ORDER BY b.barangay_name
        `, BARANGAY_LIST);

        const summary = rows.map((row) => {
            const total = Number(row.total_pets) || 0;
            const protectedCount = Number(row.vaccinated_pets) || 0;
            const overdueCount = Number(row.overdue_pets) || 0;
            const unvaccinatedCount = Number(row.unvaccinated_pets) || 0;
            const coverage = total > 0 ? Math.round((protectedCount / total) * 100) : 0;

            let riskScore = 0;
            let risk = 'Low';
            if (total > 0) {
                const nonCoverage = (100 - coverage) / 100;
                riskScore = Math.round((nonCoverage * 60 + (overdueCount / total) * 40) * 10) / 10;
                if (riskScore >= 45) {
                    risk = 'High';
                } else if (riskScore >= 38) {
                    risk = 'Medium';
                }
            }

            return {
                barangay: row.barangay_name,
                total_pets: total,
                vaccinated_pets: protectedCount,
                overdue_pets: overdueCount,
                unvaccinated_pets: unvaccinatedCount,
                lost_pets: Number(row.lost_pets) || 0,
                coverage_pct: coverage,
                risk_score: riskScore,
                risk_level: risk,
            };
        });

        res.json({ success: true, summary });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

module.exports = {
    getDashboardAnalytics,
    getSummary,
    getCharts,
    getTraceability,
    getBarangayHeatmap,
};
