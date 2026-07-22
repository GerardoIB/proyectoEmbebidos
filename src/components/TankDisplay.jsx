import { useMemo } from 'react';
import { APP_CONFIG } from '../config';
import './TankDisplay.css';

/**
 * Componente de visualización del nivel del tinaco en 3D
 * Muestra un tanque realista con efectos de agua animados
 */
export function TankDisplay({ nivel = 0, conectada = false, isStale = false }) {
  // Calcular la clase de estado según el nivel
  const estadoNivel = useMemo(() => {
    if (nivel === null || nivel === undefined) return 'unknown';
    if (nivel <= APP_CONFIG.alertLevels.critico) return 'critical';
    if (nivel <= APP_CONFIG.alertLevels.bajo) return 'warning';
    return 'normal';
  }, [nivel]);

  // Calcular altura del agua en porcentaje
  const alturaAgua = nivel !== null ? `${nivel}%` : '0%';

  // Calcular capacidad en litros
  const capacidadLitros = useMemo(() => {
    if (nivel === null) return '--';
    return Math.round((nivel / 100) * APP_CONFIG.tankCapacity.maxLiters);
  }, [nivel]);

  // Determinar estado de conexión
  const statusClass = useMemo(() => {
    if (!conectada) return 'disconnected';
    if (isStale) return 'stale';
    return 'connected';
  }, [conectada, isStale]);

  const statusText = useMemo(() => {
    if (!conectada) return 'Sin conexión';
    if (isStale) return 'Datos desactualizados';
    return 'Conectado';
  }, [conectada, isStale]);

  // Generar marcas del medidor
  const marcas = [100, 75, 50, 25, 0];

  return (
    <div className="tank-container">
      <div className="tank-wrapper">
        <div className="tank">
          {/* Paredes 3D */}
          <div className="tank-wall tank-top"></div>
          <div className="tank-wall tank-bottom"></div>
          <div className="tank-wall tank-side left"></div>
          <div className="tank-wall tank-side right"></div>

          {/* Pared frontal con agua */}
          <div className="tank-wall tank-front">
            {/* Agua */}
            <div className="water" style={{ height: alturaAgua }}>
              {/* Burbujas */}
              {nivel > 10 && (
                <div className="bubbles">
                  <div className="bubble"></div>
                  <div className="bubble"></div>
                  <div className="bubble"></div>
                  <div className="bubble"></div>
                  <div className="bubble"></div>
                </div>
              )}
            </div>

            {/* Brillo */}
            <div className="water-shine"></div>

            {/* Medidor de nivel */}
            <div className="tank-level-indicator">
              {marcas.map((marca) => (
                <div
                  key={marca}
                  className={`level-mark ${
                    marca <= APP_CONFIG.alertLevels.critico
                      ? 'critical'
                      : marca <= APP_CONFIG.alertLevels.bajo
                      ? 'warning'
                      : ''
                  }`}
                  data-value={`${marca}%`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Porcentaje */}
      <div className={`tank-percentage ${estadoNivel}`}>
        {nivel !== null ? `${Math.round(nivel)}%` : '--%'}
      </div>

      {/* Etiqueta */}
      <div className="tank-label">Nivel del Tinaco</div>

      {/* Capacidad */}
      <div className="tank-capacity">
        {capacidadLitros} / {APP_CONFIG.tankCapacity.maxLiters} L
      </div>

      {/* Estado de conexión */}
      <div className="connection-status">
        <div className={`status-dot ${statusClass}`}></div>
        <span>{statusText}</span>
      </div>
    </div>
  );
}

export default TankDisplay;