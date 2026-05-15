import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, User, Mail, Lock, Building, CheckCircle, AlertCircle } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { API_URL } from "../config";


function SignUp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    collegeId: "",
    collegeCode: "",
    collegeName: ""
  });

  const [collegeSearch, setCollegeSearch] = useState("");
  const [collegeResults, setCollegeResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const searchColleges = async (query) => {
    if (query.length < 2) {
      setCollegeResults([]);
      return;
    }
    
    // Clear previously selected collegeId if user types again
    if (form.collegeId) {
      setForm(prev => ({ ...prev, collegeId: "", collegeCode: "", collegeName: "" }));
    }

    setSearching(true);
    try {
      const res = await fetch(`${API_URL}/api/colleges?search=${query}&limit=5`);
      const data = await res.json();
      setCollegeResults(data.colleges || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleCollegeSelect = (college) => {
    setForm({
      ...form,
      collegeId: college._id,
      collegeCode: college.collegeCode,
      collegeName: college.name
    });
    setCollegeSearch(`${college.collegeCode} - ${college.name}`);
    setCollegeResults([]);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name) {
      setError("Please enter your full name");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email || !emailRegex.test(form.email) || !form.email.toLowerCase().endsWith("@gmail.com")) {
      setError("Please use a valid Gmail address.");
      return;
    }
    if (!form.password) {
      setError("Please enter password");
      return;
    }
    
    // Validation for institution
    if (form.role === "institution" && !form.collegeId) {
      setError("Please select a college from the search suggestions");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Signup failed");
        return;
      }

      navigate("/login");
    } catch (err) {
      console.error(err);
      setError("Server connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (form.role === "institution" && !form.collegeId) {
      setError("Please select a college before continuing with Google.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          credential: credentialResponse.credential,
          role: form.role,
          collegeId: form.collegeId
        })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("authChange"));
        
        if (data.user.role === "admin") navigate("/admin");
        else if (data.user.role === "institution") navigate("/institution-dashboard");
        else navigate("/dashboard");
      } else {
        setError(data.message || "Google signup failed");
      }
    } catch (err) {
      setError("Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google Sign Up was unsuccessful.");
  };


  return (
    <div className="page-wrapper container" style={{ 
      display: 'flex', 
      alignItems: 'flex-start', 
      justifyContent: 'center', 
      minHeight: 'calc(100vh - 80px)', 
      paddingTop: '60px', 
      paddingBottom: '80px' 
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', padding: '16px', background: 'var(--accent-glow)', borderRadius: '50%', color: 'var(--accent-purple)', marginBottom: '16px' }}>
            <UserPlus size={32} />
          </div>
          <h1 style={{ fontSize: '28px', margin: '0 0 8px 0' }}>Create an Account</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '15px' }}>Join CounselWise to access premium features.</p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.4)', 
            color: '#ef4444', 
            padding: '12px', 
            borderRadius: '8px', 
            marginBottom: '24px',
            fontSize: '14px',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="grid-2" style={{ gap: '12px' }}>
            <label style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', 
              background: form.role === 'student' ? 'var(--accent-glow)' : 'var(--bg-secondary)', 
              border: `1px solid ${form.role === 'student' ? 'var(--accent-blue)' : 'var(--border-color)'}`, 
              borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s ease'
            }}>
              <input type="radio" name="role" value="student" checked={form.role === "student"} onChange={handleChange} style={{ display: 'none' }} />
              <User size={24} style={{ color: form.role === 'student' ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
              <span style={{ fontWeight: '600', color: form.role === 'student' ? 'var(--accent-blue)' : 'var(--text-primary)' }}>Student</span>
            </label>
            
            <label style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', 
              background: form.role === 'institution' ? 'var(--accent-glow)' : 'var(--bg-secondary)', 
              border: `1px solid ${form.role === 'institution' ? 'var(--accent-purple)' : 'var(--border-color)'}`, 
              borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s ease'
            }}>
              <input type="radio" name="role" value="institution" checked={form.role === "institution"} onChange={handleChange} style={{ display: 'none' }} />
              <Building size={24} style={{ color: form.role === 'institution' ? 'var(--accent-purple)' : 'var(--text-muted)' }} />
              <span style={{ fontWeight: '600', color: form.role === 'institution' ? 'var(--accent-purple)' : 'var(--text-primary)' }}>Institution</span>
            </label>
          </div>

          <div className="input-group">
            <label>Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                name="name"
                className="input-field"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                name="email"
                className="input-field"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                name="password"
                className="input-field"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          {form.role === "institution" && (
            <div className="input-group" style={{ animation: 'fadeIn 0.3s ease' }}>
              <label>Link to College</label>
              <div style={{ position: 'relative' }}>
                <Building size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search college name or code..."
                  value={collegeSearch}
                  onChange={(e) => {
                    setCollegeSearch(e.target.value);
                    searchColleges(e.target.value);
                  }}
                  style={{ 
                    paddingLeft: '44px',
                    borderColor: form.collegeId ? 'var(--safe-text)' : 'var(--border-color)',
                    background: form.collegeId ? 'rgba(34, 197, 94, 0.05)' : 'transparent'
                  }}
                  required
                />
                {form.collegeId && (
                  <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--safe-text)', display: 'flex', alignItems: 'center' }}>
                    <CheckCircle size={16} />
                  </div>
                )}
                {searching && (
                  <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                    <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                  </div>
                )}
                {collegeSearch.length >= 2 && !searching && collegeResults.length === 0 && !form.collegeId && (
                  <div className="glass-card" style={{ 
                    position: 'absolute', top: '100%', left: 0, width: '100%', 
                    zIndex: 10, marginTop: '4px', padding: '16px', textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No colleges found matching "{collegeSearch}"</span>
                  </div>
                )}
                {collegeResults.length > 0 && (
                  <div className="glass-card" style={{ 
                    position: 'absolute', top: '100%', left: 0, width: '100%', 
                    zIndex: 10, marginTop: '4px', padding: '8px', 
                    maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                  }}>
                    {collegeResults.map(c => (
                      <div 
                        key={c._id} 
                        onClick={() => handleCollegeSelect(c)}
                        style={{ 
                          padding: '12px', cursor: 'pointer', borderRadius: '8px',
                          display: 'flex', flexDirection: 'column', gap: '2px',
                          transition: 'background 0.2s'
                        }}
                        className="search-result-item"
                      >
                        <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>{c.collegeCode}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Institution accounts are linked to one college for editing college data.
              </p>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '14px', fontSize: '16px', marginTop: '8px' }}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
        </div>

        {!import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
          <div style={{ 
            padding: '10px', 
            borderRadius: '8px', 
            color: 'var(--text-muted)', 
            fontSize: '12px', 
            textAlign: 'center',
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-color)'
          }}>
            <AlertCircle size={14} /> Google login is not configured
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              theme="filled_blue"
              shape="pill"
              text="signup_with"
              width="340px"
            />
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent-purple)', fontWeight: '600', textDecoration: 'none' }}>Sign in here</Link>
        </p>
      </div>
    </div>
  );
}

export default SignUp;