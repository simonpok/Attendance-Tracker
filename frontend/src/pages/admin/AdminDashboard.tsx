import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Users, FileText, Calendar, Settings as SettingsIcon, LayoutDashboard } from 'lucide-react';
import { Employees } from './Employees';
import { Records } from './Records';
import { Holidays } from './Holidays';
import { Settings } from './Settings';
import { AttendanceLeaderboard } from './AttendanceLeaderboard';
import { DashboardHome } from './DashboardHome';
import { LogoutConfirmModal } from '../../components/LogoutConfirmModal';

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname.includes(path) ? 'active' : '';

  return (
    <div className="admin-layout">
      <nav className="admin-sidebar">
        <div className="sidebar-header">
          <h2>OfficeTrack Admin</h2>
        </div>
        <ul className="sidebar-menu">
          <li className={location.pathname === '/admin' ? 'active' : ''}>
            <Link to="/admin" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <LayoutDashboard size={18} /> Dashboard
            </Link>
          </li>
          <li className={isActive('/admin/employees')}>
            <Link to="/admin/employees" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Users size={18} /> Employees
            </Link>
          </li>
          <li className={isActive('/admin/records')}>
            <Link to="/admin/records" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <FileText size={18} /> Records
            </Link>
          </li>
          <li className={isActive('/admin/holidays')}>
            <Link to="/admin/holidays" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Calendar size={18} /> Holidays
            </Link>
          </li>
          <li className={isActive('/admin/settings')}>
            <Link to="/admin/settings" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <SettingsIcon size={18} /> Settings
            </Link>
          </li>
        </ul>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={() => setShowLogoutModal(true)}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </nav>

      <LogoutConfirmModal 
        isOpen={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        onConfirm={logout} 
      />
      <main className="admin-content">
        <header className="content-header" style={{ marginBottom: '2rem' }}>
          <h1>Welcome, {user?.name}</h1>
        </header>
        
        <Routes>
          <Route path="/" element={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                <DashboardHome />
                <AttendanceLeaderboard />
              </div>
            </div>
          } />
          <Route path="/employees" element={<Employees />} />
          <Route path="/records" element={<Records />} />
          <Route path="/holidays" element={<Holidays />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
};
