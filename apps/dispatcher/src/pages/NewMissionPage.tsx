import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';
import { dispatchNav } from '../lib/dispatchNav';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const pickupIcon  = L.divIcon({ className: '', html: '📍', iconSize: [28, 28], iconAnchor: [14, 28] });
const deliveryIcon = L.divIcon({ className: '', html: '🏁', iconSize: [28, 28], iconAnchor: [14, 28] });

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

const MISSION_TYPES = [
  { value: 'standard', label: 'Standard' },
  { value: 'express',  label: 'Express'  },
  { value: 'lourd',    label: 'Lourd'    },
  { value: 'fragile',  label: 'Fragile'  },
];
const PRIORITIES = [
  { value: 'low',    label: 'Faible',  cls: '' },
  { value: 'medium', label: 'Normale', cls: 'warn' },
  { value: 'high',   label: 'Haute',   cls: 'warn' },
  { value: 'urgent', label: 'Urgente', cls: 'bad'  },
];

export default function NewMissionPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    clientName: '', pickupAddress: '', deliveryAddress: '', deadline: '',
    price: '', missionType: 'standard', weightKg: '', notes: '', priority: 'medium',
    pickupLat: 0, pickupLng: 0, deliveryLat: 0, deliveryLng: 0,
  });
  const [activePoint, setActivePoint] = useState<'pickup' | 'delivery'>('pickup');
  const [geocoding, setGeocoding] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await r.json();
      return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  async function handleMapClick(lat: number, lng: number) {
    setGeocoding(true);
    const address = await reverseGeocode(lat, lng);
    setGeocoding(false);
    if (activePoint === 'pickup') {
      setForm(prev => ({ ...prev, pickupLat: lat, pickupLng: lng, pickupAddress: address }));
      setActivePoint('delivery');
    } else {
      setForm(prev => ({ ...prev, deliveryLat: lat, deliveryLng: lng, deliveryAddress: address }));
    }
  }

  function resetMap() {
    setActivePoint('pickup');
    setForm(prev => ({ ...prev, pickupLat: 0, pickupLng: 0, deliveryLat: 0, deliveryLng: 0, pickupAddress: '', deliveryAddress: '' }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const r = await api.post('/missions', {
        clientName:      form.clientName,
        pickupAddress:   form.pickupAddress,
        pickupLat:       form.pickupLat   || undefined,
        pickupLng:       form.pickupLng   || undefined,
        deliveryAddress: form.deliveryAddress,
        deliveryLat:     form.deliveryLat  || undefined,
        deliveryLng:     form.deliveryLng  || undefined,
        deadline:        form.deadline     || undefined,
        price:           parseFloat(form.price) || 0,
        missionType:     form.missionType,
        weightKg:        parseFloat(form.weightKg) || 0,
        notes:           form.notes        || undefined,
        priority:        form.priority,
      });
      navigate(`/missions/${r.data.data.id}`);
    } catch {
      setError('Impossible de créer la mission. Vérifiez les informations saisies.');
    } finally { setLoading(false); }
  }

  return (
    <div className="wf-shell">
      {/* Sidebar */}
      <aside className="wf-side">
        <div className="side-logo">transvirex</div>
        <div className="side-role">Dispatcher</div>
        {dispatchNav.map((item, i) => {
          if (typeof item === 'string') return <div key={i} className="side-group">{item}</div>;
          return (
            <div
              key={item.key}
              className={`side-nav ${item.key === 'new' ? 'on' : ''}`}
              onClick={() => item.path && navigate(item.path)}
            >
              <span className="ic">{item.icon}</span>
              {item.label}
            </div>
          );
        })}
      </aside>

      <div className="wf-shell-main">
        <div className="wf-appbar">
          <span className="bar-crumbs">Missions / + Nouvelle mission</span>
          <div className="bar-actions">
            <button className="wf-btn" onClick={() => navigate('/board')}>← Annuler</button>
          </div>
        </div>

        <div className="wf-shell-content" style={{ maxWidth: 720 }}>
          <div className="script" style={{ fontSize: 30, marginBottom: 4 }}>Créer une mission</div>
          <div className="mono muted" style={{ fontSize: 11, marginBottom: 18 }}>
            Remplissez les informations de la nouvelle course.
          </div>

          {error && <div className="wf-error" style={{ marginBottom: 14 }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* ── Section 1 — Trajet & client ── */}
            <div className="wf-box solid" style={{ padding: '14px 16px' }}>
              <div className="mono muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
                Trajet & client
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label className="wf-field-label">Client *</label>
                  <input
                    type="text" value={form.clientName}
                    onChange={e => set('clientName', e.target.value)}
                    required placeholder="Mme Lefèvre"
                    className="wf-inp" style={{ marginTop: 4, width: '100%' }}
                  />
                </div>

                {/* ── Map picker ── */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span
                      className={`wf-pill${activePoint === 'pickup' ? ' fill' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setActivePoint('pickup')}
                    >
                      📍 Enlèvement {form.pickupLat !== 0 ? '✓' : ''}
                    </span>
                    <span
                      className={`wf-pill${activePoint === 'delivery' ? ' fill' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setActivePoint('delivery')}
                    >
                      🏁 Livraison {form.deliveryLat !== 0 ? '✓' : ''}
                    </span>
                    <span className="mono muted" style={{ fontSize: 10 }}>
                      {activePoint === 'pickup' ? '— cliquez pour placer l\'enlèvement' : '— cliquez pour placer la livraison'}
                    </span>
                    {(form.pickupLat !== 0 || form.deliveryLat !== 0) && (
                      <button type="button" className="wf-btn sm" style={{ marginLeft: 'auto' }} onClick={resetMap}>
                        ↺ Effacer
                      </button>
                    )}
                  </div>

                  <div style={{ height: 300, borderRadius: 8, overflow: 'hidden', border: '1.5px dashed var(--ink)', cursor: 'crosshair' }}>
                    <MapContainer
                      center={[36.7538, 3.0588]}
                      zoom={11}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                      <MapClickHandler onMapClick={handleMapClick} />
                      {form.pickupLat !== 0 && (
                        <Marker position={[form.pickupLat, form.pickupLng]} icon={pickupIcon}>
                          <Popup>📍 {form.pickupAddress || 'Enlèvement'}</Popup>
                        </Marker>
                      )}
                      {form.deliveryLat !== 0 && (
                        <Marker position={[form.deliveryLat, form.deliveryLng]} icon={deliveryIcon}>
                          <Popup>🏁 {form.deliveryAddress || 'Livraison'}</Popup>
                        </Marker>
                      )}
                    </MapContainer>
                  </div>

                  {geocoding && (
                    <div className="mono muted" style={{ fontSize: 10, marginTop: 4 }}>Recherche de l'adresse…</div>
                  )}
                </div>

                {/* Address fields — auto-filled by Nominatim, still editable */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="wf-field-label">📍 Adresse d'enlèvement *</label>
                    <input
                      type="text" value={form.pickupAddress}
                      onChange={e => set('pickupAddress', e.target.value)}
                      required placeholder="Cliquez sur la carte ou saisissez"
                      className="wf-inp" style={{ marginTop: 4, width: '100%' }}
                    />
                  </div>
                  <div>
                    <label className="wf-field-label">🏁 Adresse de livraison *</label>
                    <input
                      type="text" value={form.deliveryAddress}
                      onChange={e => set('deliveryAddress', e.target.value)}
                      required placeholder="Cliquez sur la carte ou saisissez"
                      className="wf-inp" style={{ marginTop: 4, width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 2 — Colis & tarif ── */}
            <div className="wf-box solid" style={{ padding: '14px 16px' }}>
              <div className="mono muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
                Colis & tarif
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label className="wf-field-label">Prix (DZD)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.price}
                    onChange={e => set('price', e.target.value)}
                    placeholder="0"
                    className="wf-inp" style={{ marginTop: 4, width: '100%' }}
                  />
                </div>
                <div>
                  <label className="wf-field-label">Type de mission</label>
                  <select
                    value={form.missionType}
                    onChange={e => set('missionType', e.target.value)}
                    className="wf-inp" style={{ marginTop: 4, width: '100%' }}
                  >
                    {MISSION_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="wf-field-label">Poids (kg)</label>
                  <input
                    type="number" min="0" step="0.1"
                    value={form.weightKg}
                    onChange={e => set('weightKg', e.target.value)}
                    placeholder="0"
                    className="wf-inp" style={{ marginTop: 4, width: '100%' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <label className="wf-field-label">Notes / Instructions spéciales</label>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Colis fragile, code d'accès 1234, sonner chez le gardien…"
                  className="wf-inp"
                  rows={2}
                  style={{ marginTop: 4, width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            {/* ── Section 3 — Délai & priorité ── */}
            <div className="wf-box solid" style={{ padding: '14px 16px' }}>
              <div className="mono muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
                Délai & priorité
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="wf-field-label">Créneau de livraison</label>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {[
                      { label: 'ASAP', h: 0 },
                      { label: '≤ 2h', h: 2 },
                      { label: "Aujourd'hui", h: 8 },
                      { label: 'Demain', h: 24 },
                    ].map(p => (
                      <span
                        key={p.label}
                        className="wf-pill"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          const d = new Date();
                          d.setHours(d.getHours() + p.h);
                          set('deadline', d.toISOString().slice(0, 16));
                        }}
                      >
                        {p.label}
                      </span>
                    ))}
                  </div>
                  <input
                    type="datetime-local" value={form.deadline}
                    onChange={e => set('deadline', e.target.value)}
                    className="wf-inp" style={{ marginTop: 8, width: '100%' }}
                  />
                </div>
                <div>
                  <label className="wf-field-label">Priorité</label>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {PRIORITIES.map(p => (
                      <span
                        key={p.value}
                        className={`wf-pill ${p.cls}${form.priority === p.value ? ' fill' : ''}`}
                        style={{ cursor: 'pointer', fontWeight: form.priority === p.value ? 700 : 400 }}
                        onClick={() => set('priority', p.value)}
                      >
                        {p.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button type="button" className="wf-btn" onClick={() => navigate('/board')}>← Annuler</button>
              <button type="submit" disabled={loading} className="wf-btn fill">
                {loading ? 'Création…' : 'Créer la mission →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
