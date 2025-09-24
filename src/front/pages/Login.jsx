import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

// Componente de la página de inicio de sesión
const Login = () => {
  // Estado local para capturar email y contraseña del formulario
  const [form, setForm] = useState({ email: "", password: "" });
  // Estado local para mostrar mensaje de error en pantalla
  const [errorMessage, setErrorMessage] = useState("");
  // Estado local para deshabilitar el formulario mientras se envía
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Acceso al store global para despachar acciones y obtener datos (si hiciera falta)
  const { dispatch } = useGlobalReducer();
  // Hook de React Router para redirigir al usuario después de iniciar sesión
  const navigate = useNavigate();

  // Maneja los cambios en los inputs y actualiza el estado local
  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  // Maneja el envío del formulario
  const handleSubmit = async (event) => {
    event.preventDefault(); // Evita el refresco de la página
    setErrorMessage(""); // Limpia cualquier error previo

    // Valida que el backend esté configurado
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (!backendUrl) {
      setErrorMessage("La URL del backend no está configurada.");
      return;
    }

    // Valida que ambos campos tengan contenido
    if (!form.email.trim() || !form.password.trim()) {
      setErrorMessage("Debes completar el email y la contraseña.");
      return;
    }

    setIsSubmitting(true); // Deshabilita el formulario y muestra estado de envío
    dispatch({ type: "auth_checking" }); // marca al store como validando

    try {
      // Realiza la petición al backend para iniciar sesión
      const response = await fetch(`${backendUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      // Si el backend devuelve error, se obtiene el mensaje y se muestra
      if (!response.ok) {
        const errorData = await response.json();
        setErrorMessage(errorData.message || "No se pudo iniciar sesión.");
        dispatch({ type: "logout" }); // Limpia cualquier estado previo
        return;
      }

      // Si todo salió bien, obtenemos el token y los datos del usuario
      const data = await response.json();

      // Guardamos la sesión en el store global (esto también la almacena en sessionStorage)
      dispatch({
        type: "login_success",
        payload: {
          token: data.token,
          user: data.user,
        },
      });

      // Redirigimos al usuario a la ruta privada
      navigate("/private");
    } catch (error) {
      // Captura cualquier error inesperado (problemas de red, etc.)
      setErrorMessage("Ocurrió un error inesperado. Inténtalo de nuevo.");
      dispatch({ type: "logout" });
      console.error(error);
    } finally {
      setIsSubmitting(false); // Reactiva el formulario
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: "480px" }}>
      <h1 className="mb-4 text-center">Iniciar sesión</h1>

      {/* Bloque con el formulario */}
      <form onSubmit={handleSubmit} className="card card-body shadow-sm">
        {/* Input de email */}
        <div className="mb-3">
          <label htmlFor="email" className="form-label">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="form-control"
            placeholder="nombre@correo.com"
            value={form.email}
            onChange={handleChange}
            disabled={isSubmitting}
            required
          />
        </div>

        {/* Input de contraseña */}
        <div className="mb-3">
          <label htmlFor="password" className="form-label">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="form-control"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            disabled={isSubmitting}
            required
          />
        </div>

        {/* Mensaje de error si existe */}
        {errorMessage && (
          <div className="alert alert-danger py-2" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Botón de envío */}
        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
};

export default Login;
