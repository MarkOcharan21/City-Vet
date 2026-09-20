import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import PetSearchSelect from '../../components/PetSearchSelect';
import { Calendar, User, FileText, Syringe, Stethoscope, CheckCircle2, Clock, MapPin, PawPrint } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/mediaUrl';

const NO_BARANGAY_KEY = '__none__';
const CABUYAO_CENTER = [14.2471, 121.1367];
const CABUYAO_BOUNDS = L.latLngBounds([14.1500, 121.0000], [14.3300, 121.2200]);

// Official barangay coordinates for Cabuyao City, Laguna (source: PhilAtlas)
// https://www.philatlas.com/luzon/r04a/laguna/cabuyao.html
// Cabuyao has exactly 18 barangays; only real ones are listed here.
const BARANGAY_COORDINATES = {
  'Baclaran': [14.2451, 121.1698],
  'Banay-banay': [14.2541, 121.1303],
  'Banaybanay': [14.2541, 121.1303], // Alternative spelling
  'Banlic': [14.2311, 121.1367],
  'Barangay 1 (Poblacion)': [14.2471, 121.1367], // Poblacion Uno — city center
  'Barangay 2 (Poblacion)': [14.2475, 121.1371], // Poblacion Dos — city center
  'Barangay 3 (Poblacion)': [14.2468, 121.1363], // Poblacion Tres — city center
  'Bigaa': [14.2909, 121.1288],
  'Butong': [14.2899, 121.1374],
  'Casile': [14.2380, 121.0830], // Western highland barangay (approx. within Cabuyao)
  'Diezmo': [14.2310, 121.0940],
  'Gulod': [14.2577, 121.1662],
  'Mamatid': [14.2352, 121.1575],
  'Marinig': [14.2794, 121.1464],
  'Niugan': [14.2633, 121.1273],
  'Pittland': [14.2206, 121.0738],
  'Pulo': [14.2464, 121.1300],
  'Sala': [14.2713, 121.1258],
  'San Isidro': [14.2401, 121.1398],
};

// Approximate radius (in meters) for each barangay's coverage area
// These are rough estimates based on barangay size
const BARANGAY_RADIUS = {
  'Baclaran': 1200,
  'Banay-banay': 1100,
  'Banaybanay': 1100,
  'Banlic': 1000,
  'Barangay 1 (Poblacion)': 500,
  'Barangay 2 (Poblacion)': 500,
  'Barangay 3 (Poblacion)': 500,
  'Bigaa': 1300,
  'Butong': 1100,
  'Casile': 1200,
  'Diezmo': 1100,
  'Gulod': 1200,
  'Mamatid': 1300,
  'Marinig': 1100,
  'Niugan': 1100,
  'Pittland': 1300,
  'Pulo': 1000,
  'Sala': 1100,
  'San Isidro': 1000,
};

// Specific subdivision coordinates for known locations in Cabuyao City
const SUBDIVISION_COORDINATES = {
  'Hongkong Village': [14.2503, 121.1250], // From Wikimapia: 14°15'1"N 121°7'30"E
  'Hong Kong Village': [14.2503, 121.1250], // Alternative spelling
  'Millwood Ville Subdivision': [14.2450, 121.1300], // Approximate location
  'Millwood Ville': [14.2450, 121.1300], // Alternative spelling
};

