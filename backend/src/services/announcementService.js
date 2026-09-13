const db = require("../config/db");
const { createNotification } = require("./notificationService");

// ======================================
// SEND ANNOUNCEMENT
// ======================================

async function sendAnnouncement(
    title,
    message,
    audience,
    createdBy
) {

    // Save announcement
    await db.query(
        `
        INSERT INTO announcements
        (
            title,
            message,
            audience,
            created_by
        )
        VALUES
        (
            ?,?,?,?
        )
        `,
        [
            title,
            message,
            audience,
            createdBy
        ]
    );

    // Find recipients
    let sql = `
        SELECT
            id
        FROM users
    `;

    const params = [];

    if (audience !== "All") {

        sql += " WHERE role = ?";

        params.push(audience);

    }

    const [users] = await db.query(sql, params);

    // Create notification for every user
    for (const user of users) {

        await createNotification(

            user.id,

            title,

            message,

            "Announcement"

        );

    }

    return true;

}

module.exports = {

    sendAnnouncement

};