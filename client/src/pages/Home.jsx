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
  GraduationCap, 
  Users, 
  CheckCircle2, 
  Award, 
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
        padding: '64px 0',
        backgroundColor: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
          
          {/* Left Column: Copy & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            {/* Trust badge */}
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              backgroundColor: 'rgba(30, 58, 138, 0.06)', 
              border: '1px solid rgba(30, 58, 138, 0.12)',
              borderRadius: '9999px', 
              padding: '6px 16px', 
              marginBottom: '24px',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--primary)'
            }}>
              <ShieldCheck size={14} style={{ color: 'var(--secondary)' }} />
              <span>Independent TS EAPCET Counselling Guidance Hub 2026</span>
            </div>

            <h1 style={{ 
              fontSize: 'clamp(32px, 5vw, 48px)', 
              fontWeight: '800', 
              color: 'var(--text)', 
              lineHeight: '1.2', 
              marginBottom: '16px',
              letterSpacing: '-0.025em'
            }}>
              Make Smarter TS EAPCET Counselling Decisions
            </h1>

            <p style={{ 
              fontSize: '16px', 
              color: 'var(--muted)', 
              lineHeight: '1.6', 
              marginBottom: '32px',
              fontWeight: '400'
            }}>
              Predict colleges, generate web options, compare engineering institutions, and plan your counselling journey using historical admission data.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', width: '100%' }}>
              <Link to="/predictor" className="btn btn-primary" style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', width: 'auto', padding: '12px 24px' }}>
                Predict My Colleges <ArrowRight size={16} />
              </Link>
              <Link to="/colleges" className="btn btn-secondary" style={{ display: 'inline-flex', width: 'auto', padding: '12px 24px', backgroundColor: 'var(--card)' }}>
                Explore Colleges
              </Link>
            </div>
          </div>

          {/* Right Column: Visual Counselling Roadmap Illustration */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
            <div className="illustration-container">
              {/* Connector lines (rendered only on desktop via class and absolute styling) */}
              {/* Connector 1: Vertical line */}
              <div 
                className="illustration-connector"
                style={{
                  position: 'absolute',
                  left: '46px',
                  top: '70px',
                  height: '240px',
                  width: '2px',
                  borderLeft: '2px dashed var(--border)',
                  zIndex: 1
                }}
              />
              
              {/* Connector 2: Horizontal branch line to CBIT card */}
              <div 
                className="illustration-connector"
                style={{
                  position: 'absolute',
                  left: '46px',
                  top: '170px',
                  width: '180px',
                  height: '2px',
                  borderTop: '2px dashed var(--border)',
                  zIndex: 1
                }}
              />
              
              {/* Flow direction indicators */}
              <div 
                className="illustration-connector"
                style={{
                  position: 'absolute',
                  left: '42px',
                  top: '166px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--secondary)',
                  zIndex: 2
                }}
              />
              
              <div 
                className="illustration-connector"
                style={{
                  position: 'absolute',
                  left: '220px',
                  top: '166px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                  zIndex: 2
                }}
              />

              {/* CARD 1: TS EAPCET Rank Card Pill */}
              <div 
                className="illustration-card"
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  width: '240px',
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '20px',
                  padding: '16px',
                  boxShadow: 'var(--card-shadow)',
                  zIndex: 3
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--muted)', letterSpacing: '0.05em' }}>RANK CARD</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', fontWeight: '700', color: 'var(--success)', backgroundColor: 'rgba(22, 163, 74, 0.08)', padding: '2px 6px', borderRadius: '999px' }}>
                    <CheckCircle2 size={10} /> VERIFIED
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(30, 58, 138, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                    <Award size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: '600', lineHeight: 1 }}>EAPCET RANK</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)' }}>12,500</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', fontSize: '11px', fontWeight: '600', color: 'var(--muted)' }}>
                  <span>BC-B</span>
                  <span>•</span>
                  <span>OU Region</span>
                  <span>•</span>
                  <span>Male</span>
                </div>
              </div>

              {/* CARD 2: College Building Card (CBIT Profile) */}
              <div 
                className="illustration-card"
                style={{
                  position: 'absolute',
                  top: '110px',
                  right: '10px',
                  width: '240px',
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '20px',
                  padding: '16px',
                  boxShadow: 'var(--card-shadow)',
                  zIndex: 4
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(37, 99, 235, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)', flexShrink: 0 }}>
                    <Building2 size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text)', lineHeight: '1.2' }}>CBIT Hyderabad</div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: '600' }}>OU Region • Gandipet</div>
                  </div>
                </div>
                
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '500' }}>Avg Placements</span>
                    <span style={{ fontSize: '11px', color: 'var(--text)', fontWeight: '700' }}>7.5 LPA</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '500' }}>Tuition Fee</span>
                    <span style={{ fontSize: '11px', color: 'var(--text)', fontWeight: '700' }}>₹1.40L/Yr</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(22, 163, 74, 0.06)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(22, 163, 74, 0.12)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: '700' }}>ADMISSION FIT</span>
                  <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: '800' }}>High Chance</span>
                </div>
              </div>

              {/* CARD 3: Prioritized Web Options List */}
              <div 
                className="illustration-card"
                style={{
                  position: 'absolute',
                  top: '260px',
                  left: '10px',
                  width: '260px',
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '20px',
                  padding: '16px',
                  boxShadow: 'var(--card-shadow)',
                  zIndex: 5
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ color: 'var(--primary)', width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'rgba(30, 58, 138, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ListChecks size={12} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)', letterSpacing: '0.05em' }}>OPTION ENTRY SHEET</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Option 1 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--background)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--muted)' }}>01</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)' }}>CBIT (CSE)</span>
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--success)', backgroundColor: 'rgba(22, 163, 74, 0.08)', padding: '2px 6px', borderRadius: '999px' }}>High</span>
                  </div>

                  {/* Option 2 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--background)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--muted)' }}>02</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)' }}>VNRVJI (IT)</span>
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.08)', padding: '2px 6px', borderRadius: '999px' }}>Medium</span>
                  </div>

                  {/* Option 3 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--background)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--muted)' }}>03</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)' }}>JNTUH (ECE)</span>
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--secondary)', backgroundColor: 'rgba(37, 99, 235, 0.08)', padding: '2px 6px', borderRadius: '999px' }}>Dream</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* SECTION 2: TRUST STATS */}
      <section style={{ padding: '32px 0', backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            
            {/* Stat Card 1 */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ color: 'var(--secondary)', backgroundColor: 'rgba(37, 99, 235, 0.06)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: 'var(--text)' }}>280+</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>Telangana Colleges</p>
              </div>
            </div>

            {/* Stat Card 2 */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ color: 'var(--primary)', backgroundColor: 'rgba(30, 58, 138, 0.06)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GraduationCap size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: 'var(--text)' }}>100+</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>B.Tech Branches</p>
              </div>
            </div>

            {/* Stat Card 3 */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ color: 'var(--success)', backgroundColor: 'rgba(22, 163, 74, 0.06)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BarChart3 size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: 'var(--text)' }}>3 Years</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>Official Cutoffs Analyzed</p>
              </div>
            </div>

            {/* Stat Card 4 */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ color: 'var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.06)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: 'var(--text)' }}>All</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>EAPCET Categories</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 3: WHY STUDENTS USE COUNSELWISE */}
      <section style={{ padding: '64px 0', backgroundColor: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: '40px' }}>
            <h2 className="section-title">Why Students Use CounselWise</h2>
            <p className="section-subtitle">A credible counselling hub built to guide engineering aspirants through every admissions milestone.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            
            {/* Feature 1 */}
            <div className="glass-card" style={{ padding: '24px', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--secondary)', marginBottom: '16px' }}><Activity size={32} /></div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: 'var(--text)' }}>Accurate Predictions</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Derived directly from past official EAPCET allotments and cutoff ranks.</p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card" style={{ padding: '24px', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--primary)', marginBottom: '16px' }}><ListChecks size={32} /></div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: 'var(--text)' }}>Smart Options Planning</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Sequence your B.Tech list drag-and-drop style to avoid official submission errors.</p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card" style={{ padding: '24px', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--success)', marginBottom: '16px' }}><GitCompare size={32} /></div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: 'var(--text)' }}>College Comparison</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Benchmark fees, placement records, and branch cutoffs side-by-side.</p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card" style={{ padding: '24px', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--warning)', marginBottom: '16px' }}><BookOpen size={32} /></div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: 'var(--text)' }}>Official Guidance</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Step-by-step documentation detailing physical certificate slot bookings.</p>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 4: CORE COUNSELLING MODULES */}
      <section style={{ padding: '64px 0', backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: '40px' }}>
            <h2 className="section-title">Core Counselling Modules</h2>
            <p className="section-subtitle">Fully interactive diagnostic tools supporting your admissions sequence.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            
            {/* Module 1: Predictor */}
            <Link to="/predictor" className="glass-card" style={{ 
              padding: '24px', 
              textDecoration: 'none', 
              transition: 'transform 0.2s, box-shadow 0.2s', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}>
              <div>
                <div style={{ color: 'var(--secondary)', backgroundColor: 'rgba(37, 99, 235, 0.06)', width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <BarChart3 size={20} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: 'var(--text)' }}>College Predictor</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Evaluate cutoff probabilities into Safe, Moderate, and Dream brackets.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--secondary)', fontWeight: '600', marginTop: '16px' }}>
                Open Predictor <ChevronRight size={14} />
              </div>
            </Link>

            {/* Module 2: Web Options */}
            <Link to="/web-options" className="glass-card" style={{ 
              padding: '24px', 
              textDecoration: 'none', 
              transition: 'transform 0.2s, box-shadow 0.2s', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}>
              <div>
                <div style={{ color: 'var(--primary)', backgroundColor: 'rgba(30, 58, 138, 0.06)', width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <ListChecks size={20} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: 'var(--text)' }}>Web Options Prioritizer</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Build and arrange your target preferences sheet in locked priority order.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--primary)', fontWeight: '600', marginTop: '16px' }}>
                Build Options List <ChevronRight size={14} />
              </div>
            </Link>

            {/* Module 3: Compare */}
            <Link to="/compare" className="glass-card" style={{ 
              padding: '24px', 
              textDecoration: 'none', 
              transition: 'transform 0.2s, box-shadow 0.2s', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}>
              <div>
                <div style={{ color: 'var(--success)', backgroundColor: 'rgba(22, 163, 74, 0.06)', width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <GitCompare size={20} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: 'var(--text)' }}>College Compare</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Examine fees, placement outputs, and affiliations side-by-side.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--success)', fontWeight: '600', marginTop: '16px' }}>
                Compare Colleges <ChevronRight size={14} />
              </div>
            </Link>

            {/* Module 4: Colleges */}
            <Link to="/colleges" className="glass-card" style={{ 
              padding: '24px', 
              textDecoration: 'none', 
              transition: 'transform 0.2s, box-shadow 0.2s', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}>
              <div>
                <div style={{ color: 'var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.06)', width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Building2 size={20} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: 'var(--text)' }}>Cutoff Explorer</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Audit admission database sheets and contact details for 280+ colleges.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--warning)', fontWeight: '600', marginTop: '16px' }}>
                Explore Databases <ChevronRight size={14} />
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* SECTION 5: HOW IT WORKS */}
      <section style={{ padding: '64px 0', backgroundColor: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: '40px' }}>
            <h2 className="section-title">How CounselWise Guides You</h2>
            <p className="section-subtitle">Follow this 4-step preparation cycle to lock choices cleanly on the official admission portal.</p>
          </div>

          {/* Stepper Steps Block */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', position: 'relative' }}>
            
            {/* Step 1 */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary)', opacity: 0.2 }}>01</div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Enter Rank & Profile</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Input your EAPCET rank, regional category, gender, and caste parameters.</p>
            </div>

            {/* Step 2 */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary)', opacity: 0.2 }}>02</div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Predict Colleges</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Generate verified seat allotment probabilities dynamically.</p>
            </div>

            {/* Step 3 */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary)', opacity: 0.2 }}>03</div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Build Web Options</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Structure your B.Tech priority list safely to maximize outcomes.</p>
            </div>

            {/* Step 4 */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary)', opacity: 0.2 }}>04</div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Lock Officially</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Download your optimized sequence reference sheet as a PDF.</p>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 6: COUNSELLING TIMELINE PREVIEW */}
      <section style={{ padding: '64px 0', backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: '40px' }}>
            <h2 className="section-title">Counselling Timeline Preview</h2>
            <p className="section-subtitle">Track the official admission phases and keep your timeline organized.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            
            {/* Timeline Item 1 */}
            <div className="glass-card" style={{ borderLeft: '4px solid var(--secondary)', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span className="badge badge-safe" style={{ fontSize: '10px', background: 'rgba(37, 99, 235, 0.08)', color: 'var(--secondary)' }}>Upcoming</span>
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: '600' }}>June 15</span>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px', color: 'var(--text)' }}>Phase-I Slot Booking</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Commencement of processing fee payments & slot booking for document verification.</p>
            </div>

            {/* Timeline Item 2 */}
            <div className="glass-card" style={{ borderLeft: '4px solid var(--warning)', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span className="badge badge-moderate" style={{ fontSize: '10px' }}>Important</span>
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: '600' }}>June 20 - 25</span>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px', color: 'var(--text)' }}>Web Options Entry</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Choice filling window to enter and prioritize college choices on the official portal.</p>
            </div>

            {/* Timeline Item 3 */}
            <div className="glass-card" style={{ borderLeft: '4px solid var(--success)', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span className="badge badge-safe" style={{ fontSize: '10px' }}>Results</span>
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: '600' }}>June 28</span>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px', color: 'var(--text)' }}>Seat Allotments</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>Publication of provisionary seat allotments based on locked ranks.</p>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 7: TRUST & DATA ACCURACY */}
      <section style={{ padding: '64px 0', backgroundColor: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', alignItems: 'center' }}>
            <div>
              <h2 className="section-title">Data Accuracy & Verification Standards</h2>
              <p className="section-subtitle">We prioritize high-trust standards. All predictions are generated using official government-grade cutoff tables.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Item 1 */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <CheckCircle size={18} style={{ color: 'var(--success)', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', margin: '0 0 2px 0' }}>3 Years Verified Cutoffs</h4>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>Every cutoff limit verified through previous years' counselling records.</p>
                </div>
              </div>

              {/* Item 2 */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <CheckCircle size={18} style={{ color: 'var(--success)', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', margin: '0 0 2px 0' }}>Category-Wise Precision</h4>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>Separate calculations for OC, BC-A/B/C/D/E, SC, ST, and EWS quotas.</p>
                </div>
              </div>

              {/* Item 3 */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <CheckCircle size={18} style={{ color: 'var(--success)', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', margin: '0 0 2px 0' }}>Official Gazette References</h4>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>Counselling guidelines extracted from official TSCHE notices.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ backgroundColor: 'var(--card)', color: 'var(--text)', borderTop: '1px solid var(--border)', padding: '48px 0 24px 0' }}>
        <div className="container">
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '32px', 
            paddingBottom: '32px',
            borderBottom: '1px solid var(--border)'
          }}>
            
            {/* Brand column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--secondary)'}}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '16px', letterSpacing: '-0.02em' }}>CounselWise</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '12.5px', lineHeight: '1.6', margin: 0 }}>
                An independent guidance platform for Telangana engineering counselling, predicting college seat allotments with high cutoff accuracy.
              </p>
            </div>

            {/* Quick Links Column */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Modules
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                <li><Link to="/predictor" className="footer-link">College Predictor</Link></li>
                <li><Link to="/web-options" className="footer-link">Web Options Prioritizer</Link></li>
                <li><Link to="/compare" className="footer-link">Compare Colleges</Link></li>
                <li><Link to="/colleges" className="footer-link">Cutoff Explorer</Link></li>
                <li><Link to="/guide" className="footer-link">Admission Guide</Link></li>
              </ul>
            </div>

            {/* Government Resources Column */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Official Links
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
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
              <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Disclaimer
              </h4>
              <p style={{ color: 'var(--muted)', fontSize: '11px', lineHeight: '1.5', margin: 0 }}>
                CounselWise is an independent research guidance platform. It is NOT affiliated with the Telangana State Council of Higher Education (TSCHE) or official admissions authorities. Cutoffs and predictions are completely advisory.
              </p>
            </div>

          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '12px',
            marginTop: '20px',
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
