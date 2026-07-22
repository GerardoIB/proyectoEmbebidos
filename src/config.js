/**
 * Configuración centralizada del sistema WereableWater
 * Edita estos valores para cambiar las conexiones sin modificar otros archivos
 */

// ============================================
// MODO DE DEMO - Simulación de datos
// ============================================
export const DEMO_MODE = {
  // true = simula datos, false = usa MQTT real
  enabled: true,
  // Intervalo de actualización en modo demo (ms)
  updateInterval: 3000,
  // Nivel inicial del tanque (%)
  initialLevel: 75,
  // Variación aleatoria máxima por actualización
  maxVariation: 5,
  // Probabilidad de que la bomba se encienda (0-1)
  pumpActivationChance: 0.15,
  // Nivel crítico que activa la bomba automáticamente
  autoPumpLevel: 25,
};

// ============================================
// Configuración del broker MQTT
// ============================================
export const MQTT_CONFIG = {
  // URL del broker MQTT (ws:// para WebSocket, mqtt:// para conexión nativa)
  brokerUrl: 'ws://localhost:9001',
  // Topic donde se publica el nivel del tinaco
  topicLevel: 'tinaco/nivel',
  // Topic donde se publica el estado de la bomba
  topicPump: 'tinaco/bomba',
  // Opciones de conexión
  options: {
    clientId: 'wereablewater_frontend_' + Math.random().toString(16).slice(2, 10),
    keepalive: 60,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  },
};

// ============================================
// Configuración de la API REST
// ============================================
export const API_CONFIG = {
  // URL base del servidor API
  baseUrl: 'http://localhost:3000/api',
  // Endpoints
  endpoints: {
    nivel: '/nivel',
    estado: '/estado',
    historial: '/historial',
    config: '/config',
  },
  // Opciones de fetch
  fetchOptions: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
};

// ============================================
// Configuración de la aplicación
// ============================================
export const APP_CONFIG = {
  // Intervalo de actualización por MQTT (ms)
  mqttUpdateInterval: 1000,
  // Intervalo de fallback para API cuando MQTT falla (ms)
  apiFallbackInterval: 10000,
  // Niveles de alerta
  alertLevels: {
    critico: 20,   // Porcentaje crítico
    bajo: 40,      // Porcentaje bajo
    medio: 60,     // Porcentaje medio
  },
  // Configuración del tanque
  tankCapacity: {
    // Capacidad máxima en litros
    maxLiters: 1000,
    // Unidad de medida
    unit: 'liters',
  },
};

// No modificar debajo de esta línea
export default { MQTT_CONFIG, API_CONFIG, APP_CONFIG, DEMO_MODE };