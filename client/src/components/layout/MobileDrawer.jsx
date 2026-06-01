import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { X, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function MobileDrawer({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const drawerRef = useRef(null);

  // Focus trap for accessibility
  useEffect(() => {
    if (!isOpen) return;

    const focusableElements = drawerRef.current?.querySelectorAll(
      'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    firstElement.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleLogoutClick = () => {
    logout();
    onClose();
    navigate("/");
  };

  const menuItems = [
    { label: "Home", path: "/", icon: "🏠" },
    { label: "Predictor", path: "/predictor", icon: "🎯" },
    { label: "Web Options", path: "/web-options", icon: "📋" },
    { label: "Compare Colleges", path: "/compare", icon: "⚖️" },
  ];

  // Saved Colleges (Dashboard) is restricted to logged-in student role
  if (user && user.role === "student") {
    menuItems.push({ label: "Saved Colleges", path: "/dashboard", icon: "💾" });
  }

  // TG EAPCET Rank Card
  menuItems.push({ label: "TG EAPCET Rank Card", path: "/tg-eapcet-rank-card-2026", icon: "📄" });

  // Institution dashboard and Admin dashboard custom links
  if (user && user.role === "institution") {
    menuItems.push({ label: "Institution Dashboard", path: "/institution-dashboard", icon: "🏢" });
  }
  if (user && user.role === "admin") {
    menuItems.push({ label: "Admin Dashboard", path: "/admin", icon: "🛠️" });
  }

  // Profile and Settings are shown when logged in, or redirect to login when guest
  if (user) {
    menuItems.push(
      { label: "Profile", path: "/profile", icon: "👤" },
      { label: "Settings", path: "/profile", icon: "⚙️" }
    );
  } else {
    menuItems.push(
      { label: "Login", path: "/login", icon: "🔑" },
      { label: "Sign Up", path: "/signup", icon: "📝" }
    );
  }

  const isLinkActive = (itemPath) => {
    if (itemPath === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(itemPath);
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className={`drawer-overlay ${isOpen ? "open" : ""}`} 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        ref={drawerRef}
        className={`mobile-drawer ${isOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
      >
        {/* Header with Brand Logo & Close Button */}
        <div className="drawer-header">
          <Link to="/" className="drawer-brand" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--accent-blue)', marginRight: '2px'}}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            CounselWise
          </Link>
          <button 
            className="drawer-close" 
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Dynamic Navigation Options */}
        <nav className="drawer-content">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`drawer-link ${isLinkActive(item.path) ? "active" : ""}`}
              onClick={onClose}
            >
              <span style={{ fontSize: "18px" }} role="img" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer actions e.g. Logout */}
        {user && (
          <div className="drawer-footer">
            <button 
              className="drawer-logout"
              onClick={handleLogoutClick}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default MobileDrawer;
