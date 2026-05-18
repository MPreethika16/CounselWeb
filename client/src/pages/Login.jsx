import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { API_URL } from "../config/api";
import { setCookie } from "../utils/cookie";

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

    if (!email) {
      return setError("Please enter a valid email");
    }
    if (!password) {
      return setError("Please enter password");
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        login(data.user, data.token);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setCookie("token", data.token, 7);
        window.dispatchEvent(new Event("authChange"));
        
        if (data.user.role === 'admin') navigate('/admin');
        else if (data.user.role === 'institution') navigate('/institution-dashboard');
        else navigate('/dashboard');
      } else {
        setError("Incorrect email or password");
      }
    } catch (err) {
      setError("Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      const data = await res.json();
      
      if (res.ok) {
        login(data.user, data.token);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setCookie("token", data.token, 7);
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

  return (
    <div className="page-wrapper container">
      <div style={{ maxWidth: '400px', margin: '40px auto 0' }} className="glass-card">
        <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '24px', fontSize: '28px' }}>Welcome Back</h2>
        {error && <div style={{ color: 'var(--accent-red)', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', padding: '10px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}
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

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google login failed")}
            useOneTap
          />
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-secondary)' }}>
          Don't have an account? <Link to="/signup" style={{ color: 'var(--accent-blue)', fontWeight: '500' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
