import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyDevices, claimDevice, rotateDeviceToken, revokeDevice } from '../services/devices';
import './Login.css';

export function Devices() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Formulario Vincular Dispositivo
  const [claimCode, setClaimCode] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [claiming, setClaiming] = useState(false);

  // Modal para mostrar el Token (Solo se muestra 1 vez al claim o rotate)
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [modalToken, setModalToken] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [copied, setCopied] = useState(false);

  // Cargar dispositivos del usuario
  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getMyDevices();
      setDevices(data);
    } catch (err) {
      setError(err.message || 'Error al cargar dispositivos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadDevices();
    }
  }, [user, loadDevices]);

  if (!user) {
    navigate('/login');
    return null;
  }

  // Manejar vinculación de dispositivo
  const handleClaim = async (e) => {
    e.preventDefault();
    if (!claimCode.trim()) return;

    setClaiming(true);
    setError('');

    try {
      const res = await claimDevice(claimCode.trim(), deviceName.trim() || undefined);
      setModalTitle(`🎉 Dispositivo "${res.device.name || res.device.claimCode}" vinculado`);
      setModalToken(res.deviceToken);
      setShowTokenModal(true);
      setClaimCode('');
      setDeviceName('');
      await loadDevices();
    } catch (err) {
      setError(err.message || 'Error al vincular el dispositivo');
    } finally {
      setClaiming(false);
    }
  };

  // Manejar rotación de token
  const handleRotateToken = async (device) => {
    if (!window.confirm(`¿Estás seguro de que quieres rotar el token de "${device.name || device.claimCode}"? El token anterior dejará de funcionar inmediatamente.`)) {
      return;
    }

    try {
      const res = await rotateDeviceToken(device.id);
      setModalTitle(`🔑 Nuevo Token para "${device.name || device.claimCode}"`);
      setModalToken(res.deviceToken);
      setShowTokenModal(true);
      await loadDevices();
    } catch (err) {
      alert(err.message || 'Error al rotar token');
    }
  };

  // Manejar desvinculación / revocar
  const handleRevoke = async (device) => {
    if (!window.confirm(`¿Estás seguro de que deseas desvincular "${device.name || device.claimCode}"?`)) {
      return;
    }

    try {
      await revokeDevice(device.id);
      await loadDevices();
    } catch (err) {
      alert(err.message || 'Error al revocar dispositivo');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="api-keys-page">
      <div className="api-keys-container">
        <div className="page-header">
          <div className="user-info">
            <div className="user-avatar">
              {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="page-title">Mis Dispositivos (Tinacos)</h1>
              <span className="user-name">{user.name || user.email}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="create-key-btn" onClick={() => navigate('/')}>
              Ir al Dashboard
            </button>
            <button className="logout-btn" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Sección Vincular Nuevo Dispositivo */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '2rem'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#f8fafc', fontSize: '1.1rem' }}>
            ➕ Vincular Nuevo Dispositivo
          </h3>
          <form onSubmit={handleClaim} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label className="form-label">Código de Reclamo (Claim Code)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. DEMO0001"
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label className="form-label">Nombre del Dispositivo (Opcional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. Tinaco Principal"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="create-key-btn"
              disabled={claiming}
              style={{ marginTop: 0 }}
            >
              {claiming ? 'Vinculando...' : 'Vincular Dispositivo'}
            </button>
          </form>
          {error && <p className="form-error" style={{ marginTop: '0.75rem' }}>{error}</p>}
        </div>

        {/* Lista de Dispositivos */}
        <h3 style={{ color: '#f8fafc', marginBottom: '1rem' }}>Dispositivos Registrados</h3>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Cargando dispositivos...</p>
        ) : devices.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            background: 'rgba(30, 41, 59, 0.4)',
            borderRadius: '12px',
            color: '#94a3b8'
          }}>
            <p>No tienes dispositivos vinculados actualmente.</p>
            <p style={{ fontSize: '0.875rem' }}>Utiliza un código de reclamo (como <strong>DEMO0001</strong>) para vincular tu primer tinaco.</p>
          </div>
        ) : (
          <div className="api-keys-list">
            {devices.map((device) => (
              <div key={device.id} className="api-key-card">
                <div className="api-key-info">
                  <span className="api-key-name">{device.name || device.claimCode}</span>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    UID: <code>{device.deviceUid}</code> | Code: <code>{device.claimCode}</code>
                  </div>
                  <span className="api-key-date">
                    Estado: <strong style={{ color: device.status === 'active' ? '#10b981' : '#f59e0b' }}>{device.status}</strong>
                    {device.lastSeenAt && ` | Última conexión: ${new Date(device.lastSeenAt).toLocaleString()}`}
                  </span>
                </div>
                <div className="api-key-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="copy-btn"
                    style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer' }}
                    onClick={() => handleRotateToken(device)}
                    title="Rotar Device Token"
                  >
                    Rotar Token
                  </button>
                  <button
                    className="revoke-btn"
                    onClick={() => handleRevoke(device)}
                  >
                    Desvincular
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para mostrar el Token generado */}
      {showTokenModal && (
        <div className="modal-overlay" onClick={() => setShowTokenModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{modalTitle}</h2>
            <p className="modal-description">
              Copia este token de dispositivo y configúralo en tu hardware (ESP32 / Microcontrolador):
            </p>

            <div className="modal-api-key" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', wordBreak: 'break-all' }}>
              <code>{modalToken}</code>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(modalToken)}
                style={{ marginLeft: '1rem' }}
              >
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="modal-warning">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
              <p>
                <strong>¡IMPORTANTE!</strong> Por seguridad, este token solo se mostrará una vez.
                Si lo pierdes, tendrás que rotarlo nuevamente desde este panel.
              </p>
            </div>

            <div className="modal-actions">
              <button className="modal-btn primary" onClick={() => setShowTokenModal(false)}>
                Entendido y Guardado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Devices;
