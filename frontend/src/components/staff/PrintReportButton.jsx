import { useState } from 'react';
import { Printer } from 'lucide-react';
import StaffReportModal from './StaffReportModal';

export default function PrintReportButton({ category = null, label = 'Print Report', className = 'btn-primary' }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`${className} staff-print-btn`}
        onClick={() => setOpen(true)}
        title="Print reports for this module"
      >
        <Printer size={16} /> {label}
      </button>
      <StaffReportModal open={open} onClose={() => setOpen(false)} category={category} />
    </>
  );
}