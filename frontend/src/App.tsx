import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import PlaybooksPage from './pages/PlaybooksPage';
import EndpointsPage from './pages/EndpointsPage';
import EndpointDetailPage from './pages/EndpointDetailPage';
import SessionsPage from './pages/SessionsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Dashboard / SIEM View */}
        <Route index element={<DashboardPage />} />
        
        {/* Session History Browser */}
        <Route path="sessions" element={<SessionsPage />} />
        
        {/* Incidents Queue */}
        <Route path="incidents" element={<IncidentsPage />} />
        
        {/* Incident Investigation / Details */}
        <Route path="incidents/:id" element={<IncidentDetailPage />} />
        
        {/* Playbooks Blueprints Manager */}
        <Route path="playbooks" element={<PlaybooksPage />} />

        {/* EDR Endpoints Inventory */}
        <Route path="endpoints" element={<EndpointsPage />} />

        {/* EDR Endpoint Detail */}
        <Route path="endpoints/:id" element={<EndpointDetailPage />} />
        
        {/* Fallback Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}


