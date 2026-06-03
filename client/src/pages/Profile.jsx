import { useState } from 'react';
import { User, Settings, Award, Save, RotateCcw, Trash2 } from 'lucide-react';
import { API_URL } from '../config/api';
import { getCookie } from '../utils/cookie';
import logger from '../utils/logger';

const Profile = () => {
  const [preferences, setPreferences] = useState(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        return {
          name: parsed.name ?? "",
          rank: parsed.rank ?? "",
          category: parsed.category ?? "",
          gender: parsed.gender ?? ""
        };
      } catch (err) {
        logger.error("Failed to parse user in Profile:", err);
      }
    } else {
      const saved = localStorage.getItem("guest_preferences");
      if (saved) {
        try {
          const parsedSaved = JSON.parse(saved);
          return {
            name: parsedSaved.name ?? "",
            rank: parsedSaved.rank ?? "",
            category: parsedSaved.category ?? "",
            gender: parsedSaved.gender ?? ""
          };
        } catch (err) {
          logger.error("Failed to parse guest_preferences in Profile:", err);
        }
      }
    }
    return {
      name: '',
      rank: '',
      category: '',
      gender: ''
    };
  });
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleInputChange = (e) => {
    setPreferences({ ...preferences, [e.target.name]: e.target.value ?? "" });
  };

  const savePreferences = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!preferences.name || !preferences.name.trim()) {
      setMsg({ type: 'error', text: 'Name is required' });
      return;
    }
    const rankVal = Number(preferences.rank);
    if (!preferences.rank || Number.isNaN(rankVal) || !Number.isFinite(rankVal) || rankVal <= 0) {
      setMsg({ type: 'error', text: 'Please enter a valid rank greater than 0' });
      return;
    }
    if (!preferences.gender) {
      setMsg({ type: 'error', text: 'Please select your gender' });
      return;
    }
    if (!preferences.category) {
      setMsg({ type: 'error', text: 'Please select your reservation category' });
      return;
    }

    localStorage.setItem("guest_preferences", JSON.stringify(preferences));
    
    const token = getCookie("token");
    if (token) {
      try {
        const res = await fetch(`${API_URL}/api/auth/profile`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json", 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify(preferences)
        });
        
        const data = await res.json();
        
        if (res.ok) {
          if (data && data.user) {
            localStorage.setItem("user", JSON.stringify(data.user));
            setMsg({ type: 'success', text: 'Profile saved successfully' });
            window.dispatchEvent(new Event("authChange"));
          } else {
            localStorage.removeItem("user");
            setMsg({ type: 'error', text: 'Server returned incomplete user data. Please try again.' });
          }
        } else {
          setMsg({ type: 'error', text: data.error || 'Failed to save preferences. Please try again.' });
        }
      } catch (err) {
        logger.error("Failed to sync profile", err);
        setMsg({ type: 'error', text: 'Network connection failed. Unable to save preferences.' });
      }
    } else {
      localStorage.setItem("user", JSON.stringify({ ...preferences, role: 'student' }));
      setMsg({ type: 'success', text: 'Profile saved successfully' });
      window.dispatchEvent(new Event("authChange"));
    }
    
    setTimeout(() => setMsg({ type: '', text: '' }), 4000);
  };

  const clearData = () => {
    if (window.confirm("Clear all locally saved data?")) {
      localStorage.clear();
      setPreferences({ name: '', rank: '', category: '', gender: '' });
      setMsg({ type: 'success', text: 'All data cleared successfully' });
      setTimeout(() => setMsg({ type: '', text: '' }), 3000);
    }
  };

  return (
    <div className="page-wrapper container">
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 className="section-title">App Settings</h1>
          <p className="section-subtitle">Set your preferences to get personalized B.Tech predictions across the app.</p>
        </div>

        <div className="glass-card" style={{ padding: '32px' }}>
          {msg.text && (
            <div style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '24px', 
              textAlign: 'center',
              background: msg.type === 'success' ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)',
              color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${msg.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
              fontWeight: '600',
              fontSize: '14px'
            }}>
              {msg.text}
            </div>
          )}

          <form onSubmit={savePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="input-group">
              <label><User size={14} style={{marginRight: '6px'}}/> Your Name</label>
              <input 
                type="text" 
                name="name" 
                placeholder="Student Name"
                className="input-field" 
                value={preferences.name ?? ""} 
                onChange={handleInputChange} 
              />
            </div>

            <div className="grid-2" style={{ gap: '20px' }}>
              <div className="input-group">
                <label><Award size={14} style={{marginRight: '6px'}}/> EAMCET Rank</label>
                <input 
                  type="number" 
                  name="rank" 
                  placeholder="e.g. 15000"
                  className="input-field" 
                  value={preferences.rank ?? ""} 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="input-group">
                <label>Gender</label>
                <select 
                  name="gender" 
                  className="input-field" 
                  value={preferences.gender ?? ""} 
                  onChange={handleInputChange}
                >
                  <option value="">Select</option>
                  <option value="BOYS">BOYS</option>
                  <option value="GIRLS">GIRLS</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label>Category</label>
              <select 
                name="category" 
                className="input-field" 
                value={preferences.category ?? ""} 
                onChange={handleInputChange}
              >
                <option value="">Select Category</option>
                {["OC", "BC_A", "BC_B", "BC_C", "BC_D", "BC_E", "SC", "ST"].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <Save size={18} style={{ marginRight: '8px' }} /> Save Preferences
              </button>
              <button type="button" onClick={clearData} className="btn btn-secondary" style={{ width: '100%', color: 'var(--dream-text)' }}>
                <Trash2 size={18} style={{ marginRight: '8px' }} /> Clear App Data
              </button>
            </div>
          </form>
        </div>

        <div className="glass-card" style={{ marginTop: '24px', padding: '24px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>About CounselWise</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Version 2.0.0 (Public Edition)</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>Designed for TS EAMCET Aspirants.</p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
