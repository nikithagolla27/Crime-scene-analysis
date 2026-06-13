import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FolderOpen, AlertTriangle, Search, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import './CasesPage.css';

const API = 'https://crimesolver.onrender.com';

export default function CasesPage() {
  const [cases,   setCases]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/cases`);
      setCases(res.data.cases || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCases(); }, []);

  const deleteCase = async (id, e) => {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm(`Delete case ${id}?`)) return;
    await axios.delete(`${API}/cases/${id}`);
    fetchCases();
  };

  const downloadReport = async (id, e) => {
    e.preventDefault(); e.stopPropagation();
    const res = await axios.get(`${API}/report/${id}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a   = document.createElement('a');
    a.href = url; a.download = `CrimeSolver_${id}.pdf`;
    a.click();
  };

  const filtered = cases.filter(c => {
    const matchSearch = c.case_id.includes(search.toUpperCase()) ||
                        c.filename?.toLowerCase().includes(search.toLowerCase()) ||
                        c.scene_type?.includes(search.toLowerCase());
    const matchFilter = filter === 'all' || c.threat_level?.toLowerCase() === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total:    cases.length,
    critical: cases.filter(c => c.threat_level === 'CRITICAL').length,
    high:     cases.filter(c => c.threat_level === 'HIGH').length,
    violent:  cases.filter(c => c.scene_type   === 'violence').length,
  };

  return (
    <div className="cases-page fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">
            <FolderOpen size={24} className="title-icon" /> Case Archive
          </h1>
          <p className="page-subtitle">All analyzed forensic cases</p>
        </div>
        <button className="btn btn-outline" onClick={fetchCases}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="stats-row">
        {[
          { label: 'Total Cases',   value: stats.total,    color: 'accent'  },
          { label: 'Critical',      value: stats.critical, color: 'red'     },
          { label: 'High Threat',   value: stats.high,     color: 'orange'  },
          { label: 'Violent Scenes',value: stats.violent,  color: 'red'     },
        ].map(s => (
          <div key={s.label} className="stat-card card">
            <div className={`stat-val color-${s.color}`}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filters-row">
        <div className="search-wrap">
          <Search size={14} className="search-icon" />
          <input
            type="text" placeholder="Search cases..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-tabs">
          {['all','critical','high','moderate','low'].map(f => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Cases table */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" /> Loading cases...
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <FolderOpen size={40} />
          <p>No cases found</p>
          <Link to="/" className="btn btn-primary">Analyze First Image</Link>
        </div>
      ) : (
        <div className="cases-table card">
          <div className="table-header">
            <span>Case ID</span>
            <span>File</span>
            <span>Scene</span>
            <span>Threat</span>
            <span>Objects</span>
            <span>Date</span>
            <span>Actions</span>
          </div>
          {filtered.map(c => (
            <Link to={`/cases/${c.case_id}`} key={c.case_id} className="table-row">
              <span className="cell-case-id">{c.case_id}</span>
              <span className="cell-file">{c.filename || '—'}</span>
              <span>
                <span className={`badge badge-${c.scene_type}`}>
                  {c.scene_type?.toUpperCase() || '—'}
                </span>
              </span>
              <span>
                <span className={`badge badge-${c.threat_level?.toLowerCase()}`}>
                  {c.threat_level || '—'}
                </span>
              </span>
              <span className="cell-mono">{c.detections?.length ?? '—'}</span>
              <span className="cell-date">
                {c.timestamp ? new Date(c.timestamp).toLocaleDateString() : '—'}
              </span>
              <span className="cell-actions" onClick={e => e.preventDefault()}>
                <button
                  className="icon-btn"
                  title="Download PDF"
                  onClick={e => downloadReport(c.case_id, e)}
                >
                  <ExternalLink size={14} />
                </button>
                <button
                  className="icon-btn danger"
                  title="Delete"
                  onClick={e => deleteCase(c.case_id, e)}
                >
                  <Trash2 size={14} />
                </button>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
