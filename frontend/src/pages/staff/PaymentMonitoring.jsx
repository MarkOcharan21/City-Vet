import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ScanLine,
  Search,
  Trash2,
  Eye,
  User,
  Pill,
  Stethoscope,
  Syringe,
  Receipt,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
  Printer,
  PawPrint,
  ChevronRight,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { detectPaymentType } from '../../utils/ocrUtils';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import QRCode from 'qrcode';
import PrintReportButton from '../../components/staff/PrintReportButton';

const PAYMENT_TYPES = ['Consultation', 'Vaccination', 'Medicine'];

const TYPE_ICON = {
  Consultation: Stethoscope,
  Vaccination: Syringe,
  Medicine: Pill,
};

function formatMoney(value) {
  const num = Number(value) || 0;
  return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Decide whether a catalog item should append a new row or fill the empty one.
function findOpenItemRow(items) {
  const emptyRow = (items || []).findIndex(
    (item) => !item.description.trim() && !String(item.amount || '').trim() && !(item.name || '').trim()
  );
  if (emptyRow >= 0) return emptyRow;
  // If row 0 only holds a payor name, it is still "open" for a description/amount.
  if ((items || []).length === 1 && !(items[0] || {}).description && !String((items[0] || {}).amount || '').trim()) return 0;
  return -1;
}

function formatDisplayDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatShortDate(value) {
  if (!value) return '—';
  const [y, m, d] = String(value).split('-');
  if (y && m && d) return `${d}/${m}/${y.slice(-2)}`;
  return value;
}

function formatTime(value) {
  if (!value) return '—';
  const hhmm = String(value).slice(0, 5);
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function useDebounced(callback, delay, deps) {
  useEffect(() => {
    const timer = setTimeout(() => callback(), delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function emptyOrForm() {
  return {
    or_number: '',
    or_date: todayIso(),
    or_time: nowTime(),
  };
}

function newEmptyItems() {
  return [{ name: '', description: '', amount: '', needs_review: false }];
}

function derivePaymentType(items) {
  const cats = (items || []).map((i) => i.category).filter(Boolean);
  if (cats.some((c) => /vaccin/i.test(c))) return 'Vaccination';
  if (cats.some((c) => /consultat/i.test(c))) return 'Consultation';
  if (cats.length) return 'Medicine';
  const text = (items || [])
    .map((i) => i.description)
    .filter(Boolean)
    .join(' ');
  return detectPaymentType(text) || 'Consultation';
}

function parseDetailItems(record) {
  if (!record || !record.payment_items) return null;
  try {
    const parsed = JSON.parse(record.payment_items);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

// Get service count for display in table
function getServiceCount(record) {
  const items = parseDetailItems(record);
  if (items && items.length > 0) {
    return items.length === 1 ? '1 Service' : `${items.length} Services`;
  }
  return record.payment_type || '—';
}

export default function PaymentMonitoring() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ overall: { total_payments: 0, total_amount: 0 }, byType: [] });
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Scan modal state ── */
  const [orForm, setOrForm] = useState(emptyOrForm());
  const [duplicate, setDuplicate] = useState({ checking: false, checked: false, isDuplicate: false });
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownerMatches, setOwnerMatches] = useState([]);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);
  const [items, setItems] = useState(newEmptyItems());
  const [totalOverride, setTotalOverride] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [qrScanOpen, setQrScanOpen] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);
  const [qrOwnerMatch, setQrOwnerMatch] = useState(null);
  const [qrReceiptMatch, setQrReceiptMatch] = useState(null);
  const [qrError, setQrError] = useState('');
  const [qrSessionKey, setQrSessionKey] = useState(null);
  const [qrSessionQr, setQrSessionQr] = useState('');
  const [qrSessionUrl, setQrSessionUrl] = useState('');
  const [qrWaiting, setQrWaiting] = useState(false);
  const qrPollRef = useRef(null);
  const [receiptRecord, setReceiptRecord] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [nextOrNumber, setNextOrNumber] = useState(null);

  /* ── Quick-pick product catalog ── */
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState('');

  const byTypeMap = useMemo(() => {
    const map = {};
    (summary.byType || []).forEach((row) => {
      map[row.payment_type] = { count: row.total_count, amount: row.type_amount };
    });
    return map;
  }, [summary]);

  const itemSum = useMemo(
    () => (items || []).reduce((sum, item) => sum + (Number.parseFloat(item.amount) || 0), 0),
    [items],
  );
  const totalText = totalOverride !== null ? totalOverride : itemSum ? itemSum.toFixed(2) : '';
  const effectiveTotal = Number.parseFloat(totalText) || 0;
  const derivedType = useMemo(() => derivePaymentType(items), [items]);

  function loadRecords(params = {}) {
    const query = { ...params };
    if (query.type === 'All') delete query.type;
    return api.get('/payment-monitoring', { params: query }).then((res) => setRecords(res.data.records || []));
  }

  function loadSummary() {
    return api.get('/payment-monitoring/summary').then((res) => {
      setSummary({
        overall: res.data.overall || { total_payments: 0, total_amount: 0 },
        byType: res.data.byType || [],
      });
    });
  }

  useEffect(() => {
    Promise.all([loadRecords(), loadSummary()])
      .catch(() => toast.error('Could not load payment monitoring data.'))
      .finally(() => setLoading(false));
  }, []);

  /* ── Live filtering from toolbar ── */
  useEffect(() => {
    const params = {
      search: searchTerm || undefined,
      type: typeFilter,
      from: fromDate || undefined,
      to: toDate || undefined,
    };
    loadRecords(params).catch(() => {});
  }, [searchTerm, typeFilter, fromDate, toDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredClientRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let rows = records;
    if (term) {
      rows = rows.filter((r) =>
        [r.or_number, r.owner_name, r.recorded_by_name, r.or_description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term),
      );
    }
    if (typeFilter !== 'All') rows = rows.filter((r) => r.payment_type === typeFilter);
    if (fromDate) rows = rows.filter((r) => !r.or_date || String(r.or_date) >= fromDate);
    if (toDate) rows = rows.filter((r) => !r.or_date || String(r.or_date) <= toDate);
    return rows;
  }, [records, searchTerm, typeFilter, fromDate, toDate]);

  function resetFilters() {
    setSearchTerm('');
    setTypeFilter('All');
    setFromDate('');
    setToDate('');
  }

  /* ── Open / close scan modal ── */
  function openScanModal() {
    resetScanState();
    loadCatalog();
    prefillNextOr();
    setModalOpen(true);
  }

  function resetScanState() {
    setOrForm(emptyOrForm());
    setDuplicate({ checking: false, checked: false, isDuplicate: false });
    setOwnerSearch('');
    setOwnerMatches([]);
    setOwnerSearching(false);
    setSelectedOwner(null);
    setSelectedPet(null);
    setItems(newEmptyItems());
    setTotalOverride(null);
    setFieldErrors({});
    setQrScanOpen(false);
    setQrScanning(false);
    setQrOwnerMatch(null);
    setQrReceiptMatch(null);
    setQrError('');
    stopQrSession();
  }

  function closeScanModal() {
    if (saving) return;
    stopQrSession();
    setQrScanOpen(false);
    setQrScanning(false);
    setQrOwnerMatch(null);
    setQrReceiptMatch(null);
    setQrError('');
    setModalOpen(false);
  }

  /* ── Quick-pick product catalog (loaded once for the modal) ── */
  function loadCatalog() {
    setCatalogLoading(true);
    setCatalogError('');
    api
      .get('/catalog')
      .then((res) => {
        setCatalog(res.data.categories || []);
        return res.data.categories || [];
      })
      .catch(() => setCatalogError('Could not load the product catalog.'))
      .finally(() => setCatalogLoading(false));
  }

  // Prefill the OR number with the next expected number (last numeric + 1) so a
  // counter queue can just type/verify it, and default date/time to right now.
  function prefillNextOr() {
    api
      .get('/payment-monitoring/last-or-number')
      .then((res) => {
        const last = res.data.last_or_number;
        if (last != null && Number.isFinite(Number(last))) {
          setOrForm((prev) => ({ ...prev, or_number: String(Number(last) + 1) }));
          setNextOrNumber(Number(last) + 1);
        } else {
          setNextOrNumber(null);
        }
      })
      .catch(() => setNextOrNumber(null));
  }

  // Clicking a catalog product adds a filled row to the payment items.
  function addCatalogItem(product, category) {
    setFieldErrors((prev) => ({ ...prev, or_amount: undefined, items: undefined }));
    const species = product.species && product.species !== 'General' ? ` · ${product.species}` : '';
    const unit = product.unit ? ` (${product.unit})` : '';
    const description = `${product.name}${species}${unit}`;
    setItems((prev) => {
      const next = [...prev];
      const openRow = findOpenItemRow(next);
      const row = {
        name: '',
        description,
        amount: product.price != null ? String(product.price) : '',
        needs_review: false,
        catalog_id: product.id || null,
        category,
      };
      if (openRow >= 0) {
        next[openRow] = { ...next[openRow], ...row, name: next[openRow].name || '' };
      } else {
        next.push(row);
      }
      return next;
    });
    setTotalOverride(null);
  }

  /* ── Duplicate OR check ── */
  useDebounced(
    () => {
      const number = orForm.or_number.trim();
      if (number.length < 3) {
        setDuplicate({ checking: false, checked: false, isDuplicate: false });
        return;
      }
      setDuplicate((prev) => ({ ...prev, checking: true, checked: false }));
      api
        .get(`/payment-monitoring/check-or/${encodeURIComponent(number)}`)
        .then((res) => {
          setDuplicate({ checking: false, checked: true, isDuplicate: !!res.data.isDuplicate });
        })
        .catch(() => {
          setDuplicate({ checking: false, checked: false, isDuplicate: false });
        });
    },
    500,
    [orForm.or_number],
  );

  /* ── Owner search ── */
  useDebounced(
    () => {
      const term = ownerSearch.trim();
      if (term.length < 2) {
        setOwnerMatches([]);
        setOwnerSearching(false);
        return;
      }
      setOwnerSearching(true);
      api
        .get('/payment-monitoring/owners', { params: { q: term } })
        .then((res) => {
          setOwnerMatches(res.data.owners || []);
          setOwnerSearching(false);
        })
        .catch(() => {
          setOwnerMatches([]);
          setOwnerSearching(false);
        });
    },
    400,
    [ownerSearch],
  );

  function handleOrFieldChange(name, value) {
    setOrForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function updateItem(index, field, value) {
    setFieldErrors((prev) => ({ ...prev, or_amount: undefined, items: undefined }));
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value, needs_review: false } : item)));
    if (field === 'amount') setTotalOverride(null);
  }

  function addItem() {
    const last = items[items.length - 1];
    if (last && !last.description.trim() && !String(last.amount).trim() && !(last.name || '').trim()) return;
    setItems((prev) => [...prev, { name: '', description: '', amount: '', needs_review: false }]);
    setTotalOverride(null);
  }

  function removeItem(index) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
    setTotalOverride(null);
  }

  function pickOwner(owner, pet) {
    setSelectedOwner(owner);
    if (pet) setSelectedPet(pet);
    else if (!pet && owner.pets && owner.pets.length === 1) setSelectedPet(owner.pets[0]);
    setOwnerSearch(owner.full_name);
    setFieldErrors((prev) => ({ ...prev, owner: undefined }));
    setItems((prev) => prev.map((item, i) => (i === 0 ? { ...item, name: owner.full_name } : item)));
  }

  /* ── Phone QR scan session ──
     The counter shows a QR on the PC screen. The staff scans it with a phone,
     which opens the system scanner page; the phone then reads the pet's /
     receipt's QR and the decoded text lands back here automatically. */
  function stopQrSession() {
    if (qrPollRef.current) {
      clearInterval(qrPollRef.current);
      qrPollRef.current = null;
    }
    setQrWaiting(false);
    setQrSessionKey(null);
    setQrSessionQr('');
    setQrSessionUrl('');
  }

  async function startQrSession() {
    stopQrSession();
    setQrError('');
    const key =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setQrSessionKey(key);
    setQrWaiting(true);
    try {
      await api.post('/payment-monitoring/scan-board', { key });
    } catch (_) {
      setQrError('Could not open the phone scan session. Please try again.');
    }

    let base = '';
    try {
      const h = await api.get('/health');
      const lanIp = h.data && h.data.lanIp ? h.data.lanIp : '';
      const port = h.data && h.data.port ? h.data.port : '5000';
      base = lanIp ? `http://${lanIp}:${port}` : '';
      if (!base) base = `${window.location.protocol}//${window.location.hostname}:${port}`;
    } catch (_) {
      base = `${window.location.protocol}//${window.location.hostname}:5000`;
    }
    const url = `${base}/phone-scan?k=${encodeURIComponent(key)}`;
    setQrSessionUrl(url);
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 320,
        margin: 1,
        color: { dark: '#241416', light: '#ffffff' },
      });
      setQrSessionQr(dataUrl);
    } catch (_) {
      setQrError('Could not build the phone scan QR. Please try again.');
    }
  }

