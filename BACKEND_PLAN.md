# Backend WereableWater — Plan de implementación

API para autenticación de usuarios, vinculación de dispositivos (ESP32) y telemetría de tanques de agua.

## Decisiones

| Tema | Elección |
|------|----------|
| Repo | **Separado** del frontend (`wereablewater-api`) |
| Base de datos | **MySQL** + Prisma |
| Ingesta | **HTTP + MQTT** desde el inicio |
| Auth app | JWT (Bearer) |
| Auth ESP32 | `X-Device-Token` (HTTP) y credenciales MQTT del device |
| Frontend | CORS hacia el origen de Vite (ej. `http://localhost:5173`) |

---

## Stack

- Node.js + Express
- Prisma + MySQL
- MQTT.js (cliente del backend suscrito al broker)
- Mosquitto (o broker compatible) en paralelo
- bcrypt + jsonwebtoken
- Opcional: Docker Compose (MySQL + Mosquitto)

---

## Estructura del repo

```text
wereablewater-api/
  prisma/
    schema.prisma
    seed.js                 # devices unclaimed + claim codes
  src/
    index.js
    config.js
    db.js
    middleware/
      authJwt.js
      authDevice.js
    routes/
      auth.js
      devices.js
      readings.js           # nivel, estado, historial, config
      telemetry.js          # POST HTTP desde ESP32
    services/
      authService.js
      deviceService.js
      readingService.js
      telemetryService.js   # compartido HTTP + MQTT
    mqtt/
      brokerClient.js
      handlers.js
  .env.example
  docker-compose.yml
  README.md
```

---

## Modelo de datos

### User
| Campo | Tipo | Notas |
|-------|------|--------|
| id | String (cuid/uuid) | PK |
| email | String | unique |
| name | String | |
| passwordHash | String | bcrypt |
| createdAt | DateTime | |

### Device
| Campo | Tipo | Notas |
|-------|------|--------|
| id | String | PK |
| userId | String? | FK → User (null si unclaimed) |
| deviceUid | String | unique (ID de fábrica / QR) |
| name | String? | ej. "Tinaco azotea" |
| claimCode | String | unique (código corto para vincular) |
| deviceTokenHash | String? | hash del token (HTTP + MQTT) |
| status | Enum | `unclaimed` \| `active` \| `revoked` |
| lastSeenAt | DateTime? | |
| createdAt | DateTime | |

### Reading
| Campo | Tipo | Notas |
|-------|------|--------|
| id | String | PK |
| deviceId | String | FK → Device |
| nivel | Float | 0–100 |
| bomba | Boolean | |
| source | Enum | `http` \| `mqtt` |
| recordedAt | DateTime | |

### DeviceConfig (opcional)
| Campo | Tipo | Notas |
|-------|------|--------|
| deviceId | String | PK / FK |
| critico | Int | default 20 |
| bajo | Int | default 40 |
| medio | Int | default 60 |
| maxLiters | Int | default 1000 |

**Índices:** `User.email`, `Device.claimCode`, `Device.deviceUid`, `(Reading.deviceId, recordedAt)`.

**Relaciones:** 1 User → N Devices → N Readings.

---

## Autenticación

### App (usuario)
- Registro / login → JWT
- Header: `Authorization: Bearer <jwt>`
- Las API keys del demo del frontend se sustituyen por JWT + dispositivos

### Dispositivo (ESP32)
- Tras el claim, el backend muestra el `deviceToken` **una sola vez**
- En DB solo se guarda el **hash**
- HTTP: header `X-Device-Token`
- MQTT: username = `deviceId` (o `deviceUid`), password = el mismo token
- ACL del broker: solo publish a `wereablewater/{suId}/#`

---

## Endpoints

### Auth
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | Público | Alta de usuario |
| `POST` | `/api/auth/login` | Público | Devuelve JWT |
| `GET` | `/api/auth/me` | JWT | Perfil actual |

