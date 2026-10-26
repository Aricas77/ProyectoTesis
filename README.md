# Tesis: sistema de gamificación colaborativa de contenidos teóricos

Trabajo recepcional de Ari Neftali Castro Montalvo (Licenciatura en Sistemas y Tecnologías de la Información, Universidad Veracruzana): plataforma de gamificación colaborativa con tarjetas-concepto.
Este repositorio reúne el documento de tesis, el manifiesto de control de avances y el código. El código cubre el **Sprint 1: autenticación y gestión de sesiones**.

*"Complementa" es el nombre provisional que se muestra en la interfaz: cámbialo en `client/src/config.js`.*

## Qué incluye

| Módulo | Qué hace |
| --- | --- |
| Autenticación | Registro, inicio y cierre de sesión. Roles `docente` y `estudiante`. Rutas protegidas por sesión y por rol. |
| Configuración de sesiones (docente) | Crear, editar, eliminar y listar sesiones: nombre, materia, descripción, máximo de participantes, duración y pares concepto-definición. Cada sesión recibe un código de 6 caracteres. |
| Ciclo de la sala | La sesión pasa por `borrador` → `abierta` → `cerrada`. Una sala abierta no se puede editar. |
| Entrada del estudiante | El estudiante escribe el código y llega a una sala de espera. La mecánica del juego se desarrolla en el Sprint 2. |

## Requisitos

Node.js **22.13 o superior** (se probó con Node 22). No hace falta instalar nada más: la base de datos usa el SQLite integrado de Node (`node:sqlite`), así que no hay que compilar módulos nativos.

## Cómo correrlo

```bash
npm run setup     # instala dependencias de la raíz, server y client
npm run seed      # (opcional) crea usuarios y una sala de demostración
npm run dev       # API en :3001 y cliente en http://localhost:5173
```

Datos de demostración: `docente@demo.mx` y `estudiante@demo.mx`, ambos con contraseña `Demo1234`. Sala abierta de ejemplo: `SCRUM26`.

Otros comandos: `npm test` (servidor y cliente), `npm run build` (compila el cliente) y `npm start` (compila y sirve todo desde el puerto 3001).

## Estructura

```
docs/                  documento de tesis (tesis.tex) y manifiesto de control de avances
server/                API con Express y SQLite (node:sqlite)
  src/app.js           configuración de Express, seguridad y manejo de errores
  src/routes/auth.js   registro, login, logout, /me
  src/routes/sessions.js  CRUD de sesiones, estados y código de sala
  src/validation.js    reglas de validación (mensajes en español)
  src/db.js            esquema: users, game_sessions, cards
  test/api.test.js     pruebas de integración
client/                Vue 3 + Vite + Pinia + Vue Router
  src/stores/auth.js   estado del usuario autenticado
  src/router/index.js  rutas y guards (sesión y rol)
  src/services/api.js  cliente HTTP, errores por campo y manejo de 401
  src/views/           Login, Registro, Panel docente, Formulario de sesión, Unirse, Sala
  src/components/      FormField, CardPairEditor, SessionTicket, etc.
  src/__tests__/       pruebas de flujo con servidor simulado
```

## API

Todas las rutas empiezan con `/api`. Los errores responden `{ error, fields? }`.

| Método y ruta | Rol | Descripción |
| --- | --- | --- |
| `POST /auth/register` | público | Crea la cuenta e inicia sesión |
| `POST /auth/login` | público | Inicia sesión |
| `POST /auth/logout` | cualquiera | Cierra sesión |
| `GET /auth/me` | autenticado | Usuario actual |
| `GET /sessions` | docente | Sesiones propias |
| `POST /sessions` | docente | Crea una sesión con sus tarjetas |
| `GET /sessions/:id` | docente dueño | Detalle con tarjetas |
| `PUT /sessions/:id` | docente dueño | Edita (no con la sala abierta) |
| `PATCH /sessions/:id/status` | docente dueño | `borrador→abierta`, `abierta→cerrada`, `cerrada→abierta` |
| `DELETE /sessions/:id` | docente dueño | Elimina |
| `GET /sessions/join/:code` | autenticado | Valida el código de una sala abierta |

## Decisiones técnicas

- **Cookie `httpOnly` en lugar de `localStorage`.** El token JWT va en una cookie `httpOnly` con `SameSite=Lax`, así que ningún script del navegador puede leerlo. Vite reenvía `/api` al servidor, por lo que todo es de mismo origen.
- **Contraseñas con bcrypt** y un mensaje único ("Correo o contraseña incorrectos") para no revelar qué correos existen. Hay límite de intentos en login y registro.
- **Validación en ambos lados.** El cliente valida para dar respuesta inmediata y el servidor vuelve a validar siempre.
- **Aislamiento entre docentes.** Un docente que consulta la sesión de otro recibe 404.
- **Accesibilidad.** Etiquetas asociadas, errores con `aria-invalid` y `role="alert"`, foco visible, enlace para saltar al contenido y `prefers-reduced-motion`.

## Límites conocidos (para documentar en la tesis)

- El registro permite elegir el rol libremente. En un despliegue real convendría restringir la cuenta docente (por ejemplo, correo institucional o aprobación).
- No hay recuperación de contraseña ni verificación de correo.
- La integración con los sistemas institucionales de la UV (alcance del anteproyecto) queda pendiente.
- Los participantes aún no se registran en la sala: eso llega con la mecánica de tiempo real del Sprint 2.

## Documentación

En `docs/` está el documento de tesis en LaTeX (`tesis.tex`, se compila en Overleaf con pdfLaTeX) y el manifiesto de control de avances en PDF, Word y Excel.
