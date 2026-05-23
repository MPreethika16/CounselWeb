import { Link, useLocation } from "react-router-dom";
import { Home, Search, Target, List, User, GitCompare } from "lucide-react";

function BottomNav() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? "active" : "";

  return (
    <div className="bottom-nav">
      <Link to="/" className={`bottom-nav-item ${isActive("/")}`}>
        <Home size={20} />
        <span>Home</span>
      </Link>
      <Link to="/predictor" className={`bottom-nav-item ${isActive("/predictor")}`}>
        <Target size={20} />
        <span>Predictor</span>
      </Link>
      <Link to="/web-options" className={`bottom-nav-item ${isActive("/web-options")}`}>
        <List size={20} />
        <span>Options</span>
      </Link>
      <Link to="/compare" className={`bottom-nav-item ${isActive("/compare")}`}>
        <GitCompare size={20} />
        <span>Compare</span>
      </Link>
      <Link to="/colleges" className={`bottom-nav-item ${isActive("/colleges")}`}>
        <Search size={20} />
        <span>Colleges</span>
      </Link>
      <Link to="/dashboard" className={`bottom-nav-item ${isActive("/dashboard")}`}>
        <User size={20} />
        <span>Saved</span>
      </Link>
    </div>
  );
}

export default BottomNav;
