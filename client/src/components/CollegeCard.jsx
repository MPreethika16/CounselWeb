import React from 'react';
import { CheckCircle2, Info, AlertTriangle, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import InfoTooltip from "./InfoTooltip";

export default function CollegeCard({ college, idx, priority, dragProps, category, gender }) {
  const isBackup = college.riskLabel === "Backup" || college.riskLabel === "Safe";
  const isBestMatch = college.riskLabel === "BestMatch" || college.riskLabel === "Moderate";
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
  const cutoffLabel = cat && gen ? `${cat} ${gen} Cutoff` : cat ? `${cat} Cutoff` : "Category Cutoff";

  return (
    <div
      key={college._id || idx}
      className="glass-card animate-up"
      style={{
        padding: "12px 14px",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        height: "100%",
        cursor: dragProps ? "grab" : "default"
      }}
      {...dragProps}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: `var(--${riskStatus}-text)` }} />

      {/* Row 1: Priority & Badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
        {priority !== undefined ? (
          <div style={{ 
            background: "var(--bg-secondary)", borderRadius: "6px", width: "24px", height: "24px",
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold",
            color: "var(--text-primary)", flexShrink: 0, fontSize: '11px'
          }}>
            #{priority}
          </div>
        ) : <div />}

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {college.highlyRecommended && (
            <span style={{ 
              background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
              color: 'white', 
              fontWeight: '700', 
              fontSize: '8px', 
              padding: '1px 5px', 
              borderRadius: '8px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px' 
            }}>
              Highly Recommended
            </span>
          )}
          <div className={`badge badge-${riskStatus}`} style={{ gap: '2px', padding: '1px 5px', fontSize: '8px', textTransform: 'uppercase', fontWeight: '700' }}>
            {getRiskIcon()}
            {getRiskDisplayLabel()}
          </div>
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

      {/* Row 5: View Details button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
        <Link to={`/college/${college.collegeCode}`} style={{ color: 'var(--accent-blue)', fontSize: '10px', display: 'flex', alignItems: 'center', fontWeight: '600', gap: '2px' }}>
          View Details <ChevronRight size={10} />
        </Link>
      </div>
    </div>
  );
}
