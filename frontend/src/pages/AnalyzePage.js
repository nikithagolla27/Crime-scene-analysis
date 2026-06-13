import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Upload, Zap, AlertTriangle, CheckCircle, XCircle,
         Target, Eye, FileText, RefreshCw, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import './AnalyzePage.css';

const API = 'https://crimesolver.onrender.com';

export default function AnalyzePage() {
  const [file,          setFile]          = useState(null);
  const [preview,       setPreview]       = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [result,        setResult]        = useState(null);
  const [error,         setError]         = useState(null);
  const [step,          setStep]          = useState('idle');
  const [showAnnotated, setShowAnnotated] = useState(true);
  const [animKey,       setAnimKey]       = useState(0);

  const onDrop = useCallback(accepted => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null); setError(null); setStep('idle');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg','.jpeg','.png','.webp','.bmp'] },
    maxFiles: 1, maxSize: 20 * 1024 * 1024
  });

  const analyze = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null); setAnimKey(k => k+1);
    const form = new FormData();
    form.append('file', file);
    try {
      setStep('validating');
      await new Promise(r => setTimeout(r, 600));
      setStep('analyzing');
      const res = await axios.post(`${API}/analyze`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
      setStep('done');
      setShowAnnotated(true);
    } catch (e) {
      setError(e.response?.data?.detail || 'Analysis failed. Make sure the backend is running.');
      setStep('idle');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null); setPreview(null);
    setResult(null); setError(null); setStep('idle');
  };

  const downloadReport = async () => {
    if (!result?.case_id) return;
    const res = await axios.get(`${API}/report/${result.case_id}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = `CrimeSolver_${result.case_id}.pdf`;
    a.click();
  };

  const threat       = result?.threat_level;
  const cls          = result?.classification;
  const valid        = result?.validation;
  const annotatedUrl = result?.annotated_image_url ? `${API}${result.annotated_image_url}` : null;

  const threatColor =
    threat?.level === 'CRITICAL' ? 'var(--red)'    :
    threat?.level === 'HIGH'     ? 'var(--orange)'  :
    threat?.level === 'MODERATE' ? 'var(--yellow)'  : 'var(--accent)';

  const stepIndex = ['validating','analyzing','done'].indexOf(step);

  return (
    <div className="analyze-page fade-in">

      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">
            <span className="title-icon-wrap"><ShieldAlert size={22} className="title-icon" /></span>
            Forensic Analysis
          </h1>
          <p className="page-subtitle">Upload a crime scene image for AI-powered analysis</p>
        </div>
        {result && (
          <div className="header-actions slide-in-right">
            <button className="btn btn-outline" onClick={downloadReport}>
              <FileText size={14} /> Export PDF
            </button>
            <button className="btn btn-danger" onClick={reset}>
              <RefreshCw size={14} /> New Analysis
            </button>
          </div>
        )}
      </div>

      <div className="analyze-layout">

        {/* ══ LEFT COLUMN ══ */}
        <div className="analyze-left">

          {/* Upload */}
          <div className="card upload-card">
            <div className="section-title"><Upload size={12} /> Upload Image</div>

            {!preview ? (
              <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <div className="dropzone-content">
                  <div className="dropzone-icon"><Upload size={28} /></div>
                  <p className="dropzone-title">
                    {isDragActive ? 'Release to upload...' : 'Drag & drop image here'}
                  </p>
                  <p className="dropzone-sub">or click to browse files</p>
                  <div className="dropzone-formats-row">
                    {['JPG','PNG','WEBP','BMP'].map(f => (
                      <span key={f} className="format-chip">{f}</span>
                    ))}
                    <span className="format-chip muted">Max 20MB</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="preview-container">
                <img src={preview} alt="Preview" className="preview-img" />
                <div className="preview-overlay">
                  <button className="btn btn-outline btn-sm" onClick={reset}>
                    <RefreshCw size={12} /> Change
                  </button>
                </div>
                <div className="preview-filename">
                  <FileText size={11} />
                  {file?.name}
                  <span className="preview-size">{file ? (file.size/1024).toFixed(0)+'KB' : ''}</span>
                </div>
              </div>
            )}

            {file && !result && (
              <button className={`btn btn-primary analyze-btn ${loading ? 'btn-loading' : ''}`}
                onClick={analyze} disabled={loading}>
                {loading ? (
                  <><div className="spinner"/>
                    {step === 'validating' ? 'Validating image...' : 'Running AI models...'}</>
                ) : (
                  <><Zap size={15}/> Run Analysis</>
                )}
              </button>
            )}

            {/* Step progress */}
            {loading && (
              <div className="step-progress">
                {['Validating','Analyzing','Complete'].map((label, i) => (
                  <div key={i} className={`step-item ${i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''}`}>
                    <div className="step-dot">
                      {i < stepIndex ? <CheckCircle size={11}/> : <span>{i+1}</span>}
                    </div>
                    <span className="step-label">{label}</span>
                    {i < 2 && <div className={`step-line ${i < stepIndex ? 'done' : ''}`}/>}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="error-box shake"><XCircle size={14}/> {error}</div>
            )}
          </div>

          {/* Annotated image */}
          {result && annotatedUrl && (
            <div className="card annotated-card fade-up" style={{animationDelay:'0.1s'}}>
              <div className="section-title">
                <ImageIcon size={12}/> Detection Overlay
                <div className="toggle-btns">
                  <button className={`toggle-btn ${showAnnotated ? 'active' : ''}`} onClick={() => setShowAnnotated(true)}>Annotated</button>
                  <button className={`toggle-btn ${!showAnnotated ? 'active' : ''}`} onClick={() => setShowAnnotated(false)}>Original</button>
                </div>
              </div>
              <div className="annotated-img-wrap">
                <img src={showAnnotated ? annotatedUrl : preview}
                  alt={showAnnotated ? 'Annotated' : 'Original'}
                  className="annotated-img" key={showAnnotated ? 'ann' : 'orig'} />
                {result.detections?.length > 0 && (
                  <div className="det-count-overlay">
                    <Eye size={10}/> {result.detections.length} object{result.detections.length > 1 ? 's' : ''} detected
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Authenticity */}
          {valid && (
            <div className="card fade-up" style={{animationDelay:'0.15s'}}>
              <div className="section-title"><Eye size={12}/> Authenticity Check</div>
              <div className="validation-grid">
                <div className={`val-item ${valid.is_valid ? 'ok' : 'fail'}`}>
                  {valid.is_valid ? <CheckCircle size={14}/> : <XCircle size={14}/>}
                  <span>Valid Format</span>
                </div>
                <div className={`val-item ${valid.is_authentic ? 'ok' : 'warn'}`}>
                  {valid.is_authentic ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
                  <span>{valid.is_authentic ? 'Authentic' : 'Tampered?'}</span>
                </div>
              </div>
              <div className="ela-row">
                <span className="ela-label">ELA Score</span>
                <div className="ela-bar-wrap">
                  <div className="ela-bar" style={{
                    width:`${Math.min(100,(valid.ela_score/30)*100)}%`,
                    background: valid.is_authentic ? 'var(--accent)' : 'var(--orange)'
                  }}/>
                </div>
                <span className="ela-val">{valid.ela_score?.toFixed(1)}</span>
              </div>
              {valid.image_info && (
                <div className="img-info-row">
                  <span>{valid.image_info.width}×{valid.image_info.height}px</span>
                  <span>{valid.image_info.file_size}</span>
                  <span className="hash-text">{valid.image_info.md5_hash?.slice(0,12)}…</span>
                </div>
              )}
              {valid.warnings?.map((w,i) => (
                <div key={i} className="val-warning"><AlertTriangle size={12}/> {w}</div>
              ))}
            </div>
          )}
        </div>

        {/* ══ RIGHT COLUMN ══ */}
        {result ? (
          <div className="analyze-right" key={animKey}>

            {/* Case ID + Threat */}
            <div className={`card threat-card threat-border-${threat?.level?.toLowerCase()} fade-up`}>
              <div className="threat-header">
                <div>
                  <div className="case-id-label">CASE ID</div>
                  <div className="case-id">{result.case_id}</div>
                  <div className="case-filename">{result.filename}</div>
                </div>
                <div className={`threat-badge threat-${threat?.level?.toLowerCase()}`}>
                  <AlertTriangle size={13}/> {threat?.level}
                </div>
              </div>
              <div className="threat-meter">
                <div className="threat-bar-bg">
                  <div className="threat-bar-fill" style={{width:`${threat?.score}%`, background: threatColor}}/>
                  <div className="threat-bar-glow" style={{left:`${threat?.score}%`, background: threatColor}}/>
                </div>
                <span className="threat-score" style={{color: threatColor}}>
                  {threat?.score}<small>/100</small>
                </span>
              </div>
              <div className="threat-timestamp">{new Date(result.timestamp).toLocaleString()}</div>
            </div>

            {/* Scene Classification */}
            <div className="card fade-up" style={{animationDelay:'0.08s'}}>
              <div className="section-title"><Target size={12}/> Scene Classification</div>
              <div className="cls-result">
                <span className={`badge badge-${cls?.scene_type}`}>{cls?.scene_type?.toUpperCase()}</span>
                <span className="cls-conf">{(cls?.confidence*100).toFixed(1)}% confident</span>
              </div>
              {cls?.probabilities && (
                <div className="prob-list">
                  {Object.entries(cls.probabilities).map(([name, prob]) => (
                    <div key={name} className="prob-row">
                      <span className="prob-name">{name}</span>
                      <div className="prob-bar-bg">
                        <div className="prob-bar-fill" style={{
                          width:`${prob*100}%`,
                          background: name === 'violence' ? 'var(--red)' : 'var(--accent)'
                        }}/>
                      </div>
                      <span className="prob-val">{(prob*100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detected objects */}
            <div className="card fade-up" style={{animationDelay:'0.14s'}}>
              <div className="section-title">
                <Eye size={12}/> Detected Objects
                <span className="count-badge">{result.detections?.length || 0}</span>
              </div>
              {result.detections?.length > 0 ? (
                <div className="detections-list">
                  {result.detections.map((d, i) => (
                    <div key={i}
                      className={`detection-item ${d.is_dangerous ? 'dangerous' : ''} fade-up`}
                      style={{animationDelay:`${0.18 + i*0.05}s`}}>
                      <div className="det-left">
                        <span className={`det-dot ${d.is_dangerous ? 'red' : 'green'}`}/>
                        <span className="det-name">{d.object}</span>
                        {d.raw_label && d.raw_label !== d.object && (
                          <span className="det-raw-label">({d.raw_label})</span>
                        )}
                        {d.is_dangerous && <span className="det-warn">⚠ DANGEROUS</span>}
                        <span className="det-source">{d.source}</span>
                      </div>
                      <div className="det-right">
                        <div className="conf-bar-bg">
                          <div className="conf-bar-fill" style={{
                            width:`${d.confidence*100}%`,
                            background: d.is_dangerous ? 'var(--red)' : 'var(--accent)'
                          }}/>
                        </div>
                        <span className="conf-val">{(d.confidence*100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-det">
                  <Eye size={26} className="empty-det-icon"/>
                  <p>No objects detected</p>
                </div>
              )}
            </div>

            {/* Forensic Report */}
            <div className="card fade-up" style={{animationDelay:'0.2s'}}>
              <div className="section-title"><FileText size={12}/> Forensic Report</div>
              <div className="report-terminal">
                <div className="terminal-header">
                  <span className="t-dot red"/><span className="t-dot yellow"/><span className="t-dot green"/>
                  <span className="terminal-title">ANALYSIS_REPORT.log</span>
                </div>
                <div className="terminal-body">
                  <span className="t-prompt">{'> '}</span>
                  {result.forensic_report ? (
                    <pre className="t-text t-pre">{result.forensic_report}</pre>
                  ) : (
                    <span className="t-text">{result.description}</span>
                  )}
                  <span className="t-cursor"/>
                </div>
                <div className="terminal-footer">
                  <span>CASE: {result.case_id}</span>
                  <span>{new Date(result.timestamp).toISOString()}</span>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <>
            {!loading && (
              <div className="analyze-right placeholder-col">
                <div className="placeholder-card">
                  <div className="placeholder-icon-wrap">
                    <ShieldAlert size={40}/>
                  </div>
                  <p className="placeholder-title">Awaiting Evidence</p>
                  <p className="placeholder-sub">Upload an image and run analysis to see results here</p>
                  <div className="placeholder-specs">
                    {[
                      ['YOLOv8s','COCO 80 classes'],
                      ['Custom YOLO','Gun specialist'],
                      ['EfficientNet-B0','Violence classifier'],
                      ['ELA Analysis','Tamper detection'],
                    ].map(([k,v]) => (
                      <div key={k} className="spec-row">
                        <span className="spec-key">{k}</span>
                        <span className="spec-val">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {loading && (
              <div className="analyze-right placeholder-col">
                <div className="placeholder-card loading-card">
                  <div className="loading-ring"/>
                  <p className="placeholder-title">
                    {step === 'validating' ? 'Validating image...' : 'Running AI analysis...'}
                  </p>
                  <p className="placeholder-sub">Dual-model YOLO + Scene Classifier</p>
                  <div className="loading-bars">
                    <div className="loading-bar" style={{animationDelay:'0s'}}/>
                    <div className="loading-bar" style={{animationDelay:'0.15s'}}/>
                    <div className="loading-bar" style={{animationDelay:'0.3s'}}/>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
