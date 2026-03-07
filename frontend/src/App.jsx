import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Stats from './pages/Stats';
import Users from './pages/Users';
import Groups from './pages/Groups';
import Logs from './pages/Logs';
import Reminders from './pages/Reminders';
import Security from './pages/Security';
import { ReminderProvider } from './contexts/ReminderContext';
import { Navigate as Redir } from 'react-router-dom';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (user) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
      <Route index element={<Dashboard />} />
      <Route path="leads" element={<Leads />} />
      <Route path="leads/:id" element={<LeadDetail />} />
      <Route path="me" element={<Redir to="/" replace />} />
      <Route path="stats" element={<Stats />} />
      <Route path="groups" element={<PrivateRoute adminOnly><Groups /></PrivateRoute>} />
      <Route path="users" element={<PrivateRoute adminOnly><Users /></PrivateRoute>} />
      <Route path="logs"      element={<PrivateRoute adminOnly><Logs /></PrivateRoute>} />
      <Route path="security"  element={<PrivateRoute adminOnly><Security /></PrivateRoute>} />
      <Route path="reminders" element={<PrivateRoute><Reminders /></PrivateRoute>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ReminderProvider>
          <AppRoutes />
        </ReminderProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
