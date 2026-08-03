'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { MapAsset } from '@/lib/api';
import 'leaflet/dist/leaflet.css';

const statusColor: Record<string, string> = {
  ACTIVE: '#1680ab',
  ARREARS: '#c01725',
  AVAILABLE: '#eab024',
  PAID_UP: '#16a34a',
  RETURNED: '#929191',
  WRITTEN_OFF: '#2c3d49',
};

function pinIcon(status: string, immobilized: boolean, selected: boolean) {
  const color = immobilized ? '#f97316' : statusColor[status] ?? '#94a3b8';
  const size = selected ? 22 : 14;
  const border = selected ? 3 : 2;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:${border}px solid white;box-shadow:0 0 0 ${selected ? 3 : 1}px rgba(0,0,0,.35);transform:translate(${selected ? -4 : 0}px, ${selected ? -4 : 0}px);transition:transform .15s ease"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    map.fitBounds(points, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

function FocusSelected({
  asset,
}: {
  asset: MapAsset | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!asset || asset.lat == null || asset.lng == null) return;
    map.flyTo([asset.lat, asset.lng], Math.max(map.getZoom(), 13), {
      duration: 0.55,
    });
  }, [asset, map]);
  return null;
}

export function FleetMap({
  assets,
  selectedId,
  onSelect,
}: {
  assets: MapAsset[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}) {
  const points = assets
    .filter((asset) => asset.lat != null && asset.lng != null)
    .map((asset) => [asset.lat as number, asset.lng as number] as [number, number]);

  const center: [number, number] =
    points[0] ?? [-26.1433, 28.0497]; // Randburg default

  const selected =
    assets.find((asset) => asset.id === selectedId) ?? null;

  return (
    <MapContainer
      center={center}
      zoom={11}
      className="h-[560px] w-full rounded-lg"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      <FocusSelected asset={selected} />
      {assets.map((asset) => {
        if (asset.lat == null || asset.lng == null) return null;
        const selectedPin = asset.id === selectedId;
        return (
          <Marker
            key={asset.id}
            position={[asset.lat, asset.lng]}
            icon={pinIcon(asset.status, asset.isImmobilized, selectedPin)}
            eventHandlers={{
              click: () => onSelect?.(asset.id),
            }}
            zIndexOffset={selectedPin ? 1000 : 0}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {asset.year} {asset.make} {asset.model}
                </p>
                <p className="font-mono text-xs">{asset.registration}</p>
                <p>
                  {asset.status}
                  {asset.isImmobilized ? ' · Immobilized' : ''}
                </p>
                <p>Odometer: {asset.currentOdometerKm.toLocaleString()} km</p>
                <p>Driver score: {asset.driverScore ?? '—'}</p>
                {asset.client ? (
                  <p>
                    <Link
                      href={`/clients/${asset.client.id}`}
                      className="text-brand underline"
                    >
                      {asset.client.firstName} {asset.client.lastName}
                    </Link>
                  </p>
                ) : (
                  <p className="text-brand-grey">No renter assigned</p>
                )}
                <div className="flex flex-col gap-1 pt-1">
                  <Link
                    href={`/fleet/${asset.id}`}
                    className="text-brand underline"
                  >
                    Open vehicle
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
