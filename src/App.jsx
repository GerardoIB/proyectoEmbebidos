import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useDemo } from './hooks/useDemo';
import { useMqtt } from './hooks/useMqtt';
import { useWaterAPI } from './hooks/useWaterAPI';
import { useAuth } from './context/AuthContext';
import { getMyDevices } from './services/devices';
import { DEMO_MODE } from './config';
import Login from './pages/Login';
import Devices from './pages/Devices';
import TankDisplay from './components/TankDisplay';
import StatusPanel from './components/StatusPanel';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

// Variable de entorno para verificar si está activo el modo demo
const isDemoEnabled = import.meta.env.VITE_DEMO_MODE === 'true' || (import.meta.env.VITE_DEMO_MODE === undefined && DEMO_MODE.enabled);

function Dashboard() {
  const { user, logout } = useAuth();
  const demo = useDemo();

  const [userDevices, setUserDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [loadingDevices, setLoadingDevices] = useState(!isDemoEnabled);

  // Hook MQTT real por dispositivo
  const mqtt = useMqtt(selectedDeviceId);

  // Cargar dispositivos si estamos conectándonos a la API real
  const loadDevices = useCallback(async () => {
    if (isDemoEnabled) return;
    try {
      setLoadingDevices(true);
      const devices = await getMyDevices();
      setUserDevices(devices);
      if (devices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(devices[0].id);
      }
    } catch (err) {
      console.error('Error al obtener dispositivos:', err);
    } finally {
      setLoadingDevices(false);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Hook de API real con el dispositivo seleccionado (para carga inicial / fallback / historial)
  const api = useWaterAPI(selectedDeviceId);

  // Polling regular como respaldo cuando el modo backend está activo y MQTT no esté transmitiendo
  useEffect(() => {
    if (isDemoEnabled || !selectedDeviceId) return;

    const interval = setInterval(() => {
      api.fetchEstado(selectedDeviceId);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedDeviceId, api]);

  // Seleccionar qué fuente de datos mostrar (Demo, MQTT en tiempo real, o API REST de respaldo)
  const usaMqttTiempoReal = !isDemoEnabled && mqtt.conectado && mqtt.nivel !== null;

  const datos = isDemoEnabled ? demo : usaMqttTiempoReal ? {
    nivel: mqtt.nivel,
    bombaEncendida: mqtt.bombaEncendida,
    conectado: true,
    isStale: mqtt.isStale,
  } : {
    nivel: api.nivel ?? 0,
    bombaEncendida: api.bombaEncendida ?? false,
    conectado: api.conectado,
    isStale: !api.conectado,
  };

  const selectedDeviceObj = userDevices.find(d => d.id === selectedDeviceId);

  return (
    <div className="app">
      <div className="bg-pattern"></div>

      <header className="app-header">
        <div className="header-content">
          <div className="logo-container">
            <svg className="logo-icon" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 20 C12 15 16 12 20 12 C24 12 28 15 28 20 C28 25 24 28 20 28 C16 28 12 25 12 20Z"
                fill="currentColor" opacity="0.3"/>
              <path d="M15 20 C15 17 17 15 20 15 C23 15 25 17 25 20"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h1>WereableWater</h1>
          </div>

          <div className="header-actions">
            {!isDemoEnabled && userDevices.length > 1 && (
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                {userDevices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name || d.claimCode}
                  </option>
                ))}
              </select>
            )}

            <span className={`badge ${isDemoEnabled ? 'demo' : 'live'}`}>
              <span className="badge-dot"></span>
              {isDemoEnabled ? 'Modo Demo' : 'Backend Real'}
            </span>

            <Link to="/devices" className="api-keys-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
              Mis Dispositivos
            </Link>

            <button
              onClick={logout}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Salir
            </button>
          </div>
        </div>
        <p className="subtitle">
          {selectedDeviceObj ? `Dispositivo: ${selectedDeviceObj.name || selectedDeviceObj.claimCode}` : 'Sistema de Monitoreo de Tanque de Agua'}
        </p>
      </header>

      <main className="app-main">
        {!isDemoEnabled && !loadingDevices && userDevices.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            background: 'rgba(30, 41, 59, 0.6)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            maxWidth: '600px',
            margin: '2rem auto'
          }}>
            <h2 style={{ color: '#f8fafc', marginBottom: '1rem' }}>💧 No tienes dispositivos vinculados</h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
              Para comenzar a visualizar el nivel de tu tanque en tiempo real, vincula tu primer dispositivo utilizando su Código de Reclamo (ej. <strong>DEMO0001</strong>).
            </p>
            <Link to="/devices" className="create-key-btn" style={{ display: 'inline-flex', textDecoration: 'none' }}>
              Vincular Dispositivo Ahora
            </Link>
          </div>
        ) : (
          <div className="dashboard-grid">
            <div className="tank-column">
              <div className="tank-card">
                <TankDisplay
                  nivel={datos.nivel}
                  conectada={datos.conectado}
                  isStale={datos.isStale}
                />
              </div>
            </div>

            <div className="status-column">
              <StatusPanel
                nivel={datos.nivel}
                bombaEncendida={datos.bombaEncendida}
                conectada={datos.conectado}
                ultimaActualizacion={new Date()}
                onRecargar={() => isDemoEnabled ? null : api.fetchAll(selectedDeviceId)}
                cargando={api.cargando}
              />

              <div className="metrics-card">
                <h3>Métricas en Tiempo Real</h3>
                <div className="metrics-grid">
                  <div className="metric">
                    <div className="metric-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                    <div className="metric-info">
                      <span className="metric-value">{(datos.nivel / 100 * (api.config?.maxLiters || 1000)).toFixed(0)}L</span>
                      <span className="metric-label">Agua disponible</span>
                    </div>
                  </div>
                  <div className="metric">
                    <div className={`metric-icon ${datos.bombaEncendida ? 'active' : ''}`}>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                      </svg>
                    </div>
                    <div className="metric-info">
                      <span className="metric-value">{datos.bombaEncendida ? 'Activa' : 'Inactiva'}</span>
                      <span className="metric-label">Bomba de llenado</span>
                    </div>
                  </div>
                  <div className="metric">
                    <div className="metric-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                      </svg>
                    </div>
                    <div className="metric-info">
                      <span className="metric-value">{isDemoEnabled ? '3s (Demo)' : usaMqttTiempoReal ? 'Tiempo Real (MQTT)' : '5s (API REST)'}</span>
                      <span className="metric-label">Frecuencia</span>
                    </div>
                  </div>
                  <div className="metric">
                    <div className="metric-icon connected">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
                      </svg>
                    </div>
                    <div className="metric-info">
                      <span className="metric-value">{datos.conectado ? 'Conectado' : 'Desconectado'}</span>
                      <span className="metric-label">Estado API Backend</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <span className="footer-brand">WereableWater v1.0</span>
          <span className="footer-divider">•</span>
          <span className="footer-status">
            {datos.conectado ? 'API Backend Conectada' : 'Sin comunicación con el backend'}
          </span>
        </div>
      </footer>
    </div>
  );
}

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: 'white'
      }}>
        Cargando WereableWater...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/devices"
        element={
          <ProtectedRoute>
            <Devices />
          </ProtectedRoute>
        }
      />
      <Route
        path="/api-keys"
        element={
          <ProtectedRoute>
            <Devices />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;