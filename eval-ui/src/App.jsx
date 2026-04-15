import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TestManagementPage from './pages/TestManagementPage';
import SheetViewerPage from './pages/SheetViewerPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import './index.css';

const ProtectedLayout = ({ children, title, subtitle }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header title={title} subtitle={subtitle} />
        <div className="page-body">{children}</div>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={
        <ProtectedLayout title="Dashboard" subtitle="Overview of your evaluation system">
          <DashboardPage />
        </ProtectedLayout>
      } />
      <Route path="/tests" element={
        <ProtectedLayout title="Test Management" subtitle="Create and manage evaluation tests">
          <TestManagementPage />
        </ProtectedLayout>
      } />
      <Route path="/tests/:testId/batches/:batchId/sheets" element={
        <ProtectedLayout title="Sheet Records" subtitle="View and review scanned answer sheets">
          <SheetViewerPage />
        </ProtectedLayout>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
