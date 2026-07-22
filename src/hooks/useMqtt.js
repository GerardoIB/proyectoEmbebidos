import { useState, useEffect, useCallback, useRef } from 'react';
import mqtt from 'mqtt';
import { MQTT_CONFIG, APP_CONFIG } from '../config';

/**
 * Hook personalizado para conexión MQTT en tiempo real
 * Maneja la suscripción a topics y actualización automática de datos
 */
export function useMqtt(deviceId) {
  const [nivel, setNivel] = useState(null);
  const [bombaEncendida, setBombaEncendida] = useState(false);
  const [conectado, setConectado] = useState(false);
  const [error, setError] = useState(null);
  const [ultimaLecturaAt, setUltimaLecturaAt] = useState(null);
  const [mensajesRecibidos, setMensajesRecibidos] = useState(0);
  const clientRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

  // Función para parsear el mensaje MQTT
  const parsearMensaje = useCallback((topic, message) => {
    try {
      const payloadStr = message.toString();
      let payload;
      try {
        payload = JSON.parse(payloadStr);
      } catch {
        payload = payloadStr;
      }

      const now = new Date();
      setUltimaLecturaAt(now);
      setMensajesRecibidos(prev => prev + 1);
      lastUpdateRef.current = now.getTime();

      if (typeof payload === 'object' && payload !== null) {
        if (payload.nivel !== undefined) {
          setNivel(Math.min(100, Math.max(0, Number(payload.nivel))));
        }
        if (payload.bomba !== undefined || payload.bombaEncendida !== undefined) {
          setBombaEncendida(Boolean(payload.bomba ?? payload.bombaEncendida));
        }
      } else if (topic === MQTT_CONFIG.topicLevel || topic.endsWith('/nivel')) {
        setNivel(Math.min(100, Math.max(0, Number(payload))));
      } else if (topic === MQTT_CONFIG.topicPump || topic.endsWith('/bomba')) {
        setBombaEncendida(Boolean(payload === 'true' || payload === true || payload === 1 || payload === '1'));
      }
    } catch (e) {
      console.error('Error al parsear mensaje MQTT:', e);
    }
  }, []);

  // Efecto para establecer conexión MQTT
  useEffect(() => {
    let client = null;

    const connect = () => {
      try {
        client = mqtt.connect(MQTT_CONFIG.brokerUrl, MQTT_CONFIG.options);
        clientRef.current = client;

        client.on('connect', () => {
          console.log('✓ Conectado al broker MQTT');
          setConectado(true);
          setError(null);

          // Suscribirse a topics globales y del dispositivo
          const topics = [MQTT_CONFIG.topicLevel, MQTT_CONFIG.topicPump];
          if (deviceId) {
            topics.push(`wereablewater/${deviceId}/telemetry`);
            topics.push(`wereablewater/${deviceId}/#`);
          }

          topics.forEach(t => client.subscribe(t, { qos: 1 }));
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

    return () => {
      if (client) {
        client.end(true);
      }
    };
  }, [deviceId, parsearMensaje]);

  // Función para obtener el tiempo desde la última actualización
  const getTiempoUltimaActualizacion = useCallback(() => {
    return Date.now() - lastUpdateRef.current;
  }, []);

  // Verificar si los datos están actualizados
  const isStale = getTiempoUltimaActualizacion() > APP_CONFIG.apiFallbackInterval;

  return {
    nivel,
    bombaEncendida,
    conectado,
    error,
    isStale,
    ultimaLecturaAt,
    mensajesRecibidos,
    getTiempoUltimaActualizacion,
  };
}

export default useMqtt;