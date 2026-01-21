import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { CandidatesPage } from './pages/CandidatesPage';
import { PositionsPage } from './pages/PositionsPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <nav className="main-nav">
        <NavLink to="/" end>Candidates</NavLink>
        <NavLink to="/positions">Positions</NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<CandidatesPage />} />
          <Route path="/positions" element={<PositionsPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
