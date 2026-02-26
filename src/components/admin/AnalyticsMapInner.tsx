'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type MarkerType = {
  id: string;
  lat: number;
  lng: number;
  country: string | null;
  city: string | null;
  pagePath: string;
  createdAt: string;
};

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function AnalyticsMapInner({ markers }: { markers: MarkerType[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || markers.length === 0) return;

    // Garante que um mapa anterior foi removido (ex.: Strict Mode remount)
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const center: L.LatLngTuple =
      markers.length > 0 ? [markers[0].lat, markers[0].lng] : [-15.77972, -47.92972];
    const map = L.map(container, {
      center,
      zoom: 4,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as L.LatLngTuple));
    map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });

    const layerGroup = L.layerGroup().addTo(map);
    markers.forEach((m) => {
      const popupContent = `
        <div class="text-sm min-w-[180px]">
          <p class="font-semibold">${m.city ?? m.country ?? 'Local desconhecido'}</p>
          ${m.country ? `<p class="text-gray-600">${m.country}</p>` : ''}
          <p class="text-xs text-gray-500 mt-1">Página: ${m.pagePath}</p>
          <p class="text-xs text-gray-400">${new Date(m.createdAt).toLocaleString('pt-BR')}</p>
        </div>
      `;
      L.marker([m.lat, m.lng], { icon: defaultIcon })
        .bindPopup(popupContent)
        .addTo(layerGroup);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [markers]);

  if (markers.length === 0) {
    return (
      <div className="w-full h-[400px] rounded-lg bg-netflix-dark border border-white/10 flex items-center justify-center text-netflix-light">
        Nenhuma visita com localização no período.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-[400px] rounded-lg overflow-hidden border border-white/10 bg-[#1a1a1a]"
    />
  );
}
