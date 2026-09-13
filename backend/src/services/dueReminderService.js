const { createNotification } = require('./notificationService');

const REMINDER_DAYS = [7, 3, 1, 0];

function getDaysUntil(dueDateValue) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDateValue);
  due.setHours(0, 0, 0, 0);

  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function buildDueReminderCopy(category, petName, daysLeft) {
  const label = category.toLowerCase();

  if (daysLeft < 0) {
    return {
      title: `${category} Overdue`,
      message: `${petName}'s ${label} is overdue. Please visit the clinic as soon as possible.`,
    };
  }

  if (daysLeft === 0) {
    return {
      title: `${category} Due Today`,
      message: `${petName}'s ${label} is due today. Please schedule a visit to the clinic.`,
    };
  }

  if (daysLeft === 1) {
    return {
      title: `${category} Due Tomorrow`,
      message: `${petName}'s ${label} is due tomorrow. Please prepare for your clinic visit.`,
    };
  }

  return {
    title: `${category} Almost Due`,
    message: `${petName}'s ${label} is due in ${daysLeft} day(s).`,
  };
}

function shouldSendDueReminder(daysLeft) {
  if (daysLeft < 0) return true;
  return REMINDER_DAYS.includes(daysLeft);
}

async function sendDueReminder({
  userId,
  petName,
  dueDate,
  category,
  type,
  link,
}) {
  const daysLeft = getDaysUntil(dueDate);

  if (!shouldSendDueReminder(daysLeft)) {
    return null;
  }

  const { title, message } = buildDueReminderCopy(category, petName, daysLeft);

  return createNotification(userId, title, message, type, false, link);
}

module.exports = {
  REMINDER_DAYS,
  getDaysUntil,
  buildDueReminderCopy,
  shouldSendDueReminder,
  sendDueReminder,
};
