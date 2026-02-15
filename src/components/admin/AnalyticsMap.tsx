'use client';

import { useEffect, useState } from 'react';

type Marker = {
  id: string;
  lat: number;
  lng: number;
  country: string | null;
  city: string | null;
  pagePath: string;
  createdAt: string;
};

export function AnalyticsMap({ markers }: { markers: Marker[] }) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ markers: Marker[] }> | null>(null);

  useEffect(() => {
    import('./AnalyticsMapInner').then((mod) => setMapComponent(() => mod.AnalyticsMapInner));
  }, []);

  if (!MapComponent) {
    return (
      <div className="w-full h-[400px] rounded-lg bg-netflix-dark border border-white/10 flex items-center justify-center text-netflix-light">
        Carregando mapa...
      </div>
    );
  }

  return <MapComponent markers={markers} />;
}
