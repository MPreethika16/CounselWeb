import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, List, BarChart3, Users, Building2, Zap, ArrowRight, CheckCircle, LogIn, UserPlus, Play } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(null);

  const handleAction = (path) => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate(path);
    } else {
      setPendingRoute(path);
      setShowAuthModal(true);
    }
  };

  const continueAsGuest = () => {
    setShowAuthModal(false);
    navigate(pendingRoute || "/predictor");
  };
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const role = user?.role;

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section" style={{ 
        padding: '100px 0 60px', 
        textAlign: 'center',
        background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.1) 0%, transparent 70%)'
      }}>
        <div className="container">
          <h1 className="section-title" style={{ fontSize: '64px', marginBottom: '24px', lineHeight: '1.1' }}>
            CounselWise
          </h1>
          <p className="section-subtitle" style={{ fontSize: '20px', maxWidth: '700px', margin: '0 auto 40px' }}>
            Smart TS EAMCET Counselling & College Decision Assistant. 
            Find your dream college based on your rank, category, and preferences.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            {(!role || role === "student") && (
              <>
                <button onClick={() => handleAction("/predictor")} className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '16px' }}>
                  Start Predictor <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                </button>
                <Link to="/colleges" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '16px' }}>
                  Explore Colleges
                </Link>
              </>
            )}
            
            {role === "institution" && (
              <>
                <Link to="/institution-dashboard" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '16px' }}>
                  Manage Your College <Building2 size={18} style={{ marginLeft: '8px' }} />
                </Link>
                <Link to="/profile" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '16px' }}>
                  View Profile
                </Link>
              </>
            )}

            {role === "admin" && (
              <Link to="/admin" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '16px' }}>
                Open Admin Dashboard <Zap size={18} style={{ marginLeft: '8px' }} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '80px 0' }}>
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '60px' }}>Smart Features</h2>
          <div className="grid-3">
            <div className="glass-card" style={{ padding: '40px' }}>
              <div style={{ background: 'rgba(37, 99, 235, 0.1)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: 'var(--accent-blue)' }}>
                <BarChart3 size={24} />
              </div>
              <h3 style={{ marginBottom: '16px' }}>Rank-based Prediction</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Advanced algorithm that analyzes previous year cutoffs to predict Safe, Moderate, and Dream colleges.
              </p>
            </div>
            <div className="glass-card" style={{ padding: '40px' }}>
              <div style={{ background: 'rgba(147, 51, 234, 0.1)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: 'var(--accent-purple)' }}>
                <List size={24} />
              </div>
              <h3 style={{ marginBottom: '16px' }}>Smart Web Options</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Automatically generate an optimized list of web options to maximize your chances of getting the best college.
              </p>
            </div>
            <div className="glass-card" style={{ padding: '40px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: 'var(--accent-green)' }}>
                <Building2 size={24} />
              </div>
              <h3 style={{ marginBottom: '16px' }}>College Insights</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Get detailed info about placements, facilities, rankings, and campus life for any college in Telangana.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 0', background: 'rgba(255,255,255,0.02)' }}>
        <div className="container">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '60px' }}>How It Works</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              {[
                { step: '01', title: 'Enter Your Details', desc: 'Provide your rank, category, gender, and preferred districts.' },
                { step: '02', title: 'Choose Preferences', desc: 'Select branch categories like Computing, Electrical, or Core engineering.' },
                { step: '03', title: 'Get Predictions', desc: 'Instant access to Safe, Moderate, and Dream college recommendations.' },
                { step: '04', title: 'Save & Export', desc: 'Save your generated web options and export them as PDF or CSV for the actual counselling.' }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '40px', fontWeight: '800', color: 'var(--accent-blue)', opacity: '0.3', lineHeight: '1' }}>{item.step}</div>
                  <div>
                    <h3 style={{ marginBottom: '8px', fontSize: '20px' }}>{item.title}</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section style={{ padding: '100px 0', textAlign: 'center' }}>
        <div className="container">
          <div className="glass-card" style={{ padding: '60px', borderRadius: '32px' }}>
            <h2 style={{ fontSize: '36px', marginBottom: '24px' }}>Ready to find your college?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
              Join thousands of students who used CounselWise to make informed decisions about their engineering career.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <Link to="/signup" className="btn btn-primary" style={{ padding: '14px 40px' }}>Create Account</Link>
              <button onClick={() => handleAction("/predictor")} className="btn btn-secondary" style={{ padding: '14px 40px' }}>Try Predictor</button>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      {showAuthModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-card" style={{ maxWidth: '400px', width: '90%', padding: '40px', textAlign: 'center' }}>
            <div style={{ 
              background: 'var(--accent-glow)', width: '60px', height: '60px', 
              borderRadius: '50%', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', margin: '0 auto 24px', color: 'var(--accent-blue)' 
            }}>
              <LogIn size={30} />
            </div>
            <h2 style={{ marginBottom: '12px', fontSize: '24px' }}>Welcome to CounselWise</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
              Login or create an account to save your reports and access premium features.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <LogIn size={18} style={{ marginRight: '8px' }} /> Login to Account
              </Link>
              <Link to="/signup" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                <UserPlus size={18} style={{ marginRight: '8px' }} /> Create New Account
              </Link>
              <button 
                onClick={continueAsGuest}
                className="btn" 
                style={{ 
                  marginTop: '12px', background: 'transparent', border: 'none', 
                  color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <Play size={14} /> Continue as Guest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
