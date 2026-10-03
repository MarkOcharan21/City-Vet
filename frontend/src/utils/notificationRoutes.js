const PORTAL_PREFIX = {
  Owner: '/owner',
  Staff: '/staff',
  Veterinarian: '/veterinarian',
  Admin: '/admin',
};

const ROUTES_BY_ROLE = {
  Owner: {
    Announcement: 'dashboard',
    Vaccination: 'vaccinations',
    QR: 'qr-records',
    Record: 'record-requests',
    Registration: 'my-pets',
    LostPet: 'my-pets',
    ClinicQueue: 'dashboard',
    System: 'dashboard',
  },
  Staff: {
    Announcement: 'dashboard',
    Vaccination: 'pet-records',
    QR: 'pet-records',
    Record: 'issue-records',
    Registration: 'verify-registration',
    LostPet: 'pet-records',
    ClinicQueue: 'dashboard',
    System: 'dashboard',
  },
  Veterinarian: {
    Announcement: 'dashboard',
    Vaccination: 'vaccination-monitoring',
    QR: 'pet-records',
    Record: 'pet-records',
    Registration: 'pet-records',
    LostPet: 'pet-records',
    ClinicQueue: 'clinical-records',
    System: 'dashboard',
  },
  Admin: {
    Announcement: 'announcements',
    Vaccination: 'vaccination-monitoring',
    QR: 'registration-records',
    Record: 'registration-records',
    Registration: 'registration-records',
    LostPet: 'registration-records',
    ClinicQueue: 'registration-records',
    System: 'overview',
  },
};

export function getNotificationPath(role, notification) {
  if (!notification) return null;

  const prefix = PORTAL_PREFIX[role] || '/owner';
  const { type, link } = notification;

  if (link?.startsWith('announcement:') || type === 'Announcement') {
    if (role === 'Admin') {
      const announcementId = link?.startsWith('announcement:')
        ? link.split(':')[1]
        : null;
      return announcementId
        ? `/admin/announcements?highlight=${announcementId}`
        : '/admin/announcements';
    }
    // Owner/staff see announcement content in the notification itself.
    return null;
  }

  if (link === 'queue') {
    if (role === 'Admin') return '/admin/overview';
    if (role === 'Veterinarian') return '/veterinarian/clinical-records';
    // Staff no longer has a walk-in queue page — send them to the dashboard.
    if (role === 'Staff') return '/staff/dashboard';
    return `${prefix}/queue`;
  }

  if (link === 'payments') {
    if (role === 'Owner') return '/owner/payment-history';
    return `${prefix}/payment-monitoring`;
  }

  if (link) {
    return `${prefix}/${link}`;
  }

  const page = ROUTES_BY_ROLE[role]?.[type] || ROUTES_BY_ROLE.Owner[type] || 'dashboard';
  return `${prefix}/${page}`;
}
