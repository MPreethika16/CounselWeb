import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Download, ExternalLink, Calendar, CheckCircle2, ChevronDown, ChevronUp, GraduationCap, List, Target, Building2, MapPin, ShieldAlert, Award } from "lucide-react";
import logger from "../utils/logger";

export default function RankCard() {
  const [openFaq, setOpenFaq] = useState(null);

  const TG_EAPCET_RANKCARD_URL = "https://eapcet.tgche.ac.in";

  const handleDownloadRedirect = (e) => {
    e.preventDefault();
    logger.log("Opening TG EAPCET Rank Card:", TG_EAPCET_RANKCARD_URL);
    
    if (!TG_EAPCET_RANKCARD_URL) {
      alert("Official TG EAPCET Rank Card portal is currently unavailable. Please try again later.");
      return;
    }

    try {
      const opened = window.open(TG_EAPCET_RANKCARD_URL, "_blank", "noopener,noreferrer");
      if (!opened) {
        throw new Error("Window blocked by browser popup blocker");
      }
    } catch (err) {
      logger.error("Redirect failed:", err);
      alert("Official TG EAPCET Rank Card portal is currently unavailable. Please try again later.");
    }
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "When was TG EAPCET Rank Card released?",
      a: "The TG EAPCET Rank Card 2026 is officially released by JNTU Hyderabad on behalf of TSCHE. Ranks and results are now live for all qualified candidates across Engineering, Agriculture, and Pharmacy streams."
    },
    {
      q: "How can I download my rank card?",
      a: "To download your rank card, visit the official TG EAPCET website (eapcet.tgche.ac.in), click on the 'Download Rank Card' link, enter your EAPCET Hall Ticket Number, Registration Number, and Date of Birth, then click 'View Rank Card' to download and print the PDF."
    },
    {
      q: "What if I forgot my hall ticket number?",
      a: "If you forgot your Hall Ticket Number, check your registered email or SMS history for confirmation letters from JNTU Hyderabad. Alternatively, you can retrieve it by visiting the official login page and clicking 'Forgot Hall Ticket/Registration Number' and providing your registered mobile number and qualifying exam details."
    },
    {
      q: "Is the rank card required for counselling?",
      a: "Yes! The official TG EAPCET Rank Card is a mandatory document for the certificate verification process during the physical reporting at helpline centres, as well as for online counselling registration, web options entry, and college seat allotments."
    }
  ];

  // FAQ Schema structured data
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  };

  return (
    <div className="page-wrapper container" style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* SEO Metadata via React Helmet */}
      <Helmet>
        <title>TG EAPCET Rank Card 2026 Download Link | CounselWise</title>
        <meta name="description" content="Download TG EAPCET Rank Card 2026 through the official portal. Get direct access, counselling updates, rank card instructions, and important admission information." />
        <link rel="canonical" href="https://counselwise.in/tg-eapcet-rank-card-2026" />
        
        {/* Open Graph Tags */}
        <meta property="og:title" content="TG EAPCET Rank Card 2026 Download Link | CounselWise" />
        <meta property="og:description" content="Download TG EAPCET Rank Card 2026 through the official portal. Get direct access, counselling updates, rank card instructions, and important admission information." />
        <meta property="og:url" content="https://counselwise.in/tg-eapcet-rank-card-2026" />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="TG EAPCET Rank Card 2026 Download Link | CounselWise" />
        <meta name="twitter:description" content="Download TG EAPCET Rank Card 2026 through the official portal. Get direct access, counselling updates, rank card instructions, and important admission information." />
        
        {/* Structured Schema FAQ */}
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>

      {/* Countdown status banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.05))',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        textAlign: 'center',
        marginBottom: '32px',
        boxShadow: '0 0 15px rgba(16, 185, 129, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 'bold', fontSize: '15px' }}>
          <Calendar size={18} /> TG EAPCET Counselling Expected Soon
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
          Helpline center verification and registration for Telangana engineering admissions will commence shortly. Get ready!
        </p>
      </div>

      {/* Authority Disclaimer */}
      <div style={{
        background: 'rgba(239, 68, 68, 0.05)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '8px',
        padding: '12px 16px',
        fontSize: '12.5px',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        lineHeight: '1.4',
        marginBottom: '32px'
      }}>
        <ShieldAlert size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: '#ef4444' }}>Important Official Notice:</strong> Rank cards are issued by the official TG EAPCET authority (JNTU Hyderabad on behalf of TSCHE). CounselWise only provides a direct access page and counselling resources. We strictly do NOT scrape, capture, or store student credentials.
        </div>
      </div>

      {/* H1 Main Title */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '12px', color: 'var(--text-primary)' }}>
          TG EAPCET Rank Card 2026
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' }}>
          Access your official rank card, check previous years' Telangana college cutoffs, and prepare your counselling web options.
        </p>
      </div>

      {/* Grid Layout: Main info and Sidebar CTA */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '32px' }}>
        
        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Section: Direct Download Link */}
          <section className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <Download size={22} style={{ color: 'var(--accent-blue)' }} /> Direct Download Link
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', marginBottom: '20px' }}>
              Telangana EAPCET results are live. Ranks are determined based on the normalized examination performance. Click the link below to be safely redirected to the official EAPCET page to download your card.
            </p>
            <a 
              href={TG_EAPCET_RANKCARD_URL}
              onClick={handleDownloadRedirect}
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '15px',
                padding: '12px 24px',
                textDecoration: 'none',
                fontWeight: '700',
                boxShadow: '0 0 15px rgba(59, 130, 246, 0.25)'
              }}
            >
              Download Rank Card (Official Portal) <ExternalLink size={16} />
            </a>
          </section>

          {/* Section: How to Download */}
          <section className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <GraduationCap size={22} style={{ color: 'var(--accent-purple)' }} /> How To Download TG EAPCET Rank Card
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', marginBottom: '16px' }}>
              Students can securely access their TG EAPCET 2026 scorecards by following these steps:
            </p>
            <ol style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Visit the Official Website:</strong> Open your web browser and navigate to the official TGCHE counselling domain: <a href="https://eapcet.tgche.ac.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>eapcet.tgche.ac.in</a>.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Click Rank Card Download:</strong> Locate and click the prominent banner labeled <strong>"Download Rank Card (E & AM)"</strong> on the landing page.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Enter EAPCET Hall Ticket Number:</strong> Input your unique EAPCET Hall Ticket number.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Enter Registration Details:</strong> Key in your registration number and date of birth in the required fields.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>View and Download PDF:</strong> Click the 'View Rank Card' submission button. Save the PDF securely on your device and print multiple physical copies for physical verification.
              </li>
            </ol>
          </section>

          {/* Section: Important Counselling Info */}
          <section id="counselling-info" className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <Award size={22} style={{ color: 'var(--accent-blue)' }} /> Important Counselling Information
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
              <div>
                <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: '700', marginBottom: '4px' }}>1. Helpline Center Registration & Verification</h3>
                <p style={{ margin: 0 }}>
                  Candidates must register online, pay the processing fee, and book slot timings for Certificate Verification. Registered students must carry their TG EAPCET Rank Card, Hall Ticket, Aadhar card, SSC memo, study certificates (class 6 to inter), and caste/income certificates (if applicable).
                </p>
              </div>
              <div>
                <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: '700', marginBottom: '4px' }}>2. Web Options Entry</h3>
                <p style={{ margin: 0 }}>
                  After successful certificate verification, a login ID is sent to the student's registered mobile. Using this, you must set options priorities. We highly recommend using our **Web Options Generator** to create a balanced list of Dream, Moderate, and Safe options to secure allotments.
                </p>
              </div>
              <div>
                <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: '700', marginBottom: '4px' }}>3. Seat Allotment & College Reporting</h3>
                <p style={{ margin: 0 }}>
                  Seats are allotted in multiple phases based on gender, local/non-local category reservations, and EAPCET ranks. Once a seat is allotted, self-report online and pay the tuition fee through the portal to secure your seat.
                </p>
              </div>
            </div>
          </section>

          {/* Section: Frequently Asked Questions */}
          <section className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <GraduationCap size={22} style={{ color: 'var(--accent-purple)' }} /> Frequently Asked Questions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {faqs.map((faq, index) => (
                <div key={index} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <button 
                    onClick={() => toggleFaq(index)}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: '8px 0',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '14.5px',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{faq.q}</span>
                    {openFaq === index ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {openFaq === index && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: '1.5', margin: '8px 0 0 0', paddingLeft: '4px' }}>
                      {faq.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Sidebar Banners & B2C CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Glowing CTA: College Predictor Banner */}
          <div className="glass-card" style={{ 
            padding: '24px', 
            borderLeft: '4px solid #10b981', 
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.15)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(0,0,0,0.1))',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h3 style={{ fontSize: '18px', margin: 0, fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🎯 EAPCET Rank Predictor
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              Ranks are out! Predict your highest chance engineering colleges across Telangana instantly using our expert matching engine.
            </p>
            <Link 
              to="/predictor" 
              className="btn btn-primary" 
              style={{
                fontSize: '13.5px',
                padding: '10px 16px',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
              }}
            >
              Predict Your Colleges Based on Rank
            </Link>
          </div>

          {/* Sidebar Quick Internal Links */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Counselling Toolkit
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link to="/predictor" className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '13.5px' }}>
                <Target size={14} style={{ marginRight: '8px' }} /> College Predictor
              </Link>
              <Link to="/web-options" className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '13.5px' }}>
                <List size={14} style={{ marginRight: '8px' }} /> Web Options Entry
              </Link>
              <Link to="/guide" className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '13.5px' }}>
                <GraduationCap size={14} style={{ marginRight: '8px' }} /> Counselling Guide
              </Link>
              <Link to="/dashboard" className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '13.5px' }}>
                <CheckCircle2 size={14} style={{ marginRight: '8px' }} /> Dashboard & Reports
              </Link>
            </div>
          </div>

          {/* Quick Stats list */}
          <div className="glass-card" style={{ padding: '20px 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', margin: '0 0 12px 0' }}>Telangana Admission Highlights</h3>
            <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
              <li>EAPCET Rank Card live as of May 2026.</li>
              <li>Expected seats available: ~85,000 across 175 engineering colleges.</li>
              <li>Top courses: CSE, CSM, ECE, CSD.</li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
