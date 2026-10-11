import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';
import useMinLoading from '../../hooks/useMinLoading';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SuccessModal from '../../components/ui/SuccessModal';
import { addSatelliteBase } from '../../utils/mapTiles';
import { CABUYAO_SUBDIVISIONS } from '../../data/cabuyaoSubdivisions';
import {
  MapPin, Upload, Trash2, Eye, X, FileSpreadsheet, Download, AlertCircle,
} from 'lucide-react';

const MAP_CENTER = [14.2471, 121.1367];

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// Rough client-side summary so the admin can sanity-check the file before
// uploading. The server is the source of truth for what actually gets stored.
function summarizeFile(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(trimmed);
      let features = [];
      if (Array.isArray(json)) features = json;
      else if (json.type === 'FeatureCollection') features = json.features || [];
      else if (json.type === 'Feature') features = [json];
      return { format: 'GeoJSON', count: features.length };
    } catch {
      return { format: 'GeoJSON', count: null, error: 'This does not look like valid JSON.' };
    }
  }
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const first = (lines[0] || '').toLowerCase();
  const looksHeader = /[a-z]/.test(first) && /(block|blk|lot|lat|lon|lng|longitude|latitude|subdivision|village)/.test(first);
  return { format: 'CSV', count: Math.max(0, lines.length - (looksHeader ? 1 : 0)) };
}

function downloadTemplate() {
  const csv = 'block,lot,latitude,longitude\n1,1,14.2471000,121.1367000\n';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'block-plan-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Small satellite preview for one subdivision's imported lots. Rendered inside
 * the detail modal, so the container already has its final size on mount.
 */
function PlanMap({ lots }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!elRef.current) return undefined;
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: true });
    mapRef.current = map;
    addSatelliteBase(map);

    const group = L.featureGroup();
    for (const lot of lots) {
      const lat = Number(lot.latitude);
      const lon = Number(lot.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      L.circleMarker([lat, lon], {
        radius: 4, color: '#b91c1c', weight: 1, fillColor: '#ef4444', fillOpacity: 0.95,
      }).addTo(group).bindTooltip(`Blk ${lot.block} Lot ${lot.lot}`);
    }
    group.addTo(map);

    if (group.getLayers().length > 0) {
      map.fitBounds(group.getBounds().pad(0.25));
    } else {
      map.setView(MAP_CENTER, 14);
    }
    const t = setTimeout(() => map.invalidateSize(), 150);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
  }, [lots]);

  return <div ref={elRef} style={{ height: 340, width: '100%', borderRadius: 12, overflow: 'hidden' }} />;
}

