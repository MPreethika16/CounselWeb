import React from 'react';
import { CheckCircle2, Info, AlertTriangle, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import InfoTooltip from "./InfoTooltip";

export default function CollegeCard({ college, idx, priority, dragProps, category, gender, sectionType }) {
  const isBackup = sectionType === "backup" || (!sectionType && (college.riskLabel === "Backup" || college.riskLabel === "Safe"));
  const isBestMatch = sectionType === "bestmatch" || (!sectionType && (college.riskLabel === "BestMatch" || college.riskLabel === "Moderate"));
  const riskStatus = isBackup ? "backup" : isBestMatch ? "bestmatch" : "competitive";

  const getRiskIcon = () => {
    if (isBackup) return <CheckCircle2 size={12} />;
    if (isBestMatch) return <Info size={12} />;
    return <AlertTriangle size={12} />;
  };

  const getRiskDisplayLabel = () => {
    if (isBackup) return "Backup Colleges";
    if (isBestMatch) return "Best Matching Colleges";
    return "Competitive Colleges";
  };

  const cat = category || college.categoryUsed || college.category || "";
  const gen = gender || college.genderUsed || college.gender || "";
  const yearPrefix = college.year ? `${college.year} ` : "";
  const cutoffLabel = cat && gen ? `${yearPrefix}${cat} ${gen} Cutoff` : cat ? `${yearPrefix}${cat} Cutoff` : `${yearPrefix}Category Cutoff`;

  // Dynamic border calculations based on official matching probability
  let borderColor = "var(--color-match-default)"; // default to gray

  const score = college.matchScore !== undefined ? college.matchScore : college.score;
  if (score !== undefined) {
    if (score >= 90) {
      borderColor = "var(--color-match-safe)"; // Green (Safe/Backup)
    } else if (score >= 75) {
      borderColor = "var(--color-match-moderate)"; // Blue (Moderate/Best Match)
    } else if (score >= 60) {
      borderColor = "var(--color-match-competitive)"; // Amber (Competitive)
    } else {
      borderColor = "var(--color-match-default)"; // Gray
    }
  } else {
    // Backward compatibility fallbacks based on risk status
    if (isBackup) {
      borderColor = "var(--color-match-safe)";
    } else if (isBestMatch) {
      borderColor = "var(--color-match-moderate)";
    } else {
      borderColor = "var(--color-match-competitive)";
    }
  }

  return (
    <div
      key={college._id || idx}
      className="glass-card animate-up"
      style={{
        padding: "16px",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        height: "100%",
        cursor: dragProps ? "grab" : "default",
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: "var(--card-shadow)"
      }}
      {...dragProps}
    >

      {/* Row 1: Priority & Badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
        {priority !== undefined ? (
          <div style={{ 
            background: "var(--bg-secondary)", borderRadius: "4px", width: "24px", height: "24px",
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700",
            color: "var(--text-primary)", flexShrink: 0, fontSize: '11px', border: '1px solid var(--border-color)'
          }}>
            #{priority}
          </div>
        ) : <div />}

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {college.highlyRecommended && (
            <span style={{ 
              background: 'var(--primary)', 
              color: 'white', 
              fontWeight: '700', 
              fontSize: '9px', 
              padding: '2px 6px', 
              borderRadius: '4px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px' 
            }}>
              Highly Recommended
            </span>
          )}
          {college.matchScore !== undefined ? (
            <span style={{ 
              background: borderColor, 
              color: 'white', 
              fontWeight: '700', 
              fontSize: '9px', 
              padding: '2px 6px', 
              borderRadius: '4px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              Match: {college.matchScore}%
            </span>
          ) : (
            <div className={`badge badge-${riskStatus}`} style={{ gap: '2px', padding: '1px 5px', fontSize: '8px', textTransform: 'uppercase', fontWeight: '700' }}>
              {getRiskIcon()}
              {getRiskDisplayLabel()}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: College Info */}
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '13px', marginBottom: '2px', lineHeight: 1.2, color: 'var(--text-primary)', fontWeight: '700' }}>
          {college.name}
        </h3>
        <div style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
          <span style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>{college.collegeCode}</span>
          <span>&bull;</span>
          <span>{college.place}{college.district ? `, ${college.district}` : ""}</span>
        </div>
      </div>

      {/* Row 3: Branch & Fees Box */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '6px', background: 'rgba(255,255,255,0.01)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <div>
          <span style={{ fontSize: '8px', color: 'var(--text-muted)', display: 'block', marginBottom: '0px' }}>Branch</span>
          <span style={{ fontWeight: '700', fontSize: '10px', color: 'var(--accent-purple)' }}>
            {college.branchCode} <span style={{ fontWeight: '400', fontSize: '9px', color: 'var(--text-muted)' }}>- {college.branch}</span>
          </span>
        </div>
        <div>
          <span style={{ fontSize: '8px', color: 'var(--text-muted)', display: 'block', marginBottom: '0px' }}>Annual Fees</span>
          <span style={{ fontWeight: '700', fontSize: '10px', color: 'var(--text-primary)' }}>
            {college.fees != null ? `₹${college.fees.toLocaleString()}` : "N/A"}
          </span>
        </div>
      </div>

      {/* Row 4: Category/Gender Cutoff Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.02)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <div>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {cutoffLabel}
            <InfoTooltip text="This is the last rank for your selected category and gender in the previous counselling round." />
          </span>
          <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--accent-blue)' }}>
            {college.cutoff != null ? college.cutoff.toLocaleString() : "N/A"}
          </span>
        </div>
      </div>

      {/* Premium Counseling Expert Detailed Stats */}
      {college.strongMatchScore !== undefined && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1.6fr',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.02)',
          padding: '10px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          fontSize: '11px',
          margin: '4px 0'
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '9px' }}>Admission Chance</span>
            <span style={{ fontWeight: '700', color: college.admissionScore >= 80 ? '#22c55e' : college.admissionScore >= 60 ? '#eab308' : '#ef4444' }}>
              {college.admissionScore}%
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '9px' }}>Recommendation Score</span>
            <span style={{ fontWeight: '700', color: college.strongMatchScore >= 80 ? '#22c55e' : college.strongMatchScore >= 60 ? '#eab308' : '#ef4444' }}>
              {college.strongMatchScore}%
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '9px' }}>College Tier</span>
            <span style={{ 
              fontWeight: '700', 
              color: college.collegeTier === 'Tier 1' ? '#3b82f6' : college.collegeTier === 'Tier 2' ? '#10b981' : '#a855f7',
              fontSize: '10px'
            }}>
              {college.collegeTier}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '9px' }}>Demand Trend</span>
            <span style={{ 
              fontWeight: '700', 
              color: college.trend === 'High Demand' ? '#3b82f6' : college.trend === 'Low Demand' ? '#ef4444' : '#6b7280'
            }}>
              {college.trend}
            </span>
          </div>
        </div>
      )}

      {/* Counseling Reasons Checklist */}
      {college.reasons && college.reasons.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          background: 'rgba(16, 185, 129, 0.03)',
          padding: '8px 10px',
          borderRadius: '6px',
          border: '1px solid rgba(16, 185, 129, 0.12)',
          margin: '4px 0'
        }}>
          <span style={{ fontSize: '9px', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
            Why Recommended
          </span>
          {college.reasons.map((reason, rIdx) => (
            <div key={rIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: 'var(--text-secondary)' }}>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
              <span>{reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* Row 5: View Details button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
        <Link to={college.year ? `/college/${college.collegeCode}?year=${college.year}` : `/college/${college.collegeCode}`} style={{ color: 'var(--accent-blue)', fontSize: '10px', display: 'flex', alignItems: 'center', fontWeight: '600', gap: '2px' }}>
          View Details <ChevronRight size={10} />
        </Link>
      </div>
    </div>
  );
}
