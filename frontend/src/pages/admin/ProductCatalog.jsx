import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import useMinLoading from '../../hooks/useMinLoading';
import {
  Search, Plus, Pencil, UserX, UserCheck, Trash2, Package, X,
} from 'lucide-react';
import FieldError from '../../components/ui/FieldError';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SuccessModal from '../../components/ui/SuccessModal';
import StatusBadge from '../../components/StatusBadge';

const CATALOG_CATEGORIES = [
  'Vaccines',
  'Dewormers / Antiparasitics',
  'Vitamins / Supplements',
  'Common Medicines',
  'Topical / Wound Care',
  'Other Supplies',
  'Consultation',
];

const SPECIES_OPTIONS = ['General', 'Dog', 'Cat'];

const UNIT_OPTIONS = [
  'dose',
  'tablet',
  'capsule',
  'sachet',
  'tube',
  'bottle',
  'vial',
  'spray',
  'ml',
  'mg',
  'g',
  'syringe',
  'applicator',
  'piece',
  'pack',
];

const SUBCATEGORY_OPTIONS = [
  'Rabies',
  'Core',
  'Follow-up',
  'Allergy',
  'Bacterial Infection',
  'Bone/Calcium Support',
  'Check-up',
  'Cleaning',
  'Diarrhea',
  'Digestive Problems',
  'Ear Hygiene',
  'Ear Infection/Care',
  'Ear Mites',
  'External Parasites',
  'Eye Care',
  'Eye Hygiene',
  'General Nutritional Support',
  'General Supplement',
  'Growth Support',
  'Internal Parasites',
  'Medication Administration',
  'Medication/Procedure',
  'Minor Wounds',
  'Nutritional Support',
  'Pain Management',
  'Pain/Inflammation',
  'Respiratory',
  'Senior Pet Support',
  'Skin Conditions',
  'Skin/Wound Care',
  'Supplement',
  'Veterinary Procedure',
  'Vitamin Supplement',
  'Vomiting/Nausea',
  'Wound Care',
  'Wound Cleaning',
];

const EMPTY_FORM = {
  category: 'Vaccines',
  product_name: '',
  species: 'General',
  unit: '',
  subcategory: '',
  price: '',
  active: true,
};

function formatPeso(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `₱${n.toFixed(2)}`;
}

