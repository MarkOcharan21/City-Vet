import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../services/api";
import { addSatelliteBase } from "../utils/mapTiles";

// Shared red teardrop pin — the default Leaflet marker image breaks under Vite,
// so the marker is drawn as inline SVG instead.
const PIN_ICON = L.divIcon({
  className: "auth-map-pin",
  html:
    '<svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">' +
    '<path fill="#c8102e" stroke="#ffffff" stroke-width="1.4" ' +
    'd="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>' +
    '<circle cx="12" cy="9" r="2.7" fill="#ffffff"/></svg>',
  iconSize: [36, 36],
  iconAnchor: [18, 35],
});

/**
 * Owns the "location verification" map shared by owner registration and the
 * profile/settings form.
 *
 * A single pin is kept in state and it tracks the owner's location automatically:
 * whenever the barangay / subdivision / block / lot changes it is geocoded
 * through the server-side, throttled + cached endpoint — which anchors on the
 * subdivision/barangay and offsets by the block & lot grid — and the pin moves
 * to the result. The free-text street address does not move the pin. The owner
 * can override the pin with an exact device GPS fix (setExactPin) or by dragging
 * the marker — whichever happens last wins.
 *
 * @param {{ address?, barangay?, subdivision?, block?, lot? }} address
 * @param {{ debounceMs?: number }} [options]
 * @returns {{
 *   pin: { lat: number, lng: number } | null,
 *   pinSource: 'gps' | 'manual' | 'geocode' | null,
 *   exactGps: { lat: number, lng: number } | null,
 *   mapContainerRef: import('react').RefObject<HTMLDivElement>,
 *   geocoding: boolean,
 *   setExactPin: (coords: { lat: number, lng: number }) => void,
 * }}
 */
export default function useOwnerLocationMap(address, { debounceMs = 800 } = {}) {
  const [pin, setPin] = useState(null);
  const [pinSource, setPinSource] = useState(null);
  const [geocoding, setGeocoding] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Create the map the first time a pin exists.
  useEffect(() => {
    if (!pin || !mapContainerRef.current || mapRef.current) return undefined;

    const map = L.map(mapContainerRef.current, {
      center: [pin.lat, pin.lng],
      zoom: 18,
      minZoom: 12,
      maxZoom: 19,
    });

    addSatelliteBase(map);

    const marker = L.marker([pin.lat, pin.lng], { draggable: true, icon: PIN_ICON }).addTo(map);

    // Drag the pin, or tap anywhere on the satellite view, to set the exact spot.
    const setManual = (lat, lng) => {
      setPin({ lat, lng, accuracy: null });
      setPinSource("manual");
    };
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLatLng();
      setManual(lat, lng);
    });
    map.on("click", (e) => setManual(e.latlng.lat, e.latlng.lng));

    mapRef.current = map;
    markerRef.current = marker;
    // Leaflet needs a tick after layout before it can measure the container.
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Only rebuild when a pin appears/disappears; position updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(pin)]);

  // Move the marker whenever the pin changes (GPS fix, manual tap/drag or geocode).
  useEffect(() => {
    if (!pin || !mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([pin.lat, pin.lng]);
    mapRef.current.panTo([pin.lat, pin.lng]);
  }, [pin?.lat, pin?.lng]);

  // Auto-update the pin from the barangay/subdivision + block & lot (debounced so
  // typing does not fire a request per keystroke). The free-text street address is
  // intentionally NOT sent — the pin is positioned by the block & lot grid, not by
  // whatever street text was typed. Best-effort: on failure the previous pin is kept.
  const { barangay, subdivision, block, lot } = address || {};
  useEffect(() => {
    const hasAny = [barangay, subdivision, block, lot].some((v) => String(v || "").trim());
    if (!hasAny) return undefined;

    const handle = setTimeout(async () => {
      setGeocoding(true);
      try {
        const res = await api.post("/auth/geocode", {
          barangay,
          subdivision,
          block,
          lot,
        });
        const data = res.data || {};
        if (data.success && Number.isFinite(Number(data.lat)) && Number.isFinite(Number(data.lon))) {
          setPin({ lat: Number(data.lat), lng: Number(data.lon) });
          setPinSource("geocode");
        }
      } catch {
        /* keep the previous pin */
      } finally {
        setGeocoding(false);
      }
    }, debounceMs);

    return () => clearTimeout(handle);
  }, [barangay, subdivision, block, lot, debounceMs]);

  // Pin from an exact device GPS fix.
  function setExactPin(coords) {
    if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return;
    setPin({
      lat: coords.lat,
      lng: coords.lng,
      accuracy: Number.isFinite(coords.accuracy) ? coords.accuracy : null,
    });
    setPinSource("gps");
  }

  // Coordinates that represent a real device/manual fix (as opposed to an
  // address lookup). This is what should be persisted explicitly; an address
  // pin is re-derived on the server, so it need not be sent.
  const exactGps = pin && (pinSource === "gps" || pinSource === "manual") ? pin : null;

  return { pin, pinSource, exactGps, mapContainerRef, geocoding, setExactPin };
}
