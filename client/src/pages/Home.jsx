import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Search, 
  BarChart3, 
  GitCompare, 
  Building2, 
  ListChecks, 
  Bell, 
  Calendar, 
  ChevronRight, 
  ArrowUpRight,
  GraduationCap, 
  Users, 
  CheckCircle2, 
  ShieldCheck, 
  ExternalLink,
  BookOpen,
  Info,
  Clock,
  MapPin,
  Settings2,
  FileText,
  AlertTriangle,
  HelpCircle,
  Activity,
  CheckCircle
} from 'lucide-react';

const Home = () => {
  // Official Announcements & Schedule data
  const officialUpdates = [
    {
      id: 1,
      date: "June 15, 2026",
      tag: "UPCOMING",
      tagColor: "var(--secondary)",
      tagBg: "rgba(37, 99, 235, 0.08)",
      title: "Commencement of Phase-I Registration, Processing Fee Payment & Slot Booking",
      desc: "Eligible B.Tech candidates must book slots for certificate verification."
    },
    {
      id: 2,
      date: "June 18 - June 22, 2026",
      tag: "SCHEDULE",
      tagColor: "var(--warning)",
      tagBg: "rgba(245, 158, 11, 0.08)",
      title: "Physical Certificate Verification at Help Line Centres (HLCs)",
      desc: "For already slot-booked candidates of Phase-I admissions."
    },
    {
      id: 3,
      date: "June 20 - June 25, 2026",
      tag: "CRITICAL",
      tagColor: "var(--danger)",
      tagBg: "rgba(220, 38, 38, 0.08)",
      title: "Phase-I Exercising Web Options (Choice Filling Period)",
      desc: "Generate your prioritized college options list and lock before the deadline."
    },
    {
      id: 4,
      date: "June 28, 2026",
      tag: "IMPORTANT",
      tagColor: "var(--success)",
      tagBg: "rgba(22, 163, 74, 0.08)",
      title: "Phase-I Provisional Seat Allotment Results Publication",
      desc: "Seat allotments will be released based on rank, category, and locked choices."
    },
    {
      id: 5,
      date: "May 28, 2026",
      tag: "COMPLETED",
      tagColor: "var(--muted)",
      tagBg: "rgba(100, 116, 139, 0.08)",
      title: "TS EAPCET 2026 Official Results & Rank Cards Released",
      desc: "Rank cards and subject-wise cutoffs are now live on the official TSCHE portal."
    }
  ];

  return (
    <div className="home-container" style={{ backgroundColor: 'var(--background)', color: 'var(--text)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* SECTION 1: HERO SECTION */}
      <section className="hero-section" style={{ 
        position: 'relative',
        paddingTop: 'clamp(32px, 5vh, 48px)',
        paddingBottom: 'clamp(64px, 10vh, 96px)',
        backgroundColor: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        {/* Subtle Decorative Visual Element (Campus Silhouette Backdrop) */}
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 1200 400" 
          fill="none" 
          style={{ 
            position: 'absolute', 
            bottom: 0, 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 0, 
            pointerEvents: 'none', 
            opacity: 0.02,
            color: 'var(--primary)'
          }}
        >
          <path d="M0 400h1200V320l-40-20-40 20v80h-80v-60l-30-15-30 15v60h-100v-100l-50-30-50 30v100h-120v-80l-40-20-40 20v80h-140v-120l-60-35-60 35v120h-160V300l-30-15-30 15v100H0v100z" fill="currentColor" />
          <circle cx="200" cy="150" r="40" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
          <path d="M400 100l50 50-50 50" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
        </svg>

        <div className="container" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: '1100px', margin: '0 auto' }}>
          
          {/* DESKTOP ONLY HERO BLOCK */}
          <div className="desktop-hero-only">
            {/* Trust badge */}
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              backgroundColor: 'rgba(30, 58, 138, 0.06)', 
              border: '1px solid rgba(30, 58, 138, 0.12)',
              borderRadius: '9999px', 
              padding: '4px 12px', 
              marginBottom: '10px',
              fontSize: '12.5px',
              fontWeight: '600',
              color: 'var(--primary)'
            }}>
              <ShieldCheck size={13.5} style={{ color: 'var(--secondary)' }} />
              <span>Independent TS EAPCET Guidance Hub 2026</span>
            </div>

            <h1 style={{ 
              fontSize: 'clamp(32px, 3.8vw, 42px)', 
              fontWeight: '800', 
              color: 'var(--text)', 
              lineHeight: '1.2', 
              marginBottom: '10px',
              letterSpacing: '-0.02em',
              maxWidth: '850px'
            }}>
              Smarter TS EAPCET Decisions
            </h1>

            <p style={{ 
              fontSize: 'clamp(14px, 1.8vw, 16px)', 
              color: 'var(--muted)', 
              lineHeight: '1.45', 
              marginBottom: '20px',
              fontWeight: '400',
              maxWidth: '720px'
            }}>
              Predict seat probabilities and organize your B.Tech options list safely.
            </p>

            <div className="hero-cta-container" style={{ justifyContent: 'center', marginBottom: '16px' }}>
              <Link to="/predictor" className="btn btn-primary hero-cta-btn" style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', padding: '12px 32px', fontSize: '15px', color: '#FFFFFF', backgroundColor: 'var(--primary)' }}>
                Predict My Colleges <ArrowRight size={16} style={{ color: '#FFFFFF' }} />
              </Link>
              <Link to="/colleges" className="btn btn-secondary hero-cta-btn" style={{ display: 'inline-flex', padding: '12px 32px', fontSize: '15px', backgroundColor: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                Explore Colleges
              </Link>
            </div>

            {/* Compact Spaced Trust Indicators Row */}
            <div style={{ 
              display: 'flex', 
              gap: '20px', 
              justifyContent: 'center',
              width: '100%',
              maxWidth: '480px'
            }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--muted)', fontWeight: '500' }}>
                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span>
                <span>Official Data</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--muted)', fontWeight: '500' }}>
                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span>
                <span>All Categories</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--muted)', fontWeight: '500' }}>
                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span>
                <span>280+ Colleges</span>
              </div>
            </div>
          </div>

          {/* MOBILE ONLY HERO BLOCK */}
          <div className="mobile-hero-only">
            {/* Badge */}
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              backgroundColor: 'rgba(30, 58, 138, 0.06)', 
              border: '1px solid rgba(30, 58, 138, 0.12)',
              borderRadius: '9999px', 
              padding: '3px 10px', 
              marginBottom: '6px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--primary)'
            }}>
              <ShieldCheck size={12} style={{ color: 'var(--secondary)' }} />
              <span>Independent Guidance Hub 2026</span>
            </div>

            {/* Headline */}
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: '800', 
              color: 'var(--text)', 
              lineHeight: '1.2', 
              marginBottom: '12px',
              letterSpacing: '-0.02em',
              maxWidth: '100%'
            }}>
              Smarter TS EAPCET Decisions
            </h1>

            {/* Primary CTA */}
            <Link to="/predictor" className="btn btn-primary hero-cta-btn" style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', padding: '11px 20px', fontSize: '14.5px', color: '#FFFFFF', backgroundColor: 'var(--primary)', marginBottom: '8px', width: '100%' }}>
              Predict My Colleges <ArrowRight size={15} style={{ color: '#FFFFFF' }} />
            </Link>

            {/* Secondary CTA */}
            <Link to="/colleges" className="btn btn-secondary hero-cta-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '11px 20px', fontSize: '14.5px', backgroundColor: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', marginBottom: '10px', width: '100%' }}>
              Explore Colleges
            </Link>

            {/* Trust Indicators */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'center',
              width: '100%'
            }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11.5px', color: 'var(--muted)', fontWeight: '500' }}>
                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span>
                <span>Official Data</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11.5px', color: 'var(--muted)', fontWeight: '500' }}>
                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span>
                <span>All Categories</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11.5px', color: 'var(--muted)', fontWeight: '500' }}>
                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span>
                <span>280+ Colleges</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 2: CORE COUNSELLING MODULES */}
      <section style={{ padding: '64px 0', backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: '40px' }}>
            <h2 className="section-title">Core Counselling Modules</h2>
            <p className="section-subtitle">Fully interactive diagnostic tools supporting your admissions sequence.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            
            {/* Module 1: Predictor */}
            <Link to="/predictor" className="glass-card" style={{ 
              padding: '28px 24px', 
              textDecoration: 'none', 
              transition: 'transform 0.2s, box-shadow 0.2s', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              cursor: 'pointer',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div style={{ color: 'var(--secondary)', backgroundColor: 'rgba(37, 99, 235, 0.06)', width: '56px', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarChart3 size={32} />
                  </div>
                  <div style={{ color: 'var(--muted)', marginTop: '4px' }}>
                    <ArrowUpRight size={20} />
                  </div>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text)' }}>College Predictor</h3>
                <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Predict college cutoff scores based on reservation quotas.</p>
              </div>
            </Link>

            {/* Module 2: Web Options */}
            <Link to="/web-options" className="glass-card" style={{ 
              padding: '28px 24px', 
              textDecoration: 'none', 
              transition: 'transform 0.2s, box-shadow 0.2s', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              cursor: 'pointer',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div style={{ color: 'var(--primary)', backgroundColor: 'rgba(30, 58, 138, 0.06)', width: '56px', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ListChecks size={32} />
                  </div>
                  <div style={{ color: 'var(--muted)', marginTop: '4px' }}>
                    <ArrowUpRight size={20} />
                  </div>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text)' }}>Web Options Prioritizer</h3>
                <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Prioritize and sequence engineering branch preferences safely.</p>
              </div>
            </Link>

            {/* Module 3: Compare */}
            <Link to="/compare" className="glass-card" style={{ 
              padding: '28px 24px', 
              textDecoration: 'none', 
              transition: 'transform 0.2s, box-shadow 0.2s', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              cursor: 'pointer',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div style={{ color: 'var(--success)', backgroundColor: 'rgba(22, 163, 74, 0.06)', width: '56px', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GitCompare size={32} />
                  </div>
                  <div style={{ color: 'var(--muted)', marginTop: '4px' }}>
                    <ArrowUpRight size={20} />
                  </div>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text)' }}>College Compare</h3>
                <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Compare college fees and placement packages side-by-side.</p>
              </div>
            </Link>

            {/* Module 4: Colleges */}
            <Link to="/colleges" className="glass-card" style={{ 
              padding: '28px 24px', 
              textDecoration: 'none', 
              transition: 'transform 0.2s, box-shadow 0.2s', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              cursor: 'pointer',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div style={{ color: 'var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.06)', width: '56px', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={32} />
                  </div>
                  <div style={{ color: 'var(--muted)', marginTop: '4px' }}>
                    <ArrowUpRight size={20} />
                  </div>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text)' }}>Cutoff Explorer</h3>
                <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Explore details and official histories for 280+ engineering institutions.</p>
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* SECTION 3: HOW IT WORKS */}
      <section style={{ padding: '64px 0', backgroundColor: '#FFFFFF', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: '40px' }}>
            <h2 className="section-title">How CounselWise Guides You</h2>
            <p className="section-subtitle">Follow this 4-step preparation cycle to lock choices cleanly.</p>
          </div>

          {/* Stepper Steps Block */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', position: 'relative' }}>
            
            {/* Step 1 */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary)', opacity: 0.2 }}>01</div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Enter Rank & Profile</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Input EAPCET rank and category filters.</p>
            </div>

            {/* Step 2 */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary)', opacity: 0.2 }}>02</div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Predict Colleges</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Instantly view your seat allocation chance.</p>
            </div>

            {/* Step 3 */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary)', opacity: 0.2 }}>03</div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Build Web Options</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Organize choices by absolute placement order.</p>
            </div>

            {/* Step 4 */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary)', opacity: 0.2 }}>04</div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Lock Officially</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Download finalized sequence sheet as a PDF.</p>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 4: COUNSELLING TIMELINE PREVIEW (ELEVATED) */}
      <section style={{ padding: '64px 0', backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: '40px' }}>
            <h2 className="section-title">Counselling Timeline Preview</h2>
            <p className="section-subtitle">Track official admission schedule windows.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            
            {/* Timeline Item 1 */}
            <div className="glass-card" style={{ borderTop: '3px solid var(--secondary)', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', borderRadius: '20px', padding: '24px', boxShadow: 'var(--card-shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span className="badge badge-safe" style={{ fontSize: '10px', background: 'rgba(37, 99, 235, 0.08)', color: 'var(--secondary)' }}>Upcoming</span>
                <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '800', backgroundColor: 'rgba(30, 58, 138, 0.06)', padding: '4px 10px', borderRadius: '6px' }}>June 15</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '8px', color: 'var(--text)' }}>Phase-I Slot Booking</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Fee payment and certificate booking commences.</p>
            </div>

            {/* Timeline Item 2 */}
            <div className="glass-card" style={{ borderTop: '3px solid var(--warning)', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', borderRadius: '20px', padding: '24px', boxShadow: 'var(--card-shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span className="badge badge-moderate" style={{ fontSize: '10px' }}>Important</span>
                <span style={{ fontSize: '12px', color: 'var(--warning)', fontWeight: '800', backgroundColor: 'rgba(245, 158, 11, 0.06)', padding: '4px 10px', borderRadius: '6px' }}>June 20 - 25</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '8px', color: 'var(--text)' }}>Web Options Entry</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Priority choice sheet locking window.</p>
            </div>

            {/* Timeline Item 3 */}
            <div className="glass-card" style={{ borderTop: '3px solid var(--success)', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', borderRadius: '20px', padding: '24px', boxShadow: 'var(--card-shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span className="badge badge-safe" style={{ fontSize: '10px' }}>Results</span>
                <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '800', backgroundColor: 'rgba(22, 163, 74, 0.06)', padding: '4px 10px', borderRadius: '6px' }}>June 28</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '8px', color: 'var(--text)' }}>Seat Allotments</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Official provisionary allotments release.</p>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ backgroundColor: '#FFFFFF', color: 'var(--text)', borderTop: '1px solid var(--border)', padding: '64px 0 32px 0' }}>
        <div className="container">
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '40px', 
            paddingBottom: '40px',
            borderBottom: '1px solid var(--border)'
          }}>
            
            {/* Brand column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--secondary)'}}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '16px', letterSpacing: '-0.02em' }}>CounselWise</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '12.5px', lineHeight: '1.6', margin: 0 }}>
                Unbiased, independent guidance platform for Telangana engineering counselling, predicting cutoff seat allocations with high-precision category calculators.
              </p>
            </div>

            {/* Quick Links Column */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: '800', marginBottom: '16px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Modules
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                <li><Link to="/predictor" className="footer-link">College Predictor</Link></li>
                <li><Link to="/web-options" className="footer-link">Web Options Prioritizer</Link></li>
                <li><Link to="/compare" className="footer-link">Compare Colleges</Link></li>
                <li><Link to="/colleges" className="footer-link">Cutoff Explorer</Link></li>
                <li><Link to="/guide" className="footer-link">Admission Guide</Link></li>
              </ul>
            </div>

            {/* Government Resources Column */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: '800', marginBottom: '16px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Official Links
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                <li>
                  <a href="https://eapcet.tgche.ac.in" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    TG EAPCET 2026 Portal <ExternalLink size={12} />
                  </a>
                </li>
                <li>
                  <a href="https://tgche.ac.in" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    TGCHE Official Site <ExternalLink size={12} />
                  </a>
                </li>
                <li>
                  <a href="https://www.jntuh.ac.in" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    JNTU Hyderabad <ExternalLink size={12} />
                  </a>
                </li>
              </ul>
            </div>

            {/* Disclaimer Column */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: '800', marginBottom: '16px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Disclaimer
              </h4>
              <p style={{ color: 'var(--muted)', fontSize: '11px', lineHeight: '1.5', margin: 0, opacity: 0.8 }}>
                CounselWise is an independent research platform. It is NOT affiliated with the Telangana State Council of Higher Education (TSCHE) or official admissions authorities. Cutoffs and predictions are advisory.
              </p>
            </div>

          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '12px',
            marginTop: '24px',
            fontSize: '11px',
            color: 'var(--muted)'
          }}>
            <span>
              &copy; {new Date().getFullYear()} CounselWise. Independent TS EAPCET Guidance Hub.
            </span>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span>High Trust Standards</span>
              <span>•</span>
              <span>Data Verified</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default Home;
