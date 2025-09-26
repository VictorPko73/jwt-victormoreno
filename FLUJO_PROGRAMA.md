# Flujo del programa — Paso a paso (backend y frontend)

Este documento describe el flujo de ejecución y la interacción entre las clases y componentes principales del proyecto. Está escrito en español y se centra en las piezas más importantes: arranque de la aplicación, autenticación JWT, modelos, rutas protegidas y la parte cliente (React). Incluye contratos (entradas/salidas), casos de error y puntos críticos.

## Resumen rápido (contrato)
- Entradas principales:
  - Peticiones HTTP desde el frontend (JSON con campos email y password para login/register).
  - Token JWT retornado por el backend y almacenado en sessionStorage.
- Salidas principales:
  - Respuestas JSON: mensajes, objetos usuario serializado, token JWT.
  - Redirecciones y renderizado de vistas en React.
- Modo de fallo:
  - Campos faltantes -> 400
  - Credenciales inválidas -> 401
  - Recursos no encontrados/inactivos -> 404
  - Token inválido/expirado -> 401/acción de logout en frontend

---

## Backend — Archivos clave y flujo

### src/app.py (arranque de la aplicación)
- Qué hace (resumen): configura Flask, JWT, base de datos (SQLAlchemy), migraciones y registra el blueprint `api` en `/api`.
- Secuencia de inicialización:
  1. Carga configuración (JWT_SECRET_KEY, JWT_ACCESS_TOKEN_EXPIRES).
  2. Inicializa JWTManager(app).
  3. Configura SQLALCHEMY_DATABASE_URI (lee `DATABASE_URL` o usa sqlite temporal).
  4. Inicializa migraciones y `db.init_app(app)`.
  5. Registra `api` blueprint con `app.register_blueprint(api, url_prefix='/api')`.
  6. Define rutas para servir el frontend estático y sitemap.
- Contrato:
  - Inputs: variables de entorno (opcional), requests HTTP a endpoints registrados en blueprints.
  - Outputs: respuestas JSON o archivos estáticos.
- Errores críticos: JWT_SECRET_KEY débil ("1234_Victor" en desarrollo), DB mal configurada.


### src/api/models.py (modelo User)
- Clase: User (SQLAlchemy)
- Campos:
  - id: entero, primary_key
  - email: string(120), unique, no nulo
  - password: string (hashed)
  - is_active: boolean
- Método `serialize()` devuelve un dict con id y email (NO la contraseña)
- Contrato:
  - Input: operaciones ORM (creación, consulta)
  - Output: objetos User y dict serializado para JSON
- Casos a vigilar:
  - Nunca serializar password.
  - En el registro se guarda `hashed_password.decode('utf-8')`.


### src/api/routes.py (endpoints principales)
- Blueprint: `api` (prefijo `/api` desde `app.py`).

Rutas y flujo:
1. POST `/api/register`
   - Input: JSON { email, password }
   - Validaciones:
     - Si el email ya existe -> devuelve 400 con mensaje "El usuario ya existe".
   - Proceso:
     - Genera `salt = bcrypt.gensalt()`.
     - Hashea la contraseña: `bcrypt.hashpw(password.encode('utf-8'), salt)`.
     - Crea `User(email, password=hashed_password.decode('utf-8'), is_active=True)`.
     - `db.session.add(user)` y `db.session.commit()`.
   - Output: JSON del usuario serializado (status 201).
   - Errores: falta de campos -> excepciones índice/KeyError no manejadas explícitamente aquí (el código asume que email y password vienen en el body).

2. POST `/api/login`
   - Input: JSON { email, password }
   - Validaciones:
     - Si falta email o password -> 400 con mensaje.
     - Si usuario no existe -> 401 "Credenciales invalidas".
     - Si la verificación bcrypt falla -> 401.
   - Proceso:
     - Recupera usuario por email -> `User.query.filter_by(email=email).first()`.
     - Verifica contraseña: `bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8'))`.
     - Genera token JWT con `create_access_token(identity=user.id)`.
   - Output: JSON { token, user } (status 200).
   - Errores: timing attacks, tasa de intentos no limitada.

 3. GET `/api/private` (ruta protegida por JWT)
   - Decoradores: `@jwt_required()`
   - Flujo:
     - Extrae `user_id = get_jwt_identity()` desde el token.
     - Consulta `User.query.get(user_id)`.
     - Si no existe o `is_active` es False -> 404.
     - Devuelve `user.serialize()` con status 200.
  - Nota importante: El frontend y backend usan `/api/private` como endpoint para validar el token y obtener los datos del usuario. Asegúrate de que `VITE_BACKEND_URL` apunte al host correcto para que las llamadas a `${VITE_BACKEND_URL}/api/private` funcionen.


