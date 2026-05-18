import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { API_URL } from "../config/api";
import { setCookie } from "../utils/cookie";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [collegeId, setCollegeId] = useState("");
  const [collegeSearch, setCollegeSearch] = useState("");
  const [colleges, setColleges] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  
  const navigate = useNavigate();

  useEffect(() => {
    if (role === "institution") {
      fetch(`${API_URL}/api/colleges/branches`)
        // Just fetching colleges list (we'll fetch actual colleges or hardcode a dropdown)
        // Here we'll just fetch options if possible, or simple input
        // Using a custom fetch for colleges list might be better, but assuming /api/colleges exists
        // Wait, the backend has /api/colleges but no dedicated simplified list route.
        // We'll leave it as a text input or fetch all if needed. For now, assuming input text is fine, 
        // wait, collegeId should be ObjectId. Let's fetch basic list.
        fetch(`${API_URL}/api/colleges?limit=1000`)
          .then(res => res.json())
          .then(data => {
            if (data.colleges) {
              setColleges(data.colleges);
            }
          })
          .catch(() => {});
    }
  }, [role]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (role === "institution" && !collegeId) {
      setError("Please select a linked college.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, collegeId: role === 'institution' ? collegeId : null })
      });
      const data = await res.json();
      
      if (res.ok) {
        navigate('/login');
      } else {
        setError(data.message || data.error || "Signup failed");
      }
    } catch (err) {
      setError("Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (role === "institution" && !collegeId) {
      setError("Please select a linked college before signing up with Google.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          credential: credentialResponse.credential, 
          role, 
          collegeId: role === 'institution' ? collegeId : null 
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        login(data.user, data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setCookie("token", data.token, 7);
        window.dispatchEvent(new Event("authChange"));

        if (data.user.role === 'admin') navigate('/admin');
        else if (data.user.role === 'institution') navigate('/institution-dashboard');
        else navigate('/dashboard');
      } else {
        setError(data.message || "Google signup failed");
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
        <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '24px', fontSize: '28px' }}>Create Account</h2>
        {error && <div style={{ color: 'var(--accent-red)', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', padding: '10px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="input-group">
            <label>I am a:</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => setRole('student')} 
                className={`btn ${role === 'student' ? 'btn-primary' : 'btn-secondary'}`} 
                style={{flex: 1}}
              >
                Student
              </button>
              <button 
                type="button" 
                onClick={() => setRole('institution')} 
                className={`btn ${role === 'institution' ? 'btn-primary' : 'btn-secondary'}`} 
                style={{flex: 1}}
              >
                Institution
              </button>
            </div>
          </div>

          <div className="input-group">
            <label>Full Name</label>
            <input type="text" required className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Email</label>
            <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" required className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {role === 'institution' && (
            <div className="input-group">
              <label>Linked College</label>
              <input 
                type="text" 
                required 
                className="input-field" 
                list="colleges-list" 
                value={collegeSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setCollegeSearch(val);
                  const match = colleges.find(c => `${c.collegeCode} - ${c.name}` === val);
                  if(match) setCollegeId(match._id);
                  else setCollegeId("");
                }} 
                placeholder="Search college code or name..." 
              />
              <datalist id="colleges-list">
                {colleges.map(c => (
                  <option key={c._id} value={`${c.collegeCode} - ${c.name}`} />
                ))}
              </datalist>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? "Signing up..." : "Sign Up"}
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
            onError={() => setError("Google signup failed")}
          />
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent-blue)', fontWeight: '500' }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
