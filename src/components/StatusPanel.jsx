import { useMemo } from 'react';
import { APP_CONFIG } from '../config';
import './StatusPanel.css';

/**
 * Panel de estado del sistema de bombeo
 * Muestra el estado de la bomba, alertas y estadísticas
 */
export function StatusPanel({
  nivel,
  bombaEncendida,
  conectada,
  ultimaActualizacion,
  onRecargar,
  cargando = false,
}) {
  // Determinar estado de alerta
  const alerta = useMemo(() => {
    if (nivel === null) return null;
    if (nivel <= APP_CONFIG.alertLevels.critico) {
      return {
        tipo: 'critical',
        mensaje: 'Nivel crítico - Bomba activada automáticamente',
      };
    }
    if (nivel <= APP_CONFIG.alertLevels.bajo) {
      return {
        tipo: 'warning',
        mensaje: 'Nivel bajo - Considere llenar el tinaco',
      };
    }
    return null;
  }, [nivel]);

  // Formatear timestamp
  const formattedTime = useMemo(() => {
    if (!ultimaActualizacion) return '--:--:--';
    return new Date(ultimaActualizacion).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [ultimaActualizacion]);

  // Calcular litros restantes
  const litrosRestantes = useMemo(() => {
    if (nivel === null) return '--';
    return Math.round((nivel / 100) * APP_CONFIG.tankCapacity.maxLiters);
  }, [nivel]);

  return (
    <div className="status-panel">
      <h2>Estado del Sistema</h2>

      {/* Estado de la bomba */}
      <div className={`pump-status ${bombaEncendida ? 'on' : 'off'}`}>
        <div className="pump-icon">
          <svg viewBox="0 0 24 24">
            {bombaEncendida ? (
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            ) : (
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
            )}
          </svg>
        </div>
        <div className="pump-info">
          <div className="pump-label">Bomba</div>
          <div className="pump-value">
            {bombaEncendida ? 'Encendida' : 'Apagada'}
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="system-status">
        <div className="status-item">
          <div className="status-item-label">Litros</div>
          <div className="status-item-value">{litrosRestantes} L</div>
        </div>
        <div className="status-item">
          <div className="status-item-label">Capacidad</div>
          <div className="status-item-value">
            {APP_CONFIG.tankCapacity.maxLiters} L
          </div>
        </div>
        <div className="status-item">
          <div className="status-item-label">Conexión</div>
          <div className="status-item-value">
            {conectada ? 'MQTT' : 'API'}
          </div>
        </div>
        <div className="status-item">
          <div className="status-item-label">Actualizado</div>
          <div className="status-item-value">{formattedTime}</div>
        </div>
      </div>

      {/* Alertas */}
      {alerta && (
        <div className="alert-container">
          <div className={`alert ${alerta.tipo}`}>
            <svg className="alert-icon" viewBox="0 0 24 24">
              {alerta.tipo === 'critical' ? (
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              ) : (
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              )}
            </svg>
            <span>{alerta.mensaje}</span>
          </div>
        </div>
      )}

      {/* Última actualización */}
      <div className="last-update">
        Última actualización: {formattedTime}
      </div>

      {/* Botón de actualizar */}
      <button
        className={`refresh-button ${cargando ? 'loading' : ''}`}
        onClick={onRecargar}
        disabled={cargando}
      >
        <svg className="refresh-icon" viewBox="0 0 24 24">
          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
        </svg>
        {cargando ? 'Actualizando...' : 'Actualizar datos'}
      </button>
    </div>
  );
}

export default StatusPanel;