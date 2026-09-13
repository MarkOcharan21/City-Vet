import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScanLine,
  Search,
  Trash2,
  Eye,
  Camera,
  User,
  Pill,
  Stethoscope,
  Syringe,
  Receipt,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  ImagePlus,
  ImageUp,
  RefreshCw,
  Pencil,
  Plus,
  Printer,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { createQrDetector, decodeWithDetector } from '../../utils/pmQrScanner';
import { ocrImage, ocrImageServer, enhanceImageForOcr, downscaleForOcr, extractPaymentDetails, parseOfficialReceipt, detectPaymentType } from '../../utils/ocrUtils';

const PAYMENT_TYPES = ['Consultation', 'Vaccination', 'Medicine'];

const TYPE_ICON = {
  Consultation: Stethoscope,
  Vaccination: Syringe,
  Medicine: Pill,
};

// Combine item rows from the normal and the faint-table OCR passes. Rows that
// describe the same thing are kept once (preferring the cleaner amount); rows
// only one pass could read are appended.
function normalizeItemDesc(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function hasCents(value) {
  return /\.\d{2}$/.test(String(value || '').trim());
}

function mergeItemRows(primary, secondary) {
  const out = [];
  const seen = new Set();
  const scurbDesc = (desc) =>
    String(desc || '').replace(/\s*\|\s*\d{1,4}\s*\|\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const push = (row) => {
    const key = normalizeItemDesc(row.description);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ ...row, description: scurbDesc(row.description) });
  };
  (primary || []).forEach((row) => push(row));
  (secondary || []).forEach((row) => {
    const key = normalizeItemDesc(row.description);
    const existing = out.find((ex) => {
      const nx = normalizeItemDesc(ex.description);
      return nx && (nx === key || nx.includes(key) || key.includes(nx));
    });
    if (!existing) {
      push(row);
    } else if (!hasCents(existing.amount) && hasCents(row.amount) && !existing.name) {
      existing.amount = row.amount;
    }
  });
  return out;
}

