import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, PawPrint, MapPin, X, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

// Debounced, server-side pet search used wherever staff/admin need to pick a
// pet without loading the whole pet table into the page.
export default function PetSearchSelect({
  value,
  onChange,
  barangay = '',
  placeholder = 'Search by pet name, code, or owner...',
  status,
  disabled = false,
  required = false,
  autoFocus = false,
  id,
}) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState('');
  const requestSeq = useRef(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  // Keep the visible label in sync with the selected pet (including clears).
  useEffect(() => {
    if (value) {
      setTerm(value.name || '');
    } else {
      setTerm('');
    }
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  // Server-side search with debounce + stale-request guard.
  useEffect(() => {
    const query = term.trim();
    if (!query && !barangay) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    // Don't re-search when the text is just the currently selected pet's name.
    if (value && term.trim() === (value.name || '')) return undefined;

    setLoading(true);
    const seq = ++requestSeq.current;
    const timer = setTimeout(() => {
      api
        .get('/pets/search', {
          params: {
            q: query,
            barangay: barangay || undefined,
            status: status || undefined,
            limit: 20,
          },
        })
        .then((res) => {
          if (seq !== requestSeq.current) return;
          setResults(res.data.pets || []);
          setOpen(true);
        })
        .catch((err) => {
          if (seq !== requestSeq.current) return;
          setError(err.response?.data?.message || 'Pet search failed.');
          setResults([]);
        })
        .finally(() => {
          if (seq === requestSeq.current) setLoading(false);
        });
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [term, barangay, status, value]);

  const displayLabel = useMemo(() => {
    if (!value) return '';
    const breed = value.breed_name || value.species_name || '';
    return [value.name, value.pet_code ? `(${value.pet_code})` : '']
      .filter(Boolean)
      .join(' ');
  }, [value]);

  const handleSelect = (pet) => {
    setTerm(pet.name || '');
    setOpen(false);
    setActiveIndex(-1);
    setError('');
    if (onChange) onChange(pet);
  };

  const handleClear = () => {
    setTerm('');
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
    setError('');
    if (onChange) onChange(null);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open && results.length > 0 && event.key.length === 1) {
      setOpen(true);
    }
    if (results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        handleSelect(results[activeIndex]);
      }
    }
  };

  return (
    <div className="pet-search" ref={rootRef}>
      <div className="pet-search-input-wrap">
        <Search size={16} className="pet-search-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={term}
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          required={required}
          placeholder={value ? displayLabel : placeholder}
          aria-label="Search pets"
          aria-expanded={open}
          role="combobox"
          onChange={(e) => {
            setTerm(e.target.value);
            setError('');
            setActiveIndex(-1);
            if (value && e.target.value !== value.name) {
              // User is editing instead of keeping the current selection.
              if (onChange) onChange(null);
            }
          }}
          onFocus={() => {
            if (term.trim() || barangay) {
              setOpen(results.length > 0 || loading);
            }
          }}
          onKeyDown={handleKeyDown}
        />
        {loading && <Loader2 size={16} className="pet-search-spin" aria-hidden="true" />}
        {value && !loading && (
          <button
            type="button"
            className="pet-search-clear"
            onClick={handleClear}
            aria-label="Clear selected pet"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {error && <p className="field-error">{error}</p>}

      {open && (
        <div className="pet-search-dropdown" role="listbox" aria-label="Pet search results">
          {loading && (
            <div className="pet-search-message">
              <Loader2 size={16} className="pet-search-spin" aria-hidden="true" />
              Searching pets...
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="pet-search-message">
              {term.trim() || barangay
                ? 'No pets match your search.'
                : 'Type at least 1 character to search.'}
            </div>
          )}
          {!loading &&
            results.map((pet, index) => (
              <button
                key={pet.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`pet-search-option ${index === activeIndex ? 'active' : ''}`}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(pet)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="pet-search-option-icon">
                  <PawPrint size={16} />
                </span>
                <span className="pet-search-option-main">
                  <span className="pet-search-option-name">
                    {pet.name}
                    {pet.status === 'Verified' && (
                      <CheckCircle2 size={14} className="pet-search-verified" aria-label="Verified" />
                    )}
                  </span>
                  <span className="pet-search-option-meta">
                    <strong>{pet.pet_code}</strong> · {pet.owner_name}
                  </span>
                  <span className="pet-search-option-meta pet-search-option-brgy">
                    <MapPin size={12} aria-hidden="true" />
                    {pet.barangay || '—'}
                  </span>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}