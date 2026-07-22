import { useState, useEffect, useCallback } from 'react';
import { getEstadoDispositivo, getHistorialLecturas, getConfigDispositivo, updateConfigDispositivo } from '../services/readings';

/**
 * Hook personalizado para consultar estado, historial y configuración de un dispositivo real desde el backend
 */
export function useWaterAPI(deviceId) {
  const [nivel, setNivel] = useState(0);
  const [bombaEncendida, setBombaEncendida] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [config, setConfig] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [conectado, setConectado] = useState(true);

  // Consultar estado actual (nivel y bomba)
  const fetchEstado = useCallback(async (targetDeviceId = deviceId) => {
    if (!targetDeviceId) return null;
    try {
      const data = await getEstadoDispositivo(targetDeviceId);
      setNivel(data.nivel ?? 0);
      setBombaEncendida(!!data.bomba);
      setLastSeen(data.lastSeenAt);
      setConectado(true);
      setError(null);
      return data;
    } catch (err) {
      setError(err.message);
      setConectado(false);
      return null;
    }
  }, [deviceId]);

  // Consultar historial
  const fetchHistorial = useCallback(async (targetDeviceId = deviceId) => {
    if (!targetDeviceId) return [];
    try {
      const data = await getHistorialLecturas(targetDeviceId);
      setHistorial(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      console.error('Error al cargar historial:', err);
      return [];
    }
  }, [deviceId]);

  // Consultar configuración del dispositivo
  const fetchConfig = useCallback(async (targetDeviceId = deviceId) => {
    if (!targetDeviceId) return null;
    try {
      const data = await getConfigDispositivo(targetDeviceId);
      setConfig(data);
      return data;
    } catch (err) {
      console.error('Error al cargar config:', err);
      return null;
    }
  }, [deviceId]);

  // Cargar todo
  const fetchAll = useCallback(async (targetDeviceId = deviceId) => {
    if (!targetDeviceId) return;
    setCargando(true);
    try {
      await Promise.all([
        fetchEstado(targetDeviceId),
        fetchHistorial(targetDeviceId),
        fetchConfig(targetDeviceId),
      ]);
    } finally {
      setCargando(false);
    }
  }, [fetchEstado, fetchHistorial, fetchConfig]);

  useEffect(() => {
    if (deviceId) {
      fetchAll(deviceId);
    }
  }, [deviceId, fetchAll]);

  return {
    nivel,
    bombaEncendida,
    lastSeen,
    historial,
    config,
    cargando,
    error,
    conectado,
    fetchEstado,
    fetchHistorial,
    fetchConfig,
    fetchAll,
    updateConfig: (configData) => deviceId ? updateConfigDispositivo(deviceId, configData) : null,
  };
}

export default useWaterAPI;