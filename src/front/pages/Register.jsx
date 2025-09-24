import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (!backendUrl) {
      setErrorMessage("La URL del backend no está configurada.");
      return;
    }

    if (!form.email.trim() || !form.password.trim()) {
      setErrorMessage("Debes completar el email y la contraseña.");
      return;
    }



    setIsSubmitting(true);

    try {
      const response = await fetch(`${backendUrl}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrorMessage(errorData.message || "No se pudo registrar.");
        return;
      }

      navigate("/login", { replace: true });
    } catch (error) {
      console.error(error);
      setErrorMessage("Ocurrió un error inesperado. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: "480px" }}>
      <h1 className="mb-4 text-center">Crear cuenta</h1>

      <form onSubmit={handleSubmit} className="card card-body shadow-sm">
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
            minLength={6}
          />
        </div>

        {errorMessage && (
          <div className="alert alert-danger py-2" role="alert">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-success w-100"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creando cuenta..." : "Registrarme"}
        </button>
      </form>
    </div>
  );
};

export default Register;