function CabuyaoLocationMap({ pet, ownerPets, onSelectPet }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const watchIdRef = useRef(null);
  const [locationMessage, setLocationMessage] = useState('Select a pet to view the owner location.');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return undefined;

    const map = L.map(mapElementRef.current, {
      center: CABUYAO_CENTER,
      zoom: 12,
      minZoom: 11,
      maxZoom: 16,
      maxBounds: CABUYAO_BOUNDS,
      maxBoundsViscosity: 1,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pet) {
      setLocating(false);
      return undefined;
    }

    let cancelled = false;
    const fallbackPosition = L.latLng(CABUYAO_CENTER);
    const hasPhoto = Boolean(pet?.photo && String(pet.photo).trim() !== '');
    const petName = escapeHtml(pet?.name || '');
    const pinIcon = hasPhoto
      ? L.divIcon({
        className: 'traceability-map-pin pin-with-photo',
        html: `<span class="traceability-pin-squircle-wrap">`
            + `<span class="traceability-pin-ring"></span>`
            + `<span class="traceability-pin-ring"></span>`
            + `<span class="traceability-pin-ring"></span>`
            + `<span class="traceability-pin-squircle">`
            + `<img class="traceability-pin-img" src="${resolveMediaUrl(pet.photo)}" alt="${petName}" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />`
            + `<span class="traceability-pin-placeholder">🐾</span>`
            + `</span>`
            + `<span class="traceability-pin-tail"></span>`
            + `</span>`,
        iconSize: [64, 82],
        iconAnchor: [32, 80],
      })
      : L.divIcon({
        className: 'traceability-map-pin pin-no-photo',
        html: `<span class="traceability-pin-squircle-wrap">`
            + `<span class="traceability-pin-ring"></span>`
            + `<span class="traceability-pin-ring"></span>`
            + `<span class="traceability-pin-ring"></span>`
            + `<span class="traceability-pin-squircle pin-squircle-empty">`
            + `<span class="traceability-pin-placeholder">🐾</span>`
            + `</span>`
            + `<span class="traceability-pin-tail"></span>`
            + `</span>`,
        iconSize: [64, 82],
        iconAnchor: [32, 80],
      });

    setLocationMessage('Locating the registered owner address...');
    setLocating(true);

    // Improved address formatting for better Philippine geocoding
    const formatAddressForGeocoding = (address, barangay) => {
      const parts = [];

      // Add specific address if available
      if (address && address.trim()) {
        parts.push(address.trim());
      }

      // Add barangay if available (this is crucial for Philippine locations)
      if (barangay && barangay.trim() && barangay !== 'pulo') {
        parts.push(`Barangay ${barangay.trim()}`);
      }

      // Always add city and province for context
      parts.push('Cabuyao City');
      parts.push('Laguna');
      parts.push('Philippines');

      return parts.join(', ');
    };

    const address = formatAddressForGeocoding(pet.address, pet.barangay);
    const query = encodeURIComponent(address);

    // Try multiple search strategies for better accuracy
    const searchWithFallback = async () => {
      try {
        let results = [];

        // Multiple search strategies in order of specificity
        const searchStrategies = [
          // Strategy 1: Full detailed address without bounding box (more flexible)
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ph&q=${query}`,
          // Strategy 2: Address without "Barangay" prefix, different format
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ph&q=${encodeURIComponent(`${pet.address || ''}, ${pet.barangay || ''} barangay, Cabuyao City, Laguna`)}`,
          // Strategy 3: Just barangay and city (more specific)
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ph&q=${encodeURIComponent(`${pet.barangay || ''} barangay, Cabuyao City, Laguna`)}`,
          // Strategy 4: Try with "Brgy" abbreviation
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ph&q=${encodeURIComponent(`${pet.address || ''}, Brgy ${pet.barangay || ''}, Cabuyao City, Laguna`)}`,
          // Strategy 5: Try specific village/subdivision name if present
          pet.address && pet.address.includes('Hongkong')
            ? `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ph&q=${encodeURIComponent('Hongkong Village, Cabuyao City, Laguna')}`
            : null,
          // Strategy 6: With bounding box as last resort
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ph&bounded=1&viewbox=121.0700,14.3200,121.2100,14.1800&q=${query}`
        ].filter(Boolean); // Remove null entries

        for (const strategy of searchStrategies) {
          if (cancelled) return;

          try {
            const response = await fetch(strategy);
            if (!response.ok) continue;

            const strategyResults = await response.json();
            if (strategyResults && strategyResults.length > 0) {
              results = strategyResults;
              console.log('Geocoding results from strategy:', strategy);
              console.log('Results:', strategyResults);
              break; // Use first successful results
            }
          } catch (e) {
            console.log('Search strategy failed:', e);
            continue; // Try next strategy
          }
        }

        if (cancelled) return;

        // Pick the first result that is inside Cabuyao AND consistent with
        // the pet's declared barangay; otherwise treat the geocode as unreliable.
        let result = results.find((candidate) => validateResult(candidate, pet.barangay)) || null;
        let position = result ? L.latLng(Number(result.lat), Number(result.lon)) : fallbackPosition;
        let locationMessage = 'Cabuyao City location; exact address not found';
        let isBarangayFallback = false;

        // If no reliable geocoding result, try known subdivision coordinates first
        if (!result && pet.address) {
          const subdivisionKey = Object.keys(SUBDIVISION_COORDINATES).find(
            key => pet.address.toLowerCase().includes(key.toLowerCase())
          );

          if (subdivisionKey && SUBDIVISION_COORDINATES[subdivisionKey]) {
            position = L.latLng(SUBDIVISION_COORDINATES[subdivisionKey]);
            locationMessage = `Approximate location in ${subdivisionKey}`;
            isBarangayFallback = true;
            console.log(`Using subdivision coordinates for ${subdivisionKey}:`, SUBDIVISION_COORDINATES[subdivisionKey]);
          }
        }

        // If still no reliable result, use the barangay's official coordinates
        if (!result && !isBarangayFallback && pet.barangay) {
          const center = barangayCenter(pet.barangay);
          if (center) {
            position = L.latLng(center);
            locationMessage = `Approximate location in Barangay ${pet.barangay}`;
            isBarangayFallback = true;
          }
        }

        if (result && CABUYAO_BOUNDS.contains(position)) {
          locationMessage = 'Registered owner location';
        }

        if (!CABUYAO_BOUNDS.contains(position)) {
          if (cancelled) return;
          setLocating(false);
          setLocationMessage('The registered address is outside Cabuyao City.');
          if (markerRef.current) markerRef.current.remove();
          markerRef.current = null;
          map.setView(CABUYAO_CENTER, 12);
          return;
        }

        setLocating(false);
        setLocationMessage(locationMessage);
        if (!markerRef.current) {
          markerRef.current = L.marker(position, { icon: pinIcon }).addTo(map);
        } else {
          markerRef.current.setLatLng(position);
          markerRef.current.setIcon(pinIcon);
        }
        // Use higher zoom for exact address, lower zoom for approximate barangay location
        const zoomLevel = result ? 15 : (isBarangayFallback ? 13 : 12);
        map.setView(position, zoomLevel, { animate: true });
        markerRef.current.unbindTooltip();
        markerRef.current.bindTooltip(buildPetCardHtml(pet), {
          permanent: true,
          direction: 'top',
          offset: hasPhoto ? [0, -74] : [0, -50],
          className: 'traceability-pet-card',
          interactive: false,
        });

      } catch (error) {
        if (cancelled) return;
        console.error('Geocoding error:', error);
        setLocating(false);
        setLocationMessage('Cabuyao City location; address lookup unavailable');
        if (!markerRef.current) markerRef.current = L.marker(fallbackPosition, { icon: pinIcon }).addTo(map);
        map.setView(fallbackPosition, 12);
      }
    };

    searchWithFallback();

    function barangayCenter(name) {
      if (!name) return null;
      const lower = String(name).toLowerCase();
      const key = Object.keys(BARANGAY_COORDINATES).find(
        (k) => k.toLowerCase() === lower
          || (lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)),
      );
      return key ? BARANGAY_COORDINATES[key] : null;
    }

    // Validate that a geocoded result is truly within Cabuyao AND close to the
    // pet's declared barangay (geocoders sometimes return same-city places from
    // the wrong side of town). We accept only results within ~4km of the
    // barangay's known center; anything farther is treated as unreliable.
    function validateResult(candidate, brgyName) {
      if (!candidate) return false;
      const lat = Number(candidate.lat);
      const lon = Number(candidate.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
      const position = L.latLng(lat, lon);
      if (!CABUYAO_BOUNDS.contains(position)) return false;
      const center = barangayCenter(brgyName);
      if (center && position.distanceTo(L.latLng(center)) > 4000) return false;
      return true;
    }

    return () => { cancelled = true; };
  }, [pet]);

  return (
    <section className="traceability-location" aria-label="Cabuyao City device location map">
      <div className="traceability-location-heading">
        <div>
          <span className="traceability-location-kicker">Registered owner location</span>
          <h2>{pet ? `${pet.owner_name}'s location` : 'Cabuyao City'}</h2>
        </div>
        <span className="traceability-location-status">{locationMessage}</span>
      </div>
      <div className="traceability-map-wrap">
        <div ref={mapElementRef} className="traceability-location-map" />
{locating && (
            <div className="traceability-locating-overlay" role="status" aria-live="polite">
              <LogoPulse />
              <span>Locating pet...</span>
            </div>
          )}
      </div>
      {pet && (
        <div className="traceability-owner-panel">
          {ownerPets.length > 1 && (
            <div className="traceability-owner-tabs" role="tablist" aria-label="Pets of this owner">
              {ownerPets.map((ownerPet) => (
                <button
                  key={ownerPet.id}
                  type="button"
                  role="tab"
                  aria-selected={String(ownerPet.id) === String(pet.id)}
                  className={String(ownerPet.id) === String(pet.id) ? 'active' : ''}
                  onClick={() => onSelectPet(ownerPet)}
                >
                  <PawPrint size={14} /> {ownerPet.name}
                </button>
              ))}
            </div>
          )}
          <div className="traceability-owner-card">
            <div className="traceability-owner-card-icon"><MapPin size={22} /></div>
            <div className="traceability-owner-card-content">
              <span className="traceability-location-kicker">Pet owner information</span>
              <h3>{pet.owner_name || '—'}</h3>
              <div className="traceability-owner-details">
                <span><strong>Pet</strong>{pet.name || '—'}</span>
                <span><strong>Barangay</strong>{pet.barangay || '—'}</span>
                <span><strong>Contact number</strong>{pet.contact_number || '—'}</span>
                <span><strong>Address</strong>{pet.address || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function BarangayHeatmapMap({ data, loading, onSelectBarangay }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return undefined;

    const map = L.map(mapElementRef.current, {
      center: CABUYAO_CENTER,
      zoom: 12,
      // minZoom 10 guarantees the whole of Cabuyao fits without needing to
      // zoom out further — every barangay bubble stays visible.
      minZoom: 10,
      maxZoom: 16,
      maxBounds: CABUYAO_BOUNDS,
      maxBoundsViscosity: 1,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }

    if (!data || data.length === 0) return undefined;

    try {
      const maxCount = Math.max(...data.map((row) => row.total_pets), 1);
      const layer = L.layerGroup().addTo(map);

      data.forEach((row) => {
        try {
          const color = riskColor(row.risk_level);
          const radius = BARANGAY_RADIUS[row.barangay] || BARANGAY_RADIUS['San Isidro'] || 1000;
          
          // Create circle for the barangay with larger radius to show coverage area
          const marker = L.circle(row.coords, {
            radius,
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.35,
          });

          marker.bindTooltip(
            `<strong>${row.barangay}</strong><br/>${row.total_pets} pet${row.total_pets !== 1 ? 's' : ''} · ${row.risk_level} risk`,
            { direction: 'auto', offset: [0, -60] },
          );

          marker.bindPopup(
            `<div class="trace-heatmap-popup">`
            + `<h4>${row.barangay}</h4>`
            + `<span class="risk-chip risk-${row.risk_level.toLowerCase()}">${row.risk_level} risk</span>`
            + `<table>`
            + `<tr><td>Registered pets</td><td><strong>${row.total_pets}</strong></td></tr>`
            + `<tr><td>Protected (up to date)</td><td><strong>${row.vaccinated_pets}</strong></td></tr>`
            + `<tr><td>Unvaccinated</td><td><strong>${row.unvaccinated_pets}</strong></td></tr>`
            + `<tr><td>Overdue boosters</td><td><strong>${row.overdue_pets}</strong></td></tr>`
            + `<tr><td>Coverage</td><td><strong>${row.coverage_pct}%</strong></td></tr>`
            + `<tr><td>Risk score</td><td><strong>${row.risk_score}</strong> / 100</td></tr>`
            + `</table>`
            + `<button type="button" data-barangay="${row.barangay}" class="trace-heatmap-btn">Trace pets in this barangay</button>`
            + `</div>`,
            { autoPan: true, autoPanPadding: [28, 28], closeOnClick: false, keepInView: true },
          );

          layer.addLayer(marker);
        } catch (err) {
          console.error('Error adding barangay marker:', row.barangay, err);
        }
      });

      layerRef.current = layer;

      const handler = (event) => {
        const barangay = event.target.closest?.('.trace-heatmap-btn')?.dataset?.barangay;
        if (barangay && onSelectBarangay) onSelectBarangay(barangay);
      };
      map.on('popupopen', (e) => {
        e.popup.getElement()?.addEventListener('click', handler);
      });
      map.on('popupclose', (e) => {
        e.popup.getElement()?.removeEventListener('click', handler);
      });

      const group = L.featureGroup(data.map((row) => {
        try {
          const radius = BARANGAY_RADIUS[row.barangay] || BARANGAY_RADIUS['San Isidro'] || 1000;
          return L.circle(row.coords, { radius });
        } catch (err) {
          console.error('Error creating circle for bounds:', row.barangay, err);
          return L.circle(row.coords, { radius: 1000 });
        }
      }));
      const bounds = group.getBounds();
      // Wait for tiles + layout so the fit is exact; pad keeps every circle
      // (and the popup anchor of top-edge barangays) clear of the map border.
      map.whenReady(() => {
        map.invalidateSize();
        map.fitBounds(bounds.pad(0.28), {
          padding: [28, 28],
          maxZoom: 13,
          animate: false,
        });
      });

      return () => {
        layer.remove();
        layerRef.current = null;
      };
    } catch (err) {
      console.error('Error rendering heatmap:', err);
      return undefined;
    }
  }, [data, onSelectBarangay]);

  return (
    <section className="traceability-location" aria-label="Barangay vaccination risk heatmap">
      <div className="traceability-location-heading">
        <div>
          <span className="traceability-location-kicker">Vaccination risk heatmap</span>
          <h2>Cabuyao City — Barangay Risk Overview</h2>
        </div>
        <span className="traceability-location-status">
          {loading ? 'Loading barangay data...' : `${data.length} barangay${data.length !== 1 ? 's' : ''} mapped`}
        </span>
      </div>
      <div className="traceability-map-wrap">
        <div ref={mapElementRef} className="traceability-location-map traceability-heatmap-map" />
        {loading && (
          <div className="traceability-locating-overlay" role="status" aria-live="polite">
            <LogoPulse />
            <span>Loading barangay data...</span>
          </div>
        )}
      </div>
      <div className="traceability-heatmap-legend">
        <span className="legend-title">Risk level</span>
        {['High', 'Medium', 'Low'].map((level) => (
          <span key={level} className="legend-item">
            <span className="legend-dot" style={{ background: riskColor(level) }} />
            {level}
          </span>
        ))}
        <span className="legend-hint">Circle size = barangay coverage area</span>
      </div>
    </section>
  );
}

// Color palette for barangay risk levels
const RISK_COLORS = {
  High: '#e04f4f',
  Medium: '#f2b13c',
  Low: '#3f9d5c',
};

function riskColor(level) {
  return RISK_COLORS[level] || RISK_COLORS.Low;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function LogoPulse({ size = 72 }) {
  return (
    <div className="cvo-pulse-loader" aria-hidden="true">
      <img src="/cityvet-logo.jpg" alt="" style={{ width: size, height: size }} />
    </div>
  );
}

function buildPetCardHtml(pet) {
  const name = escapeHtml(pet?.name);
  const code = pet?.pet_code ? escapeHtml(pet.pet_code) : '';
  const species = pet?.species_name ? escapeHtml(pet.species_name) : '';
  const owner = pet?.owner_name ? escapeHtml(pet.owner_name) : '';
  const barangay = pet?.barangay ? escapeHtml(pet.barangay) : '';
  const address = pet?.address ? escapeHtml(pet.address) : '';
  const sub = [code, species].filter(Boolean).join(' · ');
  return '<div class="traceability-pet-card">'
    + `<span class="traceability-pet-card-name">${name}</span>`
    + (sub ? `<span class="traceability-pet-card-sub">${sub}</span>` : '')
    + (owner ? `<span class="traceability-pet-card-row"><strong>Owner</strong>${owner}</span>` : '')
    + (barangay ? `<span class="traceability-pet-card-row"><strong>Barangay</strong>${barangay}</span>` : '')
    + (address ? `<span class="traceability-pet-card-row"><strong>Address</strong>${address}</span>` : '')
    + '</div>';
}

function barangayCoord(name) {
  if (!name) return null;
  const exact = BARANGAY_COORDINATES[name];
  if (exact) return exact;
  const lower = String(name).toLowerCase();
  const key = Object.keys(BARANGAY_COORDINATES).find(
    (k) => k.toLowerCase() === lower
      || k.toLowerCase().includes(lower)
      || lower.includes(k.toLowerCase()),
  );
  return key ? BARANGAY_COORDINATES[key] : null;
}

function barangayLabel(key) {
  return key === NO_BARANGAY_KEY ? 'No Barangay Assigned' : key;
}

export default function Traceability() {
  const [barangays, setBarangays] = useState([]);
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [selectedPetId, setSelectedPetId] = useState('');
  const [selectedPet, setSelectedPet] = useState(null);
  const [ownerPets, setOwnerPets] = useState([]);
  const [trace, setTrace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapMode, setMapMode] = useState('pet'); // 'pet' | 'heatmap'
  const [heatmap, setHeatmap] = useState([]);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);

  useEffect(() => {
    api.get('/users/barangay-summary')
      .then((res) => setBarangays(res.data.summary || []))
      .catch((err) => console.error('Barangay list error:', err));
  }, []);

  useEffect(() => {
    if (mapMode !== 'heatmap') return undefined;
    setLoadingHeatmap(true);
    api.get('/analytics/barangay-heatmap')
      .then((res) => {
        setHeatmap(res.data.summary || []);
        console.log('Heatmap data loaded:', res.data.summary);
      })
      .catch((err) => {
        console.error('Heatmap load error:', err);
        setHeatmap([]);
      })
      .finally(() => setLoadingHeatmap(false));
    return undefined;
  }, [mapMode]);

  // Owner's other pets (for the tabs above the map) — fetched on demand, never
  // from a full-table dump.
  useEffect(() => {
    if (!selectedPet?.pet_owner_id) {
      setOwnerPets([]);
      return undefined;
    }
    api.get(`/pets/by-owner/${selectedPet.pet_owner_id}`)
      .then((res) => setOwnerPets(res.data.pets || []))
      .catch((err) => console.error('Owner pets error:', err));
    return undefined;
  }, [selectedPet]);

  useEffect(() => {
    if (selectedPetId) {
      setLoading(true);
      api.get(`/analytics/traceability/${selectedPetId}`)
        .then((res) => setTrace(res.data))
        .catch((err) => console.error('Traceability error:', err))
        .finally(() => setLoading(false));
    } else {
      setTrace(null);
    }
  }, [selectedPetId]);

  const heatmapStats = useMemo(() => {
    const totals = heatmap.reduce(
      (acc, row) => ({
        pets: acc.pets + row.total_pets,
        vaccinated: acc.vaccinated + row.vaccinated_pets,
        overdue: acc.overdue + row.overdue_pets,
        unvaccinated: acc.unvaccinated + row.unvaccinated_pets,
        lost: acc.lost + row.lost_pets,
        high: acc.high + (row.risk_level === 'High' ? 1 : 0),
        medium: acc.medium + (row.risk_level === 'Medium' ? 1 : 0),
        low: acc.low + (row.risk_level === 'Low' ? 1 : 0),
      }),
      { pets: 0, vaccinated: 0, overdue: 0, unvaccinated: 0, lost: 0, high: 0, medium: 0, low: 0 },
    );
    return {
      ...totals,
      coverage: totals.pets > 0 ? Math.round((totals.vaccinated / totals.pets) * 100) : 0,
      barangays: heatmap.length,
    };
  }, [heatmap]);

  const mappedHeatmap = useMemo(
    () => {
      if (!heatmap || heatmap.length === 0) return [];
      return heatmap.map((row) => {
        const coords = barangayCoord(row.barangay);
        if (!coords) {
          console.warn(`[Traceability] No coordinates found for barangay: ${row.barangay}, using city center`);
        }
        return { ...row, coords: coords ?? CABUYAO_CENTER };
      });
    },
    [heatmap],
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="page">
      <h1>Traceability</h1>
      <p className="page-intro">Follow a pet record's full lifecycle — from registration, verification, QR issuance, vaccination, and clinical consultations.</p>

      <div className="form-card" style={{ marginBottom: '2rem' }}>
        <div className="traceability-search-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ marginBottom: '0.5rem', display: 'block' }}>Filter by Barangay</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <select
                className="traceability-brgy-select"
                value={selectedBarangay}
                onChange={(e) => {
                  setSelectedBarangay(e.target.value);
                  setSelectedPetId('');
                  setSelectedPet(null);
                }}
                style={{ paddingLeft: '40px', cursor: 'pointer', width: '100%' }}
              >
                <option value="">All Barangays</option>
                {barangays.map((b) => (
                  <option key={b.barangay} value={b.barangay}>
                    {b.barangay} ({b.total_pets} pet{b.total_pets !== 1 ? 's' : ''})
                  </option>
                ))}
                <option value={NO_BARANGAY_KEY}>No Barangay Assigned</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ marginBottom: '0.5rem', display: 'block' }}>Select a Pet to Trace</label>
            <PetSearchSelect
              value={selectedPet}
              onChange={(pet) => {
                setSelectedPet(pet);
                setSelectedPetId(pet ? pet.id : '');
              }}
              barangay={selectedBarangay}
              placeholder={
                selectedBarangay
                  ? `Search pets in ${barangayLabel(selectedBarangay)}...`
                  : 'Search by pet name, code, or owner...'
              }
            />
          </div>
        </div>

        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Start typing to search — matching pets appear instantly. Pulling from
          hundreds of thousands of records is never a problem because the search
          runs on the server.
        </p>
      </div>

      <div className="form-card traceability-mode-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Map View</h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
              {mapMode === 'pet'
                ? 'Showing the registered location of the selected pet.'
                : 'Vaccination coverage risk bubbles per barangay — click a bubble for details.'}
            </p>
          </div>
          <div className="traceability-mode-toggle" role="tablist" aria-label="Map view mode">
            <button
              type="button"
              role="tab"
              aria-selected={mapMode === 'pet'}
              className={mapMode === 'pet' ? 'active' : ''}
              onClick={() => setMapMode('pet')}
            >
              <MapPin size={15} /> Pet Location
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mapMode === 'heatmap'}
              className={mapMode === 'heatmap' ? 'active' : ''}
              onClick={() => {
                // Heatmap always covers the whole of Cabuyao — reset any filters
                setSelectedBarangay('');
                setSelectedPetId('');
                setSelectedPet(null);
                setMapMode('heatmap');
              }}
            >
              <PawPrint size={15} /> Risk Heatmap
            </button>
          </div>
        </div>
      </div>

      {mapMode === 'heatmap' && (
        <div className="traceability-heatmap-summary">
          {[
            { label: 'Barangays', value: heatmapStats.barangays, color: 'var(--color-primary)' },
            { label: 'Registered Pets', value: heatmapStats.pets, color: 'var(--color-accent)' },
            { label: 'Vaccination Coverage', value: `${heatmapStats.coverage}%`, color: 'var(--color-success)' },
            { label: 'Unvaccinated', value: heatmapStats.unvaccinated, color: RISK_COLORS.High },
            { label: 'Overdue Boosters', value: heatmapStats.overdue, color: RISK_COLORS.Medium },
            { label: 'High Risk', value: heatmapStats.high, color: RISK_COLORS.High },
            { label: 'Medium Risk', value: heatmapStats.medium, color: RISK_COLORS.Medium },
            { label: 'Low Risk', value: heatmapStats.low, color: RISK_COLORS.Low },
            { label: 'Lost Pets', value: heatmapStats.lost, color: 'var(--color-text-muted)' },
          ].map((stat) => (
            <div key={stat.label} className="traceability-heatmap-stat">
              <span className="traceability-heatmap-stat-value" style={{ color: stat.color }}>{stat.value}</span>
              <span className="traceability-heatmap-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {mapMode === 'pet' ? (
        <CabuyaoLocationMap
          pet={trace?.pet}
          ownerPets={ownerPets}
          onSelectPet={(pet) => {
            setSelectedPet(pet);
            setSelectedPetId(pet ? pet.id : '');
          }}
        />
      ) : (
        <BarangayHeatmapMap
          data={mappedHeatmap}
          loading={loadingHeatmap}
          onSelectBarangay={(barangay) => {
            setSelectedBarangay(barangay);
            setSelectedPetId('');
            setSelectedPet(null);
            setMapMode('pet');
          }}
        />
      )}

      {loading && (
        <div className="traceability-container" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          <LogoPulse />
          <div style={{ marginTop: '1rem' }}>Loading traceability data...</div>
        </div>
      )}

      {trace && !loading && (
        <div className="traceability-container">
          {/* Pet Info Card */}
          <div className="form-card" style={{ marginBottom: '2rem', borderLeftColor: 'var(--color-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'var(--color-primary-tint)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <PawPrint size={28} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem' }}>{trace.pet.name}</h2>
                <p style={{ margin: '0', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                  <strong>Pet Code:</strong> {trace.pet.pet_code || '—'}
                  {trace.pet.species_name && (
                    <span> · {trace.pet.species_name}{trace.pet.breed_name ? ` — ${trace.pet.breed_name}` : ''}</span>
                  )}
                </p>
              </div>
              <StatusBadge status={trace.pet.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem', background: 'var(--color-bg)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} style={{ color: 'var(--color-accent)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Owner</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{trace.pet.owner_name}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} style={{ color: 'var(--color-accent)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Barangay</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{trace.pet.barangay || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} style={{ color: 'var(--color-accent)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registered</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{formatDate(trace.pet.registration_date)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} style={{ color: 'var(--color-accent)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{trace.pet.contact_number || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} style={{ color: 'var(--color-accent)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Address</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{trace.pet.address || '—'}</div>
                </div>
              </div>
              {trace.pet.sex && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PawPrint size={16} style={{ color: 'var(--color-accent)' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sex / Color</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                      {trace.pet.sex}{trace.pet.color ? ` · ${trace.pet.color}` : ''}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="traceability-timeline">
            <div className="trace-step">
              <div className="trace-step-icon" style={{ background: 'var(--color-success-tint)', color: 'var(--color-success)' }}>
                <CheckCircle2 size={24} />
              </div>
              <div className="trace-step-content">
                <h3>Registration</h3>
                <StatusBadge status={trace.pet.status} />
                <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  Registered on {formatDate(trace.pet.registration_date)}
                </p>
              </div>
            </div>

            <div className="trace-step">
              <div className="trace-step-icon" style={{ background: trace.qr.length > 0 ? 'var(--color-success-tint)' : 'var(--color-warning-tint)', color: trace.qr.length > 0 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {trace.qr.length > 0 ? <CheckCircle2 size={24} /> : <Clock size={24} />}
              </div>
              <div className="trace-step-content">
                <h3>QR Code</h3>
                {trace.qr.length > 0 ? (
                  <>
                    <StatusBadge status={trace.qr[0].status} />
                    <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                      Issued on {formatDate(trace.qr[0].issue_date)}
                    </p>
                  </>
                ) : (
                  <>
                    <StatusBadge status="Pending" />
                    <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                      QR code not yet generated
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="trace-step">
              <div className="trace-step-icon" style={{ background: trace.vaccinations.length > 0 ? 'var(--color-success-tint)' : 'var(--color-warning-tint)', color: trace.vaccinations.length > 0 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                <Syringe size={24} />
              </div>
              <div className="trace-step-content">
                <h3>Vaccinations {trace.vaccinations.length > 0 && `(${trace.vaccinations.length})`}</h3>
                <div style={{ marginTop: '0.5rem' }}>
                  {trace.vaccinations.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {trace.vaccinations.map((v, idx) => (
                        <div key={idx} style={{ padding: '0.75rem', background: 'var(--color-bg)', borderRadius: '8px', fontSize: '0.9rem' }}>
                          <strong>{v.vaccine_name}</strong>
                          <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                            • {formatDate(v.date_administered)}
                          </span>
                          {v.next_due_date && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                              Next due: {formatDate(v.next_due_date)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: '0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                      No vaccination records
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="trace-step">
              <div className="trace-step-icon" style={{ background: trace.consultations.length > 0 ? 'var(--color-success-tint)' : 'var(--color-warning-tint)', color: trace.consultations.length > 0 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                <Stethoscope size={24} />
              </div>
              <div className="trace-step-content">
                <h3>Clinical Consultations {trace.consultations.length > 0 && `(${trace.consultations.length})`}</h3>
                <div style={{ marginTop: '0.5rem' }}>
                  {trace.consultations.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {trace.consultations.map((c, idx) => (
                        <div key={idx} style={{ padding: '0.75rem', background: 'var(--color-bg)', borderRadius: '8px', fontSize: '0.9rem' }}>
                          <strong>{c.diagnosis || 'Consultation'}</strong>
                          <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                            • {formatDate(c.consultation_date)}
                          </span>
                          {c.vet_name && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                              by {c.vet_name}
                            </div>
                          )}
                          {c.treatment_plan && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                              Treatment: {c.treatment_plan}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: '0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                      No consultation records
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .traceability-container {
          max-width: 720px;
          margin: 0 auto;
        }

        .traceability-timeline {
          position: relative;
          padding-left: 2rem;
        }

        .traceability-timeline::before {
          content: '';
          position: absolute;
          left: 0.75rem;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--color-border);
        }

        .trace-step {
          position: relative;
          margin-bottom: 2rem;
          padding-left: 1.5rem;
        }

        .trace-step:last-child {
          margin-bottom: 0;
        }

        .trace-step-icon {
          position: absolute;
          left: -2.5rem;
          top: 0;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid var(--color-card);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

.trace-step-content h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  color: var(--color-ink);
}

.trace-step-content .status-badge {
  display: inline-flex;
}
      `}</style>
    </div>
  );
}
