import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth, api } from '../context/AuthContext';

// Fix default icon paths for Vite/bundler environments
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Driver {
  id: string; name: string; status: string;
  acceptanceRate: string; currentLoad: number;
  vehicleType: string; lat: number; lng: number;
}

const STATUS_LABEL: Record<string, string> = {
  available:  'Disponible',
  on_mission: 'En mission',
  offline:    'Hors ligne',
};
const STATUS_PILL: Record<string, string> = {
  available:  'good',
  on_mission: 'warn',
  offline:    '',
};
const STATUS_COLOR: Record<string, string> = {
  available:  '#7ec46a',
  on_mission: '#ffe27a',
  offline:    '#aaa',
};

const mgmtNav = [
  'PERFORMANCE',
  { key: 'dash', icon: '📊', label: 'Tableau de bord', path: '/dashboard' },
  { key: 'sla',  icon: '⏱',  label: 'SLA & délais',   path: '/sla' },
  'FLOTTE',
  { key: 'drv',  icon: '🚐', label: 'Chauffeurs', path: '/drivers' },
  { key: 'geo',  icon: '🗺',  label: 'Géographie', path: '/geo' },
  'ADMINISTRATION',
  { key: 'team', icon: '👥', label: 'Équipe',      path: '/team' },
];

function makeIcon(status: string) {
  const color = STATUS_COLOR[status] ?? '#aaa';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22S28 23.33 28 14C28 6.27 21.73 0 14 0z"
            fill="${color}" stroke="#1f1d1a" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="6" fill="#fff" opacity=".85"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [28, 36],
    iconAnchor: [14, 36],
    popupAnchor:[0, -36],
  });
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], 13, { duration: 1 }); }, [lat, lng, map]);
  return null;
}