### src/api/utils.py
- `APIException`: clase para lanzar errores controlados con `message`, `status_code` y `payload`.
- `generate_sitemap(app)`: construye una página HTML con links a las rutas GET navegables.


## Frontend — Archivos clave y flujo

### Persistencia de sesión: `src/front/store.js`
- `SESSION_KEY = 'session'` y funciones `loadSession`, `saveSession`, `clearSession`.
- `loadSession()` lee `sessionStorage` y devuelve objeto { token, user } o valores nulos si no existe.
- `initialStore()` usa `loadSession()` para inicializar `auth` con { token, user, isLoading }.
  - Si hay token, `isLoading` = true para forzar validación del mismo.
- Reducer (`storeReducer`) gestiona acciones:
  - `auth_checking`: set isLoading true
  - `login_success`: guarda token y user en sessionStorage via `saveSession` y set isLoading false
  - `set_user`: actualiza usuario y guarda sesión
  - `logout`: clearSession y revierte `auth` a vacío

Contrato de store:
- Inputs: acciones dispatch({ type, payload }) desde componentes
- Outputs: nuevo estado global y persistencia en sessionStorage


### Hook global: `src/front/hooks/useGlobalReducer.jsx`
- Crea `StoreContext` y `StoreProvider` para encapsular el `useReducer` y proveer `store` y `dispatch`.
- `useGlobalReducer()` retorna `{ store, dispatch }` para componentes.


### Login Flow: `src/front/pages/Login.jsx`
1. El usuario completa email y password y envía el formulario.
2. `handleSubmit` valida campos y construye `fetch(`${backendUrl}/api/login`, { method: 'POST', body: JSON })`.
3. Si la respuesta es ok := 200, obtiene JSON `{ token, user }`.
4. Dispatch `login_success` con payload { token, user } — el reducer guarda en sessionStorage.
5. Redirige con `navigate("/private")`.

Errores y comportamientos:
- Si `backendUrl` no está definido, muestra error y no intenta login.
- Si el backend devuelve error (ej. 401), muestra el mensaje y ejecuta `logout`.
- Si ocurre error de red, muestra mensaje genérico y `logout`.


### ProtectedRoute: `src/front/components/ProtectedRoute.jsx`
- Propósito: proteger rutas hijas y validar token en el backend.
- Flujo principal:
  1. Si `!auth.token`, redirige inmediatamente a `/login`.
  2. Si `auth.token` existe y `auth.user` no, realiza una petición GET para validar el token y obtener el usuario:
  - `fetch(`${backendUrl}/api/private`, { headers: { Authorization: `Bearer ${auth.token}` } })`
     - Si la respuesta no es ok -> lanza error y dispatch logout.
     - Si ok -> dispatch `set_user` con la data.
  3. Mientras `auth.isLoading` es true muestra "Validando sesión...".
  4. Si después de validar no hay `auth.user`, redirige a `/login`.
  5. Si todo correcto, renderiza `<Outlet />` para las rutas hijas.
- Contrato:
  - Input: `auth.token` desde el store; `backendUrl` desde variables de entorno
  - Output: `set_user` o `logout`, navegación condicional
  - Punto crítico: la ruta que pide ProtectedRoute es `/api/private` (cliente). En el backend, el endpoint que satisface la verificación en este repositorio es `/api/private`. Ambos lados están unificados.


### Routes y Private
- `src/front/routes.jsx`: define la ruta protegida con `<Route element={<ProtectedRoute />}> <Route path="/private" element={<Private />} />`.
- `src/front/pages/Private.jsx`: componente que muestra `auth.user` y `auth.token` desde el store.
- Flujo: después del login, `navigate('/private')` intenta mostrar la vista; `ProtectedRoute` validará el token con el backend y establecerá `auth.user`.