function formatMoney(value) {
  const num = Number(value) || 0;
  return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Decide whether a second (refined) parse is better than a first one.
function betterParse(candidate, current) {
  if (!current || !current.or_number) return true;
  if (!candidate) return false;
  const curItems = current.items || [];
  const candItems = candidate.items || [];
  if (candItems.length > curItems.length) return true;
  if (candItems.length < curItems.length) return false;
  if (candidate.sum_matches === true && current.sum_matches !== true) return true;
  if (candidate.owner_name && !current.owner_name) return true;
  if (candidate.or_number && !current.or_number) return true;
  return false;
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

function emptyOrForm() {
  return {
    or_number: '',
    or_date: '',
    or_time: '',
  };
}

function newEmptyItems() {
  return [{ name: '', description: '', amount: '', needs_review: false }];
}

function derivePaymentType(items) {
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
  const [orFile, setOrFile] = useState(null);
  const [orPreview, setOrPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [ocrRawText, setOcrRawText] = useState('');
  const [ocrConfidence, setOcrConfidence] = useState(null);
  const [orForm, setOrForm] = useState(emptyOrForm());
  const [duplicate, setDuplicate] = useState({ checking: false, checked: false, isDuplicate: false });
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownerMatches, setOwnerMatches] = useState([]);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [items, setItems] = useState(newEmptyItems());
  const [totalOverride, setTotalOverride] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [qrScanOpen, setQrScanOpen] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);
  const [qrOwnerMatch, setQrOwnerMatch] = useState(null);
  const [qrReceiptMatch, setQrReceiptMatch] = useState(null);
  const [qrError, setQrError] = useState('');
  const [receiptRecord, setReceiptRecord] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const galleryInputRef = useRef(null);
  const qrScannerRef = useRef(null);
  const qrFileInputRef = useRef(null);
  const qrNativeVideoRef = useRef(null);
  const qrStreamRef = useRef(null);
  const qrLensVideoRef = useRef(null);
  const qrLensStreamRef = useRef(null);
  const qrLensCanvasRef = useRef(null);
  const qrLensTickRef = useRef(null);
  const qrLensDecoderRef = useRef(null);
  const [nativeQrMode, setNativeQrMode] = useState(false);
  const [nativeQrStarting, setNativeQrStarting] = useState(false);
  const [nativeBox, setNativeBox] = useState(null);
  const [qrLensLive, setQrLensLive] = useState(false);
  const [qrLensError, setQrLensError] = useState('');
  const [qrLensFound, setQrLensFound] = useState(false);

  /* ── Capture source: upload (default) | manual ── */
  const [scanSource, setScanSource] = useState('upload');
  const [ocrStep, setOcrStep] = useState('');
  /* OCR review flags — set after a scan so the user can verify risky fields. */
  const [ocrReview, setOcrReview] = useState(null);

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
    setModalOpen(true);
  }

  function resetScanState() {
    setOrFile(null);
    setOrPreview(null);
    setScanning(false);
    setOcrRawText('');
    setOcrConfidence(null);
    setOcrStep('');
    setOrForm(emptyOrForm());
    setDuplicate({ checking: false, checked: false, isDuplicate: false });
    setOwnerSearch('');
    setOwnerMatches([]);
    setOwnerSearching(false);
    setSelectedOwner(null);
    setItems(newEmptyItems());
    setTotalOverride(null);
    setFieldErrors({});
    setScanSource('upload');
    setQrScanOpen(false);
    setQrScanning(false);
    setQrOwnerMatch(null);
    setQrReceiptMatch(null);
    setQrError('');
    stopQrScanner();
  }

  function closeScanModal() {
    if (saving) return;
    stopQrScanner();
    setQrScanOpen(false);
    setQrScanning(false);
    setQrOwnerMatch(null);
    setQrReceiptMatch(null);
    setQrError('');
    setModalOpen(false);
  }

  /* ── Receipt photo capture (native camera / gallery input) ── */
  function openNativeCamera() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = (e) => handleFilePicked(e.target.files ? e.target.files[0] : null);
    input.click();
  }

  function switchScanSource(mode) {
    if (scanning) return;
    setOrFile(null);
    setOrPreview(null);
    setOcrRawText('');
    setOcrConfidence(null);
    setOcrStep('');
    setScanSource(mode);
  }

  function clearCapture() {
    setOrFile(null);
    setOrPreview(null);
    setOcrRawText('');
    setOcrConfidence(null);
    setScanning(false);
    setOcrStep('');
  }

  /* ── Image selection + OCR ── */
  function handleFilePicked(file, keepSource) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG or WEBP).');
      return;
    }
    setScanSource(keepSource || 'upload');
    setOrFile(file);
    runOcr(file);
  }

  async function runOcr(source) {
    setScanning(true);
    setFieldErrors({});
    toast.loading('Reading receipt...', { id: 'pm-ocr' });
    try {
      let prepared;
      try {
        setOcrStep('Preparing image…');
        prepared = await enhanceImageForOcr(source);
      } catch (prepErr) {
        console.warn('Image preparation failed — OCR will use the original.', prepErr);
        prepared = { blob: source instanceof Blob ? source : null, dataUrl: null, binBlob: null };
      }

      // Primary path — server-side PaddleOCR (accurate, runs on this machine).
      let text = '';
      let text2 = '';
      let confidence = null;
      let parsed = null;
      let serverLines = null;
      let engine = 'client';
      let serverUnavailable = false;
      try {
        // Send the downscaled, contrast-boosted copy (≤2000 px) — a fraction of
        // the raw phone photo's upload size and a clean image for the server.
        const sendBlob = (prepared && prepared.blob) || (source instanceof Blob ? source : null);
        if (sendBlob) {
          const server = await ocrImageServer(sendBlob, (stepLabel) => setOcrStep(stepLabel));
          if (server && server.text) {
            text = server.text;
            engine = server.engine || 'paddle';
            // Paddle confidence is 0..1; the UI displays a percentage.
            confidence = server.confidence != null ? server.confidence * 100 : null;
            serverLines = server.lines || null;
            parsed = parseOfficialReceipt(text, serverLines);

            // Refine pass: the server re-OCR's a binarized copy of the same
            // image and merges both passes when the first read was shaky.
            if (prepared.binBlob || true) {
              const needsRefine =
                !parsed ||
                !(parsed.items || []).length ||
                parsed.sum_matches === false ||
                (parsed.items || []).some((it) => !it.amount);
              if (needsRefine) {
                const server2 = await ocrImageServer(sendBlob, (stepLabel) => setOcrStep(stepLabel), { refine: true });
                if (server2 && server2.text) {
                  const parsed2 = parseOfficialReceipt(server2.text, server2.lines || null);
                  if (parsed2 && betterParse(parsed2, parsed)) {
                    parsed = parsed2;
                    text = server2.text;
                    serverLines = server2.lines || null;
                    confidence = server2.confidence != null ? server2.confidence * 100 : confidence;
                  }
                }
              }
            }
          } else {
            throw new Error('Server OCR returned no text.');
          }
        }
      } catch (serverErr) {
        console.warn('[OCR] Server-side OCR failed — falling back to on-device engine.', serverErr?.message || serverErr);
        serverUnavailable = true;
      }

      if (!text || !parsed) {
        // Fallback — on-device Tesseract (works offline). Never feed it the raw
        // 12–48 MP phone photo: downscale first or phones OOM mid-read.
        setOcrStep('Reading receipt on device…');
        let fallbackSource = (prepared && prepared.blob) || null;
        if (!fallbackSource) {
          fallbackSource = await downscaleForOcr(source) || (source instanceof Blob ? source : null);
        }
        const data = await ocrImage(fallbackSource || source);
        text = (data.text || '') + (parsed ? '' : '');

        // Pass 2 — binarized "faint table" variant (recovers very light rows).
        if (prepared.binBlob) {
          try {
            const data2 = await ocrImage(prepared.binBlob);
            text2 = (data2 && data2.text) || '';
          } catch (secErr) {
            console.warn('Faint-table OCR pass failed — continuing with pass 1 only.', secErr);
          }
        }
        confidence = data.confidence ?? null;
        parsed = parseOfficialReceipt(text, null);
        if (text2) {
          const faintItems = extractPaymentDetails(text2) || [];
          const combined = mergeItemRows(parsed.items, faintItems);
          if (combined.length) {
            parsed = { ...parsed, items: combined };
          }
        }
      }

      setOcrStep('');
      setOcrRawText(text);
      setOcrConfidence(confidence);
      if (prepared.dataUrl) {
        setOrPreview(prepared.dataUrl);
      }
      if (serverUnavailable) {
        toast.warning(
          'OCR server unreachable — receipt was read on this device instead. Phones may be slower; reconnect to the clinic network for the fast reader.',
          { id: 'pm-ocr' }
        );
      }

      const mergedItems = parsed.items || [];
      const itemSum = mergedItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
      const totalNum = parsed.amount ? Number(parsed.amount) : null;
      const sumMatches =
        totalNum != null
          ? Number.isFinite(itemSum) && Math.abs(itemSum - totalNum) <= 0.01
          : parsed.sum_matches;
      const mismatch =
        sumMatches === false
          ? `Item total ₱${itemSum.toFixed(2)} doesn't match Amount Paid ₱${Number(totalNum || parsed.words_total || 0).toFixed(2)} — review the highlighted rows.`
          : null;

      const displayed = mergedItems.length
        ? mergedItems.map((item) => ({
            name: '',
            description: item.description || '',
            amount: item.amount || '',
            needs_review: !!item.needs_review,
          }))
        : [{ name: '', description: '', amount: '', needs_review: false }];
      if (displayed[0]) displayed[0].name = parsed.owner_name || '';

      setItems(displayed);
      setTotalOverride(totalNum != null ? totalNum.toFixed(2) : null);
      setOcrReview({
        or_number: !!parsed.or_needs_review && !!parsed.or_number,
        date: !!parsed.date_needs_review && !!parsed.date,
        owner: !!parsed.owner_needs_review && !!parsed.owner_name,
        items: displayed.map((it) => it.needs_review),
        amountMissing: !!parsed.amount_missing,
        sumMismatch: sumMatches === false,
        message: mismatch,
      });

      if (parsed.owner_name) {
        setOwnerSearch(parsed.owner_name);
      }

      setOrForm((prev) => ({
        or_number: parsed.or_number || prev.or_number,
        or_date: parsed.date || prev.or_date,
        or_time: parsed.time || prev.or_time,
      }));

      if (!parsed.or_number) {
        toast('Could not read the OR number. Please review or type it manually.', { id: 'pm-ocr', icon: 'ℹ️' });
      } else if (sumMatches === false) {
        toast.warning('Amount Paid doesn\'t match the item totals — review the highlighted rows.', { id: 'pm-ocr' });
      } else if (parsed.or_number && sumMatches === true && mergedItems.length >= 1 && !(parsed.items || []).some((it) => it.needs_review)) {
        toast.success('Receipt read successfully — details and items were filled in automatically.', { id: 'pm-ocr' });
      } else {
        toast('Receipt partly read — please review the details below.', { id: 'pm-ocr', icon: '✏️' });
      }
    } catch (err) {
      console.error('OCR error:', err);
      toast.error('Could not read the receipt image. You can enter the details manually.', { id: 'pm-ocr' });
    } finally {
      setScanning(false);
      setOcrStep('');
    }
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
    setOcrReview((prev) => (prev ? { ...prev, [name === 'or_number' ? 'or_number' : name === 'or_date' || name === 'or_time' ? 'date' : name]: false } : prev));
  }

  function updateItem(index, field, value) {
    setFieldErrors((prev) => ({ ...prev, or_amount: undefined, items: undefined }));
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value, needs_review: false } : item)));
    if (field === 'amount') setTotalOverride(null);
    setOcrReview((prev) =>
      prev
        ? {
            ...prev,
            items: (prev.items || []).map((flag, i) => (i === index ? false : flag)),
            sumMismatch: false,
            message: null,
          }
        : prev,
    );
  }

  function addItem() {
    const last = items[items.length - 1];
    if (last && !last.description.trim() && !String(last.amount).trim() && !(last.name || '').trim()) return;
    setItems((prev) => [...prev, { name: '', description: '', amount: '', needs_review: false }]);
    setTotalOverride(null);
    setOcrReview((prev) => (prev ? { ...prev, items: [...(prev.items || []), false] } : prev));
  }

  function removeItem(index) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
    setTotalOverride(null);
    setOcrReview((prev) =>
      prev
        ? {
            ...prev,
            items: (prev.items || []).filter((_, i) => i !== index),
            sumMismatch: false,
            message: null,
          }
        : prev,
    );
  }

  function pickOwner(owner) {
    setSelectedOwner(owner);
    setOwnerSearch(owner.full_name);
    setFieldErrors((prev) => ({ ...prev, owner: undefined }));
    setItems((prev) => prev.map((item, i) => (i === 0 ? { ...item, name: owner.full_name } : item)));
  }

  /* ── Pet owner QR scan (matches the owner from a pet QR) ── */
  function stopQrScanner() {
    const scanner = qrScannerRef.current;
    qrScannerRef.current = null;
    if (scanner) {
      scanner.stop().catch(() => {});
    }
    stopQrLens();
  }

  /* ── Google-Lens-style viewfinder scan (works on every browser). ──
     Live camera + dimmed guide frame + LIVE dot. Parses frames continuously
     and reads the code automatically as soon as the QR is pointed at the
     frame ("tapat, basa agad"). The Scan button stays as a manual fallback. */
  function stopQrLens() {
    if (qrLensTickRef.current) {
      clearInterval(qrLensTickRef.current);
      qrLensTickRef.current = null;
    }
    const stream = qrLensStreamRef.current;
    qrLensStreamRef.current = null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setQrLensLive(false);
    setQrLensFound(false);
  }

  // Lazy reusable Html5Qrcode bound to the hidden pm-qr-lens-region div, so the
  // silent auto-read loop never collides with the manual "Choose QR image"
  // pipeline (which uses pm-qr-file-region).
  async function getLensDecoder() {
    if (!qrLensDecoderRef.current) {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      qrLensDecoderRef.current = new Html5Qrcode('pm-qr-lens-region', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
    }
    return qrLensDecoderRef.current;
  }

  // Silent in-memory QR decode (no UI flicker): BarcodeDetector on the canvas
  // first, then html5-qrcode scanFile on a small JPEG. Never throws.
  async function readQrFrameSilent(canvas) {
    try {
      const detector = createQrDetector();
      if (detector) {
        const raw = await decodeWithDetector(canvas, detector);
        if (raw) return raw;
      }
      const w = canvas.width;
      const h = canvas.height;
      if (w < 40 || h < 40) return null;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
      if (!blob) return null;
      const file = new File([blob], 'qr-frame.jpg', { type: 'image/jpeg' });
      try {
        const decoder = await getLensDecoder();
        return await decoder.scanFile(file, false);
      } catch (_) {
        return null;
      }
    } catch (_) {
      return null;
    }
  }

  async function startQrLens() {
    if (qrLensStreamRef.current || !qrLensVideoRef.current) return;
    setQrLensError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      qrLensStreamRef.current = stream;
      const video = qrLensVideoRef.current;
      video.srcObject = stream;
      await video.play();
      setQrLensLive(true);

      // Continuous auto-read: grab a frame every ~220ms and decode it silently.
      // Two consecutive identical reads commit the code (stable, no flicker).
      let last = '';
      let stable = 0;
      let busy = false;
      let committed = false;
      const canvas = qrLensCanvasRef.current;
      const W = 420;
      const H = 320;
      if (canvas) {
        canvas.width = W;
        canvas.height = H;
      }
      qrLensTickRef.current = setInterval(async () => {
        if (committed || busy || !qrLensStreamRef.current || !canvas) return;
        if (video.readyState < 2 || !video.videoWidth) return;
        busy = true;
        try {
          const ctx = canvas.getContext('2d', { willReadFrequently: false });
          ctx.drawImage(video, 0, 0, W, H);
          const raw = await readQrFrameSilent(canvas);
          if (raw) {
            if (raw === last) stable += 1;
            else {
              last = raw;
              stable = 1;
            }
            if (stable >= 2 && !committed) {
              committed = true;
              clearInterval(qrLensTickRef.current);
              qrLensTickRef.current = null;
              setQrLensFound(true);
              const text = raw;
              // Brief green "found" flash before switching to the reading view.
              setTimeout(() => {
                stopQrLens();
                handleQrText(text);
              }, 500);
            }
          } else {
            last = '';
            stable = 0;
          }
        } catch (_) {
          last = '';
          stable = 0;
        } finally {
          busy = false;
        }
      }, 220);
    } catch (err) {
      console.warn('Viewfinder camera start failed:', err);
      stopQrLens();
      setQrLensError(
        'The camera could not start. Allow camera access for this site (use HTTPS), or use "Open Phone Camera" / "Choose image" instead.'
      );
    }
  }

  async function shootQrLens() {
    const video = qrLensVideoRef.current;
    const canvas = qrLensCanvasRef.current;
    if (!video || !canvas || !qrLensLive) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob((blob) => decodeQrFile(blob), 'image/png');
  }

  function openNativeQrCamera() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = (e) => decodeQrFile(e.target.files ? e.target.files[0] : null);
    input.click();
  }

  async function decodeQrFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setQrError('Please choose an image file that contains the QR code.');
      return;
    }
    setQrScanning(true);
    setQrError('');
    // html5-qrcode scanFile requires a File instance — normalize blobs.
    const toFile = (b) => (b instanceof File ? b : new File([b], 'qr-image.jpg', { type: b.type || 'image/jpeg' }));
    let send = toFile(file);
    const decode = async (blob) => {
      // Native engine first (BarcodeDetector on Android Chrome) — fast and precise.
      const detector = createQrDetector();
      if (detector) {
        const nativeText = await decodeWithDetector(blob, detector);
        if (nativeText) return nativeText;
      }
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      const reader = new Html5Qrcode('pm-qr-file-region', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      return reader.scanFile(blob, false);
    };
    try {
      let text;
      try {
        text = await decode(send);
      } catch (firstErr) {
        // Phone photos are often slightly soft — retry on the enhanced image
        // (contrast + sharpen), then on the high-contrast binarized variant.
        let prepared = null;
        try {
          prepared = await enhanceImageForOcr(send);
        } catch (_) {}
        const variants = [prepared && prepared.blob, prepared && prepared.binBlob].filter(Boolean);
        let decoded = false;
        for (const variant of variants) {
          try {
            text = await decode(toFile(variant));
            decoded = true;
            break;
          } catch (retryErr) {
            console.warn('QR retry variant failed:', retryErr);
          }
        }
        if (!decoded) throw firstErr;
      }
      await handleQrText(text);
    } catch (err) {
      console.warn('QR file decode failed:', err);
      setQrError('Could not read the QR code in that image. Keep the code flat and well-lit, hold the phone closer, or tap "Choose QR image" to pick a clearer photo.');
    } finally {
      setQrScanning(false);
    }
  }

  /* ── Native QR scan (BarcodeDetector — fullscreen overlay). ── */
  function stopNativeQrScan() {
    const stream = qrStreamRef.current;
    qrStreamRef.current = null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setNativeQrStarting(false);
    setNativeBox(null);
  }

  async function startNativeQrScan() {
    if (qrStreamRef.current || !qrNativeVideoRef.current) return;
    const detector = createQrDetector();
    if (!detector) {
      setQrError('This browser has no native QR engine. Use "Choose QR image" or the phone camera instead.');
      return;
    }
    setNativeQrStarting(true);
    setQrError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      qrStreamRef.current = stream;
      const video = qrNativeVideoRef.current;
      video.srcObject = stream;
      await video.play();
      setNativeQrStarting(false);

      let stopped = false;
      let last = '';
      let stable = 0;
      let fired = false;
      const tick = async () => {
        if (stopped) return;
        requestAnimationFrame(tick);
        try {
          const codes = await detector.detect(video);
          const code = (codes || []).find((c) => String(c.rawValue || '').trim());
          if (code) {
            const raw = String(code.rawValue).trim();
            const box = code.boundingBox;
            if (box && video.videoWidth > 0 && video.videoHeight > 0) {
              setNativeBox({
                x: box.x / video.videoWidth,
                y: box.y / video.videoHeight,
                w: box.width / video.videoWidth,
                h: box.height / video.videoHeight,
              });
            }
            if (raw === last) stable += 1;
            else {
              last = raw;
              stable = 1;
            }
            if (!fired && stable >= 4) {
              fired = true;
              stopNativeQrScan();
              setNativeQrMode(false);
              handleQrText(raw);
            }
          } else {
            last = '';
            stable = 0;
            setNativeBox(null);
          }
        } catch (_) {}
      };
      tick();
    } catch (err) {
      console.warn('Native QR scan start failed:', err);
      stopNativeQrScan();
      setNativeQrMode(false);
      setQrError('Could not start the camera. Allow camera access, or tap "Choose QR image" instead.');
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
        stopQrScanner();
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
      stopQrScanner();
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
    setOwnerSearch(receipt.owner_name || '');
    setQrReceiptMatch(null);
    setQrScanOpen(false);
    setQrError('');
    stopQrScanner();
    toast.success(`OR ${receipt.or_number} filled exactly from the receipt QR. Review, then save.`);
  }

  function toggleQrScan() {
    setQrError('');
    if (qrScanOpen) {
      setQrScanOpen(false);
      setQrOwnerMatch(null);
      setQrReceiptMatch(null);
      setNativeQrMode(false);
      stopQrScanner();
      stopNativeQrScan();
      return;
    }
    setQrOwnerMatch(null);
    setQrReceiptMatch(null);
    setQrScanOpen(true);
    setQrLensError('');
    if (createQrDetector()) {
      // Native BarcodeDetector engine available — fullscreen auto-detect overlay.
      setNativeQrMode(true);
    }
  }

  function confirmQrOwner() {
    if (!qrOwnerMatch) return;
    pickOwner(qrOwnerMatch);
    setQrOwnerMatch(null);
    setQrScanOpen(false);
    setQrError('');
    stopQrScanner();
  }

  useEffect(() => {
    if (qrScanOpen && !nativeQrMode && !qrOwnerMatch && !qrReceiptMatch && !qrScanning) {
      const timer = setTimeout(() => startQrLens(), 150);
      return () => {
        clearTimeout(timer);
        stopQrLens();
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrScanOpen, nativeQrMode, qrOwnerMatch, qrReceiptMatch, qrScanning]);

  useEffect(() => {
    if (qrScanOpen && nativeQrMode) {
      const timer = setTimeout(() => startNativeQrScan(), 150);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrScanOpen, nativeQrMode]);

  useEffect(() => () => { stopQrScanner(); stopNativeQrScan(); }, []);

  function handleSave() {
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
    formData.append('payment_type', derivedType);
    if (ocrRawText) formData.append('ocr_text', ocrRawText);
    if (ocrConfidence != null) formData.append('ocr_confidence', Number(ocrConfidence).toFixed(2));
    if (orFile) formData.append('or_photo', orFile);

    api
      .post('/payment-monitoring', formData)
      .then((res) => {
        toast.success(res.data.message || 'Payment record saved.');
        setModalOpen(false);
        resetScanState();
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
            Scan Treasury-issued Official Receipts, verify duplicate OR numbers, and keep a reliable
            record of which pet owners have paid.
          </p>
        </div>
        <button type="button" className="btn-primary pm-scan-btn" onClick={openScanModal}>
          <ScanLine size={18} aria-hidden="true" />
          Scan OR
        </button>
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
            <p>Every scanned Treasury OR appears here with its pet owner match.</p>
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
                      : 'No payments recorded yet. Click "Scan OR" to start.'}
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
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={() => setDetailRecord(record)}
                          style={{ 
                            display: "inline-flex", 
                            alignItems: "center", 
                            gap: "4px", 
                            padding: "0.4rem 0.9rem", 
                            fontSize: "13px", 
                            height: "34px",
                            borderRadius: "6px"
                          }}
                        >
                          <Eye size={14} aria-hidden="true" /> View Details
                        </button>
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
                  <p>Scan with the camera or upload a photo — OCR reads the receipt and fills in the details for you.</p>
                </div>
              </div>
              <button type="button" className="barangay-modal-close" onClick={closeScanModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="pm-modal-body">
              {/* Receipt capture */}
              <section className="pm-section">
                <div className="pm-section-label">
                  <span>1</span> Official Receipt
                  {scanSource === 'manual' ? (
                    <em className="pm-auto-badge pm-badge-neutral">manual entry — no photo needed</em>
                  ) : (
                    <em className="pm-auto-badge">photo optional</em>
                  )}
                </div>

                {scanSource !== 'manual' && (
                  <div className="pm-section-toolbar">
                    <span className="pm-source-note">
                      <ImageUp size={14} aria-hidden="true" /> Take a photo with your phone camera or choose an image
                    </span>
                    <button
                      type="button"
                      className="pm-manual-link"
                      onClick={() => switchScanSource('manual')}
                      disabled={scanning}
                    >
                      <Pencil size={13} aria-hidden="true" />
                      Enter details manually
                    </button>
                  </div>
                )}

                {scanSource === 'manual' && (
                  <div className="pm-manual-banner">
                    <Pencil size={16} aria-hidden="true" />
                    <span>No image required — the details below will be saved without a photo.</span>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => switchScanSource('upload')}>
                      <ImageUp size={14} aria-hidden="true" /> Scan instead
                    </button>
                  </div>
                )}

                {!orPreview && scanSource !== 'manual' && (
                  <div className="or-upload-zone">
                    <ImagePlus size={30} aria-hidden="true" />
                    <div className="or-upload-head">
                      <strong>{scanning ? 'Reading receipt...' : 'Get the receipt photo'}</strong>
                      <span>JPG, PNG or WEBP — hold the receipt steady and well-lit for best results</span>
                    </div>
                    <div className="or-upload-actions">
                      <button type="button" className="btn-primary btn-sm" onClick={openNativeCamera} disabled={scanning}>
                        <Camera size={15} aria-hidden="true" /> Take photo
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => galleryInputRef.current?.click()}
                        disabled={scanning}
                      >
                        <ImageUp size={15} aria-hidden="true" /> Choose image
                      </button>
                    </div>
                  </div>
                )}

                {scanning && ocrStep && (
                  <div className="pm-ocr-progress" role="status" aria-live="polite">
                    <Loader2 size={22} className="spin" aria-hidden="true" />
                    <span>{ocrStep}</span>
                  </div>
                )}

                {orPreview && (
                  <div className="or-preview-wrap">
                    <img src={orPreview} alt="Prepared receipt" className="or-preview-img" />
                    <div className="or-preview-actions">
                      <button type="button" className="btn-secondary btn-sm" onClick={clearCapture} disabled={scanning}>
                        <RefreshCw size={14} aria-hidden="true" /> New scan
                      </button>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => runOcr(orFile)} disabled={scanning}>
                        {scanning ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <ScanLine size={14} aria-hidden="true" />}
                        {scanning ? 'Reading...' : 'Re-run OCR'}
                      </button>
                    </div>
                    {ocrConfidence != null && (
                      <div className={`ocr-confidence ocr-confidence-${ocrConfidence >= 70 ? 'good' : ocrConfidence >= 40 ? 'ok' : 'low'}`}>
                        {ocrConfidence >= 70 ? <CheckCircle2 size={13} aria-hidden="true" /> : <AlertTriangle size={13} aria-hidden="true" />}
                        OCR confidence: {Number(ocrConfidence).toFixed(0)}%
                      </div>
                    )}
                  </div>
                )}

                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(e) => {
                    handleFilePicked(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </section>

              {/* Receipt details (spreadsheet) */}
              <section className="pm-section">
                <div className="pm-section-label">
                  <span>2</span> Receipt Details {ocrRawText && <em className="pm-auto-badge">auto-filled by OCR — edit if needed</em>}
                </div>

                <div className="pm-receipt-card">
                  <div className="pm-receipt-meta">
                    <div className="field-group">
                      <label htmlFor="pm-or-number">OR Number</label>
                      <div className="pm-input-with-status">
                        <input
                          id="pm-or-number"
                          type="text"
                          className={ocrReview?.or_number ? 'pm-needs-review' : ''}
                          value={orForm.or_number}
                          onChange={(e) => handleOrFieldChange('or_number', e.target.value)}
                          placeholder="e.g. 7439418"
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
                        className={ocrReview?.date ? 'pm-needs-review' : ''}
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

                  {ocrReview?.sumMismatch && ocrReview.message && (
                    <div className="pm-ocr-mismatch" role="alert">
                      <AlertTriangle size={16} aria-hidden="true" />
                      <div>
                        <strong>Check the payment details.</strong>
                        <span>{ocrReview.message}</span>
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
                      <div className={`pm-items-row ${ocrReview?.items?.[index] || item.needs_review ? 'pm-row-review' : ''}`} key={index}>
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

                  {(ocrReview?.sumMismatch || (ocrReview?.items || []).some(Boolean)) && (
                    <p className="pm-items-hint pm-row-review-hint">
                      <AlertTriangle size={12} aria-hidden="true" /> Highlighted rows weren't read with full confidence — verify each amount before saving.
                    </p>
                  )}
                  <div className="pm-items-actions">
                    <button type="button" className="btn-secondary btn-sm" onClick={addItem}>
                      <Plus size={14} aria-hidden="true" /> Add payment item
                    </button>
                    <span className="pm-items-hint">
                      Click any cell to edit. Filled from the "Payment Details" part of the OR — fix or add rows the scanner missed.
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
                      disabled={scanning}
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
                            <button type="button" className="btn-primary btn-sm" onClick={confirmQrOwner} disabled={scanning}>
                              <CheckCircle2 size={15} aria-hidden="true" /> Confirm & Use
                            </button>
                            <button type="button" className="btn-secondary btn-sm" onClick={() => setQrOwnerMatch(null)} disabled={scanning}>
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
                            <button type="button" className="btn-primary btn-sm" onClick={confirmQrReceipt} disabled={scanning}>
                              <CheckCircle2 size={15} aria-hidden="true" /> Fill Form & Confirm
                            </button>
                            <button type="button" className="btn-secondary btn-sm" onClick={() => setQrReceiptMatch(null)} disabled={scanning}>
                              <X size={15} aria-hidden="true" /> Not this receipt
                            </button>
                          </div>
                        </div>
                      ) : qrScanning ? (
                        <div className="pm-qr-scanning">
                          <Loader2 size={20} className="spin" aria-hidden="true" /> Reading QR code...
                        </div>
                      ) : (
                        <div className="pm-qr-desktop">
                          <div className="pm-camera-box">
                            <div className="pm-camera-stage">
                              <div className="pm-camera-viewport">
                                <video ref={qrLensVideoRef} className="pm-camera-video" playsInline muted />
                                <div className="pm-camera-guide">
                                  <div className={`pm-camera-guide-frame${qrLensFound ? ' found' : ''}`}>
                                    {qrLensFound && (
                                      <span className="pm-camera-found">
                                        <CheckCircle2 size={18} aria-hidden="true" /> QR Found!
                                      </span>
                                    )}
                                  </div>
                                  <p className="pm-camera-guide-text">
                                    Point the pet's QR inside the frame — it reads automatically. Press Scan only if it's slow.
                                  </p>
                                </div>
                              </div>

                              {qrLensError ? (
                                <div className="pm-camera-error">
                                  <span className="pm-camera-error-icon">
                                    <AlertTriangle size={22} aria-hidden="true" />
                                  </span>
                                  <p>{qrLensError}</p>
                                  <div className="pm-camera-error-actions">
                                    <button type="button" className="pm-camera-shoot" onClick={openNativeQrCamera} disabled={scanning}>
                                      <Camera size={16} aria-hidden="true" /> Open Phone Camera
                                    </button>
                                    <button type="button" className="btn-secondary btn-sm" onClick={() => qrFileInputRef.current?.click()} disabled={scanning}>
                                      <ImageUp size={15} aria-hidden="true" /> Choose image
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="pm-camera-controls">
                                  <span className={`pm-camera-live ${qrLensLive ? 'on' : ''}`}>
                                    <ScanLine size={14} aria-hidden="true" />
                                    {qrLensLive ? 'Live' : 'Starting camera…'}
                                  </span>
                                  <button
                                    type="button"
                                    className="pm-camera-shoot"
                                    onClick={shootQrLens}
                                    disabled={!qrLensLive || scanning}
                                  >
                                    <ScanLine size={16} aria-hidden="true" /> {scanning ? 'Reading…' : 'Scan QR'}
                                  </button>
                                </div>
                              )}
                              <canvas ref={qrLensCanvasRef} className="pm-capture-canvas" />
                            </div>
                          </div>
                          <span className="pm-items-hint">
                            Point the camera at the pet's QR code — system receipts (pm-receipt QRs) are matched too.
                          </span>
                        </div>
                      )}
                      {qrError && (
                        <p className="pm-qr-error">
                          <AlertTriangle size={14} aria-hidden="true" /> {qrError}
                        </p>
                      )}
                      <input
                        ref={qrFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        hidden
                        aria-label="Choose a QR code image"
                        onChange={(e) => {
                          decodeQrFile(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                      <div id="pm-qr-file-region" hidden aria-hidden="true" />
                      <div id="pm-qr-lens-region" hidden aria-hidden="true" />
                    </div>
                  )}

                  {nativeQrMode && (
                    <div
                      className="pm-native-overlay"
                      onClick={() => {
                        stopNativeQrScan();
                        setNativeQrMode(false);
                        setQrScanOpen(false);
                      }}
                    >
                      <video ref={qrNativeVideoRef} className="pm-native-video" playsInline muted />
                      <div className="pm-native-frame">
                        <span className="pm-native-corner tl" />
                        <span className="pm-native-corner tr" />
                        <span className="pm-native-corner bl" />
                        <span className="pm-native-corner br" />
                        {nativeBox && nativeBox.w > 0 && nativeBox.h > 0 && (
                          <span
                            className="pm-native-guide"
                            style={{
                              left: `${nativeBox.x * 100}%`,
                              top: `${nativeBox.y * 100}%`,
                              width: `${nativeBox.w * 100}%`,
                              height: `${nativeBox.h * 100}%`,
                            }}
                          />
                        )}
                      </div>
                      <p className="pm-native-hint">{nativeQrStarting ? 'Starting camera...' : 'Point at the pet QR code'}</p>
                      <div className="pm-native-topbar">
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            stopNativeQrScan();
                            setNativeQrMode(false);
                            setQrScanOpen(false);
                          }}
                        >
                          <X size={15} aria-hidden="true" /> Close
                        </button>
                      </div>
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
                            <button
                              type="button"
                              key={owner.owner_id}
                              className={`owner-match-item ${isSelected ? 'selected' : ''}`}
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
                </div>
              </section>
            </div>

            <div className="pm-modal-footer">
              <button type="button" className="btn-secondary" onClick={closeScanModal} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || duplicate.checking}>
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
      {receiptRecord && (
        <div className="logout-modal-overlay pm-receipt-overlay" onClick={() => setReceiptRecord(null)}>
          <div className="pm-receipt-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pm-receipt-title">
            <div className="pm-receipt-actions">
              <div>
                <h3 id="pm-receipt-title">Payment Receipt · OR {receiptRecord.or_number}</h3>
                <p>A printable copy for the pet owner. Scanning its QR reopens the exact record.</p>
              </div>
              <div className="pm-receipt-actions-buttons">
                <button type="button" className="btn-primary btn-sm" onClick={() => window.print()}>
                  <Printer size={14} aria-hidden="true" /> Print Receipt
                </button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setReceiptRecord(null)}>
                  <X size={14} aria-hidden="true" /> Close
                </button>
              </div>
            </div>

            <div className="qr-print-area pm-receipt-sheet qr-print-header">
              <div className="pm-receipt-brand">
                <div>
                  <strong>City of Cabuyao</strong>
                  <span>City Veterinary Office — Official Payment Receipt</span>
                </div>
                <span className="pm-receipt-no">OR {receiptRecord.or_number}</span>
              </div>

              <div className="pm-receipt-meta-grid">
                <div className="clinical-detail-item">
                  <span>OR Number</span>
                  <strong>{receiptRecord.or_number}</strong>
                </div>
                <div className="clinical-detail-item">
                  <span>Date of Payment</span>
                  <strong>{formatDisplayDate(receiptRecord.or_date)}{receiptRecord.or_time ? ` · ${formatTime(receiptRecord.or_time)}` : ''}</strong>
                </div>
                <div className="clinical-detail-item">
                  <span>Payment Type</span>
                  <strong>{receiptRecord.payment_type}</strong>
                </div>
                <div className="clinical-detail-item">
                  <span>Amount</span>
                  <strong>{formatMoney(receiptRecord.or_amount)}</strong>
                </div>
                <div className="clinical-detail-item">
                  <span>Pet Owner</span>
                  <strong>{receiptRecord.owner_name}</strong>
                </div>
                <div className="clinical-detail-item">
                  <span>Contact</span>
                  <strong>{receiptRecord.contact_number || '—'}</strong>
                </div>
                <div className="clinical-detail-item">
                  <span>Address</span>
                  <strong>{[receiptRecord.address, receiptRecord.barangay].filter(Boolean).join(', ') || '—'}</strong>
                </div>
                <div className="clinical-detail-item">
                  <span>Recorded By</span>
                  <strong>{receiptRecord.recorded_by_name || `Staff #${receiptRecord.recorded_by}`}</strong>
                </div>
              </div>

              {(() => {
                const detailItems = parseDetailItems(receiptRecord);
                if (detailItems) {
                  return (
                    <div className="pm-receipt-items-wrap">
                      <div className="pm-detail-items pm-detail-items-r">
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
                          <span>{formatMoney(receiptRecord.or_amount)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return receiptRecord.or_description ? (
                  <p className="pm-receipt-desc"><strong>Payment for:</strong> {receiptRecord.or_description}</p>
                ) : null;
              })()}

              <div className="pm-receipt-foot">
                <div className="pm-receipt-qr">
                  {receiptRecord.receipt_qr_path ? (
                    <>
                      <img src={receiptRecord.receipt_qr_path} alt={`Receipt QR ${receiptRecord.pm_token || ''}`} />
                      <span>Scan to re-open this receipt</span>
                    </>
                  ) : (
                    <span className="pm-receipt-noqr">No receipt QR generated.</span>
                  )}
                </div>
                <div className="pm-receipt-stamp">
                  <strong>City Veterinary Office</strong>
                  <span>Cabuyao, Laguna</span>
                  <span>{receiptRecord.pm_token || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
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