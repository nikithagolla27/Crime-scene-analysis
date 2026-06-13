import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import AnalyzePage from './pages/AnalyzePage';
import CasesPage from './pages/CasesPage';
import CaseDetailPage from './pages/CaseDetailPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/"        element={<AnalyzePage />} />
            <Route path="/cases"   element={<CasesPage />} />
            <Route path="/cases/:id" element={<CaseDetailPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
