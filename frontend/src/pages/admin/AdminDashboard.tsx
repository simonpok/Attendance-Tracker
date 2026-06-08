import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Users, FileText, Calendar, Settings as SettingsIcon, LayoutDashboard, Menu, X } from 'lucide-react';
import { Employees } from './Employees';
import { Records } from './Records';
import { Holidays } from './Holidays';
import { Settings } from './Settings';
import { AttendanceLeaderboard } from './AttendanceLeaderboard';
import { DashboardHome } from './DashboardHome';
import { SalaryLeaderboard } from './SalaryLeaderboard';
import { AbsentLeaderboard } from './AbsentLeaderboard';
import { PresenceLeaderboard } from './PresenceLeaderboard';
import { StreakLeaderboard } from './StreakLeaderboard';

import { LogoutConfirmModal } from '../../components/LogoutConfirmModal';

export const AdminDashboard: React.FC = () => {
  const { user, logout, token } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const location = useLocation();
  
  const isActive = (path: string) => location.pathname.includes(path) ? 'active' : '';

  React.useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="admin-layout">
      <button className="mobile-nav-toggle" onClick={() => setIsSidebarOpen(true)}>
        <Menu size={24} />
      </button>

      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}

      <nav className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 style={{ whiteSpace: 'nowrap', fontSize: '1.25rem' }}>Core Walkers Admin</h2>
          <button className="mobile-close-btn" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <ul className="sidebar-menu">
          <li className={location.pathname === '/admin' ? 'active' : ''}>
            <Link to="/admin" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <LayoutDashboard size={20} /> <span>Dashboard</span>
            </Link>
          </li>
          <li className={isActive('/admin/employees')}>
            <Link to="/admin/employees" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <Users size={20} /> <span>Employees</span>
            </Link>
          </li>
          <li className={isActive('/admin/records')}>
            <Link to="/admin/records" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <FileText size={20} /> <span>Records</span>
            </Link>
          </li>
          <li className={isActive('/admin/holidays')}>
            <Link to="/admin/holidays" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <Calendar size={20} /> <span>Calendar</span>
            </Link>
          </li>

          <li className={isActive('/admin/settings')}>
            <Link to="/admin/settings" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <SettingsIcon size={20} /> <span>Settings</span>
            </Link>
          </li>
        </ul>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={() => setShowLogoutModal(true)}>
            <LogOut size={20} /> <span>Logout</span>
          </button>
        </div>
      </nav>

      <LogoutConfirmModal 
        isOpen={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        onConfirm={logout} 
      />
      <main className="admin-content">
        <header className="content-header" style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 'clamp(1.25rem, 5vw, 2.25rem)' }}>Welcome, {user?.name}</h1>
        </header>
        
        <Routes>
          <Route path="/" element={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                <DashboardHome />
                <AttendanceLeaderboard />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                <SalaryLeaderboard />
                <AbsentLeaderboard />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                <PresenceLeaderboard />
                <StreakLeaderboard />
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
