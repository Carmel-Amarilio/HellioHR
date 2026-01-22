import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CandidatesPage } from './pages/CandidatesPage';
import { CandidateProfilePage } from './pages/CandidateProfilePage';
import { ComparePage } from './pages/ComparePage';
import { PositionsPage } from './pages/PositionsPage';
import './App.css';

function AppContent() {
  const { theme, toggleTheme } = useTheme();

  return (
    <BrowserRouter>
      <header className="app-header">
        <div className="app-brand">Hellio HR</div>
        <nav className="main-nav">
          <NavLink to="/" end>Candidates</NavLink>
          <NavLink to="/positions">Positions</NavLink>
        </nav>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<CandidatesPage />} />
          <Route path="/candidates/:id" element={<CandidateProfilePage />} />
          <Route path="/compare/:id1/:id2" element={<ComparePage />} />
          <Route path="/positions" element={<PositionsPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
