import { useState, useEffect, useCallback, useRef } from 'react';
import mqtt from 'mqtt';
import { MQTT_CONFIG, APP_CONFIG } from '../config';

/**
 * Hook personalizado para conexión MQTT en tiempo real
 * Maneja la suscripción a topics y actualización automática de datos
 */
export function useMqtt() {
  const [nivel, setNivel] = useState(null);
  const [bombaEncendida, setBombaEncendida] = useState(false);
  const [conectado, setConectado] = useState(false);
  const [error, setError] = useState(null);
  const clientRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

  // Función para parsear el mensaje MQTT
  const parsearMensaje = useCallback((topic, message) => {
    try {
      const payload = typeof message === 'string'
        ? JSON.parse(message)
        : message;

      if (topic === MQTT_CONFIG.topicLevel) {
        // Formato esperado: { nivel: 75 } o solo el número
        const nivelValue = typeof payload === 'object' ? payload.nivel : payload;
        setNivel(Math.min(100, Math.max(0, Number(nivelValue))));
        lastUpdateRef.current = Date.now();
      } else if (topic === MQTT_CONFIG.topicPump) {
        // Formato esperado: { encendida: true } o booleano
        const pumpValue = typeof payload === 'object' ? payload.encendida : payload;
        setBombaEncendida(Boolean(pumpValue));
      }
    } catch (e) {
      console.error('Error al parsear mensaje MQTT:', e);
    }
  }, []);

  // Efecto para establecer conexión MQTT
  useEffect(() => {
    let client = null;
    let reconnectTimer = null;

    const connect = () => {
      try {
        client = mqtt.connect(MQTT_CONFIG.brokerUrl, MQTT_CONFIG.options);
        clientRef.current = client;

        client.on('connect', () => {
          console.log('✓ Conectado al broker MQTT');
          setConectado(true);
          setError(null);

          // Suscribirse a los topics
          client.subscribe(MQTT_CONFIG.topicLevel, { qos: 1 });
          client.subscribe(MQTT_CONFIG.topicPump, { qos: 1 });
        });

        client.on('message', (topic, message) => {
          parsearMensaje(topic, message);
        });

        client.on('error', (err) => {
          console.error('Error de MQTT:', err);
          setError(err.message);
        });

        client.on('close', () => {
          console.log('✗ Desconectado del broker MQTT');
          setConectado(false);
        });

        client.on('reconnect', () => {
          console.log('↻ Reconectando al broker MQTT...');
        });

      } catch (err) {
        console.error('Error al conectar:', err);
        setError(err.message);
      }
    };

    connect();

    // Cleanup al desmontar
    return () => {
      if (client) {
        client.end(true);
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [parsearMensaje]);

  // Función para obtener el tiempo desde la última actualización
  const getTiempoUltimaActualizacion = useCallback(() => {
    return Date.now() - lastUpdateRef.current;
  }, []);

  // Verificar si los datos están actualizados
  const isStale = getTiempoUltimaActualizacion() > APP_CONFIG.apiFallbackInterval;

  return {
    nivel,
    bombaEncendida: bombaEncendida,
    conectado,
    error,
    isStale,
    getTiempoUltimaActualizacion,
  };
}

export default useMqtt;