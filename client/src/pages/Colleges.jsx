import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Building2, ExternalLink, GraduationCap, DollarSign, BarChart } from 'lucide-react';
import { API_URL } from "../config/api";
import logger from '../utils/logger';

const Colleges = () => {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchColleges = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/colleges?search=${search}&page=${page}&limit=12`);
      const data = await res.json();
      setColleges(data.colleges || []);
      setTotalPages(data.pages || 1);
    } catch (err) {
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchColleges();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search, page]);

  return (
    <div className="page-wrapper container">
      <div style={{ marginBottom: '48px', marginTop: '16px' }}>
        <h1 className="section-title">Explore Colleges</h1>
        <p className="section-subtitle" style={{ maxWidth: '600px' }}>Browse through all engineering colleges in Telangana and find the B.Tech course that fits your career aspirations.</p>
      </div>

      <div style={{ position: 'relative', maxWidth: 'min(100%, 600px)', margin: '0 auto var(--spacing-md)' }}>
        <Search size={20} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          placeholder="Search by name, code, district or place..." 
          className="input-field" 
          style={{ paddingLeft: '48px' }}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: '20px', color: 'var(--text-muted)' }}>Fetching colleges...</p>
        </div>
      ) : (
        <>
          <div className="grid-3">
            {colleges.map((college) => (
              <div key={college._id} className="glass-card college-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '24px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div className="badge badge-primary">{college.collegeCode}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} /> {college.district}
                    </div>
                  </div>
                  <h3 style={{ fontSize: '18px', marginBottom: '12px', lineHeight: '1.4' }}>{college.name}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      <GraduationCap size={16} /> {college.place}, {college.district}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      <DollarSign size={16} /> Fees: ₹{college.fees?.toLocaleString() || "N/A"}
                    </div>
                    {college.placements?.avgPackage && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--accent-green)' }}>
                        <BarChart size={16} /> Avg Package: {college.placements.avgPackage} LPA
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
                  <Link to={`/college/${college.collegeCode}`} className="btn btn-secondary" style={{ flex: 1, padding: '10px' }}>
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {colleges.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Building2 size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ color: 'var(--text-muted)' }}>No colleges found matching your search.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '40px' }}>
              <button 
                className="btn btn-secondary" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Prev
              </button>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages}
              </div>
              <button 
                className="btn btn-secondary" 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Colleges;
