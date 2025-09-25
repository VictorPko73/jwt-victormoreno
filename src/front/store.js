// Clave que usaremos para guardar la sesión en sessionStorage
const SESSION_KEY = "session";

//Para hacerlo con localStorage

/* const loadSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    // ...
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return { token: null, user: null };
  }
};

const saveSession = (session) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
}; */

// Lee la sesión almacenada en sessionStorage y la devuelve como objeto
const loadSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { token: null, user: null };
    const parsed = JSON.parse(raw);
    return {
      token: parsed.token ?? null,
      user: parsed.user ?? null,
    };
  } catch {
    // Si algo falla (JSON inválido, por ejemplo) limpiamos la sesión corrupta
    sessionStorage.removeItem(SESSION_KEY);
    return { token: null, user: null };
  }
};

// Guarda la sesión (token y usuario) en sessionStorage
const saveSession = (session) => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

// Elimina toda la información de sesión del almacenamiento de sesión
const clearSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
};

// Estado base para la información de autenticación
const emptyAuthState = { token: null, user: null, isLoading: false };

// Estado inicial global de la aplicación, ahora solo con el mensaje y la autenticación
export const initialStore = () => {
  const session = loadSession();

  return {
    message: null,
    auth: {
      token: session.token,
      user: session.user,
      // Si hay token arrancamos en modo "isLoading" para validar al usuario
      isLoading: Boolean(session.token),
    },
  };
};

// Reducer que maneja las acciones del estado global
export default function storeReducer(store, action = {}) {
  switch (action.type) {
    case "set_hello":
      return {
        ...store,
        message: action.payload,
      };

    // Indica que estamos verificando la sesión (por ejemplo, validando token)
    case "auth_checking":
      return {
        ...store,
        auth: {
          ...store.auth,
          isLoading: true,
        },
      };

    // Al iniciar sesión correctamente guardamos token/usuario y dejamos de cargar
    case "login_success": {
      const session = {
        token: action.payload.token,
        user: action.payload.user,
      };
      saveSession(session);
      return {
        ...store,
        auth: {
          ...store.auth,
          ...session,
          isLoading: false,
        },
      };
    }

    // Actualiza sólo la información del usuario (por ejemplo, tras /me)
    case "set_user": {
      const session = {
        token: store.auth.token,
        user: action.payload,
      };
      saveSession(session);
      return {
        ...store,
        auth: {
          ...store.auth,
          user: action.payload,
          isLoading: false,
        },
      };
    }

    // Borra la sesión y vuelve al estado vacío
    case "logout":
      clearSession();
      return {
        ...store,
        auth: { ...emptyAuthState },
      };

    default:
      throw Error("Unknown action.");
  }
}