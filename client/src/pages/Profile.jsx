import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Award, Calendar, Edit2, LogOut, Building2 } from 'lucide-react';
import { API_URL } from "../config/api";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', rank: '', category: '', gender: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setEditForm({
            name: data.name || '',
            rank: data.rank || '',
            category: data.category || '',
            gender: data.gender || ''
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChange"));
    window.location.href = "/login";
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setMsg({ type: '', text: '' });
  };

  const handleInputChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("authChange"));
        setMsg({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => {
          setIsEditing(false);
          setMsg({ type: '', text: '' });
        }, 2000);
      } else {
        setMsg({ type: 'error', text: data.message || 'Update failed' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Server error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="page-wrapper container">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="skeleton" style={{ width: '200px', height: '40px', margin: '0 auto 40px' }}></div>
        <div className="glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="skeleton" style={{ width: '100px', height: '100px', borderRadius: '50%', marginBottom: '24px' }}></div>
          <div className="skeleton" style={{ width: '150px', height: '24px', marginBottom: '8px' }}></div>
          <div className="skeleton" style={{ width: '200px', height: '16px', marginBottom: '32px' }}></div>
          <div className="grid-2" style={{ width: '100%', gap: '24px' }}>
            <div className="skeleton" style={{ height: '150px', borderRadius: '16px' }}></div>
            <div className="skeleton" style={{ height: '150px', borderRadius: '16px' }}></div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <h2>Not logged in</h2>
        <p style={{ marginBottom: '24px' }}>Please login to view your profile.</p>
        <a href="/login" className="btn btn-primary">Login Now</a>
      </div>
    );
  }

  return (
    <div className="page-wrapper container">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 className="section-title">Your Profile</h1>
        </div>

        <div className="glass-card" style={{ padding: '40px', position: 'relative' }}>
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

          <div style={{ 
            width: '100px', height: '100px', borderRadius: '50%', 
            background: 'var(--accent-glow)', border: '2px solid var(--accent-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', color: 'var(--accent-blue)',
            overflow: 'hidden'
          }}>
            {user.picture ? (
              <img src={user.picture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={48} />
            )}
          </div>

          {!isEditing ? (
            <>
              <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>{user.name}</h2>
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '32px' }}>{user.email}</p>

              <div className="grid-2" style={{ gap: '24px' }}>
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <Shield size={20} style={{ color: 'var(--accent-blue)' }} />
                    <span style={{ fontWeight: '600' }}>Account Details</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Role</span>
                      <span style={{ textTransform: 'capitalize', fontWeight: '600', color: 'var(--accent-purple)' }}>{user.role}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Member Since</span>
                      <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Auth Method</span>
                      <span style={{ textTransform: 'capitalize' }}>{user.authProvider || 'Local'}</span>
                    </div>
                  </div>
                </div>

                {user.role === "student" && (
                  <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <Award size={20} style={{ color: 'var(--accent-purple)' }} />
                      <span style={{ fontWeight: '600' }}>Academic Info</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Rank</span>
                        <span>{user.rank || "Not set"}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Category</span>
                        <span>{user.category || "Not set"}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Gender</span>
                        <span style={{ textTransform: 'capitalize' }}>{user.gender || "Not set"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '40px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button onClick={handleEditToggle} className="btn btn-secondary">
                  <Edit2 size={16} style={{ marginRight: '8px' }} /> Edit Profile
                </button>
                <button onClick={handleLogout} className="btn btn-secondary" style={{ color: 'var(--dream-text)' }}>
                  <LogOut size={16} style={{ marginRight: '8px' }} /> Logout
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="input-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  className="input-field" 
                  value={editForm.name} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>

              <div className="input-group">
                <label>Email (Read-only)</label>
                <input 
                  type="email" 
                  className="input-field" 
                  value={user.email} 
                  disabled 
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>

              {user.role === 'student' && (
                <div className="grid-2" style={{ gap: '20px' }}>
                  <div className="input-group">
                    <label>Rank</label>
                    <input 
                      type="number" 
                      name="rank" 
                      className="input-field" 
                      value={editForm.rank} 
                      onChange={handleInputChange} 
                    />
                  </div>
                  <div className="input-group">
                    <label>Gender</label>
                    <select 
                      name="gender" 
                      className="input-field" 
                      value={editForm.gender} 
                      onChange={handleInputChange}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="input-group" style={{ gridColumn: 'span 2' }}>
                    <label>Category</label>
                    <select 
                      name="category" 
                      className="input-field" 
                      value={editForm.category} 
                      onChange={handleInputChange}
                    >
                      <option value="">Select Category</option>
                      <option value="OC">OC</option>
                      <option value="BC_A">BC_A</option>
                      <option value="BC_B">BC_B</option>
                      <option value="BC_C">BC_C</option>
                      <option value="BC_D">BC_D</option>
                      <option value="BC_E">BC_E</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                      <option value="EWS">EWS</option>
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={handleEditToggle} className="btn btn-secondary" disabled={saving}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
