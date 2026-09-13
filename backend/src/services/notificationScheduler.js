const cron = require("node-cron");
const db = require("../config/db");
const { createNotification } = require("./notificationService");
const { sendDueReminder } = require("./dueReminderService");

function startNotificationScheduler() {
  cron.schedule("0 8 * * *", async () => {
    console.log("Running notification scheduler...");

    try {
      await generateVaccinationDueReminders();
      await generateFollowUpDueReminders();
      await generatePaymentNotifications();

      console.log("Notification scheduler finished.");
    } catch (error) {
      console.error("Notification scheduler error:", error.message);
    }
  });
}

async function generateVaccinationDueReminders() {
  const [records] = await db.query(`
    SELECT
      vr.next_due_date,
      p.name AS pet_name,
      po.user_id
    FROM vaccination_records vr
    JOIN pets p ON vr.pet_id = p.id
    JOIN pet_owners po ON p.pet_owner_id = po.id
    WHERE vr.next_due_date IS NOT NULL
  `);

  for (const record of records) {
    await sendDueReminder({
      userId: record.user_id,
      petName: record.pet_name,
      dueDate: record.next_due_date,
      category: "Vaccination",
      type: "Vaccination",
      link: "vaccinations",
    });
  }
}

async function generateFollowUpDueReminders() {
  const [records] = await db.query(`
    SELECT
      cr.follow_up_date,
      p.name AS pet_name,
      po.user_id
    FROM consultation_records cr
    JOIN pets p ON cr.pet_id = p.id
    JOIN pet_owners po ON p.pet_owner_id = po.id
    WHERE cr.follow_up_date IS NOT NULL
  `);

  for (const record of records) {
    await sendDueReminder({
      userId: record.user_id,
      petName: record.pet_name,
      dueDate: record.follow_up_date,
      category: "Follow-Up Visit",
      type: "System",
      link: "clinical-medicine",
    });
  }
}

async function generatePaymentNotifications() {
  const [payments] = await db.query(`
    SELECT
      py.id,
      p.name AS pet_name,
      po.user_id
    FROM payments py
    JOIN pets p ON py.pet_id = p.id
    JOIN pet_owners po ON py.pet_owner_id = po.id
    WHERE py.payment_status = 'Pending'
  `);

  for (const payment of payments) {
    await createNotification(
      payment.user_id,
      "Pending Payment",
      `Payment for ${payment.pet_name} is still pending.`,
      "Payment",
      false,
      "payments"
    );
  }
}

module.exports = {
  startNotificationScheduler,
  generateVaccinationDueReminders,
  generateFollowUpDueReminders,
};
