import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import Admin from './components/Admin';
import AdminPricing from './components/AdminPricing';
import Policies from './components/Policies';
import Docs from './components/Docs';
import CookieConsent from './components/CookieConsent';
import NotFound from './components/NotFound';
import './index.css';

function App() {
  return (
    <Router>
      <CookieConsent />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/pricing" element={<AdminPricing />} />
        <Route path="/policies" element={<Policies />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
