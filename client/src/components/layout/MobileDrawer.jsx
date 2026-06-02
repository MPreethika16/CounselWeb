import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { X, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getDashboardPath } from "../../utils/navigation";

function MobileDrawer({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const drawerRef = useRef(null);

  // Focus trap and focus restoration for accessibility
  useEffect(() => {
    if (!isOpen) return;

    // Capture the element that has focus prior to opening the drawer
    const previouslyFocusedElement = document.activeElement;

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
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the trigger element when the drawer closes
      if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === "function") {
        previouslyFocusedElement.focus();
      }
    };
  }, [isOpen, onClose]);

  const handleLogoutClick = () => {
    logout();
    onClose();
    navigate("/");
  };


  const menuItems = [];

  // Home as first item
  menuItems.push({ label: "Home", path: "/" });

  if (user) {
    menuItems.push({ label: "Dashboard", path: getDashboardPath(user?.role) });
  }

  menuItems.push(
    { label: "Predictor", path: "/predictor" },
    { label: "Web Options", path: "/web-options" },
    { label: "Explore Colleges", path: "/colleges" },
    { label: "Compare Colleges", path: "/compare" }
  );

  if (user && user.role === "student") {
    menuItems.push({ label: "Saved Colleges", path: "/dashboard" });
  }

  if (user) {
    menuItems.push(
      { label: "Profile", path: "/profile" }
    );
  } else {
    menuItems.push(
      { label: "Login", path: "/login" },
      { label: "Sign Up", path: "/signup" }
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
        role={isOpen ? "dialog" : undefined}
        aria-modal={isOpen ? "true" : undefined}
        aria-hidden={isOpen ? undefined : "true"}
        inert={!isOpen}
        aria-label="Mobile Navigation Menu"
      >
        {/* Header with Brand Logo & Close Button */}
        <div className="drawer-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <Link to="/" className="drawer-brand" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', WebkitBackgroundClip: 'unset', backgroundClip: 'unset', WebkitTextFillColor: 'unset', textDecoration: 'none' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--primary)'}}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span style={{ fontWeight: '800', color: 'var(--primary)', letterSpacing: '-0.02em', fontSize: '18px' }}>CounselWise</span>
          </Link>
          <button 
            className="drawer-close" 
            onClick={onClose}
            aria-label="Close menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Dynamic Navigation Options */}
        <nav className="drawer-content" style={{ display: 'flex', flexDirection: 'column', padding: '0' }}>
          {menuItems.map((item, index) => {
            const active = isLinkActive(item.path);
            return (
              <Link
                key={index}
                to={item.path}
                className={`drawer-link ${active ? "active" : ""}`}
                onClick={onClose}
                style={{
                  display: 'block',
                  padding: '16px 24px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: active ? 'var(--secondary)' : 'var(--text)',
                  textDecoration: 'none',
                  background: active ? 'rgba(37, 99, 235, 0.03)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: active ? '4px solid var(--secondary)' : '4px solid transparent',
                  transition: 'var(--transition)'
                }}
              >
                {item.label}
              </Link>
            );
          })}
          
          {user && (
            <button 
              onClick={handleLogoutClick}
              className="drawer-link"
              style={{
                display: 'block',
                width: '100%',
                padding: '16px 24px',
                fontSize: '15px',
                fontWeight: '600',
                color: 'var(--danger)',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                borderLeft: '4px solid transparent',
                cursor: 'pointer',
                transition: 'var(--transition)',
                fontFamily: 'inherit'
              }}
            >
              Logout
            </button>
          )}
        </nav>
      </div>
    </>
  );
}

export default MobileDrawer;