export default function BlockPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [subdivision, setSubdivision] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileText, setFileText] = useState('');
  const [fileSummary, setFileSummary] = useState(null);
  const [importing, setImporting] = useState(false);

  const [viewKey, setViewKey] = useState(null);
  const [viewLots, setViewLots] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [successModal, setSuccessModal] = useState({ open: false, title: '', message: '' });

  const showLoading = useMinLoading(loading);

  async function loadPlans() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/block-plans');
      setPlans(res.data.plans || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load block plans.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPlans(); }, []);

  const totalLots = useMemo(() => plans.reduce((sum, p) => sum + (p.lots || 0), 0), [plans]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      setFileText(text);
      setFileSummary(summarizeFile(text));
    } catch {
      setFileText('');
      setFileSummary({ error: 'Could not read that file.' });
    }
  }

  function clearFile() {
    setFileName('');
    setFileText('');
    setFileSummary(null);
  }

  async function handleImport() {
    if (!fileText.trim()) {
      setError('Choose a CSV or GeoJSON file to import.');
      return;
    }
    setImporting(true);
    setError('');
    try {
      const res = await api.post('/block-plans/import', {
        subdivision: subdivision.trim(),
        content: fileText,
      });
      const data = res.data || {};
      if (!data.success) {
        setError(data.message || 'No valid rows could be imported.');
        return;
      }
      const skippedNote = data.skipped ? ` ${data.skipped} row(s) were skipped.` : '';
      setSuccessModal({
        open: true,
        title: 'Import complete',
        message: `${data.message}${skippedNote}`,
      });
      clearFile();
      setSubdivision('');
      loadPlans();
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed. Please check the file and try again.');
    } finally {
      setImporting(false);
    }
  }

  async function openView(key) {
    setViewKey(key);
    setViewLots([]);
    setViewLoading(true);
    try {
      const res = await api.get(`/block-plans/${encodeURIComponent(key)}`);
      setViewLots(res.data.lots || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load that plan.');
    } finally {
      setViewLoading(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/block-plans/${encodeURIComponent(pendingDelete.subdivision)}`);
      setPendingDelete(null);
      loadPlans();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete that plan.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page">
      <h1>Block Plans</h1>
      <p>
        Upload the City's real per-lot coordinates so an owner's Blk/Lot pin lands on the exact
        lot instead of the estimated position inside the subdivision.
      </p>

      {error && (
        <p className="form-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </p>
      )}

      <div className="form-card">
        <div className="form-card-header">
          <h2>Import a block plan</h2>
          <p>
            Choose the subdivision, then upload a <strong>CSV</strong> (columns
            {' '}<code>block, lot, latitude, longitude</code>) or a <strong>GeoJSON</strong> file of
            lot points/polygons. A file may also carry its own <code>subdivision</code> column.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="validated-field" style={{ flex: '1 1 280px', minWidth: 240 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.85rem' }}>
              Subdivision
            </label>
            <input
              type="text"
              list="blockplan-subdivisions"
              value={subdivision}
              onChange={(e) => setSubdivision(e.target.value)}
              placeholder="e.g. Bamboo Orchard Subdivision"
            />
            <datalist id="blockplan-subdivisions">
              {CABUYAO_SUBDIVISIONS.map((name) => <option key={name} value={name} />)}
            </datalist>
          </div>

          <div style={{ flex: '1 1 280px', minWidth: 240 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.85rem' }}>
              File (.csv / .geojson / .json)
            </label>
            <input type="file" accept=".csv,.json,.geojson,text/csv,application/json" onChange={handleFileChange} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-primary" onClick={handleImport} disabled={importing || !fileText}>
              <Upload size={16} /> {importing ? 'Importing…' : 'Import'}
            </button>
            <button type="button" className="btn-icon-action" onClick={downloadTemplate} title="Download CSV template">
              <Download size={16} />
            </button>
          </div>
        </div>

        {fileName && (
          <div style={{ marginTop: '0.9rem', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <FileSpreadsheet size={16} /> {fileName}
            </span>
            {fileSummary && !fileSummary.error && (
              <span className="table-subtext">
                Detected {fileSummary.format}
                {fileSummary.count != null ? ` · ~${fileSummary.count} row(s)` : ''}
              </span>
            )}
            {fileSummary?.error && <span className="form-error">{fileSummary.error}</span>}
            <button type="button" className="btn-icon-action" onClick={clearFile} title="Remove file">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="page-card">
        <div className="table-header-row">
          <div>
            <h2>Imported plans</h2>
            <p className="page-intro">
              {plans.length} subdivision{plans.length === 1 ? '' : 's'} · {totalLots} lot{totalLots === 1 ? '' : 's'} mapped
            </p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subdivision</th>
                <th>Lots</th>
                <th>Imported</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {showLoading ? (
                <tr><td colSpan="4"><LoadingSpinner text="Loading block plans…" fullPage={false} /></td></tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan="4">
                    No block plans yet. Upload a file above to map a subdivision's lots.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.subdivision}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MapPin size={15} /> {plan.subdivision}
                    </td>
                    <td>{plan.lots}</td>
                    <td>{formatDateTime(plan.created_at)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn-icon-action"
                        onClick={() => openView(plan.subdivision)}
                        title="View lots"
                        style={{ width: 32, height: 32, padding: 0, marginRight: 4 }}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="btn-icon-action btn-icon-action--danger"
                        onClick={() => setPendingDelete(plan)}
                        title="Delete plan"
                        style={{ width: 32, height: 32, padding: 0 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewKey && (
        <div
          onClick={() => setViewKey(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--color-surface, #fff)', borderRadius: 16, width: '100%',
              maxWidth: 820, maxHeight: '90vh', overflow: 'auto', padding: '1.25rem 1.25rem 1.5rem',
              boxShadow: '0 24px 64px rgba(0,0,0,.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{viewKey}</h3>
              <button className="btn-icon-action" onClick={() => setViewKey(null)} title="Close" style={{ width: 32, height: 32, padding: 0 }}>
                <X size={16} />
              </button>
            </div>

            {viewLoading ? (
              <LoadingSpinner text="Loading lots…" fullPage={false} />
            ) : viewLots.length === 0 ? (
              <p className="page-intro">No lots found.</p>
            ) : (
              <>
                <PlanMap lots={viewLots} />
                <p className="table-subtext" style={{ margin: '0.6rem 0' }}>{viewLots.length} lot(s)</p>
                <div className="table-wrapper" style={{ maxHeight: 260, overflow: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Block</th><th>Lot</th><th>Latitude</th><th>Longitude</th></tr>
                    </thead>
                    <tbody>
                      {viewLots.map((lot) => (
                        <tr key={lot.id}>
                          <td>{lot.block}</td>
                          <td>{lot.lot}</td>
                          <td>{Number(lot.latitude).toFixed(7)}</td>
                          <td>{Number(lot.longitude).toFixed(7)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this block plan?"
        message={pendingDelete ? `This removes all ${pendingDelete.lots} imported lot(s) for "${pendingDelete.subdivision}". Owners will fall back to the estimated position.` : ''}
        confirmText="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => (deleting ? null : setPendingDelete(null))}
      />

      <SuccessModal
        open={successModal.open}
        title={successModal.title}
        message={successModal.message}
        onConfirm={() => setSuccessModal({ open: false, title: '', message: '' })}
      />
    </div>
  );
}
