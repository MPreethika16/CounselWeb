import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, User, LayoutDashboard, LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";
import MobileDrawer from "./layout/MobileDrawer";

function Navbar() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const role = user?.role;
  const isActive = (path) => location.pathname === path ? "nav-link active" : "nav-link";

  // Dashboard route helper
  const getDashboardPath = () => {
    if (role === 'institution') return "/institution-dashboard";
    if (role === 'admin') return "/admin";
    return "/dashboard";
  };

  return (
    <nav className="navbar" style={{ padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', background: 'var(--card)' }}>
      {/* Left Brand Area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          className="hamburger-btn" 
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={isDrawerOpen}
        >
          <Menu size={20} />
        </button>
        <Link to="/" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', WebkitBackgroundClip: 'unset', backgroundClip: 'unset', WebkitTextFillColor: 'unset', textDecoration: 'none' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--primary)'}}>
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span style={{ fontWeight: '800', color: 'var(--primary)', letterSpacing: '-0.02em', fontSize: '18px' }}>CounselWise</span>
        </Link>
      </div>

      {/* Center Navigation Links (desktop only) */}
      <div className="nav-links desktop-only" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <Link to="/" className={isActive("/")}>Home</Link>
        <Link to="/predictor" className={isActive("/predictor")}>Predictor</Link>
        <Link to="/web-options" className={isActive("/web-options")}>Web Options</Link>
        <Link to="/colleges" className={isActive("/colleges")}>Colleges</Link>
        <Link to="/compare" className={isActive("/compare")}>Compare</Link>
        <Link to="/guide" className={isActive("/guide")}>Guide</Link>
      </div>

      {/* Right Actions Area (visible on mobile and desktop) */}
      <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ThemeToggle />
        
        {!user ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/login" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '13px', height: '36px' }}>Login</Link>
            <Link to="/signup" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '13px', height: '36px' }}>Sign Up</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Dashboard Button */}
            <Link 
              to={getDashboardPath()} 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '13px', height: '36px', gap: '6px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}
              title="Dashboard"
            >
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
            </Link>

            {/* Profile Link */}
            <Link 
              to="/profile" 
              className="btn btn-secondary" 
              style={{ padding: '6px 10px', fontSize: '13px', height: '36px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}
              title="Profile"
            >
              <User size={14} />
            </Link>

            {/* Logout */}
            <button 
              onClick={handleLogout} 
              className="btn btn-danger" 
              style={{ padding: '6px 10px', fontSize: '13px', height: '36px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(220,38,38,0.16)', cursor: 'pointer' }}
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>

      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </nav>
  );
}

export default Navbar;