export default function ProductCatalog() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [pendingToggle, setPendingToggle] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [successModal, setSuccessModal] = useState({ open: false, title: '', message: '' });

  async function loadCatalog() {
    setLoading(true);
    try {
      const res = await api.get('/catalog/admin');
      setCategories(res.data.categories || []);
    } catch (err) {
      setSuccessModal({
        open: true,
        title: 'Load Failed',
        message: 'Unable to load the product catalog. Please refresh the page.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCatalog(); }, []);

  const products = useMemo(
    () => categories.flatMap((c) => c.products.map((p) => ({ ...p, category: c.name }))),
    [categories]
  );

  const shownProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        `${p.name} ${p.category} ${p.species} ${p.subcategory || ''} ${p.unit || ''}`
          .toLowerCase()
          .includes(q);
      const matchesCat = catFilter === 'All' || p.category === catFilter;
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' ? p.active : !p.active);
      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [products, search, catFilter, statusFilter]);

  const unitOptions = useMemo(
    () => Array.from(new Set([...UNIT_OPTIONS, ...products.map((p) => p.unit).filter(Boolean)])),
    [products]
  );

  const subcategoryOptions = useMemo(
    () => Array.from(new Set([...SUBCATEGORY_OPTIONS, ...products.map((p) => p.subcategory).filter(Boolean)])),
    [products]
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(p) {
    setEditing(p);
    setForm({
      category: p.category,
      product_name: p.name,
      species: p.species || 'General',
      unit: p.unit || '',
      subcategory: p.subcategory || '',
      price: p.price,
      active: p.active,
    });
    setFieldErrors({});
    setFormError('');
    setModalOpen(true);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validate() {
    const errors = {};
    if (!form.product_name.trim()) errors.product_name = 'Product name is required.';
    if (!form.category) errors.category = 'Category is required.';
    const price = Number.parseFloat(form.price);
    if (form.price === '' || form.price === null || Number.isNaN(price) || price < 0) {
      errors.price = 'Enter a valid price (0 or higher).';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    const payload = {
      category: form.category,
      product_name: form.product_name.trim(),
      species: form.species,
      unit: form.unit.trim() || null,
      subcategory: form.subcategory.trim() || null,
      price: Number.parseFloat(form.price),
      active: form.active,
    };

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/catalog/${editing.id}`, payload);
        setSuccessModal({
          open: true,
          title: 'Product Updated',
          message: `"${payload.product_name}" is now updated in the catalog.`,
        });
      } else {
        await api.post('/catalog', payload);
        setSuccessModal({
          open: true,
          title: 'Product Added',
          message: `"${payload.product_name}" was added to the catalog.`,
        });
      }
      setModalOpen(false);
      await loadCatalog();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to save the product.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmToggle() {
    if (!pendingToggle) return;
    setBusy(true);
    try {
      const nextActive = !pendingToggle.active;
      await api.put(`/catalog/${pendingToggle.id}`, { active: nextActive });
      await loadCatalog();
      setSuccessModal({
        open: true,
        title: nextActive ? 'Product Activated' : 'Product Deactivated',
        message: `"${pendingToggle.name}" is now ${
          nextActive ? 'available' : 'hidden from the quick-pick catalog'
        }.`,
      });
    } catch (err) {
      setSuccessModal({
        open: true,
        title: 'Update Failed',
        message: err.response?.data?.message || 'Unable to update the product status.',
      });
    } finally {
      setBusy(false);
      setPendingToggle(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      const res = await api.delete(`/catalog/${pendingDelete.id}`);
      await loadCatalog();
      setSuccessModal({
        open: true,
        title: 'Product Removed',
        message: res.data?.message || `"${pendingDelete.name}" was removed from the catalog.`,
      });
    } catch (err) {
      setSuccessModal({
        open: true,
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Unable to remove the product.',
      });
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  }

  const countLabel = loading
    ? 'Loading products...'
    : `${shownProducts.length} of ${products.length} products`;

  return (
    <div className="page">
      <h1>Product Catalog</h1>
      <p>Quick-pick products used by the clinic (48 items by default) — add, edit, hide, or remove items.</p>

      <div className="page-card">
        <div className="table-header-row">
          <div>
            <h2>Catalog Items</h2>
            <p className="page-intro">
              {categories.length} categories · shown when a record is being recorded.
            </p>
          </div>
          <div className="table-meta">{countLabel}</div>
        </div>

        <div className="toolbar-row">
          <div className="search-wrap">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search product, category, species..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="toolbar-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option>All</option>
            {categories.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
          <select className="toolbar-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add Product
          </button>
        </div>

        <div className="table-wrapper catalog-table-wrapper">
          <table className="data-table catalog-sticky-table" style={{ overflow: 'visible', borderRadius: '0' }}>
            <thead className="catalog-sticky-thead">
              <tr>
                <th>Product</th><th>Category</th><th>Species</th><th>Unit / Subcategory</th><th>Price</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
          <tr><td colSpan="7"><LoadingSpinner text="Loading catalog..." fullPage={false} /></td></tr>
              ) : shownProducts.length === 0 ? (
                <tr><td colSpan="7">No products match your filters.</td></tr>
              ) : (
                shownProducts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="cell-strong">{p.name}</div>
                    </td>
                    <td><span className="cell-muted">{p.category}</span></td>
                    <td>{p.species || 'General'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {p.unit ? (
                          <span className="catalog-unit">{p.unit}</span>
                        ) : (
                          <span className="cell-muted">—</span>
                        )}
                        {p.subcategory && (
                          <span className="catalog-subcategory">{p.subcategory}</span>
                        )}
                        {!p.unit && !p.subcategory && (
                          <span className="cell-muted">—</span>
                        )}
                      </div>
                    </td>
                    <td className="catalog-price-cell">{formatPeso(p.price)}</td>
                    <td>
                      <StatusBadge status={p.active ? 'Active' : 'Inactive'} />
                    </td>
                    <td className="catalog-actions" style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'nowrap' }}>
                      <button className="btn-icon-action" onClick={() => openEdit(p)} title="Edit" style={{ padding: '0.35rem' }}>
                        <Pencil size={16} />
                      </button>
                      {p.active ? (
                        <button className="btn-icon-action btn-icon-action--danger" onClick={() => setPendingToggle(p)} title="Deactivate" style={{ padding: '0.35rem' }}>
                          <UserX size={16} />
                        </button>
                      ) : (
                        <button className="btn-icon-action" onClick={() => setPendingToggle(p)} title="Activate" style={{ padding: '0.35rem' }}>
                          <UserCheck size={16} />
                        </button>
                      )}
                      <button className="btn-icon-action btn-icon-action--danger" onClick={() => setPendingDelete(p)} title="Delete" style={{ padding: '0.35rem' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit modal */}
      {modalOpen && (
        <div className="logout-modal-overlay" onClick={() => !saving && setModalOpen(false)}>
          <div className="aat-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="aat-modal-header">
              <div>
                <h3>{editing ? 'Edit Product' : 'Add Product'}</h3>
                <p>
                  <Package size={14} />
                  {editing ? `Updating "${editing.name}"` : 'Add a new quick-pick product to the catalog'}
                </p>
              </div>
              <button className="aat-modal-close" onClick={() => setModalOpen(false)} aria-label="Close" disabled={saving}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="vaccination-modal-form">
              <div className="vaccination-modal-body">
                <div className="vaccination-form-row">
                  <div className="field-group">
                    <label htmlFor="cat-product_name">Product Name *</label>
                    <input
                      id="cat-product_name"
                      name="product_name"
                      type="text"
                      value={form.product_name}
                      onChange={handleChange}
                      placeholder="e.g., Anti-Rabies Vaccine"
                    />
                    <FieldError message={fieldErrors.product_name} />
                  </div>
                  <div className="field-group">
                    <label htmlFor="cat-category">Category *</label>
                    <select id="cat-category" name="category" value={form.category} onChange={handleChange}>
                      {CATALOG_CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <FieldError message={fieldErrors.category} />
                  </div>
                </div>

                <div className="vaccination-form-row">
                  <div className="field-group">
                    <label htmlFor="cat-price">Price (₱) *</label>
                    <input
                      id="cat-price"
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                    <FieldError message={fieldErrors.price} />
                  </div>
                  <div className="field-group">
                    <label htmlFor="cat-species">Species</label>
                    <select id="cat-species" name="species" value={form.species} onChange={handleChange}>
                      {SPECIES_OPTIONS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="vaccination-form-row">
                  <div className="field-group">
                    <label htmlFor="cat-unit">Unit (optional)</label>
                    <select id="cat-unit" name="unit" value={form.unit} onChange={handleChange}>
                      <option value="">None</option>
                      {unitOptions.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group">
                    <label htmlFor="cat-subcategory">Subcategory (optional)</label>
                    <select id="cat-subcategory" name="subcategory" value={form.subcategory} onChange={handleChange}>
                      <option value="">None</option>
                      {subcategoryOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field-group catalog-active-toggle">
                  <label className="catalog-checkbox">
                    <input
                      id="cat-active"
                      name="active"
                      type="checkbox"
                      checked={form.active}
                      onChange={handleChange}
                    />
                    Active in catalog
                  </label>
                  <p className="vaccination-calc-helper">
                    Inactive items are hidden from the clinic&apos;s quick-pick menu but kept here so they can be
                    turned back on.
                  </p>
                </div>

                {formError && <p className="form-error">{formError}</p>}
              </div>

              <div className="catalog-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate / activate confirmation */}
      <ConfirmDialog
        open={Boolean(pendingToggle)}
        title={pendingToggle?.active ? 'Deactivate this product?' : 'Activate this product?'}
        message={
          pendingToggle?.active
            ? `"${pendingToggle?.name}" will be hidden from the clinic's quick-pick catalog. You can reactivate it anytime.`
            : `"${pendingToggle?.name}" will be available again in the clinic's quick-pick catalog.`
        }
        confirmText={pendingToggle?.active ? 'Deactivate' : 'Activate'}
        cancelText="Cancel"
        variant={pendingToggle?.active ? 'danger' : 'warn'}
        loading={busy}
        onConfirm={confirmToggle}
        onCancel={() => setPendingToggle(null)}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this product?"
        message={`"${pendingDelete?.name}" will be permanently removed from the catalog. This cannot be undone.`}
        confirmText="Delete Product"
        cancelText="Keep It"
        variant="danger"
        loading={busy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <SuccessModal
        open={successModal.open}
        title={successModal.title}
        message={successModal.message}
        confirmText="Done"
        onConfirm={() => setSuccessModal({ open: false, title: '', message: '' })}
      />
    </div>
  );
}