import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Home as HomeIcon, QrCode, Trophy, User } from 'lucide-react';
import { Home } from './Home';
import { CheckIn } from './CheckIn';
import { Leaderboard } from './Leaderboard';
import { Holidays } from './Holidays';
import { Calendar } from 'lucide-react';
import { LogoutConfirmModal } from '../../components/LogoutConfirmModal';

export const EmployeeDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  return (
    <div className="employee-layout">
      <main className="employee-content">
        <header className="mobile-header">
          <div className="header-user">
            <User size={24} />
            <span>Hi, {user?.name?.split(' ')[0]}</span>
          </div>
          <button className="icon-btn" onClick={() => setShowLogoutModal(true)}>
            <LogOut size={20} />
          </button>
        </header>

        <LogoutConfirmModal 
          isOpen={showLogoutModal} 
          onClose={() => setShowLogoutModal(false)} 
          onConfirm={logout} 
        />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/holidays" element={<Holidays />} />
          <Route path="*" element={<Navigate to="/employee" replace />} />
        </Routes>
      </main>

      <nav className="bottom-nav">
        <Link to="/employee" className={`nav-item ${isActive('/employee')}`} style={{ textDecoration: 'none' }}>
          <HomeIcon size={24} />
          <span>Home</span>
        </Link>
        <Link to="/employee/checkin" className={`nav-item ${isActive('/employee/checkin')}`} style={{ textDecoration: 'none' }}>
          <QrCode size={24} />
          <span>Check In</span>
        </Link>
        <Link to="/employee/holidays" className={`nav-item ${isActive('/employee/holidays')}`} style={{ textDecoration: 'none' }}>
          <Calendar size={24} />
          <span>Calendar</span>
        </Link>
        <Link to="/employee/leaderboard" className={`nav-item ${isActive('/employee/leaderboard')}`} style={{ textDecoration: 'none' }}>
          <Trophy size={24} />
          <span>Your Stats</span>
        </Link>
      </nav>
    </div>
  );
};
