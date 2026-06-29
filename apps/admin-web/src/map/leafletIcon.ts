import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

try {
  const DefaultIcon = L.Icon.Default.prototype as unknown as { _getIconUrl?: string };
  if (DefaultIcon && typeof DefaultIcon === "object") {
    delete DefaultIcon._getIconUrl;
  }
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });
} catch (e) {
  console.warn("[admin-web] leaflet default icon patch skipped:", e);
}
