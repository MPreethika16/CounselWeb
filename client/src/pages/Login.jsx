import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config/api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        login(data.user, data.token);
        window.dispatchEvent(new Event("authChange"));
        if (data.user.role === 'admin') navigate('/admin');
        else if (data.user.role === 'institution') navigate('/institution-dashboard');
        else navigate('/dashboard');
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleGoogleResponse = async (credentialResponse) => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: credentialResponse.credential })
        });
        const data = await res.json();
        
        if (res.ok) {
          localStorage.setItem("user", JSON.stringify(data.user));
          login(data.user, data.token);
          window.dispatchEvent(new Event("authChange"));
          if (data.user.role === 'admin') navigate('/admin');
          else if (data.user.role === 'institution') navigate('/institution-dashboard');
          else navigate('/dashboard');
        } else {
          setError(data.message || "Google login failed");
        }
      } catch (err) {
        setError("Server connection failed");
      } finally {
        setLoading(false);
      }
    };

    const initializeGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false
        });

        const btnElement = document.getElementById("google-button");
        if (btnElement) {
          window.google.accounts.id.renderButton(
            btnElement,
            { theme: "outline", size: "large", width: "100%" }
          );
        }
      }
    };

    // Load Google script dynamically if not already loaded
    const scriptId = "google-gsi-client";
    let script = document.getElementById(scriptId);
    
    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.id = scriptId;
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.body.appendChild(script);
    } else {
      if (window.google) {
        initializeGoogle();
      } else {
        script.onload = initializeGoogle;
      }
    }
  }, []);

  return (
    <div className="page-wrapper container">
      <div style={{ maxWidth: '400px', margin: '40px auto 0' }} className="glass-card">
        <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '24px', fontSize: '28px' }}>Welcome Back</h2>
        {error && <div style={{ color: 'red', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <label>Email</label>
            <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" required className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          <span style={{ padding: '0 10px', color: 'var(--text-muted)', fontSize: '14px' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', minHeight: '40px' }}>
          <div id="google-button" style={{ width: '100%' }}></div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-secondary)' }}>
          Don't have an account? <Link to="/signup" style={{ color: 'var(--accent-blue)', fontWeight: '500' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
