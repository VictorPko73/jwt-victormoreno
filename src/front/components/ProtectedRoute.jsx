import React, { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

const ProtectedRoute = () => {
  const { store, dispatch } = useGlobalReducer();
  const { auth } = store;
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // Si no hay token guardado, redirige inmediatamente al login
  if (!auth.token) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    // Si no hay backend configurado o ya tenemos usuario no hacemos nada
    if (!backendUrl || auth.user || !auth.token) return;

    const controller = new AbortController();

    const fetchCurrentUser = async () => {
      dispatch({ type: "auth_checking" });

      try {
        const response = await fetch(`${backendUrl}/api/private`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Token inválido o caducado");
        }

        const data = await response.json();
        dispatch({ type: "set_user", payload: data });
      } catch (error) {
        console.error(error);
        dispatch({ type: "logout" });
      }
    };

    fetchCurrentUser();

    return () => controller.abort();
  }, [auth.token, auth.user, backendUrl, dispatch]);

  // Mientras se valida el token, mostramos un mensaje
  if (auth.isLoading) {
    return (
      <div className="container py-5 text-center">
        <p className="lead">Validando sesión...</p>
      </div>
    );
  }

  // Si después de validar no hay usuario, redirigimos al login
  if (!auth.user) {
    return <Navigate to="/login" replace />;
  }

  // Todo correcto: mostramos las rutas hijas protegidas
  return <Outlet />;
};

export default ProtectedRoute;