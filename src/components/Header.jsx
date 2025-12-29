import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../hooks/useTheme.js";
import { APP_NAME } from "../config/constants.js";

export default function Header() {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isActive = (path) =>
    location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <header className="app-header">
      <div className="header-left">
        <span className="logo-icon">
          <i className="fa-solid fa-car" />
        </span>
        <span className="logo-text">{APP_NAME}</span>
      </div>

      <nav className="header-nav">
        {isAuthenticated && (
          <>
            <Link to="/logs" className={isActive("/logs")}>
              Home
            </Link>
            <Link to="/chat" className={isActive("/chat")}>
              Chat with Agent
            </Link>
            <Link to="/estimate" className={isActive("/estimate")}>
              Estimate with ML
            </Link>
          </>
        )}
      </nav>

      <div className="header-right">
        {isAuthenticated && (
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        )}
        <button
          className="theme-toggle"
          aria-label="Toggle theme"
          onClick={toggleTheme}
        >
          <i
            className={
              theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon"
            }
          />
        </button>
      </div>
    </header>
  );
}
