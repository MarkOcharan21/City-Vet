import L from "leaflet";

// Esri World Imagery (satellite) plus a labels/boundaries reference overlay.
// A satellite view lets an owner actually see their roof when placing a pin,
// which is far more accurate than a street map where houses are invisible.
export const SATELLITE_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const LABEL_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

/**
 * Adds the satellite base layer (and optionally the labels overlay) to a map.
 * @param {import('leaflet').Map} map
 * @param {{ labels?: boolean, maxZoom?: number }} [options]
 */
export function addSatelliteBase(map, { labels = true, maxZoom = 19 } = {}) {
  L.tileLayer(SATELLITE_TILES, {
    attribution:
      "Imagery &copy; Esri, Maxar, Earthstar Geographics &amp; the GIS User Community",
    maxZoom,
  }).addTo(map);

  if (labels) {
    L.tileLayer(LABEL_TILES, {
      attribution: "Labels &copy; Esri",
      maxZoom,
      opacity: 0.9,
    }).addTo(map);
  }
}
