import { useState, useEffect, useCallback, useRef } from 'react';
import { DEMO_MODE } from '../config';

/**
 * Hook para simular datos del tanque en modo demo
 * Genera valores realistas que cambian suavemente
 */
export function useDemo() {
  const [nivel, setNivel] = useState(DEMO_MODE.initialLevel);
  const [bombaEncendida, setBombaEncendida] = useState(false);
  const [conectado, setConectado] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  // Función para generar siguiente nivel
  const generarSiguienteNivel = useCallback((nivelActual, bombaEncendida) => {
    // Si la bomba está encendida, el nivel aumenta
    if (bombaEncendida) {
      // Sube entre 0.5% y 2% por ciclo
      const incremento = (Math.random() * 1.5 + 0.5);
      return Math.min(100, nivelActual + incremento);
    }

    // Si la bomba está apagada, el nivel baja (consumo)
    // Variación aleatoria
    const variacion = (Math.random() * DEMO_MODE.maxVariation * 2) - DEMO_MODE.maxVariation;
    const cambioBase = Math.random() * 0.8 + 0.2; // Consumo base entre 0.2% y 1%
    const nuevoNivel = nivelActual - cambioBase + variacion;

    return Math.max(0, Math.min(100, nuevoNivel));
  }, []);

  // Función para determinar estado de la bomba
  const determinarBomba = useCallback((nivelActual, bombaActual) => {
    // Si está llena, apagar bomba
    if (nivelActual >= 95) {
      return false;
    }

    // Si está en nivel crítico, activar bomba
    if (nivelActual <= DEMO_MODE.autoPumpLevel) {
      return true;
    }

    // Probabilidad aleatoria de cambio de estado
    if (Math.random() < DEMO_MODE.pumpActivationChance) {
      return !bombaActual;
    }

    return bombaActual;
  }, []);

  // Efecto para simular actualización de datos
  useEffect(() => {
    if (!DEMO_MODE.enabled) {
      setConectado(false);
      return;
    }

    // Simular conexión
    setConectado(true);

    // Intervalo de actualización
    intervalRef.current = setInterval(() => {
      setNivel((prevNivel) => {
        const nuevoNivel = generarSiguienteNivel(prevNivel, bombaEncendida);

        // Verificar si la bomba debe cambiar de estado
        setBombaEncendida((prevBomba) => {
          return determinarBomba(nuevoNivel, prevBomba);
        });

        return Math.round(nuevoNivel * 10) / 10; // Redondear a 1 decimal
      });
    }, DEMO_MODE.updateInterval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [generarSiguienteNivel, determinarBomba]);

  // Función para obtener el tiempo desde la última actualización
  const getTiempoUltimaActualizacion = useCallback(() => {
    return 0; // En demo siempre está actualizado
  }, []);

  return {
    nivel,
    bombaEncendida,
    conectado,
    error,
    isStale: false,
    getTiempoUltimaActualizacion,
  };
}

export default useDemo;