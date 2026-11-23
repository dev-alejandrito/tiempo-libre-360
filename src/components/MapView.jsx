import { useEffect, useRef, useState } from "react";

// Approximate-area map: shows circles (never exact pins or addresses).
export default function MapView({ center, zoom = 11, circles = [], me, onPick, height = 380, label = "Mapa" }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  const [L, setL] = useState(null);
  useEffect(() => { let live = true; import("leaflet").then((mod) => { if (live) setL(mod.default || mod); }); return () => { live = false; }; }, []);

  useEffect(() => {
    if (!L) return undefined;
    const m = L.map(el.current, { scrollWheelZoom: false }).setView(center || [40.4168, -3.7038], zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", (e) => pickRef.current?.(e.latlng.lat, e.latlng.lng));
    map.current = m;
    return () => { m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  useEffect(() => {
    const m = map.current; if (!m || !L) return;
    layer.current.clearLayers();
    const pts = [];
    circles.forEach((c) => {
      L.circle([c.lat, c.lng], { radius: 800, color: "#8A4B00", weight: 2, fillColor: "#F4A93B", fillOpacity: 0.35 }).bindPopup(c.popup || "").addTo(layer.current);
      pts.push([c.lat, c.lng]);
    });
    if (me) { L.circle([me.lat, me.lng], { radius: 800, color: "#0B6F6A", weight: 3, fillColor: "#6EE7D0", fillOpacity: 0.4 }).bindPopup("Tu zona aproximada").addTo(layer.current); pts.push([me.lat, me.lng]); }
    if (pts.length > 1) m.fitBounds(pts, { padding: [40, 40], maxZoom: 13 });
    else if (pts.length === 1) m.setView(pts[0], 12);
    else if (center) m.setView(center, zoom);
  }, [L, circles, me, center, zoom]);

  return <div ref={el} role="region" aria-label={label} style={{ height }} className="w-full overflow-hidden rounded-2xl border border-line" />;
}