## Escenario de login — secuencia completa (paso a paso)
1. Usuario en frontend completa formulario Login.
2. Frontend POST a `POST ${VITE_BACKEND_URL}/api/login` con JSON `{ email, password }`.
3. Backend valida, encuentra usuario y verifica bcrypt → si válido `create_access_token(identity=user.id)`.
4. Backend responde 200 con `{ token, user }`.
5. Frontend recibe token y dispatch `login_success` → `saveSession` guarda en sessionStorage.
6. Frontend hace `navigate('/private')`.
7. ProtectedRoute detecta token presente y hace GET `${VITE_BACKEND_URL}/api/private`.
8. Backend debería validar el token (decorador `@jwt_required()`) y devolver el usuario asociado.
9. Frontend recibe datos -> dispatch `set_user` y renderiza `Private.jsx` con la info.


## Puntos críticos, edge cases y recomendaciones
-- Observación: actualmente ambos lados usan `/api/private`. Si en el futuro decides cambiar el nombre del endpoint, actualiza simultáneamente `src/api/routes.py` y `src/front/components/ProtectedRoute.jsx`.
- JWT_SECRET_KEY en claro y simple en `src/app.py`: cambiar por variable de entorno segura antes de producción.
- Control de errores en register/login: validar formato de email, longitud de password, manejar excepciones de DB (IntegrityError) para evitar 500 inesperados.
- Rate limiting: considerar protección contra fuerza bruta en `/api/login`.
- Expiración y refresh tokens: hoy solo hay access tokens con 1h — si necesitas sesiones más largas, añadir refresh tokens.
- Bcrypt: se usa correctamente con `gensalt()` y `checkpw`, asegurarse de que la versión y coste de bcrypt sean adecuados.


## Archivos que hay que actualizar si renombras la ruta `/private`
(Encontrados con búsquedas en el repo; actualizar ambos lados y la documentación)
- Backend:
  - `src/api/routes.py` — línea con `@api.route('/private', methods=['GET'])` (cambiar a `/profile` o destino elegido).
- Frontend:
  - `src/front/routes.jsx` — `<Route path="/private" element={<Private />} />` (si quieres cambiar el path público).
  - `src/front/pages/Login.jsx` — `navigate("/private")` (redirección tras login).
  - `src/front/pages/Private.jsx` — componente que muestra la página privada (no requiere renombrado, salvo que cambies la import path).
  - `src/front/components/ProtectedRoute.jsx` — actualiza la URL usada en fetch: actualmente usa `/api/private` (coincide con el backend).


## Pasos para verificar localmente (smoke test)
1. Levantar la API: `python -m src.app` (o el comando que uses) — verifica que `app` arranca sin errores.
2. Registrar un usuario: POST `/api/register` con cuerpo JSON.
3. Hacer login: POST `/api/login` y comprobar que recibes `token`.
4. Guardar token y llamar a la ruta protegida (desde curl o Postman): `GET /api/private` con header `Authorization: Bearer <token>` — debería devolver el usuario.
5. Iniciar frontend (npm run dev o equivalente) y probar login -> ver que `ProtectedRoute` hace la validación y que `Private.jsx` muestra datos.


## Próximos pasos recomendados
- Observación: el endpoint elegido en este proyecto es `/api/private`; si en el futuro deseas renombrarlo, actualiza simultáneamente `src/api/routes.py` y `src/front/components/ProtectedRoute.jsx`.
- Añadir validaciones adicionales en registro (email válido, contraseña fuerte) y manejo de errores DB.
- Considerar tests unitarios para endpoints auth y un test e2e para el flujo login → página privada.
- Si quieres que genere el PDF con la documentación, dime si autorizas instalar dependencias Node (puppeteer) o prefieres que te entregue instrucciones para convertir localmente.


---

Fin del documento. Si quieres, actualizo automáticamente los endpoints al nombre que prefieras (indícame el nuevo path) y genero `DOCUMENTACION_PROYECTO.pdf` usando Puppeteer (necesito permiso para instalar dependencias).