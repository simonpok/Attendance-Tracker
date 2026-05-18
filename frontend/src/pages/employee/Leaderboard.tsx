import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Trophy, Flame, UserCheck, AlertCircle, Clock } from 'lucide-react';

export const Leaderboard: React.FC = () => {
  const { token } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    
    fetch(`${import.meta.env.VITE_API_URL || ""}/api/leaderboards`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setLeaderboard(data))
    .catch(console.error);
  }, [token]);

  const formatDuration = (ms: number) => {
    if (!ms || ms <= 0) return '0h 0m';
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  if (!leaderboard) return <div className="loading-spinner">Loading...</div>;

  return (
    <div className="content-scroll" style={{ paddingBottom: '3rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Your Stats</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* 1. Attendance Count */}
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#10b981' }}>
            <UserCheck size={20} color="#10b981" /> Attendance Count
          </h3>
          {leaderboard.myStats ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
              <span style={{ fontWeight: 500 }}>{leaderboard.myStats.name}</span>
              <span style={{ fontWeight: 600, color: '#10b981' }}>{leaderboard.myStats.attendanceCount || 0} check-ins</span>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No data available</p>
          )}
        </div>

        {/* 2. Working Days */}
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>
            <Trophy size={20} className="text-primary" /> Working Days
          </h3>
          {leaderboard.myStats ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
              <span style={{ fontWeight: 500 }}>{leaderboard.myStats.name}</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{leaderboard.myStats.totalPresent} days</span>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No data available</p>
          )}
        </div>

        {/* 3. Absent */}
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--danger-color)' }}>
            <AlertCircle size={20} color="var(--danger-color)" /> Absent
          </h3>
          {leaderboard.myStats ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
              <span style={{ fontWeight: 500 }}>{leaderboard.myStats.name}</span>
              <span style={{ fontWeight: 600, color: 'var(--danger-color)' }}>{leaderboard.myStats.totalAbsent} days</span>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No data available</p>
          )}
        </div>

        {/* 4. Your Streak */}
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'orange' }}>
            <Flame size={20} color="orange" /> Your Streak
          </h3>
          {leaderboard.myStats ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
              <span style={{ fontWeight: 500 }}>{leaderboard.myStats.name}</span>
              <span style={{ fontWeight: 600, color: 'orange' }}>{leaderboard.myStats.currentStreak} 🔥</span>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No data available</p>
          )}
        </div>

        {/* 5. Average Presence Time */}
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#8b5cf6' }}>
            <Clock size={20} color="#8b5cf6" /> Average Presence
          </h3>
          {leaderboard.myStats ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
              <span style={{ fontWeight: 500 }}>{leaderboard.myStats.name}</span>
              <span style={{ fontWeight: 600, color: '#8b5cf6' }}>{formatDuration(leaderboard.myStats.averagePresence)}</span>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No data available</p>
          )}
        </div>
      </div>
    </div>
  );
};
