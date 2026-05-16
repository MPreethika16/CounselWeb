import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, List, BarChart3, Building2, Zap, ArrowRight, Play, GitCompare } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section" style={{ 
        padding: 'var(--spacing-xl) 0 var(--spacing-lg)', 
        textAlign: 'center',
        background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.1) 0%, transparent 70%)'
      }}>
        <div className="container">
          <h1 className="section-title" style={{ fontSize: 'clamp(36px, 8vw, 64px)', marginBottom: '24px', lineHeight: '1.1' }}>
            CounselWise
          </h1>
          <p className="section-subtitle" style={{ fontSize: 'clamp(16px, 4vw, 20px)', maxWidth: '700px', margin: '0 auto 40px' }}>
            Smart TS EAMCET Counselling & College Decision Assistant. 
            Find your dream college based on your rank, category, and preferences.
          </p>
          <div className="cta-buttons" style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/predictor" className="btn btn-primary">
              Start Predictor <ArrowRight size={18} style={{ marginLeft: '8px' }} />
            </Link>
            <Link to="/compare" className="btn btn-secondary">
              Compare Colleges
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: 'var(--spacing-lg) 0' }}>
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>Smart Features</h2>
          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
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
                <GitCompare size={24} />
              </div>
              <h3 style={{ marginBottom: '16px' }}>College Comparison</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Side-by-side comparison of colleges based on placements, fees, and location to help you make informed choices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: 'var(--spacing-lg) 0', background: 'rgba(255,255,255,0.02)' }}>
        <div className="container">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>How It Works</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {[
                { step: '01', title: 'Enter Your Details', desc: 'Provide your rank, category, gender, and preferred districts.' },
                { step: '02', title: 'Choose Preferences', desc: 'Select branch categories like Computing, Electrical, or Core engineering.' },
                { step: '03', title: 'Get Predictions', desc: 'Instant access to Safe, Moderate, and Dream college recommendations.' },
                { step: '04', title: 'Save & Export', desc: 'Save your generated web options and export them as PDF or CSV for the actual counselling.' }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 'clamp(32px, 5vw, 40px)', fontWeight: '800', color: 'var(--accent-blue)', opacity: '0.3', lineHeight: '1', minWidth: '50px' }}>{item.step}</div>
                  <div>
                    <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>{item.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section style={{ padding: 'var(--spacing-lg) 0', textAlign: 'center' }}>
        <div className="container">
          <div className="glass-card" style={{ padding: 'var(--spacing-lg)', borderRadius: '32px' }}>
            <h2 style={{ fontSize: 'clamp(24px, 5vw, 36px)', marginBottom: '24px' }}>Ready to find your college?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', maxWidth: '600px', margin: '0 auto var(--spacing-md)' }}>
              Explore colleges, predict your future, and generate web options with CounselWise.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/predictor" className="btn btn-primary">Try Predictor</Link>
              <Link to="/web-options" className="btn btn-secondary">Web Options</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
