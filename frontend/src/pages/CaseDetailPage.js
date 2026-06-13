import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, FileText, AlertTriangle, Target, Eye, Shield, Download } from 'lucide-react';
import './CaseDetailPage.css';

const API = 'https://crimesolver.onrender.com';

export default function CaseDetailPage() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    axios.get(`${API}/cases/${id}`)
      .then(r => setCaseData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const downloadReport = async () => {
    const res = await axios.get(`${API}/report/${id}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a   = document.createElement('a');
    a.href = url; a.download = `CrimeSolver_${id}.pdf`;
    a.click();
  };

  if (loading) return (
    <div className="detail-loading"><div className="spinner" /> Loading case...</div>
  );
  if (!caseData) return (
    <div className="detail-not-found">
      <p>Case not found</p>
      <Link to="/cases" className="btn btn-outline">Back to Cases</Link>
    </div>
  );

  const threat = caseData.threat_level ? JSON.parse(
    typeof caseData.threat_level === 'string' && caseData.threat_level.startsWith('{')
      ? caseData.threat_level : JSON.stringify({ level: caseData.threat_level, score: caseData.threat_score })
  ) : { level: caseData.threat_level, score: caseData.threat_score };

  const detections = Array.isArray(caseData.detections) ? caseData.detections : [];
  const validation = typeof caseData.validation === 'object' ? caseData.validation : {};

  return (
    <div className="detail-page fade-in">
      {/* Header */}
      <div className="detail-header">
        <Link to="/cases" className="back-link">
          <ArrowLeft size={16} /> Back to Cases
        </Link>
        <div className="detail-title-row">
          <div>
            <h1 className="detail-case-id">{caseData.case_id}</h1>
            <p className="detail-filename">{caseData.filename}</p>
          </div>
          <button className="btn btn-primary" onClick={downloadReport}>
            <Download size={15} /> Download PDF Report
          </button>
        </div>
      </div>

      <div className="detail-grid">
        {/* Threat level */}
        <div className={`card threat-banner threat-${(caseData.threat_level||'low').toLowerCase()}`}>
          <div className="threat-banner-left">
            <AlertTriangle size={20} />
            <div>
              <div className="threat-banner-level">{caseData.threat_level}</div>
              <div className="threat-banner-sub">Threat Level</div>
            </div>
          </div>
          <div className="threat-banner-score">{caseData.threat_score}/100</div>
        </div>

        {/* Classification */}
        <div className="card">
          <div className="section-title"><Target size={13}/> Classification</div>
          <div className="detail-cls">
            <span className={`badge badge-${caseData.scene_type}`}>
              {caseData.scene_type?.toUpperCase()}
            </span>
            <span className="cls-conf-detail">
              {caseData.confidence ? `${(caseData.confidence * 100).toFixed(1)}% confidence` : ''}
            </span>
          </div>
          <p className="detail-description">{caseData.description}</p>
        </div>

        {/* Detections */}
        <div className="card">
          <div className="section-title"><Eye size={13}/> Detected Objects ({detections.length})</div>
          {detections.length > 0 ? (
            <div className="det-list-detail">
              {detections.map((d, i) => (
                <div key={i} className={`det-row-detail ${d.is_dangerous ? 'danger' : ''}`}>
                  <span className={`det-dot-detail ${d.is_dangerous ? 'red' : 'green'}`} />
                  <span className="det-name-detail">{d.object}</span>
                  {d.is_dangerous && <span className="det-dangerous-tag">DANGEROUS</span>}
                  <div className="det-conf-bar">
                    <div className="det-conf-fill" style={{
                      width: `${d.confidence*100}%`,
                      background: d.is_dangerous ? 'var(--red)' : 'var(--accent)'
                    }}/>
                  </div>
                  <span className="det-conf-text">{(d.confidence*100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          ) : <p className="empty-det">No objects detected</p>}
        </div>

        {/* Validation */}
        <div className="card">
          <div className="section-title"><Shield size={13}/> Image Authenticity</div>
          <div className="val-detail-grid">
            <div className={`val-badge-detail ${validation.is_valid ? 'ok' : 'fail'}`}>
              {validation.is_valid ? '✓ Valid Format' : '✗ Invalid Format'}
            </div>
            <div className={`val-badge-detail ${validation.is_authentic ? 'ok' : 'warn'}`}>
              {validation.is_authentic ? '✓ Authentic' : '⚠ Possible Tampering'}
            </div>
          </div>
          {validation.ela_score !== undefined && (
            <div className="ela-detail">
              <span>ELA Score: <strong>{validation.ela_score?.toFixed(2)}</strong></span>
              <span className="ela-note">(threshold: 15.0)</span>
            </div>
          )}
          {validation.image_info && (
            <div className="img-meta-detail">
              <span>{validation.image_info.width}×{validation.image_info.height}</span>
              <span>{validation.image_info.file_size}</span>
              <span className="hash-text">{validation.image_info.md5_hash?.slice(0,16)}...</span>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="card meta-card">
          <div className="section-title"><FileText size={13}/> Case Metadata</div>
          <div className="meta-list">
            <div className="meta-item">
              <span className="meta-key">Case ID</span>
              <span className="meta-value mono">{caseData.case_id}</span>
            </div>
            <div className="meta-item">
              <span className="meta-key">Filename</span>
              <span className="meta-value">{caseData.filename}</span>
            </div>
            <div className="meta-item">
              <span className="meta-key">Timestamp</span>
              <span className="meta-value">{caseData.timestamp ? new Date(caseData.timestamp).toLocaleString() : '—'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-key">Total Objects</span>
              <span className="meta-value mono">{detections.length}</span>
            </div>
            <div className="meta-item">
              <span className="meta-key">Dangerous Objects</span>
              <span className="meta-value mono color-red">
                {detections.filter(d => d.is_dangerous).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
