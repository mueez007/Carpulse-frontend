import { Link } from "react-router-dom";
import Hyperspeed from "../components/Hyperspeed.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="landing-bg">
          <Hyperspeed />
        </div>

        <div className="landing-content">
          <h1>
            <span className="brand-main">carpulse</span>{" "}
            <span className="brand-highlight">AI</span>
          </h1>
          <p className="landing-subtitle">
            Intelligent vehicle log &amp; service agent that keeps your fleet
            organised, monitored, and one step ahead.
          </p>

          <div className="landing-actions">
            {isAuthenticated ? (
              <Link to="/logs" className="btn primary">
                Go to service logs
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn primary">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
