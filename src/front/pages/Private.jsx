import React from "react";

// Vista privada de ejemplo (puedes personalizarla luego)
const Private = () => {
  return (
    <div className="container py-5">
      <h1>Zona privada</h1>
      <p className="lead">
        Si puedes leer esto es porque tu sesión y token fueron validados correctamente.
      </p>
    </div>
  );
};

export default Private;