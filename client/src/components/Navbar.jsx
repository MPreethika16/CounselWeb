import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

function Navbar() {
  const location = useLocation();

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
        <Link to="/predictor" className={isActive("/predictor")}>Predictor</Link>
        <Link to="/web-options" className={isActive("/web-options")}>Web Options</Link>
        <Link to="/compare" className={isActive("/compare")}>Compare</Link>
        <Link to="/colleges" className={isActive("/colleges")}>Colleges</Link>
        <Link to="/counselling-guide" className={isActive("/counselling-guide")}>Guide</Link>
        <Link to="/dashboard" className={isActive("/dashboard")}>Saved</Link>
      </div>

      <div className="nav-actions">
        <ThemeToggle />
        <Link to="/profile" className="profile-btn desktop-only">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;