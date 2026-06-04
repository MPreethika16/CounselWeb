import { BookOpen, FileText, CheckCircle, Info, ArrowRight, ListChecks, MapPin, GraduationCap, AlertTriangle } from "lucide-react";

function CounsellingGuide() {
  const documents = [
    { name: "TG EAPCET Rank Card", required: true },
    { name: "Hall Ticket", required: true },
    { name: "Aadhaar Card", required: true },
    { name: "SSC Marks Memo (10th)", required: true },
    { name: "Intermediate Marks Memo (12th)", required: true },
    { name: "Study Certificates (6th to 12th)", required: true },
    { name: "Transfer Certificate (TC)", required: true },
    { name: "Income Certificate (issued after Jan 1st)", optional: true },
    { name: "Caste Certificate (if applicable)", optional: true },
    { name: "EWS Certificate (if applicable)", optional: true },
    { name: "Residence Certificate (for non-local candidates)", optional: true },
    { name: "Physically Handicapped/NCC/Sports/CAP (if applicable)", optional: true },
    { name: "Passport Size Photos (4-6 copies)", required: true },
    { name: "Allotment Order (after allotment)", postAllotment: true },
  ];

  const steps = [
    { title: "Registration", description: "Pay the processing fee and book a slot for certificate verification." },
    { title: "Certificate Verification", description: "Visit the help-line center with original documents for verification." },
    { title: "Exercising Options", description: "Login to the portal and enter your college/branch choices in order of preference." },
    { title: "Seat Allotment", description: "Seats are allotted based on rank, category, and options exercised." },
    { title: "Reporting", description: "Report to the allotted college with original certificates and fee receipt." },
  ];

  return (
    <div className="page-wrapper container">
      <div className="page-header">
        <h1 className="section-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '16px' }}>
          <BookOpen size={40} style={{ color: 'var(--accent-blue)' }} /> Counselling Guide
        </h1>
        <p className="section-subtitle">Everything you need to know about the TG EAPCET counselling process.</p>
      </div>

      <div className="grid-2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <section className="glass-card">
            <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ListChecks size={24} style={{ color: 'var(--accent-purple)' }} /> Required Documents
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {documents.map((doc, i) => (
                <div key={i} style={{ 
                  display: 'flex', alignItems: 'center', justifySelf: 'space-between', 
                  padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '12px',
                  border: doc.required ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    {doc.postAllotment ? <Info size={16} style={{ color: 'var(--moderate-text)' }} /> : <CheckCircle size={16} style={{ color: doc.required ? 'var(--safe-text)' : 'var(--text-muted)' }} />}
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{doc.name}</span>
                  </div>
                  {doc.optional && <span className="badge badge-outline" style={{ fontSize: '10px' }}>Optional</span>}
                  {doc.postAllotment && <span className="badge badge-outline" style={{ fontSize: '10px', color: 'var(--moderate-text)' }}>Post-Allotment</span>}
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card">
            <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GraduationCap size={24} style={{ color: 'var(--accent-blue)' }} /> Process Steps
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ 
                    width: '32px', height: '32px', background: 'var(--accent-glow)', 
                    color: 'var(--accent-blue)', borderRadius: '50%', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: '700', flexShrink: 0, marginTop: '4px'
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', marginBottom: '4px' }}>{step.title}</h4>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <section className="glass-card">
            <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={24} style={{ color: 'var(--dream-text)' }} /> Common Mistakes
            </h2>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <li>Filling too few options (always fill 50+ options).</li>
              <li>Not keeping enough "Safe" colleges at the end of the list.</li>
              <li>Assuming the same cutoff as last year (they always fluctuate).</li>
              <li>Not checking the college's previous placement records.</li>
              <li>Ignoring the distance and transportation factor.</li>
            </ul>
          </section>

          <section className="glass-card" style={{ border: '1px solid rgba(168, 85, 247, 0.2)' }}>
            <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GraduationCap size={24} style={{ color: 'var(--accent-purple)' }} /> Special Category Documents & Benefits
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div>
                <h4 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '8px' }}>Required Documents</h4>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <li>NCC certificate</li>
                  <li>Sports achievement/participation certificates</li>
                  <li>CAP certificate if applicable</li>
                  <li>PH disability certificate if applicable</li>
                  <li>EWS certificate if applicable</li>
                  <li>Caste certificate if applicable</li>
                  <li>Income certificate if fee reimbursement</li>
                  <li>Residence/study certificates</li>
                  <li>Aadhaar</li>
                  <li>Rank card</li>
                  <li>Hall ticket</li>
                  <li>Allotment order after allotment</li>
                </ul>
              </div>

              <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Info size={16} /> Important Note
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, fontWeight: '500' }}>
                  NCC/Sports/CAP/PH may improve chances only if certificates are valid and verified as per official counselling rules. It does not guarantee admission.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '8px' }}>NCC & Sports Quota</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Students with valid NCC/Sports certificates may receive additional consideration under special category seats. This can significantly improve your chances of getting a better college or branch compared to general rank-based allotment. 
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '8px' }}>CAP, PH & EWS</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  <strong>CAP:</strong> Children of Armed Personnel. Requires a valid CAP certificate.<br/>
                  <strong>PH:</strong> Physically Handicapped. Requires a disability certificate from a competent authority.<br/>
                  <strong>EWS:</strong> Economically Weaker Section. Provides 10% reservation in most colleges.
                </p>
              </div>

            </div>
          </section>

          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>Ready to generate your strategic list?</p>
            <Link to="/web-options" className="btn btn-primary" style={{ width: '100%' }}>
              Go to Web Options Generator <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Adding missing imports for components used in the guide

import { Link } from "react-router-dom";

export default CounsellingGuide;
