import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  // CHECK TOKEN
  useEffect(() => {
  const checkAuth = () => {
    setIsLoggedIn(!!localStorage.getItem("token"));
  };

  // run once
  checkAuth();

  // listen for changes (login/logout in other tabs)
  window.addEventListener("storage", checkAuth);

  return () => {
    window.removeEventListener("storage", checkAuth);
  };
}, []);

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    navigate("/login");
  };

  return (
    <nav style={styles.nav}>
      {/* LEFT */}
      <div>
        <Link to="/" style={styles.logo}>
          CounselWise
        </Link>
      </div>

      {/* RIGHT */}
      <div style={styles.links}>
        <Link to="/predictor" style={styles.link}>
          Predictor
        </Link>

        <Link to="/web-options" style={styles.link}>
          Web Options
        </Link>

        {isLoggedIn && (
          <Link to="/dashboard" style={styles.link}>
            Dashboard
          </Link>
        )}

        {!isLoggedIn ? (
          <>
            <Link to="/login" style={styles.link}>
              Login
            </Link>

            <Link to="/signup" style={styles.link}>
              Signup
            </Link>
          </>
        ) : (
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}

// STYLES
const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 25px",
    background: "#111",
    color: "#fff"
  },
  logo: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#fff",
    textDecoration: "none"
  },
  links: {
    display: "flex",
    alignItems: "center",
    gap: "15px"
  },
  link: {
    color: "#fff",
    textDecoration: "none",
    fontSize: "14px"
  },
  logoutBtn: {
    background: "red",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    cursor: "pointer",
    borderRadius: "5px"
  }
};

export default Navbar;