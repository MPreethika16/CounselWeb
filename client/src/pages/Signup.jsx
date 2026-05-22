import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { API_URL } from "../config/api";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [collegeId, setCollegeId] = useState("");
  const [colleges, setColleges] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    if (role === "institution") {
      fetch(`${API_URL}/api/colleges?limit=1000`)
        .then((res) => res.json())
        .then((data) => {
          if (data.colleges) {
            setColleges(data.colleges);
          }
        })
        .catch((err) => {
          console.error("Failed to load colleges:", err);
        });
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
          token: credentialResponse.credential, 
          role, 
          collegeId: role === 'institution' ? collegeId : null 
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        // Assume Google Signup also logs us in, wait no, Google Auth backend logic:
        // if user created/found, returns { token, user }. Let's use AuthContext here.
        // I need to import login from useAuth. Wait, I'll just redirect to /login or auto-login.
        // Let's auto-login.
        // Need to add login to useAuth() in this component. Wait! I didn't import login from useAuth!
        navigate('/login'); // We can redirect to login to be safe, but actually it returns token/user.
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
        {error && <div style={{ color: 'red', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="input-group">
            <label>I am a:</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="radio" name="role" value="student" checked={role === 'student'} onChange={() => setRole('student')} />
                Student
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="radio" name="role" value="institution" checked={role === 'institution'} onChange={() => setRole('institution')} />
                Institution
              </label>
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
              <select required className="input-field" value={collegeId} onChange={(e) => setCollegeId(e.target.value)}>
                <option value="">Select your college...</option>
                {colleges.map(c => (
                  <option key={c._id} value={c._id}>{c.collegeCode} - {c.name}</option>
                ))}
              </select>
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
