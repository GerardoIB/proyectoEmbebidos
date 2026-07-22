import { fetchWithAuth } from './apiClient';

// Vincular nuevo dispositivo usando el claimCode
export async function claimDevice(claimCode, name) {
  return await fetchWithAuth('/devices/claim', {
    method: 'POST',
    body: JSON.stringify({ claimCode, name }),
  });
}

// Obtener mis dispositivos
export async function getMyDevices() {
  return await fetchWithAuth('/devices');
}

// Obtener detalle + última lectura
export async function getDeviceDetail(deviceId) {
  return await fetchWithAuth(`/devices/${deviceId}`);
}

// Rotar token del dispositivo
export async function rotateDeviceToken(deviceId) {
  return await fetchWithAuth(`/devices/${deviceId}/rotate-token`, {
    method: 'POST',
  });
}

// Desvincular / revocar dispositivo
export async function revokeDevice(deviceId) {
  return await fetchWithAuth(`/devices/${deviceId}`, {
    method: 'DELETE',
  });
}