export default function GeoPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Driver | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    api.get('/drivers')
      .then(r => setDrivers(r.data.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const onMap    = drivers.filter(d => +d.lat !== 0 || +d.lng !== 0);
  const noPos    = drivers.filter(d => +d.lat === 0 && +d.lng === 0);
  const filtered = filterStatus === 'all' ? drivers : drivers.filter(d => d.status === filterStatus);

  const available  = drivers.filter(d => d.status === 'available').length;
  const onMission  = drivers.filter(d => d.status === 'on_mission').length;
  const withPos    = onMap.length;

  return (
    <div className="wf-shell">
      <aside className="wf-side">
        <div className="side-logo">transvirex</div>
        <div className="side-role">Direction · {user?.name}</div>
        {mgmtNav.map((item, i) => {
          if (typeof item === 'string') return <div key={i} className="side-group">{item}</div>;
          return (
            <div
              key={item.key}
              className={`side-nav ${item.key === 'geo' ? 'on' : ''}`}
              onClick={() => 'path' in item && item.path && navigate(item.path)}
            >
              <span className="ic">{item.icon}</span> {item.label}
            </div>
          );
        })}
        <div className="side-bottom">
          <div className="side-logout" onClick={logout}>↩ Déconnexion</div>
        </div>
      </aside>

      <main className="wf-shell-main" style={{ overflow: 'hidden' }}>
        <div className="wf-appbar">
          <span className="bar-crumbs">Flotte / Géographie</span>
          <div className="bar-actions">
            <span className="wf-pill good">{available} disponible{available !== 1 ? 's' : ''}</span>
            <span className="wf-pill warn">{onMission} en mission</span>
            <span className="mono muted" style={{ fontSize: 11 }}>{withPos} localisé{withPos !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {loading ? (
          <div className="mono muted" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Chargement…
          </div>
        ) : (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 46px)' }}>
            {/* Left panel */}
            <div style={{
              width: 270, flexShrink: 0, borderRight: '1.3px dashed rgba(31,29,26,.2)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              {/* Filter */}
              <div style={{ padding: '10px 12px', borderBottom: '1px dashed rgba(31,29,26,.15)' }}>
                <div className="mono muted" style={{ fontSize: 10, marginBottom: 6, textTransform: 'uppercase' }}>Filtrer par statut</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['all', 'available', 'on_mission', 'offline'].map(s => (
                    <span
                      key={s}
                      className={`wf-pill${filterStatus === s ? ' fill' : ''}`}
                      style={{ cursor: 'pointer', fontSize: 10 }}
                      onClick={() => setFilterStatus(s)}
                    >
                      {s === 'all' ? 'Tous' : STATUS_LABEL[s]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Driver list */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {filtered.map(d => {
                  const hasPos = +d.lat !== 0 || +d.lng !== 0;
                  return (
                    <div
                      key={d.id}
                      onClick={() => hasPos && setSelected(d)}
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px dashed rgba(31,29,26,.12)',
                        cursor: hasPos ? 'pointer' : 'default',
                        background: selected?.id === d.id ? 'var(--paper-2)' : 'transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                          background: STATUS_COLOR[d.status] ?? '#aaa',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700,
                        }}>
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</span>
                        <span className={`wf-pill ${STATUS_PILL[d.status] ?? ''}`} style={{ fontSize: 9, marginLeft: 'auto' }}>
                          {STATUS_LABEL[d.status] ?? d.status}
                        </span>
                      </div>
                      <div className="mono muted" style={{ fontSize: 10, paddingLeft: 32 }}>
                        {hasPos
                          ? `📍 ${(+d.lat).toFixed(3)}, ${(+d.lng).toFixed(3)}`
                          : '— Pas de position'}
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="mono muted" style={{ textAlign: 'center', padding: '24px 0', fontSize: 11 }}>
                    Aucun chauffeur
                  </div>
                )}
              </div>
            </div>

            {/* Map */}
            <div style={{ flex: 1, position: 'relative' }}>
              <MapContainer
                center={[36.737, 3.086]}
                zoom={6}
                style={{ width: '100%', height: '100%' }}
                scrollWheelZoom
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {selected && <FlyTo lat={+selected.lat} lng={+selected.lng} />}
                {onMap.map(d => (
                  <Marker
                    key={d.id}
                    position={[+d.lat, +d.lng]}
                    icon={makeIcon(d.status)}
                    eventHandlers={{ click: () => setSelected(d) }}
                  >
                    <Popup>
                      <div style={{ fontFamily: 'ui-sans-serif, system-ui', minWidth: 140 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{d.name}</div>
                        <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>
                          {STATUS_LABEL[d.status] ?? d.status}
                        </div>
                        <div style={{ fontSize: 11 }}>
                          Charge : <b>{d.currentLoad}</b> course{d.currentLoad !== 1 ? 's' : ''}
                        </div>
                        {d.vehicleType && (
                          <div style={{ fontSize: 11, marginTop: 2 }}>Véhicule : {d.vehicleType}</div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>

              {/* Legend overlay */}
              <div style={{
                position: 'absolute', bottom: 16, right: 16, zIndex: 1000,
                background: 'rgba(250,247,241,.92)', border: '1.3px dashed rgba(31,29,26,.25)',
                borderRadius: 6, padding: '8px 12px', backdropFilter: 'blur(4px)',
              }}>
                {[
                  { color: STATUS_COLOR.available,  label: 'Disponible' },
                  { color: STATUS_COLOR.on_mission,  label: 'En mission' },
                  { color: STATUS_COLOR.offline,     label: 'Hors ligne' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, border: '1px solid #1f1d1a' }} />
                    <span className="mono" style={{ fontSize: 10 }}>{l.label}</span>
                  </div>
                ))}
                {noPos.length > 0 && (
                  <div className="mono muted" style={{ fontSize: 9, marginTop: 4, borderTop: '1px dashed rgba(31,29,26,.2)', paddingTop: 4 }}>
                    {noPos.length} sans position GPS
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
