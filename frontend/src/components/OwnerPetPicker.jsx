import { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2, User, PawPrint, MapPin, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

// Owner → pets picker for medicine prescriptions. Search an owner, then pick
// one of that owner's pets (server-side lookups only — never loads the full
// pet table, so it scales to large registries).
export default function OwnerPetPicker({
  value,
  onChange,
  ownerPlaceholder = 'Search pet owner by name...',
}) {
  const [ownerTerm, setOwnerTerm] = useState('');
  const [owners, setOwners] = useState([]);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [ownerPets, setOwnerPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [petsError, setPetsError] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const requestSeq = useRef(0);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!ownerOpen) return undefined;
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOwnerOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [ownerOpen]);

  // Debounced, server-side owner search.
  useEffect(() => {
    const term = ownerTerm.trim();
    if (term.length < 2) {
      setOwners([]);
      setOwnerSearching(false);
      setOwnerOpen(false);
      return undefined;
    }

    setOwnerSearching(true);
    setOwnerOpen(true);
    const seq = ++requestSeq.current;
    const timer = setTimeout(() => {
      api
        .get('/payment-monitoring/owners', { params: { q: term } })
        .then((res) => {
          if (seq === requestSeq.current) setOwners(res.data.owners || []);
        })
        .catch(() => {
          if (seq === requestSeq.current) setOwners([]);
        })
        .finally(() => {
          if (seq === requestSeq.current) setOwnerSearching(false);
        });
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [ownerTerm]);

  function pickOwner(owner) {
    setSelectedOwner(owner);
    setOwnerTerm(owner.full_name || '');
    setOwners([]);
    setOwnerOpen(false);
    setActiveIndex(-1);
    if (value) onChange(null);
    setOwnerPets([]);
    setPetsError('');
    setPetsLoading(true);

    api
      .get(`/pets/by-owner/${owner.owner_id}`)
      .then((res) => {
        setOwnerPets(res.data.pets || []);
      })
      .catch(() => {
        setPetsError("Could not load this owner's pets. Please try again.");
      })
      .finally(() => setPetsLoading(false));
  }

  function clearOwner() {
    setSelectedOwner(null);
    setOwnerTerm('');
    setOwners([]);
    setOwnerOpen(false);
    setActiveIndex(-1);
    setOwnerPets([]);
    setPetsError('');
    if (value) onChange(null);
  }

  function handleOwnerInput(valueText) {
    setOwnerTerm(valueText);
    setActiveIndex(-1);
    if (selectedOwner && valueText.trim() !== selectedOwner.full_name) {
      setSelectedOwner(null);
      setOwnerPets([]);
      setPetsError('');
      if (value) onChange(null);
    }
  }

  function handleOwnerKeyDown(event) {
    if (event.key === 'Escape') {
      setOwnerOpen(false);
      return;
    }
    if (owners.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % owners.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? owners.length - 1 : i - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && owners[activeIndex]) pickOwner(owners[activeIndex]);
    }
  }

  return (
    <div className="clinical-form-grid clinical-form-grid--2 opp-grid" ref={rootRef}>
      <div className="field-group">
        <label htmlFor="pet_owner">Pet Owner</label>

        <div className="pet-search">
          <div className="pet-search-input-wrap">
            <Search size={16} className="pet-search-icon" aria-hidden="true" />
            <input
              id="pet_owner"
              type="text"
              value={ownerTerm}
              autoComplete="off"
              placeholder={ownerPlaceholder}
              aria-label="Search pet owner"
              aria-expanded={ownerOpen}
              role="combobox"
              onChange={(e) => handleOwnerInput(e.target.value)}
              onFocus={() => {
                if (ownerTerm.trim().length >= 2) setOwnerOpen(true);
              }}
              onKeyDown={handleOwnerKeyDown}
            />
            {ownerSearching && <Loader2 size={16} className="pet-search-spin" aria-hidden="true" />}
            {(selectedOwner || ownerTerm) && !ownerSearching && (
              <button
                type="button"
                className="pet-search-clear"
                onClick={clearOwner}
                aria-label="Clear selected owner"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {ownerOpen && (
            <div className="pet-search-dropdown" role="listbox" aria-label="Owner search results">
              {ownerSearching && (
                <div className="pet-search-message">
                  <Loader2 size={16} className="pet-search-spin" aria-hidden="true" />
                  Searching owners...
                </div>
              )}
              {!ownerSearching && owners.length === 0 && (
                <div className="pet-search-message">
                  No registered owner matches &quot;{ownerTerm.trim()}&quot;.
                </div>
              )}
              {!ownerSearching &&
                owners.map((owner, index) => (
                  <button
                    key={owner.owner_id}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`pet-search-option opp-owner-option ${
                      index === activeIndex ? 'active' : ''
                    }`}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => pickOwner(owner)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <span className="pet-search-option-icon">
                      <User size={16} aria-hidden="true" />
                    </span>
                    <span className="pet-search-option-main">
                      <span className="pet-search-option-name">{owner.full_name}</span>
                      <span className="pet-search-option-meta">
                        {[owner.barangay, owner.contact_number ? `#${owner.contact_number}` : '']
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </span>
                    </span>
                    <span className="pet-search-option-count">
                      {Number(owner.pet_count)} {Number(owner.pet_count) === 1 ? 'pet' : 'pets'}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {selectedOwner && (
          <p className="opp-owner-hint">
            <MapPin size={12} aria-hidden="true" />
            {selectedOwner.barangay || '—'}{' '}
            {Number(selectedOwner.pet_count) > 0
              ? `· ${selectedOwner.pet_count} registered ${Number(selectedOwner.pet_count) === 1 ? 'pet' : 'pets'}`
              : ''}
          </p>
        )}
      </div>

      <div className="field-group">
        <label htmlFor="pet_pick">Pet</label>

        <div className="opp-pets" id="pet_pick">
          {!selectedOwner && (
            <div className="opp-pets-empty">
              <User size={15} aria-hidden="true" /> Search and pick an owner to see their pets.
            </div>
          )}
          {selectedOwner && petsLoading && (
            <div className="opp-pets-empty">
              <Loader2 size={15} className="pet-search-spin" aria-hidden="true" /> Loading pets...
            </div>
          )}
          {selectedOwner && petsError && (
            <div className="opp-pets-empty opp-pets-error">{petsError}</div>
          )}
          {selectedOwner && !petsLoading && !petsError && ownerPets.length === 0 && (
            <div className="opp-pets-empty">This owner has no registered pets yet.</div>
          )}
          {selectedOwner &&
            !petsLoading &&
            !petsError &&
            ownerPets.map((pet) => {
              const isSelected = value && String(value.id) === String(pet.id);
              return (
                <button
                  type="button"
                  key={pet.id}
                  className={`opp-pet-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => onChange(pet)}
                  aria-pressed={!!isSelected}
                >
                  <span className="pet-search-option-icon">
                    <PawPrint size={16} aria-hidden="true" />
                  </span>
                  <span className="opp-pet-main">
                    <span className="opp-pet-name">
                      {pet.name}
                      {pet.status === 'Verified' && (
                        <CheckCircle2 size={14} className="pet-search-verified" aria-label="Verified" />
                      )}
                    </span>
                    <span className="opp-pet-meta">
                      <strong>{pet.pet_code}</strong>
                      {pet.breed_name || pet.species_name
                        ? ` · ${pet.breed_name || pet.species_name}`
                        : ''}
                    </span>
                  </span>
                  {isSelected && (
                    <span className="opp-pet-check" aria-hidden="true">
                      <CheckCircle2 size={18} />
                    </span>
                  )}
                </button>
              );
            })}
        </div>

        <p className="field-hint">The pets of the selected owner appear here automatically.</p>
      </div>
    </div>
  );
}