### Devices (app)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/devices/claim` | JWT | Body: `{ claimCode, name }` → vincula y muestra `deviceToken` 1 vez |
| `GET` | `/api/devices` | JWT | Lista solo devices del usuario |
| `GET` | `/api/devices/:id` | JWT | Detalle + última lectura (ownership) |
| `POST` | `/api/devices/:id/rotate-token` | JWT | Nuevo token; invalida el anterior |
| `DELETE` | `/api/devices/:id` | JWT | Revoca / desvincula |

### Telemetría (ESP32)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/devices/telemetry` | `X-Device-Token` | Body: `{ nivel, bomba }` |

### Lecturas (app)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/nivel?deviceId=` | JWT | Último nivel |
| `GET` | `/api/estado?deviceId=` | JWT | `{ nivel, bomba, lastSeenAt }` |
| `GET` | `/api/historial?deviceId=&from=&to=` | JWT | Serie temporal |
| `GET` / `PUT` | `/api/config?deviceId=` | JWT | Umbrales por bomba |

### Utilidad
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/health` | Estado del servicio |

Todas las rutas de lecturas/devices validan que `device.userId === req.user.id`.

---

## Protocolos de telemetría (HTTP + MQTT)

```text
ESP32 ──HTTP POST──► /api/devices/telemetry ──┐
                                              ├──► telemetryService ──► MySQL (readings)
