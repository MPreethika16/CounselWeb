import React, { useState, useEffect } from 'react';
import { User, Settings, Award, Save, RotateCcw, Trash2 } from 'lucide-react';
import { API_URL } from '../config/api';
import { getCookie } from '../utils/cookie';
import logger from '../utils/logger';

const Profile = () => {
  const [preferences, setPreferences] = useState({
    name: '',
    rank: '',
    category: '',
    gender: ''
  });
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setPreferences(JSON.parse(userStr));
      } catch (err) {
        logger.error("Failed to parse user in Profile:", err);
      }
    } else {
      const saved = localStorage.getItem("guest_preferences");
      if (saved) {
        try {
          setPreferences(JSON.parse(saved));
        } catch (err) {
          logger.error("Failed to parse guest_preferences in Profile:", err);
        }
      }
    }
  }, []);

  const handleInputChange = (e) => {
    setPreferences({ ...preferences, [e.target.name]: e.target.value });
  };

  const savePreferences = async (e) => {
    e.preventDefault();
    localStorage.setItem("guest_preferences", JSON.stringify(preferences));
    
    const token = getCookie("token");
    if (token) {
      try {
        const res = await fetch(`${API_URL}/api/auth/profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(preferences)
        });
        if (res.ok) {
           const data = await res.json();
           localStorage.setItem("user", JSON.stringify(data.user));
        }
      } catch (err) {
        logger.error("Failed to sync profile", err);
      }
    } else {
      localStorage.setItem("user", JSON.stringify({ ...preferences, role: 'student' }));
    }
    
    setMsg({ type: 'success', text: 'Preferences saved successfully!' });
    window.dispatchEvent(new Event("authChange"));
    setTimeout(() => setMsg({ type: '', text: '' }), 3000);
  };

  const clearData = () => {
    if (window.confirm("Clear all locally saved data?")) {
      localStorage.clear();
      setPreferences({ name: '', rank: '', category: '', gender: '' });
      setMsg({ type: 'success', text: 'All data cleared.' });
      setTimeout(() => setMsg({ type: '', text: '' }), 3000);
    }
  };

  return (
    <div className="page-wrapper container">
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 className="section-title">App Settings</h1>
          <p className="section-subtitle">Set your preferences to get personalized predictions across the app.</p>
        </div>

        <div className="glass-card" style={{ padding: '32px' }}>
          {msg.text && (
            <div style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '24px', 
              textAlign: 'center',
              background: msg.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: msg.type === 'success' ? 'var(--safe-text)' : '#ef4444',
              border: `1px solid ${msg.type === 'success' ? 'var(--safe-text)' : '#ef4444'}`
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
                value={preferences.name} 
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
                  value={preferences.rank} 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="input-group">
                <label>Gender</label>
                <select 
                  name="gender" 
                  className="input-field" 
                  value={preferences.gender} 
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
                value={preferences.category} 
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
