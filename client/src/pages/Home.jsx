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
  FileText
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
    <div className="home-container" style={{ backgroundColor: 'var(--background)', color: 'var(--text)', minHeight: '100vh' }}>
      
      {/* SECTION 1: HERO SECTION */}
      <section className="hero-section" style={{ 
        position: 'relative',
        padding: 'var(--spacing-xl) 0',
        backgroundColor: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden'
      }}>

        <div className="container" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          
          {/* Government Trusted badge */}
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            backgroundColor: 'rgba(30, 58, 138, 0.06)', 
            border: '1px solid rgba(30, 58, 138, 0.12)',
            borderRadius: '9999px', 
            padding: '6px 16px', 
            marginBottom: '28px',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--primary)'
          }}>
            <ShieldCheck size={14} style={{ color: 'var(--secondary)' }} />
            <span>Independent TS EAPCET (EAMCET) Counselling Decision Hub 2026</span>
          </div>

          <h1 style={{ 
            fontSize: 'clamp(36px, 6vw, 56px)', 
            fontWeight: '800', 
            color: 'var(--text)', 
            lineHeight: '1.15', 
            maxWidth: '900px',
            marginBottom: '20px',
            letterSpacing: '-0.025em'
          }}>
            TS EAPCET Counselling Made Simple
          </h1>

          <p style={{ 
            fontSize: 'clamp(16px, 2.5vw, 19px)', 
            color: 'var(--muted)', 
            maxWidth: '720px', 
            lineHeight: '1.6', 
            marginBottom: '36px',
            fontWeight: '400'
          }}>
            Predict colleges, build web options, compare B.Tech cutoffs and make smarter counselling decisions with precision-based admissions data.
          </p>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', width: '100%', maxWidth: '480px' }}>
            <Link to="/predictor" className="btn btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: '1', minWidth: '180px', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)' }}>
              Start Prediction <ArrowRight size={16} />
            </Link>
            <Link to="/colleges" className="btn btn-secondary" style={{ flex: '1', minWidth: '180px', justifyContent: 'center', backgroundColor: 'var(--card)' }}>
              Explore Colleges
            </Link>
          </div>

          {/* Quick Stats Ticker under Hero */}
          <div style={{ 
            display: 'flex', 
            gap: '24px', 
            marginTop: '56px', 
            flexWrap: 'wrap', 
            justifyContent: 'center',
            fontSize: '13px',
            color: 'var(--muted)',
            fontWeight: '500'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> Updated with 2025 Final Phase Cutoffs
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> OC / BC / SC / ST / EWS Categories
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> All 280+ Telangana B.Tech Colleges
            </span>
          </div>

        </div>
      </section>

      {/* IMPORTANT ANNOUNCEMENT CARD */}
      <section style={{ padding: 'var(--spacing-md) 0 0 0', backgroundColor: 'var(--background)' }}>
        <div className="container">
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderLeft: '4px solid var(--danger)',
            borderRadius: '12px',
            padding: '24px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '24px',
            boxShadow: 'var(--card-shadow)'
          }}>
            <div style={{ flex: '1', minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ 
                  backgroundColor: 'var(--danger)', 
                  color: '#ffffff', 
                  fontSize: '11px', 
                  fontWeight: '800', 
                  padding: '2px 8px', 
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Official Release
                </span>
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: '600' }}>TG EAPCET Admissions 2026</span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text)', margin: '0 0 6px 0' }}>
                TG EAPCET Rank Cards Released
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
                Download your official rank card and begin counselling preparation.
              </p>
            </div>
            <Link 
              to="/tg-eapcet-rank-card-2026" 
              className="btn btn-primary" 
              style={{ 
                width: 'auto', 
                padding: '12px 24px', 
                fontSize: '14px', 
                fontWeight: '700',
                background: 'var(--secondary)',
                color: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
              }}
            >
              Download Official Rank Card
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 2: QUICK ACCESS CARDS */}
      <section style={{ padding: 'var(--spacing-lg) 0', backgroundColor: 'var(--card)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '12px', color: 'var(--text)' }}>
              Core Counselling Modules
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
              Select a module below to start analyzing your TS EAPCET engineering options.
            </p>
          </div>

          <div className="grid-2" style={{ gap: '24px' }}>
            
            {/* Card 1: College Predictor */}
            <div className="glass-card" style={{ 
              padding: '36px', 
              borderRadius: '12px', 
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              height: '100%',
              minHeight: '260px'
            }}>
              <div>
                <div style={{ 
                  backgroundColor: 'rgba(37, 99, 235, 0.08)', 
                  color: 'var(--secondary)', 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginBottom: '20px' 
                }}>
                  <BarChart3 size={24} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px', color: 'var(--text)' }}>
                  College Predictor
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                  Analyze past 3 years' cutoff trends. Enter your rank, category, gender, and regional preferences to predict B.Tech seat allotment probabilities (Safe, Moderate, and Dream choices).
                </p>
              </div>
              <Link to="/predictor" className="btn btn-primary" style={{ display: 'inline-flex', alignSelf: 'flex-start', width: 'auto', padding: '10px 18px', fontSize: '13px' }}>
                Predict Seat Allotments <ChevronRight size={14} style={{ marginLeft: '4px' }} />
              </Link>
            </div>

            {/* Card 2: Web Options Generator */}
            <div className="glass-card" style={{ 
              padding: '36px', 
              borderRadius: '12px', 
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              height: '100%',
              minHeight: '260px'
            }}>
              <div>
                <div style={{ 
                  backgroundColor: 'rgba(30, 58, 138, 0.08)', 
                  color: 'var(--primary)', 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginBottom: '20px' 
                }}>
                  <ListChecks size={24} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px', color: 'var(--text)' }}>
                  Web Options Generator
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                  Avoid simple mistakes on the official submission. Build an optimized list of web options, drag to prioritize priorities, test choices, and download your final reference PDF.
                </p>
              </div>
              <Link to="/web-options" className="btn btn-primary" style={{ display: 'inline-flex', alignSelf: 'flex-start', width: 'auto', padding: '10px 18px', fontSize: '13px' }}>
                Generate Web Options <ChevronRight size={14} style={{ marginLeft: '4px' }} />
              </Link>
            </div>

            {/* Card 3: College Compare */}
            <div className="glass-card" style={{ 
              padding: '36px', 
              borderRadius: '12px', 
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              height: '100%',
              minHeight: '260px'
            }}>
              <div>
                <div style={{ 
                  backgroundColor: 'rgba(22, 163, 74, 0.08)', 
                  color: 'var(--success)', 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginBottom: '20px' 
                }}>
                  <GitCompare size={24} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px', color: 'var(--text)' }}>
                  College Compare
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                  Compare up to 3 engineering colleges side-by-side. Benchmark key variables such as placement averages, maximum packages, tuition fees, branch intake, and university affiliations.
                </p>
              </div>
              <Link to="/compare" className="btn btn-primary" style={{ display: 'inline-flex', alignSelf: 'flex-start', width: 'auto', padding: '10px 18px', fontSize: '13px' }}>
                Compare B.Tech Colleges <ChevronRight size={14} style={{ marginLeft: '4px' }} />
              </Link>
            </div>

            {/* Card 4: Cutoff Explorer */}
            <div className="glass-card" style={{ 
              padding: '36px', 
              borderRadius: '12px', 
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              height: '100%',
              minHeight: '260px'
            }}>
              <div>
                <div style={{ 
                  backgroundColor: 'rgba(245, 158, 11, 0.08)', 
                  color: 'var(--warning)', 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginBottom: '20px' 
                }}>
                  <Building2 size={24} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px', color: 'var(--text)' }}>
                  Cutoff Explorer
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                  Browse comprehensive database records for 280+ engineering institutions in Telangana. Examine branch codes, college profiles, historical rank cutoffs, and contact numbers.
                </p>
              </div>
              <Link to="/colleges" className="btn btn-primary" style={{ display: 'inline-flex', alignSelf: 'flex-start', width: 'auto', padding: '10px 18px', fontSize: '13px' }}>
                Explore Institutional Profiles <ChevronRight size={14} style={{ marginLeft: '4px' }} />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 3: IMPORTANT COUNSELLING UPDATES */}
      <section style={{ padding: 'var(--spacing-lg) 0', backgroundColor: 'var(--background)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <Bell size={24} style={{ color: 'var(--secondary)' }} />
            <h2 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
              Official TS EAPCET 2026 Schedule & Notifications
            </h2>
          </div>

          <div style={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--card-shadow)' }}>
            
            {/* Table layout for desktop, list layout for mobile handled elegantly */}
            <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(30, 58, 138, 0.02)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '600', color: 'var(--text)', width: '200px' }}>Schedule Date</th>
                    <th style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '600', color: 'var(--text)', width: '150px' }}>Status</th>
                    <th style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>Admission Notification & Action Details</th>
                  </tr>
                </thead>
                <tbody>
                  {officialUpdates.map((update) => (
                    <tr key={update.id} style={{ borderBottom: '1px solid var(--border)', transition: 'var(--transition)' }}>
                      <td style={{ padding: '20px 24px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontWeight: '600', fontSize: '14px' }}>
                          <Calendar size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                          {update.date}
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px', verticalAlign: 'top' }}>
                        <span style={{ 
                          display: 'inline-block', 
                          fontSize: '11px', 
                          fontWeight: '700', 
                          letterSpacing: '0.05em', 
                          color: update.tagColor, 
                          backgroundColor: update.tagBg, 
                          padding: '4px 8px', 
                          borderRadius: '4px' 
                        }}>
                          {update.tag}
                        </span>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px', color: 'var(--text)' }}>
                          {update.title}
                        </h4>
                        <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                          {update.desc}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer action for Notice Board */}
            <div style={{ padding: '16px 24px', backgroundColor: 'rgba(30, 58, 138, 0.01)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Disclaimer: Keep tracking the official TG EAPCET admission website for sudden changes.
              </span>
              <a 
                href="https://eapcet.tgche.ac.in" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--secondary)' }}
              >
                Go to Official TG EAPCET Portal <ExternalLink size={14} />
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 4: HOW IT WORKS */}
      <section style={{ padding: 'var(--spacing-lg) 0', backgroundColor: 'var(--card)' }}>
        <div className="container">
          
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '12px', color: 'var(--text)' }}>
              How CounselWise Guides You
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
              Simplify your official counselling routine using this effortless 4-step preparation cycle.
            </p>
          </div>

          <div className="grid-4" style={{ gap: '24px' }}>
            {[
              {
                step: "01",
                title: "Enter Rank & Profile",
                desc: "Specify your TS EAPCET local rank, select your reservation category (OC, BC, SC, ST), region (OU, AU, SVU), and gender status."
              },
              {
                step: "02",
                title: "Run Precision Predictor",
                desc: "Generate probability brackets instantly. Sort and filter potential colleges into Safe, Moderate, and Dream categories."
              },
              {
                step: "03",
                title: "Structure Web Options",
                desc: "Add target colleges to your choice sheet. Drag and drop items in sequence order to maximize B.Tech seat availability chances."
              },
              {
                step: "04",
                title: "Export & Lock Officially",
                desc: "Download your error-free preferences sheet as a PDF. Replicate the list directly inside the official TSCHE seat allotment platform."
              }
            ].map((item, idx) => (
              <div key={idx} style={{ 
                position: 'relative', 
                padding: '30px', 
                backgroundColor: 'var(--background)', 
                borderRadius: '12px', 
                border: '1px solid var(--border)',
                height: '100%' 
              }}>
                <div style={{ 
                  fontSize: '44px', 
                  fontWeight: '800', 
                  color: 'var(--primary)', 
                  opacity: 0.15, 
                  lineHeight: '1', 
                  marginBottom: '16px',
                  fontFamily: 'var(--font-heading)'
                }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '10px', color: 'var(--text)' }}>
                  {item.title}
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '13.5px', lineHeight: '1.5', margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* SECTION 6: FOOTER */}
      <footer style={{ backgroundColor: 'var(--card)', color: 'var(--text)', borderTop: '1px solid var(--border)', padding: '64px 0 32px 0' }}>
        <div className="container">
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '40px', 
            marginBottom: '48px' 
          }}>
            
            {/* Brand column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--secondary)'}}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '18px', letterSpacing: '-0.02em' }}>CounselWise</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
                A highly trusted decision-making assistant for Telangana engineering counselling. Predict colleges, organize B.Tech choice preferences, and verify historical cutoffs.
              </p>
            </div>

            {/* Quick Links Column */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Platform Modules
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <li>
                  <Link to="/predictor" className="footer-link">
                    College Predictor
                  </Link>
                </li>
                <li>
                  <Link to="/web-options" className="footer-link">
                    Web Options Generator
                  </Link>
                </li>
                <li>
                  <Link to="/compare" className="footer-link">
                    Compare Colleges
                  </Link>
                </li>
                <li>
                  <Link to="/colleges" className="footer-link">
                    Cutoff Explorer
                  </Link>
                </li>
                <li>
                  <Link to="/guide" className="footer-link">
                    Admission Guide
                  </Link>
                </li>
              </ul>
            </div>

            {/* Government Resources Column */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Official Portals
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
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
                  <a href="https://sbtet.telangana.gov.in" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    SBTET Telangana <ExternalLink size={12} />
                  </a>
                </li>
                <li>
                  <a href="https://www.jntuh.ac.in" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    JNTU Hyderabad <ExternalLink size={12} />
                  </a>
                </li>
                <li>
                  <a href="https://www.osmania.ac.in" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Osmania University <ExternalLink size={12} />
                  </a>
                </li>
              </ul>
            </div>

            {/* Disclaimer Column */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Legal & Info
              </h4>
              <p style={{ color: 'var(--muted)', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>
                <strong>Official Disclaimer:</strong> CounselWise is an independent research and guidance website. It is NOT affiliated with the Telangana State Council of Higher Education (TSCHE) or any government authority. Cutoff data and predictions are completely advisory. Always verify instructions directly from the official gazette notices before final allotment cycles.
              </p>
            </div>

          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '32px 0' }} />

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '16px',
            fontSize: '12px',
            color: 'var(--muted)'
          }}>
            <span>
              &copy; {new Date().getFullYear()} CounselWise. Designed and maintained for TS engineering aspirants.
            </span>
            <div style={{ display: 'flex', gap: '20px' }}>
              <span>Independent Platform</span>
              <span>•</span>
              <span>High Trust Standards</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default Home;
