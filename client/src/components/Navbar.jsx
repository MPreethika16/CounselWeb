import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { LogOut, LogIn, UserPlus } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { API_URL } from "../config";
import "./Navbar.css";

function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUser = async () => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (!token) {
      setIsLoggedIn(false);
      setUser(null);
      return;
    }

    setIsLoggedIn(true);
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem("user", JSON.stringify(data));
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error("Auth verify failed", err);
    }
  };

  useEffect(() => {
    fetchUser();
    window.addEventListener("storage", fetchUser);
    window.addEventListener("authChange", fetchUser);
    return () => {
      window.removeEventListener("storage", fetchUser);
      window.removeEventListener("authChange", fetchUser);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUser(null);
    window.dispatchEvent(new Event("authChange"));
    navigate("/login");
  };

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

      <div className="nav-links">
        <Link to="/" className={isActive("/")}>Home</Link>
        
        {/* Student or Guest links */}
        {(!user || user.role === "student") && (
          <>
            <Link to="/predictor" className={isActive("/predictor")}>Predictor</Link>
            <Link to="/web-options" className={isActive("/web-options")}>Web Options</Link>
            <Link to="/compare" className={isActive("/compare")}>Compare</Link>
          </>
        )}

        <Link to="/counselling-guide" className={isActive("/counselling-guide")}>Guide</Link>
        <Link to="/colleges" className={isActive("/colleges")}>Colleges</Link>

        {isLoggedIn && (
          <>
            {user?.role === "student" && (
              <Link to="/dashboard" className={isActive("/dashboard")}>Dashboard</Link>
            )}
            {user?.role === "institution" && (
              <Link to="/institution-dashboard" className={isActive("/institution-dashboard")}>My College</Link>
            )}
            {user?.role === "admin" && (
              <Link to="/admin" className={isActive("/admin")}>Admin Panel</Link>
            )}
            <Link to="/profile" className={isActive("/profile")}>Profile</Link>
          </>
        )}
      </div>

      <div className="nav-actions">
        <ThemeToggle />
        {!isLoggedIn ? (
          <>
            <Link to="/login" className="btn btn-secondary">
              <LogIn size={18} /> Login
            </Link>
            <Link to="/signup" className="btn btn-primary">
              <UserPlus size={18} /> Signup
            </Link>
          </>
        ) : (
          <button onClick={handleLogout} className="btn btn-danger">
            <LogOut size={18} /> Logout
          </button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;