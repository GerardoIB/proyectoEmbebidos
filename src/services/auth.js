import { fetchWithAuth } from './apiClient';

export async function loginUser(email, password) {
  const data = await fetchWithAuth('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (data.token) {
    localStorage.setItem('ww_jwt_token', data.token);
  }
  return data.user;
}

export async function registerUser(email, password, name) {
  const data = await fetchWithAuth('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });

  if (data.token) {
    localStorage.setItem('ww_jwt_token', data.token);
  }
  return data.user;
}

export async function getCurrentUser() {
  return await fetchWithAuth('/auth/me');
}

export function logoutUser() {
  localStorage.removeItem('ww_jwt_token');
}