ESP32 ──MQTT pub───► wereablewater/{id}/telemetry ──┘
```

Ambos canales llaman a la misma lógica:

```text
telemetryService.save(deviceId, { nivel, bomba }, source)
```

### HTTP
- URL: `POST /api/devices/telemetry`
- Header: `X-Device-Token: ww_dev_...`
- Body:

```json
{
  "nivel": 72.5,
  "bomba": false
}
```

### MQTT
- Topic: `wereablewater/{deviceId}/telemetry`
- Payload: mismo JSON
- QoS recomendado: 1
- Retain: opcional (última lectura al reconectar)
- Backend se suscribe a `wereablewater/+/telemetry` con una cuenta de servicio

### Validaciones
- `nivel` entre 0 y 100
- `bomba` boolean
- Device debe existir y estar `active`
- Token inválido / revocado → 401 (HTTP) o mensaje descartado (MQTT + log)

---

## Flujo de instalación

```text
1. Fábrica / seed: crea deviceUid + claimCode (QR en caja), status = unclaimed
2. Usuario se registra / inicia sesión (JWT)
3. Escanea QR o escribe claimCode → POST /api/devices/claim
4. Backend genera deviceToken, lo muestra 1 vez, status = active
5. Se graba en el ESP32 (token, deviceId, WiFi, API URL, broker MQTT)
6. ESP32 envía telemetría por HTTP y/o MQTT
7. Solo ese usuario ve nivel / estado / historial
```

---

## Configuración ESP32

Valores a grabar en el micro:

```text
WIFI_SSID
WIFI_PASS
API_BASE_URL          # https://tu-api.com
DEVICE_TOKEN          # ww_dev_...
DEVICE_ID             # id del device en el backend
MQTT_BROKER           # mqtt://... o host:1883
MQTT_USER             # deviceId
MQTT_PASS             # mismo DEVICE_TOKEN
```

El ESP32 puede usar **ambos** protocolos o solo uno; el backend acepta los dos.

### Ejemplo payload MQTT / HTTP

```json
{ "nivel": 72.5, "bomba": false }
```

---

## Variables de entorno

```env
PORT=3000
DATABASE_URL="mysql://user:pass@localhost:3306/wereablewater"
JWT_SECRET="cambia-esto"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:5173"
MQTT_URL="mqtt://localhost:1883"
MQTT_SERVICE_USER="wereablewater_backend"
MQTT_SERVICE_PASS="..."
MQTT_TOPIC_PATTERN="wereablewater/+/telemetry"
```

---

## Fases de implementación

### Fase 0 — Repo + infra
- Crear repo `wereablewater-api`
- Express + Prisma + MySQL
- Docker Compose: MySQL + Mosquitto (ACL básica)
- `GET /api/health`
- `.env.example` y README inicial

**Listo cuando:** el servidor arranca y responde health.

### Fase 1 — Auth JWT
- Register / login / me
- Middleware `authJwt`
- Passwords con bcrypt

**Listo cuando:** registro e login funcionan y devuelven JWT.

### Fase 2 — Devices + claim
- Schema Device + seed unclaimed
- Claim, list, detail, rotate-token, revoke
- Mostrar `deviceToken` solo en claim/rotate

**Listo cuando:** un usuario claima un código y otro usuario no ve ese device.

### Fase 3 — Telemetría dual (HTTP + MQTT)
- `telemetryService` + persistencia MySQL (`source`: http | mqtt)
- Ruta HTTP + middleware `authDevice`
- Cliente MQTT: connect → subscribe → parse → save
- Pruebas: curl + `mosquitto_pub` → filas en `readings`
- Rate limit y validación de rango

**Listo cuando:** ambos protocolos guardan lecturas correctas.

### Fase 4 — Lecturas para la app
- `/api/nivel`, `/api/estado`, `/api/historial`, `/api/config`
- Ownership en todas las queries

**Listo cuando:** el dashboard puede consumir datos reales con JWT.

### Fase 5 — Hardening + docs
- Rate limit en login y telemetry
- CORS restringido
- Logs de `lastSeenAt`
- README: claim, ESP32 HTTP, ESP32 MQTT
- Colección Postman / ejemplos curl

### Fase 6 — Integración frontend (repo WereableWater)
- `AuthContext` → API real (dejar de usar localStorage como DB)
- Página Api Keys → Mis dispositivos (claim, lista, rotar token)
- Dashboard: polling HTTP y/o MQTT por `deviceId`
- Mantener `DEMO_MODE` como fallback opcional

---

## Cronograma sugerido

| Día | Trabajo |
|-----|---------|
| 1 | Repo, Docker MySQL + Mosquitto, Prisma schema, health |
| 2 | Auth + Devices + claim + seed |
| 3 | `telemetryService` + HTTP + MQTT subscriber |
| 4 | Readings endpoints + seguridad + README |
| 5 | Prueba con ESP32 (o simulación) y documentar credenciales |

---

## Seguridad (checklist)

- [ ] Passwords de usuario con bcrypt
- [ ] Device tokens: solo hash en DB; plain text una vez en claim/rotate
- [ ] Nunca confiar en `deviceId` del body del ESP32: resolverlo desde el token
- [ ] Ownership en todas las rutas de lecturas
- [ ] Rate limit en `/auth/login` y `/devices/telemetry`
- [ ] CORS solo al origen del frontend
- [ ] HTTPS en producción (ESP32 → API)
- [ ] ACL MQTT por dispositivo
- [ ] Tokens revocados dejan de funcionar de inmediato

---

## Criterio de “hecho”

- Usuario A no ve devices ni lecturas de usuario B
- Claim funciona una vez; rotate invalida el token anterior
- La misma telemetría llega por HTTP **o** MQTT y se guarda en MySQL
- La app puede leer nivel, estado e historial con JWT
- Health check y README permiten levantar el proyecto en local

---

## Relación con el frontend actual

| Hoy (demo) | Con este backend |
|------------|------------------|
| Usuarios / API keys en `localStorage` | JWT + devices en MySQL |
| Topics globales `tinaco/nivel` | `wereablewater/{deviceId}/telemetry` |
| `/api/nivel` sin dueño | `/api/nivel?deviceId=` filtrado por usuario |
| Página Api Keys | Mis dispositivos + claim + rotar token |

Base URL prevista (alineada con `src/config.js` del frontend):

```text
http://localhost:3000/api
```

---

## Referencias rápidas

- Frontend: repo `WereableWater`
- Backend: repo `wereablewater-api` (separado)
- Broker: Mosquitto (local vía Docker o remoto)
- Hardware: ESP32 (WiFi + sensor de nivel + relé de bomba)