async function handleQrText(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) {
      setQrError('No QR content was detected.');
      return;
    }

    // 1) Payment receipt QR (generated by this system). Carries its own route
    //    so it never collides with a pet QR — details always match 1:1.
    const pmMatch = trimmed.match(/\/pm-receipt\/([A-Za-z0-9-]+)/i);
    const pmToken = pmMatch ? pmMatch[1] : /^PM-[A-Z0-9-]+$/i.test(trimmed) ? trimmed : null;
    if (pmToken) {
      setQrScanning(true);
      setQrError('');
      try {
        const res = await api.get(`/payment-monitoring/receipt/${encodeURIComponent(pmToken)}`);
        const receipt = res.data.receipt;
        if (!receipt) throw new Error('empty receipt response');
        setQrReceiptMatch(receipt);
        stopQrSession();
        toast.success(`Exact receipt match: OR ${receipt.or_number} — review then fill.`);
      } catch (err) {
        setQrError(
          err.response?.status === 404
            ? 'Receipt not recognized. This QR does not belong to a recorded payment.'
            : 'Could not look up this receipt QR. Please try again.'
        );
      } finally {
        setQrScanning(false);
      }
      return;
    }

    // 2) Pet QR — resolves to the matched pet + its owner for the counter.
    const urlMatch = trimmed.match(/\/qr\/([A-Za-z0-9-]+)/i);
    const token = urlMatch ? urlMatch[1] : /^[A-Za-z0-9-]+$/i.test(trimmed) ? trimmed : null;
    if (!token) {
      setQrError('That QR code is not a pet QR or system receipt from this app.');
      return;
    }
    setQrScanning(true);
    setQrError('');
    try {
      const res = await api.get(`/qr/owner/${encodeURIComponent(token)}`);
      const owner = res.data.owner;
      if (!owner) throw new Error('empty owner response');
      setQrOwnerMatch(owner);
      stopQrSession();
      toast.success(`Pet matched: ${owner.pet_name}. Verify the owner, then confirm.`);
    } catch (err) {
      setQrError(
        err.response?.status === 404
          ? 'QR not recognized. This code is not registered in the system.'
          : 'Could not look up this QR code. Please try again or search by name.'
      );
    } finally {
      setQrScanning(false);
    }
  }

  function confirmQrReceipt() {
    if (!qrReceiptMatch) return;
    const receipt = qrReceiptMatch;
    const srcItems = Array.isArray(receipt.items) && receipt.items.length
      ? receipt.items
      : [];
    const restored = srcItems.length
      ? srcItems.map((item) => ({
          name: item.name || '',
          description: item.description || '',
          amount: item.amount != null ? String(item.amount) : '',
        }))
      : newEmptyItems();
    setItems(restored);
    setTotalOverride(receipt.or_amount != null ? String(receipt.or_amount) : null);
    setOrForm({
      or_number: receipt.or_number || '',
      or_date: receipt.or_date
          ? (() => {
              const d = new Date(receipt.or_date);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            })()
          : '',
      or_time: receipt.or_time ? String(receipt.or_time).slice(0, 5) : '',
    });
    setSelectedOwner({
      owner_id: receipt.pet_owner_id,
      full_name: receipt.owner_name || '',
      contact_number: receipt.contact_number || '—',
      address: receipt.address || '',
      barangay: receipt.barangay || '',
      pet_count: receipt.pet_count ?? 0,
    });
    if (receipt.pet_id) {
      setSelectedPet({
        pet_id: receipt.pet_id,
        pet_name: receipt.pet_name || '',
        pet_code: receipt.pet_code || '',
        pet_sex: receipt.pet_sex || '',
        pet_photo: receipt.pet_photo || '',
        pet_species: receipt.pet_species || '',
        pet_breed: receipt.pet_breed || '',
      });
    } else {
      setSelectedPet(null);
    }
    setOwnerSearch(receipt.owner_name || '');
    setQrReceiptMatch(null);
    setQrScanOpen(false);
    setQrError('');
    stopQrSession();
    toast.success(`OR ${receipt.or_number} filled exactly from the receipt QR. Review, then save.`);
  }

  function toggleQrScan() {
    setQrError('');
    setQrOwnerMatch(null);
    setQrReceiptMatch(null);
    if (qrScanOpen) {
      stopQrSession();
      setQrScanOpen(false);
      return;
    }
    setQrScanOpen(true);
    startQrSession();
  }

  function confirmQrOwner() {
    if (!qrOwnerMatch) return;
    const pet = {
      pet_id: qrOwnerMatch.pet_id,
      pet_name: qrOwnerMatch.pet_name || '',
      pet_code: qrOwnerMatch.pet_code || '',
      pet_sex: qrOwnerMatch.pet_sex || '',
      pet_photo: qrOwnerMatch.pet_photo || '',
      pet_species: qrOwnerMatch.pet_species || '',
      pet_breed: qrOwnerMatch.pet_breed || '',
    };
    pickOwner(qrOwnerMatch, pet);
    setQrOwnerMatch(null);
    setQrScanOpen(false);
    setQrError('');
    stopQrSession();
  }

  /* Poll the scan board until the phone delivers the pet/receipt text, then
     auto-populate the owner match card the same way as a direct camera read. */
  useEffect(() => {
    if (!qrScanOpen || !qrSessionKey) return undefined;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/payment-monitoring/scan-board/${encodeURIComponent(qrSessionKey)}`);
        const board = res.data;
        if (!board || board.status !== 'ok') return;
        stopQrSession();
        if (board.value) handleQrText(board.value);
      } catch (_) {
        /* keep polling */
      }
    }, 1500);
    qrPollRef.current = interval;
    return () => {
      if (qrPollRef.current) {
        clearInterval(qrPollRef.current);
        qrPollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrScanOpen, qrSessionKey]);

  useEffect(() => () => stopQrSession(), []);

  function handleSave(mode = 'close') {
    const errors = {};

    const number = orForm.or_number.trim();
    if (!number) errors.or_number = 'OR number is required.';
    else if (duplicate.isDuplicate) errors.or_number = 'This OR number has already been recorded.';

    if (!orForm.or_date) errors.or_date = 'Date of payment is required.';
    if (!selectedOwner) errors.owner = 'Select the pet owner for this payment.';

    const hasItems = (items || []).some((item) => item.description.trim() || String(item.amount).trim());
    if (!hasItems) errors.items = 'Add at least one payment item (a "Payment for" row).';

    if (!effectiveTotal || effectiveTotal <= 0) {
      errors.or_amount = 'Enter the amount paid (Total row).';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(Object.values(errors).find(Boolean) || 'Please complete the highlighted fields.');
      return;
    }

    setSaving(true);
    const formData = new FormData();
    formData.append('or_number', number);
    formData.append('or_amount', effectiveTotal.toFixed(2));
    formData.append('or_date', orForm.or_date);
    if (orForm.or_time) formData.append('or_time', orForm.or_time);
    const description = (items || [])
      .map((item) => item.description.trim())
      .filter(Boolean)
      .join('; ');
    if (description) formData.append('or_description', description);
    formData.append('payment_items', JSON.stringify(items));
    formData.append('pet_owner_id', selectedOwner.owner_id);
    if (selectedPet?.pet_id) formData.append('pet_id', selectedPet.pet_id);
    formData.append('payment_type', derivedType);

    api
      .post('/payment-monitoring', formData)
      .then((res) => {
        toast.success(res.data.message || 'Payment record saved.');
        if (mode === 'next') {
          // Stay open for the next entry in the queue: keep date/time, advance the OR.
          const nextNumber = /^\d+$/.test(number) ? String(Number(number) + 1) : '';
          setOrForm((prev) => ({ ...prev, or_number: nextNumber }));
          setNextOrNumber(nextNumber ? Number(nextNumber) : null);
          setDuplicate({ checking: false, checked: false, isDuplicate: false });
          setOwnerSearch('');
          setOwnerMatches([]);
          setOwnerSearching(false);
          setSelectedOwner(null);
          setSelectedPet(null);
          setItems(newEmptyItems());
          setTotalOverride(null);
          setFieldErrors({});
          setQrOwnerMatch(null);
          setQrReceiptMatch(null);
          setQrScanOpen(false);
          stopQrSession();
          toast.success('Saved — next OR ready. Enter the details, then save again.');
        } else {
          setModalOpen(false);
          resetScanState();
        }
        return Promise.all([loadRecords(), loadSummary()]);
      })
      .catch((err) => {
        const message = err.response?.data?.message || 'Could not save the payment record.';
        if (/already been recorded/i.test(message)) {
          setDuplicate({ checking: false, checked: true, isDuplicate: true });
          setFieldErrors((prev) => ({ ...prev, or_number: message }));
        } else {
          toast.error(message);
        }
      })
      .finally(() => setSaving(false));
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    api
      .delete(`/payment-monitoring/${deleteTarget.id}`)
      .then((res) => {
        toast.success(res.data.message || 'Record deleted.');
        setDeleteTarget(null);
        return Promise.all([loadRecords(), loadSummary()]);
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Could not delete the record.'))
      .finally(() => setDeleting(false));
  }

  function formatCellDate(record) {
    if (!record.or_date) return '—';
    return formatDisplayDate(record.or_date);
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1>Payment Monitoring</h1>
          <p className="page-intro">
            Record Treasury-issued Official Receipts, verify duplicate OR numbers, and keep a reliable
            record of which pet owners have paid.
          </p>
        </div>
        <div className="page-header-actions">
          <PrintReportButton category="payments" />
          <button type="button" className="btn-primary pm-scan-btn" onClick={openScanModal}>
            <ScanLine size={18} aria-hidden="true" />
            Record Payment
          </button>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card summary-card-info">
          <span className="summary-label">Total Payments</span>
          <strong>{summary.overall.total_payments ?? 0}</strong>
        </div>
        <div className="summary-card summary-card-success">
          <span className="summary-label">Total Amount</span>
          <strong>{formatMoney(summary.overall.total_amount)}</strong>
        </div>
        <div className="summary-card summary-card-info">
          <span className="summary-label">Consultation</span>
          <strong>{byTypeMap.Consultation?.count ?? 0}</strong>
        </div>
        <div className="summary-card summary-card-warning">
          <span className="summary-label">Vaccination</span>
          <strong>{byTypeMap.Vaccination?.count ?? 0}</strong>
        </div>
        <div className="summary-card summary-card-danger">
          <span className="summary-label">Medicine</span>
          <strong>{byTypeMap.Medicine?.count ?? 0}</strong>
        </div>
      </div>

      <div className="panel-card table-panel-card">
        <div className="table-header-row">
          <div>
            <h2>Payment Records</h2>
            <p>Every recorded Treasury OR appears here with its pet owner match.</p>
          </div>
          <div className="table-meta">{filteredClientRecords.length} records</div>
        </div>

        <div className="toolbar-row pm-toolbar">
          <div className="search-wrap">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search OR number, owner, or staff..."
              aria-label="Search payment records"
            />
          </div>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by payment type">
            <option value="All">All Types</option>
            {PAYMENT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <div className="toolbar-date">
            <input type="date" value={fromDate} min="2020-01-01" onChange={(e) => setFromDate(e.target.value)} aria-label="Filter from date" />
            <span>to</span>
            <input type="date" value={toDate} min="2020-01-01" onChange={(e) => setToDate(e.target.value)} aria-label="Filter to date" />
          </div>

          <button type="button" className="btn-secondary draft-toolbar-reset" onClick={resetFilters}>
            Reset
          </button>
        </div>

        <div className="table-wrapper">
          <table className="data-table pm-table">
            <thead>
              <tr>
                <th>OR #</th>
                <th>Date & Time</th>
                <th>Pet Owner</th>
                <th>Payment Type / Services</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="empty-state-cell">Loading payment records...</td>
                </tr>
              ) : filteredClientRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state-cell">
                    {searchTerm || typeFilter !== 'All' || fromDate || toDate
                      ? 'No payment records match your filters.'
                      : 'No payments recorded yet. Click "Record Payment" to start.'}
                  </td>
                </tr>
              ) : (
                filteredClientRecords.map((record) => {
                  const TypeIcon = TYPE_ICON[record.payment_type] || Receipt;
                  return (
                    <tr key={record.id}>
                      <td data-label="OR #" className="cell-strong">{record.or_number}</td>
                      <td data-label="Date & Time">
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>
                          {formatDisplayDate(record.or_date)}
                        </div>
                        <div className="cell-muted" style={{ fontSize: '13px' }}>
                          {formatTime(record.or_time)}
                        </div>
                      </td>
                      <td data-label="Pet Owner">
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>{record.owner_name}</div>
                        {record.barangay && (
                          <div className="cell-muted" style={{ fontSize: '12px' }}>{record.barangay}</div>
                        )}
                        {record.pet_name && (
                          <div className="cell-muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                            <PawPrint size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} aria-hidden="true" />
                            {record.pet_name}{record.pet_code ? ` · ${record.pet_code}` : ''}
                          </div>
                        )}
                      </td>
                      <td data-label="Payment Type / Services">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="pm-type-chip" style={{ fontSize: '12px', padding: '3px 8px' }}>
                            <TypeIcon size={12} aria-hidden="true" />
                            {record.payment_type}
                          </span>
                          <span className="cell-muted" style={{ fontSize: '12px' }}>
                            ({getServiceCount(record)})
                          </span>
                        </div>
                      </td>
                      <td data-label="Amount">
                        <strong style={{ fontSize: '15px', color: '#1f2937' }}>{formatMoney(record.or_amount)}</strong>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            className="btn-icon-action"
                            onClick={() => setDetailRecord(record)}
                            aria-label={`View details for ${record.or_number}`}
                            title="View details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon-action btn-icon-action--print"
                            onClick={() => setReceiptRecord(record)}
                            aria-label={`Print receipt for ${record.or_number}`}
                            title="Print receipt"
                          >
                            <Printer size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────── SCAN OR MODAL ───────────────────── */}
      {modalOpen && (
        <div className="logout-modal-overlay" onClick={closeScanModal}>
          <div className="pm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pm-modal-title">
            <div className="pm-modal-header">
              <div className="pm-modal-title">
                <div className="pm-modal-icon">
                  <Receipt size={22} aria-hidden="true" />
                </div>
                <div>
                  <h3 id="pm-modal-title">Record Treasury Official Receipt</h3>
                  <p>Enter the OR details and pick the products/services from the catalog — the amount fills automatically.</p>
                </div>
              </div>
              <button type="button" className="barangay-modal-close" onClick={closeScanModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="pm-modal-body">
              {/* Quick-pick catalog */}
              <section className="pm-section">
                <div className="pm-section-label">
                  <span>1</span> Quick Pick —
                  <em className="pm-auto-badge">tap a product to add it to the payment</em>
                </div>
                {catalogLoading && (
                  <div className="pm-catalog-loading">
                    <Loader2 size={16} className="spin" aria-hidden="true" /> Loading products…
                  </div>
                )}
                {catalogError && !catalogLoading && (
                  <p className="field-error">{catalogError}</p>
                )}
                {!catalogLoading && catalog.length > 0 && (
                  <div className="pm-catalog">
                    <div className="pm-catalog-toolbar">
                      <div className="pm-catalog-tabs">
                        {catalog.map((group) => (
                          <button
                            key={group.name}
                            type="button"
                            className={`pm-cat-chip ${activeCategory === group.name ? 'active' : ''}`}
                            onClick={() => setActiveCategory(group.name === activeCategory ? null : group.name)}
                          >
                            {group.name}
                          </button>
                        ))}
                      </div>
                      <div className="pm-catalog-search">
                        <Search size={14} aria-hidden="true" />
                        <input
                          type="text"
                          value={catalogSearch}
                          onChange={(e) => setCatalogSearch(e.target.value)}
                          placeholder="Search product…"
                        />
                      </div>
                    </div>
                    <div className="pm-catalog-products">
                      {catalog.map((group) => {
                        const isVisible = !activeCategory || activeCategory === group.name;
                        if (!isVisible) return null;
                        const q = catalogSearch.trim().toLowerCase();
                        const products = q
                          ? group.products.filter(
                              (p) => `${p.name} ${p.species || ''} ${p.subcategory || ''}`.toLowerCase().includes(q)
                            )
                          : group.products;
                        if (!products.length) return null;
                        return (
                          <div className="pm-catalog-group" key={group.name}>
                            <div className="pm-catalog-group-head">
                              <strong>{group.name}</strong>
                              <span className="cell-muted">{group.payment_type}</span>
                            </div>
                            <div className="pm-catalog-grid">
                              {products.map((product) => (
                                <button
                                  key={`${group.name}-${product.id}`}
                                  type="button"
                                  className="pm-cat-product"
                                  onClick={() => addCatalogItem(product, group.name)}
                                  title={product.subcategory ? `${product.subcategory}${product.species && product.species !== 'General' ? ` · ${product.species}` : ''}` : ''}
                                >
                                  <span className="pm-cat-product-name">{product.name}</span>
                                  {product.species !== 'General' && (
                                    <span className="pm-cat-product-species">{product.species} · {product.unit || 'dose'}</span>
                                  )}
                                  <span className="pm-cat-product-price">{formatMoney(product.price)}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {catalogSearch.trim() && !catalog.some((g) => g.products.some((p) => p.name.toLowerCase().includes(catalogSearch.trim().toLowerCase()))) && (
                        <p className="field-hint">No products match "{catalogSearch}". You can still type the row manually below.</p>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* Receipt details (spreadsheet) */}
              <section className="pm-section">
                <div className="pm-section-label">
                  <span>2</span> Receipt Details
                </div>

                <div className="pm-receipt-card">
                  <div className="pm-receipt-meta">
                    <div className="field-group">
                      <label htmlFor="pm-or-number">OR Number</label>
                      <div className="pm-input-with-status">
                        <input
                          id="pm-or-number"
                          type="text"
                          value={orForm.or_number}
                          onChange={(e) => handleOrFieldChange('or_number', e.target.value)}
                          placeholder="e.g. 7439418"
                          autoFocus
                        />
                        {orForm.or_number.trim().length >= 3 && (
                          <span className={`pm-or-status ${duplicate.isDuplicate ? 'dup' : 'ok'}`}>
                            {duplicate.checking
                              ? <Loader2 size={14} className="spin" aria-hidden="true" />
                              : duplicate.isDuplicate
                                ? <><AlertTriangle size={14} aria-hidden="true" /> Duplicate</>
                                : <><CheckCircle2 size={14} aria-hidden="true" /> Unique</>}
                          </span>
                        )}
                      </div>
                      {fieldErrors.or_number && <p className="field-error">{fieldErrors.or_number}</p>}
                      {duplicate.isDuplicate && (
                        <p className="field-hint field-hint-danger">This OR was already recorded — verify with the pet owner before proceeding.</p>
                      )}
                    </div>

                    <div className="field-group">
                      <label htmlFor="pm-date">Date of Payment</label>
                      <input
                        id="pm-date"
                        type="date"
                        value={orForm.or_date}
                        onChange={(e) => handleOrFieldChange('or_date', e.target.value)}
                      />
                      {fieldErrors.or_date && <p className="field-error">{fieldErrors.or_date}</p>}
                    </div>

                    <div className="field-group">
                      <label htmlFor="pm-time">Time</label>
                      <input
                        id="pm-time"
                        type="time"
                        value={orForm.or_time}
                        onChange={(e) => handleOrFieldChange('or_time', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pm-receipt-head">
                    <strong>Payment Details</strong>
                    <span className="pm-receipt-entitle">
                      Date {formatShortDate(orForm.or_date)} · {formatTime(orForm.or_time)}
                    </span>
                    <span className="pm-autotype-chip">
                      Auto-classified: <b>{derivedType}</b>
                    </span>
                  </div>

                  {items.some((it) => it.needs_review) && (
                    <div className="pm-ocr-mismatch" role="alert">
                      <AlertTriangle size={16} aria-hidden="true" />
                      <div>
                        <strong>Review the highlighted rows.</strong>
                        <span>Some amounts were not confirmed — verify each before saving.</span>
                      </div>
                    </div>
                  )}

                  <div className={`pm-items-table ${fieldErrors.or_amount || fieldErrors.items ? 'pm-items-invalid' : ''}`}>
                    <div className="pm-items-row pm-items-head">
                      <div className="pm-cell pm-cell-name">Name</div>
                      <div className="pm-cell pm-cell-desc">Payment for</div>
                      <div className="pm-cell pm-cell-amount">Amount</div>
                      <div className="pm-cell pm-cell-action" />
                    </div>

                    {(items || []).map((item, index) => (
                      <div className={`pm-items-row ${item.needs_review ? 'pm-row-review' : ''}`} key={index}>
                        <div className="pm-cell pm-cell-name">
                          {index === 0 ? (
                            <input
                              value={item.name || ''}
                              onChange={(e) => updateItem(index, 'name', e.target.value)}
                              placeholder="Payor name"
                              aria-label="Payor name"
                            />
                          ) : (
                            <span className="pm-cell-empty" />
                          )}
                        </div>
                        <div className="pm-cell pm-cell-desc">
                          <input
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder={index === 0 ? 'e.g. Consultation Fee' : 'Payment for…'}
                            aria-label={`Payment for, row ${index + 1}`}
                          />
                        </div>
                        <div className="pm-cell pm-cell-amount">
                          <input
                            inputMode="decimal"
                            value={item.amount}
                            onChange={(e) => updateItem(index, 'amount', e.target.value)}
                            placeholder="0.00"
                            aria-label={`Amount, row ${index + 1}`}
                          />
                        </div>
                        <div className="pm-cell pm-cell-action">
                          <button
                            type="button"
                            className="pm-items-del"
                            onClick={() => removeItem(index)}
                            aria-label={`Remove payment item ${index + 1}`}
                            title="Remove row"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="pm-items-row pm-items-total">
                      <div className="pm-cell pm-cell-name pm-cell-empty" />
                      <div className="pm-cell pm-cell-desc pm-total-label">Total</div>
                      <div className="pm-cell pm-cell-amount">
                        <input
                          className="pm-total-input"
                          inputMode="decimal"
                          value={totalText}
                          onChange={(e) => setTotalOverride(e.target.value)}
                          placeholder="0.00"
                          aria-label="Total amount paid"
                        />
                        {totalOverride !== null && itemSum !== effectiveTotal && (
                          <button type="button" className="pm-total-reset" onClick={() => setTotalOverride(null)} title="Reset total to sum of items">
                            ∑
                          </button>
                        )}
                      </div>
                      <div className="pm-cell pm-cell-action" />
                    </div>
                  </div>
                  {fieldErrors.or_amount && <p className="field-error">{fieldErrors.or_amount}</p>}
                  {fieldErrors.items && <p className="field-error">{fieldErrors.items}</p>}
                  <div className="pm-items-actions">
                    <button type="button" className="btn-secondary btn-sm" onClick={addItem}>
                      <Plus size={14} aria-hidden="true" /> Add payment item
                    </button>
                    <span className="pm-items-hint">
                      Click any cell to edit. Pick products from "Quick Pick" above, or type each payment row manually.
                    </span>
                  </div>
                </div>
              </section>

              {/* Owner matching */}
              <section className="pm-section">
                <div className="pm-section-label">
                  <span>3</span> Pet Owner
                </div>
                <div className="field-group">
                  <div className="pm-owner-toolbar">
                    <div className="pm-owner-search">
                      <Search size={15} aria-hidden="true" />
                      <input
                        type="text"
                        value={ownerSearch}
                        onChange={(e) => {
                          setOwnerSearch(e.target.value);
                          if (selectedOwner) setSelectedOwner(null);
                        }}
                        placeholder="Search pet owner by name..."
                      />
                      {ownerSearching && <Loader2 size={15} className="spin" aria-hidden="true" />}
                    </div>
                    <button
                      type="button"
                      className={`pm-qr-scan-btn ${qrScanOpen ? 'active' : ''}`}
                      onClick={toggleQrScan}
                      disabled={qrScanning}
                    >
                      {qrScanning ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <ScanLine size={15} aria-hidden="true" />}
                      {qrScanOpen ? 'Close QR Scanner' : 'Scan Pet QR'}
                    </button>
                  </div>

                  {qrScanOpen && (
                    <div className="pm-qr-panel">
                      {qrOwnerMatch ? (
                        <div className="pm-qr-match">
                          <div className="pm-qr-match-head">
                            <span className="pm-qr-match-badge">
                              <CheckCircle2 size={15} aria-hidden="true" /> Matched Pet
                            </span>
                            <span className="pm-qr-match-pet">
                              {qrOwnerMatch.pet_name || 'Unknown pet'} · {qrOwnerMatch.pet_code || ''}
                            </span>
                          </div>

                          <div className="owner-match-item selected owner-picked pm-qr-match-card">
                            {qrOwnerMatch.pet_photo ? (
                              <img
                                className="pm-pet-thumb"
                                src={qrOwnerMatch.pet_photo}
                                alt={qrOwnerMatch.pet_name || 'Pet'}
                              />
                            ) : (
                              <span className="pm-pet-thumb pm-pet-thumb-icon">
                                <ScanLine size={16} aria-hidden="true" />
                              </span>
                            )}
                            <span className="owner-match-main">
                              <strong>{qrOwnerMatch.pet_name || 'Registered pet'}</strong>
                              <span className="owner-match-sub">
                                {[qrOwnerMatch.pet_species, qrOwnerMatch.pet_breed, qrOwnerMatch.pet_sex]
                                  .filter(Boolean)
                                  .join(' · ') || '—'}
                              </span>
                              <span className="owner-match-sub">Code: {qrOwnerMatch.pet_code || '—'}</span>
                            </span>
                          </div>

                          <div className="pm-qr-owner-block">
                            <span className="pm-qr-owner-label">Registered Pet Owner</span>
                            <div className="owner-match-item selected owner-picked">
                              <User size={16} aria-hidden="true" />
                              <span className="owner-match-main">
                                <strong>{qrOwnerMatch.full_name}</strong>
                                <span className="owner-match-sub">
                                  Brgy. {qrOwnerMatch.barangay || '—'} · {qrOwnerMatch.pet_count} pet(s)
                                </span>
                              </span>
                              <span className="owner-match-contact">{qrOwnerMatch.contact_number || '—'}</span>
                            </div>
                          </div>

                          <div className="pm-qr-match-actions">
                            <button type="button" className="btn-primary btn-sm" onClick={confirmQrOwner} disabled={qrScanning}>
                              <CheckCircle2 size={15} aria-hidden="true" /> Confirm & Use
                            </button>
                            <button type="button" className="btn-secondary btn-sm" onClick={() => setQrOwnerMatch(null)} disabled={qrScanning}>
                              <X size={15} aria-hidden="true" /> Not this pet
                            </button>
                          </div>
                        </div>
                      ) : qrReceiptMatch ? (
                        <div className="pm-qr-match">
                          <div className="pm-qr-match-head">
                            <span className="pm-qr-match-badge">
                              <CheckCircle2 size={15} aria-hidden="true" /> Matched Receipt
                            </span>
                            <span className="pm-qr-match-pet">OR {qrReceiptMatch.or_number}</span>
                          </div>

                          <div className="pm-qr-match-grid">
                            <div className="clinical-detail-item">
                              <span>Date of Payment</span>
                              <strong>{formatDisplayDate(qrReceiptMatch.or_date)}{qrReceiptMatch.or_time ? ` · ${formatTime(qrReceiptMatch.or_time)}` : ''}</strong>
                            </div>
                            <div className="clinical-detail-item">
                              <span>Amount</span>
                              <strong>{formatMoney(qrReceiptMatch.or_amount)}</strong>
                            </div>
                            <div className="clinical-detail-item">
                              <span>Pet Owner</span>
                              <strong>{qrReceiptMatch.owner_name}</strong>
                            </div>
                            <div className="clinical-detail-item">
                              <span>Items</span>
                              <strong>{Array.isArray(qrReceiptMatch.items) ? qrReceiptMatch.items.filter((i) => i.description).length : 0}</strong>
                            </div>
                          </div>

                          <p className="pm-items-hint">These are the exact details saved for OR {qrReceiptMatch.or_number}. Fill the form with them, or search a different receipt.</p>

                          <div className="pm-qr-match-actions">
                            <button type="button" className="btn-primary btn-sm" onClick={confirmQrReceipt} disabled={qrScanning}>
                              <CheckCircle2 size={15} aria-hidden="true" /> Fill Form & Confirm
                            </button>
                            <button type="button" className="btn-secondary btn-sm" onClick={() => setQrReceiptMatch(null)} disabled={qrScanning}>
                              <X size={15} aria-hidden="true" /> Not this receipt
                            </button>
                          </div>
                        </div>
                      ) : qrScanning ? (
                        <div className="pm-qr-scanning">
                          <Loader2 size={20} className="spin" aria-hidden="true" /> Checking the scanned code...
                        </div>
                      ) : (
                        <div className="pm-qr-session">
                          <div className="pm-qr-session-card">
                            <span className="pm-qr-session-label">Step 1 — Scan this QR with your phone</span>
                            {qrSessionQr ? (
                              <img className="pm-qr-session-img" src={qrSessionQr} alt="Phone scan session QR" />
                            ) : (
                              <div className="pm-qr-session-loading">
                                <Loader2 size={18} className="spin" aria-hidden="true" /> Preparing...
                            </div>
                            )}
                          </div>
                          <ol className="pm-qr-session-steps">
                            <li>Open your phone's camera and scan the QR above — it opens the system's QR scanner.</li>
                            <li>Point the phone at the pet's QR code (or a payment-receipt QR).</li>
                            <li>The match appears here automatically — verify, then <strong>Confirm &amp; Use</strong>.</li>
                          </ol>
                          <div className="pm-qr-session-status">
                            {qrWaiting ? (
                              <Loader2 size={14} className="spin" aria-hidden="true" />
                            ) : null}
                            <span>Waiting for the phone...</span>
                            {qrSessionUrl && (
                              <small title={qrSessionUrl}>
                                {qrSessionUrl}
                              </small>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={startQrSession}
                            disabled={qrScanning}
                          >
                            Refresh QR
                          </button>
                        </div>
                      )}
                      {qrError && (
                        <p className="pm-qr-error">
                          <AlertTriangle size={14} aria-hidden="true" /> {qrError}
                        </p>
                      )}
                    </div>
                  )}

                  {fieldErrors.owner && <p className="field-error">{fieldErrors.owner}</p>}
                  {ownerSearch.trim().length >= 2 && !selectedOwner && (
                    <div className="owner-match-list">
                      {ownerSearching ? (
                        <div className="owner-match-empty">Searching...</div>
                      ) : ownerMatches.length === 0 ? (
                        <div className="owner-match-empty">No registered pet owner matches "{ownerSearch}".</div>
                      ) : (
                        ownerMatches.map((owner) => {
                          const isSelected = selectedOwner?.owner_id === owner.owner_id;
                          return (
                            <div key={owner.owner_id} className={`owner-match-group ${isSelected ? 'selected' : ''}`}>
                              <button
                                type="button"
                                className="owner-match-item"
                                onClick={() => pickOwner(owner)}
                              >
                                <User size={16} aria-hidden="true" />
                                <span className="owner-match-main">
                                  <strong>{owner.full_name}</strong>
                                  <span className="owner-match-sub">
                                    Brgy. {owner.barangay || '—'} · {owner.pet_count} pet(s)
                                  </span>
                                </span>
                                <span className="owner-match-contact">{owner.contact_number || '—'}</span>
                              </button>
                              {Array.isArray(owner.pets) && owner.pets.length > 0 && (
                                <div className="owner-pets-list">
                                  {owner.pets.map((pet) => (
                                    <button
                                      type="button"
                                      key={pet.pet_id}
                                      className={`owner-pet-item ${selectedPet?.pet_id === pet.pet_id ? 'selected' : ''}`}
                                      onClick={() => pickOwner(owner, pet)}
                                    >
                                      {pet.pet_photo ? (
                                        <img
                                          className="owner-pet-thumb"
                                          src={resolveMediaUrl(pet.pet_photo)}
                                          alt={pet.pet_name || 'Pet'}
                                        />
                                      ) : (
                                        <span className="owner-pet-thumb owner-pet-thumb-icon">
                                          <PawPrint size={13} aria-hidden="true" />
                                        </span>
                                      )}
                                      <span className="owner-pet-main">
                                        <strong>{pet.pet_name || 'Pet'}</strong>
                                        <span className="owner-match-sub">
                                          {[pet.pet_species, pet.pet_breed, pet.pet_sex].filter(Boolean).join(' · ') || '—'}
                                          {pet.pet_code ? ` · ${pet.pet_code}` : ''}
                                        </span>
                                      </span>
                                      <span className="owner-pet-pick">Pick pet</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                      {ownerMatches.length > 1 && !ownerSearching && (
                        <p className="field-hint">Multiple owners share this name. Ask the pet owner for their address / contact number to confirm the correct one.</p>
                      )}
                    </div>
                  )}
                  {selectedOwner && (
                    <div className="owner-match-item selected owner-picked">
                      <User size={16} aria-hidden="true" />
                      <span className="owner-match-main">
                        <strong>{selectedOwner.full_name}</strong>
                        <span className="owner-match-sub">
                          Brgy. {selectedOwner.barangay || '—'} · {selectedOwner.pet_count} pet(s)
                        </span>
                      </span>
                      <span className="owner-match-contact">{selectedOwner.contact_number || '—'}</span>
                      <button type="button" className="pm-remove-owner" onClick={() => setSelectedOwner(null)} aria-label="Change owner">
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {selectedPet && (
                    <div className="pm-pet-card">
                      {selectedPet.pet_photo ? (
                        <img
                          className="pm-pet-thumb"
                          src={resolveMediaUrl(selectedPet.pet_photo)}
                          alt={selectedPet.pet_name || 'Pet'}
                        />
                      ) : (
                        <span className="pm-pet-thumb pm-pet-thumb-icon">
                          <PawPrint size={16} aria-hidden="true" />
                        </span>
                      )}
                      <span className="owner-match-main">
                        <span className="owner-match-sub">Pet details</span>
                        <strong>{selectedPet.pet_name || 'Registered pet'}</strong>
                        <span className="owner-match-sub">
                          {[selectedPet.pet_species, selectedPet.pet_breed, selectedPet.pet_sex].filter(Boolean).join(' · ') || '—'}
                          {selectedPet.pet_code ? ` · ${selectedPet.pet_code}` : ''}
                        </span>
                      </span>
                      <button type="button" className="pm-remove-owner" onClick={() => setSelectedPet(null)} aria-label="Change pet">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="pm-modal-footer">
              <button type="button" className="btn-secondary" onClick={closeScanModal} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn-secondary" onClick={() => handleSave('next')} disabled={saving || duplicate.checking}>
                {saving ? (
                  <>
                    <Loader2 size={16} className="spin" aria-hidden="true" /> Saving...
                  </>
                ) : (
                  <>
                    <ChevronRight size={16} aria-hidden="true" /> Save & Next
                  </>
                )}
              </button>
              <button type="button" className="btn-primary" onClick={() => handleSave('close')} disabled={saving || duplicate.checking}>
                {saving ? (
                  <>
                    <Loader2 size={16} className="spin" aria-hidden="true" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} aria-hidden="true" /> Save Payment Record
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────── DETAIL MODAL ───────────────────── */}
      {detailRecord && (
        <div className="logout-modal-overlay" onClick={() => setDetailRecord(null)}>
          <div className="barangay-pets-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pm-detail-title">
            <div className="barangay-pets-modal-header">
              <div className="barangay-pets-modal-title">
                <div className="barangay-pets-modal-icon"><Receipt /></div>
                <div>
                  <h3 id="pm-detail-title">Payment Record · OR {detailRecord.or_number}</h3>
                  <p>{detailRecord.owner_name} · {detailRecord.payment_type}</p>
                </div>
              </div>
              <div className="pm-detail-header-actions">
                <button type="button" className="btn-secondary btn-sm" onClick={() => setReceiptRecord(detailRecord)}>
                  <Printer size={14} aria-hidden="true" /> Print Receipt
                </button>
                <button 
                  type="button" 
                  className="btn-delete-icon" 
                  onClick={() => setDeleteTarget(detailRecord)}
                  aria-label={`Delete record ${detailRecord.or_number}`}
                  title="Delete record"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0.4rem", height: "32px", width: "32px" }}
                >
                  <Trash2 size={15} />
                </button>
                <button type="button" className="barangay-modal-close" onClick={() => setDetailRecord(null)} aria-label="Close">
                  ×
                </button>
              </div>
            </div>

            <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '0 20px 20px' }}>
              <div className="clinical-detail-grid">
              <div className="clinical-detail-item">
                <span>OR Number</span>
                <strong>{detailRecord.or_number}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Date of Payment</span>
                <strong>{formatDisplayDate(detailRecord.or_date)}{detailRecord.or_time ? ` · ${formatTime(detailRecord.or_time)}` : ''}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Amount</span>
                <strong>{formatMoney(detailRecord.or_amount)}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Payment Type</span>
                <strong>{detailRecord.payment_type}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Pet Owner</span>
                <strong>{detailRecord.owner_name}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Contact</span>
                <strong>{detailRecord.contact_number || '—'}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Address</span>
                <strong>{[detailRecord.address, detailRecord.barangay].filter(Boolean).join(', ') || '—'}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Recorded By</span>
                <strong>{detailRecord.recorded_by_name || `Staff #${detailRecord.recorded_by}`}</strong>
              </div>
              <div className="clinical-detail-item">
                <span>Logged</span>
                <strong>{detailRecord.created_at ? new Date(detailRecord.created_at).toLocaleString('en-PH') : '—'}</strong>
              </div>
            </div>

            {(() => {
              const detailItems = parseDetailItems(detailRecord);
              if (detailItems) {
                return (
                  <div className="clinical-detail-section">
                    <h4>Payment Details</h4>
                    <div className="pm-detail-items">
                      <div className="pm-detail-items-row pm-detail-items-head">
                        <span>Name</span>
                        <span>Payment for</span>
                        <span>Amount</span>
                      </div>
                      {detailItems.map((item, index) => (
                        <div className="pm-detail-items-row" key={index}>
                          <span>{index === 0 && item.name ? item.name : ''}</span>
                          <span>{item.description || '—'}</span>
                          <span>{item.amount ? formatMoney(item.amount) : '—'}</span>
                        </div>
                      ))}
                      <div className="pm-detail-items-row pm-detail-items-total">
                        <span />
                        <span>Total</span>
                        <span>{formatMoney(detailRecord.or_amount)}</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return detailRecord.or_description ? (
                <div className="clinical-detail-section">
                  <h4>Payment Details</h4>
                  <p>{detailRecord.or_description}</p>
                </div>
              ) : null;
            })()}

            {detailRecord.or_photo_path && (
              <div className="clinical-detail-section">
                <h4>Scanned Receipt</h4>
                <div className="pm-detail-photo">
                  <img 
                    src={detailRecord.or_photo_path} 
                    alt={`Official Receipt ${detailRecord.or_number}`} 
                    style={{ 
                      cursor: 'pointer', 
                      transition: 'transform 0.2s'
                    }}
                    onClick={() => setLightboxImage(detailRecord.or_photo_path)}
                    title="Click to enlarge"
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  />
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────── LIGHTBOX MODAL ───────────────────── */}
      {lightboxImage && (
        <div 
          className="logout-modal-overlay" 
          onClick={() => setLightboxImage(null)}
          style={{ zIndex: 100001 }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '90vw', 
              maxHeight: '90vh', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <img 
              src={lightboxImage} 
              alt="Enlarged receipt" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '90vh', 
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }} 
            />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              aria-label="Close lightbox"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────── PRINT RECEIPT MODAL ───────────────────── */}
      {receiptRecord &&
        createPortal(
          <div className="logout-modal-overlay pm-receipt-overlay" onClick={() => setReceiptRecord(null)}>
            <div className="pm-receipt-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pm-receipt-title">
              <div className="pm-receipt-actions">
                <div>
                  <h3 id="pm-receipt-title">Payment Receipt · OR {receiptRecord.or_number}</h3>
                  <p>A printable copy for the pet owner.</p>
                </div>
                <div className="pm-receipt-actions-buttons">
                  <button type="button" className="btn-primary btn-sm" onClick={() => window.print()}>
                    <Printer size={14} aria-hidden="true" /> Print Receipt
                  </button>
                </div>
              </div>

              <div className="qr-print-area pm-receipt-sheet">
              <div className="pm-receipt-head">
                <div className="pm-receipt-head-brand">
                  <img className="pm-receipt-head-logo" src="/assets/logo.png.jpg" alt="City Veterinary Office" />
                  <div className="pm-receipt-head-title">
                    <span className="pm-receipt-head-city">City of Cabuyao</span>
                    <strong className="pm-receipt-head-office">City Veterinary Office</strong>
                    <small className="pm-receipt-head-sub">Official Payment Receipt</small>
                  </div>
                </div>
                <div className="pm-receipt-orbox">
                  <span>Official Receipt No.</span>
                  <strong>{receiptRecord.or_number}</strong>
                </div>
              </div>

              <div className="pm-receipt-meta">
                <div className="pm-receipt-meta-row">
                  <span className="pm-receipt-meta-label">Date of Payment</span>
                  <strong>{formatDisplayDate(receiptRecord.or_date)}{receiptRecord.or_time ? ` · ${formatTime(receiptRecord.or_time)}` : ''}</strong>
                </div>
                <div className="pm-receipt-meta-row">
                  <span className="pm-receipt-meta-label">Payment Type</span>
                  <strong>{receiptRecord.payment_type}</strong>
                </div>
                <div className="pm-receipt-meta-row">
                  <span className="pm-receipt-meta-label">Pet Owner</span>
                  <strong>{receiptRecord.owner_name}</strong>
                </div>
                <div className="pm-receipt-meta-row">
                  <span className="pm-receipt-meta-label">Pet</span>
                  <strong>
                    {receiptRecord.pet_name
                      ? `${receiptRecord.pet_name}${receiptRecord.pet_code ? ` · ${receiptRecord.pet_code}` : ''}`
                      : '—'}
                  </strong>
                </div>
                <div className="pm-receipt-meta-row">
                  <span className="pm-receipt-meta-label">Contact</span>
                  <strong>{receiptRecord.contact_number || '—'}</strong>
                </div>
                <div className="pm-receipt-meta-row">
                  <span className="pm-receipt-meta-label">Address</span>
                  <strong>{[receiptRecord.address, receiptRecord.barangay].filter(Boolean).join(', ') || '—'}</strong>
                </div>
                <div className="pm-receipt-meta-row pm-receipt-meta-row--full">
                  <span className="pm-receipt-meta-label">Recorded By</span>
                  <strong>{receiptRecord.recorded_by_name || `Staff #${receiptRecord.recorded_by}`}</strong>
                </div>
              </div>

              {(() => {
                const detailItems = parseDetailItems(receiptRecord);
                if (detailItems) {
                  return (
                    <div className="pm-receipt-items">
                      <div className="pm-receipt-items-head">
                        <span>Item</span>
                        <span>Payment for</span>
                        <span>Amount</span>
                      </div>
                      {detailItems.map((item, index) => (
                        <div className="pm-receipt-items-row" key={index}>
                          <span>{index === 0 && item.name ? item.name : '—'}</span>
                          <span>{item.description || '—'}</span>
                          <span>{item.amount ? formatMoney(item.amount) : '—'}</span>
                        </div>
                      ))}
                      <div className="pm-receipt-items-total">
                        <span>Total</span>
                        <strong>{formatMoney(receiptRecord.or_amount)}</strong>
                      </div>
                    </div>
                  );
                }
                return receiptRecord.or_description ? (
                  <p className="pm-receipt-desc"><strong>Payment for:</strong> {receiptRecord.or_description}</p>
                ) : null;
              })()}

              <div className="pm-receipt-foot">
                <div className="pm-receipt-sign">
                  <span className="pm-receipt-sign-label">Prepared by</span>
                  <strong>{receiptRecord.recorded_by_name || `Staff #${receiptRecord.recorded_by}`}</strong>
                  <span className="pm-receipt-sign-role">City Veterinary Office · Cabuyao, Laguna</span>
                  <span className="pm-receipt-sign-token">{receiptRecord.pm_token || '—'}</span>
                </div>
              </div>
            </div>
          </div>
          </div>,
          document.body
        )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete payment record?"
        message={deleteTarget ? `This will permanently remove the record for OR ${deleteTarget.or_number}. This cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}