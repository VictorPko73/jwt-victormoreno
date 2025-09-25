import React from "react";
import useGlobalReducer from "../hooks/useGlobalReducer";

// Vista privada que muestra la información del usuario autenticado
const Private = () => {
  const { store } = useGlobalReducer();
  const { auth } = store;

  return (
    <div className="container py-5">
      <h1 className="mb-4">Zona privada</h1>
      <p className="lead">
        Si puedes leer esto es porque tu sesión y token fueron validados correctamente.
      </p>

      <div className="card shadow-sm mt-4">
        <div className="card-header">Información de la sesión</div>
        <div className="card-body">
          <p className="mb-2">
            <strong>Email:</strong> {auth.user?.email || "No disponible"}
          </p>
          <div>
            <strong>Token:</strong>
            <pre className="bg-light p-2 mt-2" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {auth.token || "No disponible"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Private;