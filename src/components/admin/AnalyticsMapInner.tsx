'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

function MapFitBounds({ markers }: { markers: MarkerType[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as L.LatLngTuple));
    map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });
  }, [map, markers]);
  return null;
}

export function AnalyticsMapInner({ markers }: { markers: MarkerType[] }) {
  if (markers.length === 0) {
    return (
      <div className="w-full h-[400px] rounded-lg bg-netflix-dark border border-white/10 flex items-center justify-center text-netflix-light">
        Nenhuma visita com localização no período.
      </div>
    );
  }

  const center = markers.length > 0
    ? [markers[0].lat, markers[0].lng] as [number, number]
    : [-15.77972, -47.92972] as [number, number];

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border border-white/10">
      <MapContainer
        center={center}
        zoom={4}
        className="h-full w-full"
        style={{ background: '#1a1a1a' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFitBounds markers={markers} />
        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={defaultIcon}>
            <Popup>
              <div className="text-sm min-w-[180px]">
                <p className="font-semibold">{m.city ?? m.country ?? 'Local desconhecido'}</p>
                {m.country && <p className="text-gray-600">{m.country}</p>}
                <p className="text-xs text-gray-500 mt-1">Página: {m.pagePath}</p>
                <p className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString('pt-BR')}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
