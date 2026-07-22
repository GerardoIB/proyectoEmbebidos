import { fetchWithAuth } from './apiClient';

// Obtener nivel actual del dispositivo
export async function getNivelDispositivo(deviceId) {
  return await fetchWithAuth(`/nivel?deviceId=${deviceId}`);
}

// Obtener estado actual (nivel, bomba, lastSeenAt)
export async function getEstadoDispositivo(deviceId) {
  return await fetchWithAuth(`/estado?deviceId=${deviceId}`);
}

// Obtener historial de lecturas
export async function getHistorialLecturas(deviceId, from, to) {
  let url = `/historial?deviceId=${deviceId}`;
  if (from) url += `&from=${encodeURIComponent(from)}`;
  if (to) url += `&to=${encodeURIComponent(to)}`;
  return await fetchWithAuth(url);
}

// Obtener configuración de umbrales del tinaco
export async function getConfigDispositivo(deviceId) {
  return await fetchWithAuth(`/config?deviceId=${deviceId}`);
}

// Actualizar configuración de umbrales
export async function updateConfigDispositivo(deviceId, configData) {
  return await fetchWithAuth(`/config?deviceId=${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify(configData),
  });
}
