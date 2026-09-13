export function getPetCardStatuses(pet) {
  return [
    getQrStatusItem(pet),
    getVaccinationStatusItem(pet),
    getRegistrationStatusItem(pet),
  ];
}

function getQrStatusItem(pet) {
  const status = pet.qr_status || 'Pending';

  if (status === 'Generated') {
    return {
      category: 'QR Code',
      status: 'Generated',
      description: 'Your pet QR ID is ready to view and print.',
    };
  }

  if (pet.status === 'Verified') {
    return {
      category: 'QR Code',
      status: 'Pending',
      description: 'QR code generation is in progress.',
    };
  }

  return {
    category: 'QR Code',
    status: 'Pending',
    description: 'QR code will be available after registration is verified.',
  };
}

function getVaccinationStatusItem(pet) {
  const total = Number(pet.vaccination_count || 0);
  const overdue = Number(pet.overdue_vaccinations || 0);
  const dueSoon = Number(pet.due_soon_vaccinations || 0);

  if (total === 0) {
    return {
      category: 'Vaccination',
      status: 'Pending',
      description: 'No vaccination records yet.',
    };
  }

  if (overdue > 0) {
    return {
      category: 'Vaccination',
      status: 'Overdue',
      description: `${overdue} vaccination record(s) are overdue.`,
    };
  }

  if (dueSoon > 0) {
    return {
      category: 'Vaccination',
      status: 'Due Soon',
      description: 'A vaccination is coming up within the next 7 days.',
    };
  }

  return {
    category: 'Vaccination',
    status: 'Updated',
    description: 'All vaccination records are up to date.',
  };
}

function getRegistrationStatusItem(pet) {
  if (pet.status === 'Verified') {
    return {
      category: 'Registration',
      status: 'Verified',
      description: 'Clinic staff has verified this pet registration.',
    };
  }

  return {
    category: 'Registration',
    status: 'Registered',
    description: 'Registration submitted and awaiting clinic verification.',
  };
}
