import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, FolderOpen, Activity } from 'lucide-react';
import axios from 'axios';
import './Navbar.css';

const API = 'https://crimesolver.onrender.com';

export default function Navbar() {
  const location = useLocation();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    axios.get(`${API}/health`)
      .then(() => setStatus('online'))
      .catch(() => setStatus('offline'));
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">
            <Shield size={20} />
          </div>
          <div className="logo-text">
            <span className="logo-main">CRIME<span className="logo-accent">SOLVER</span></span>
            <span className="logo-sub">AI FORENSIC PLATFORM</span>
          </div>
        </Link>

        {/* Nav links */}
        <div className="navbar-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            <Activity size={15} />
            Analyze
          </Link>
          <Link
            to="/cases"
            className={`nav-link ${location.pathname.startsWith('/cases') ? 'active' : ''}`}
          >
            <FolderOpen size={15} />
            Cases
          </Link>
        </div>

        {/* Status */}
        <div className={`api-status ${status}`}>
          <span className="status-dot" />
          <span className="status-text">
            {status === 'online'   ? 'API ONLINE' :
             status === 'offline'  ? 'API OFFLINE' : 'CONNECTING...'}
          </span>
        </div>
      </div>
    </nav>
  );
}
