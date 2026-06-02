import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  BarChart3, 
  GitCompare, 
  Building2, 
  ListChecks, 
  ArrowUpRight,
  CheckCircle2, 
  ShieldCheck, 
  ExternalLink
} from 'lucide-react';

const Home = () => {
  return (
    <div className="home-container" style={{ backgroundColor: 'var(--background)', color: 'var(--text)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* SECTION 1: HERO */}
      <section className="hero-section" style={{ 
        position: 'relative',
        paddingTop: 'clamp(38px, 3.5vw, 52px)',
        paddingBottom: 'clamp(20px, 3vw, 32px)',
        backgroundColor: 'var(--hero-bg)',
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          
          {/* Centered Hero Content Block */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: '680px', margin: '0 auto' }}>
            
            {/* Trust badge */}
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              backgroundColor: 'var(--badge-bg)', 
              border: '1px solid var(--badge-border)',
              borderRadius: '9999px', 
              padding: '5px 14px', 
              marginBottom: '20px',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--primary)'
            }}>
              <ShieldCheck size={13} style={{ color: 'var(--secondary)' }} />
              <span>Independent TS EAPCET Guidance Hub 2026</span>
            </div>

            <h1 style={{ 
              fontSize: 'clamp(24px, 3.5vw, 36px)', 
              fontWeight: '800', 
              color: 'var(--text)', 
              lineHeight: '1.05', 
              marginBottom: '24px',
              letterSpacing: '-0.025em',
              textAlign: 'center'
            }}>
               Your TS EAPCET Counselling Guide
            </h1>

            <p style={{ 
              fontSize: '14.5px', 
              color: 'var(--muted)', 
              lineHeight: '1.45', 
               margin: '0 auto 40px auto',
              fontWeight: '400',
              maxWidth: '520px',
              textAlign: 'center'
            }}>
               Explore colleges, predict admission chances, and build smarter web options.
            </p>

             <div className="hero-cta-container" style={{ marginBottom: '56px' }}>
              <Link to="/predictor" className="btn btn-primary hero-cta-btn" style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', padding: '10px 20px', fontSize: '14.5px' }}>
                Predict My Colleges <ArrowRight size={16} />
              </Link>
              <Link to="/colleges" className="btn btn-secondary hero-cta-btn" style={{ display: 'inline-flex', padding: '10px 20px', fontSize: '14.5px', backgroundColor: 'var(--card)' }}>
                Explore Colleges
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 2: DOWNLOAD RANK CARD */}
      <section style={{ padding: '32px 0 0 0', backgroundColor: 'var(--background)' }}>
        <div className="container">
          <div className="rank-card-strip">
            {/* Left: Badge + Title + Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: 'var(--secondary)',
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.18)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  letterSpacing: '0.06em'
                }}>OFFICIAL RELEASE</span>
                <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: '500' }}>TG EAPCET Admissions 2026</span>
              </div>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text)', margin: 0, lineHeight: '1.2' }}>
                TG EAPCET Rank Cards Released
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.4' }}>
                Download your official rank card and begin counselling preparation.
              </p>
            </div>
            <div className="rank-card-strip__cta">
              <Link
                to="/tg-eapcet-rank-card-2026"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap' }}
              >
                Download Rank Card
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: CORE COUNSELLING MODULES */}
      <section style={{ padding: '56px 0', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: '32px' }}>
            <h2 className="section-title">Core Counselling Modules</h2>
            <p className="section-subtitle">Tools built for every step of the TS EAPCET admissions process.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            
            {/* Module 1: Predictor */}
            <Link to="/predictor" className="glass-card" style={{ 
              padding: '24px', 
              textDecoration: 'none', 
              transition: 'transform 0.2s, box-shadow 0.2s', 
              display: 'flex', 
              flexDirection: 'column',
              cursor: 'pointer',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ color: 'var(--secondary)', backgroundColor: 'var(--icon-blue-bg)', width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BarChart3 size={26} />
                </div>
                <div style={{ color: 'var(--muted)' }}>
                  <ArrowUpRight size={18} />
                </div>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '6px', color: 'var(--text)' }}>College Predictor</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Predict seat chances across Safe, Moderate and Dream categories.</p>
            </Link>

            {/* Module 2: Web Options */}
            <Link to="/web-options" className="glass-card" style={{ 
              padding: '24px', 
              textDecoration: 'none', 
              transition: 'transform 0.2s, box-shadow 0.2s', 
              display: 'flex', 
              flexDirection: 'column',
              cursor: 'pointer',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ color: 'var(--primary)', backgroundColor: 'var(--icon-navy-bg)', width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ListChecks size={26} />
                </div>
                <div style={{ color: 'var(--muted)' }}>
                  <ArrowUpRight size={18} />
                </div>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '6px', color: 'var(--text)' }}>Web Options Prioritizer</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Arrange colleges in the exact priority order required during choice filling.</p>
            </Link>

            {/* Module 3: Compare */}
            <Link to="/compare" className="glass-card" style={{ 
              padding: '24px', 
              textDecoration: 'none', 
              transition: 'transform 0.2s, box-shadow 0.2s', 
              display: 'flex', 
              flexDirection: 'column',
              cursor: 'pointer',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ color: 'var(--success)', backgroundColor: 'var(--icon-green-bg)', width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GitCompare size={26} />
                </div>
                <div style={{ color: 'var(--muted)' }}>
                  <ArrowUpRight size={18} />
                </div>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '6px', color: 'var(--text)' }}>College Compare</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Compare fees, placement packages and cutoffs side-by-side.</p>
            </Link>

            {/* Module 4: Cutoff Explorer */}
            <Link to="/colleges" className="glass-card" style={{ 
              padding: '24px', 
              textDecoration: 'none', 
              transition: 'transform 0.2s, box-shadow 0.2s', 
              display: 'flex', 
              flexDirection: 'column',
              cursor: 'pointer',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ color: 'var(--warning)', backgroundColor: 'var(--icon-warning-bg)', width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={26} />
                </div>
                <div style={{ color: 'var(--muted)' }}>
                  <ArrowUpRight size={18} />
                </div>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '6px', color: 'var(--text)' }}>Cutoff Explorer</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Browse verified cutoff histories for 280+ Telangana engineering colleges.</p>
            </Link>

          </div>
        </div>
      </section>

      {/* SECTION 4: COUNSELLING TIMELINE */}
      <section style={{ padding: '48px 0', backgroundColor: 'var(--timeline-bg)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: '28px' }}>
            <h2 className="section-title">Counselling Timeline</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            
            {/* Timeline Item 1 */}
            <div style={{ 
              borderTop: '2px solid var(--secondary)', 
              border: '1px solid var(--border)',
              borderTopWidth: '2px',
              borderTopColor: 'var(--secondary)',
              borderRadius: '12px', 
              padding: '16px 18px', 
              backgroundColor: 'var(--card)',
              boxShadow: 'var(--card-shadow)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--secondary)', backgroundColor: 'rgba(37, 99, 235, 0.08)', padding: '2px 8px', borderRadius: '999px', letterSpacing: '0.04em' }}>UPCOMING</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600' }}>June 15</span>
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px', color: 'var(--text)' }}>Phase-I Slot Booking</h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, lineHeight: '1.4' }}>Fee payment and certificate verification booking opens.</p>
            </div>

            {/* Timeline Item 2 */}
            <div style={{ 
              border: '1px solid var(--border)',
              borderTopWidth: '2px',
              borderTopColor: 'var(--warning)',
              borderRadius: '12px', 
              padding: '16px 18px', 
              backgroundColor: 'var(--card)',
              boxShadow: 'var(--card-shadow)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.08)', padding: '2px 8px', borderRadius: '999px', letterSpacing: '0.04em' }}>CRITICAL</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600' }}>June 20–25</span>
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px', color: 'var(--text)' }}>Web Options Entry</h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, lineHeight: '1.4' }}>Lock your prioritized college choices before the deadline.</p>
            </div>

            {/* Timeline Item 3 */}
            <div style={{ 
              border: '1px solid var(--border)',
              borderTopWidth: '2px',
              borderTopColor: 'var(--success)',
              borderRadius: '12px', 
              padding: '16px 18px', 
              backgroundColor: 'var(--card)',
              boxShadow: 'var(--card-shadow)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--success)', backgroundColor: 'rgba(22, 163, 74, 0.08)', padding: '2px 8px', borderRadius: '999px', letterSpacing: '0.04em' }}>RESULTS</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600' }}>June 28</span>
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px', color: 'var(--text)' }}>Seat Allotments</h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, lineHeight: '1.4' }}>Phase-I provisional seat allotment results published.</p>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)', borderTop: '1px solid var(--border)', padding: '48px 0 24px 0', marginTop: 'auto' }}>
        <div className="container">
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '36px', 
            paddingBottom: '28px',
            borderBottom: '1px solid var(--border)'
          }}>
            
            {/* Brand column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--secondary)'}}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <span style={{ fontWeight: '800', color: 'var(--text)', fontSize: '15px', letterSpacing: '-0.02em' }}>CounselWise</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '12px', lineHeight: '1.6', margin: 0, maxWidth: '200px' }}>
                Independent TS EAPCET guidance platform for Telangana B.Tech admissions.
              </p>
            </div>

            {/* Modules Column */}
            <div>
              <h4 style={{ fontSize: '11px', fontWeight: '700', marginBottom: '14px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Modules
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12.5px' }}>
                <li><Link to="/predictor" className="footer-link">College Predictor</Link></li>
                <li><Link to="/web-options" className="footer-link">Web Options Prioritizer</Link></li>
                <li><Link to="/compare" className="footer-link">Compare Colleges</Link></li>
                <li><Link to="/colleges" className="footer-link">Cutoff Explorer</Link></li>
              </ul>
            </div>

            {/* Official Links Column */}
            <div>
              <h4 style={{ fontSize: '11px', fontWeight: '700', marginBottom: '14px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Official Links
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12.5px' }}>
                <li>
                  <a href="https://eapcet.tgche.ac.in" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    TG EAPCET Portal <ExternalLink size={11} />
                  </a>
                </li>
                <li>
                  <a href="https://tgche.ac.in" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    TGCHE Official <ExternalLink size={11} />
                  </a>
                </li>
                <li>
                  <a href="https://www.jntuh.ac.in" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    JNTU Hyderabad <ExternalLink size={11} />
                  </a>
                </li>
              </ul>
            </div>

            {/* Disclaimer Column */}
            <div>
              <h4 style={{ fontSize: '11px', fontWeight: '700', marginBottom: '14px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Disclaimer
              </h4>
              <p style={{ color: 'var(--muted)', fontSize: '11px', lineHeight: '1.5', margin: 0 }}>
                CounselWise is an independent platform, not affiliated with TSCHE or any official admissions authority. Predictions are advisory only.
              </p>
            </div>

          </div>

          <div style={{ 
            marginTop: '20px',
            fontSize: '11px',
            color: 'var(--muted)'
          }}>
            <span>© {new Date().getFullYear()} CounselWise. Independent TS EAPCET Guidance Hub.</span>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default Home;
