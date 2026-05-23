import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();

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
        
        {(!user || user.role === 'student') && (
          <>
            <Link to="/predictor" className={isActive("/predictor")}>Predictor</Link>
            <Link to="/web-options" className={isActive("/web-options")}>Web Options</Link>
            <Link to="/compare" className={isActive("/compare")}>Compare</Link>
            <Link to="/colleges" className={isActive("/colleges")}>Colleges</Link>
            <Link to="/counselling-guide" className={isActive("/counselling-guide")}>Guide</Link>
            {user && <Link to="/dashboard" className={isActive("/dashboard")}>Saved</Link>}
          </>
        )}

        {user?.role === 'institution' && (
          <Link to="/institution-dashboard" className={isActive("/institution-dashboard")}>Institution Dashboard</Link>
        )}

        {user?.role === 'admin' && (
          <Link to="/admin" className={isActive("/admin")}>Admin Dashboard</Link>
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
            <button onClick={logout} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '14px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;