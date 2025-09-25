import { Link, useLocation, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

// Barra de navegación que muestra acciones según el estado de autenticación
export const Navbar = () => {
  const { store, dispatch } = useGlobalReducer();
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = store;

  const isRegisterPage = location.pathname === "/register";

  // Maneja el cierre de sesión y redirige al login
  const handleLogout = () => {
    dispatch({ type: "logout" });
    navigate("/login", { replace: true });
  };

  return (
    <nav className="navbar navbar-light bg-light">
      <div className="container d-flex justify-content-between align-items-center">
        <Link to="/" className="navbar-brand mb-0 h1">
          JWT TOKEN
        </Link>

        <div className="d-flex align-items-center gap-2">
          {!auth.user && (
            <>
              {isRegisterPage ? (
                <Link to="/login" className="btn btn-success">
                  Login
                </Link>
              ) : (
                <Link to="/register" className="btn btn-primary">
                  Regístrate
                </Link>
              )}
            </>
          )}

          {auth.user && (
            <>
             
              <button onClick={handleLogout} className="btn btn-danger">
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
