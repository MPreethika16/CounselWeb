import { Link, useLocation, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { useState, useEffect } from "react";
import "./Navbar.css";
import { eraseCookie } from "../utils/cookie";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));

  useEffect(() => {
    const handleAuthChange = () => {
      setUser(JSON.parse(localStorage.getItem("user") || "null"));
    };

    window.addEventListener("authChange", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("authChange", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    eraseCookie("token");
    window.dispatchEvent(new Event("authChange"));
    navigate("/login");
  };

  const role = user?.role;
  const isActive = (path) => location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--accent-blue)'}}>
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        CounselWise
      </Link>

      <div className="nav-links desktop-only">
        <Link to="/" className={isActive("/")}>Home</Link>
        
        {(!user) && (
          <>
            <Link to="/predictor" className={isActive("/predictor")}>Predictor</Link>
            <Link to="/web-options" className={isActive("/web-options")}>Web Options</Link>
            <Link to="/colleges" className={isActive("/colleges")}>Colleges</Link>
            <Link to="/compare" className={isActive("/compare")}>Compare</Link>
            <Link to="/guide" className={isActive("/guide")}>Guide</Link>
          </>
        )}

        {role === 'student' && (
          <>
            <Link to="/predictor" className={isActive("/predictor")}>Predictor</Link>
            <Link to="/web-options" className={isActive("/web-options")}>Web Options</Link>
            <Link to="/colleges" className={isActive("/colleges")}>Colleges</Link>
            <Link to="/compare" className={isActive("/compare")}>Compare</Link>
            <Link to="/guide" className={isActive("/guide")}>Guide</Link>
            <Link to="/dashboard" className={isActive("/dashboard")}>Dashboard</Link>
          </>
        )}

        {role === 'institution' && (
          <>
            <Link to="/colleges" className={isActive("/colleges")}>Colleges</Link>
            <Link to="/institution-dashboard" className={isActive("/institution-dashboard")}>Institution Dashboard</Link>
          </>
        )}

        {role === 'admin' && (
          <>
            <Link to="/colleges" className={isActive("/colleges")}>Colleges</Link>
            <Link to="/admin" className={isActive("/admin")}>Admin Dashboard</Link>
          </>
        )}
      </div>

      <div className="nav-actions">
        <ThemeToggle />
        
        {!user ? (
          <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
            <Link to="/login" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '14px' }}>Login</Link>
            <Link to="/signup" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '14px' }}>Sign Up</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/profile" className="profile-btn desktop-only" title="Profile">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </Link>
            <button onClick={handleLogout} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '14px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;