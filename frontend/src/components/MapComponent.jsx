import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored SVG pin markers
export const createColoredIcon = (color = '#0066FF', pulse = false) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        ${pulse ? `<div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: ${color}; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
        <div style="width: 24px; height: 24px; border-radius: 50%; background-color: ${color}; border: 3px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background-color: #ffffff;"></div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

export default function MapComponent({
  center = [13.0827, 80.2707],
  zoom = 13,
  markers = [],
  radiusCircle = null,
  onMapClick = null,
  draggableMarker = null,
  onMarkerDragEnd = null,
  style = { height: '350px', width: '100%' }
}) {
  return (
    <div style={style} className="overflow-hidden rounded-xl border border-slate-700/60 shadow-lg">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', background: '#0B1320' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeMapView center={center} zoom={zoom} />
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

        {/* Optional Radius Circle (e.g. 50 meters active duplicate radius) */}
        {radiusCircle && radiusCircle.center && (
          <Circle
            center={radiusCircle.center}
            radius={radiusCircle.radius || 50}
            pathOptions={{
              color: radiusCircle.color || '#38BDF8',
              fillColor: radiusCircle.fillColor || '#0284C7',
              fillOpacity: 0.2,
              weight: 2,
              dashArray: '4, 4'
            }}
          >
            <Popup>
              <div className="text-xs text-slate-800 p-1">
                <strong>Active Deduplication Radius:</strong> {radiusCircle.radius || 50}m<br/>
                Any matching grievance within this perimeter will be merged.
              </div>
            </Popup>
          </Circle>
        )}

        {/* Existing Markers */}
        {markers.map((m, idx) => (
          <Marker
            key={idx}
            position={[m.lat, m.lng]}
            icon={createColoredIcon(m.color || '#0066FF', m.pulse)}
          >
            {m.popup && <Popup>{m.popup}</Popup>}
          </Marker>
        ))}

        {/* Draggable Selection Marker */}
        {draggableMarker && (
          <Marker
            position={[draggableMarker.lat, draggableMarker.lng]}
            icon={createColoredIcon('#FF6B35', true)}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                if (onMarkerDragEnd) {
                  const latlng = e.target.getLatLng();
                  onMarkerDragEnd(latlng.lat, latlng.lng);
                }
              }
            }}
          >
            <Popup>
              <span className="text-xs font-semibold text-slate-900">
                Selected Complaint Location<br/>
                Lat: {draggableMarker.lat.toFixed(5)}, Lng: {draggableMarker.lng.toFixed(5)}
              </span>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
