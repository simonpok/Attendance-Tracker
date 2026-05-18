import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Trophy, Flame, UserCheck, AlertCircle } from 'lucide-react';

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

  if (!leaderboard) return <div className="loading-spinner">Loading...</div>;

  return (
    <div className="content-scroll" style={{ paddingBottom: '3rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Your Stats</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* 1. Working Days */}
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#10b981' }}>
            <UserCheck size={20} color="#10b981" /> Working Days
          </h3>
          {leaderboard.myStats ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
              <span style={{ fontWeight: 500 }}>{leaderboard.myStats.name}</span>
              <span style={{ fontWeight: 600, color: '#10b981' }}>{leaderboard.myStats.totalPresent || 0} days</span>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No data available</p>
          )}
        </div>

        {/* 2. Attendance Count */}
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>
            <Trophy size={20} className="text-primary" /> Attendance Count
          </h3>
          {leaderboard.myStats ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
              <span style={{ fontWeight: 500 }}>{leaderboard.myStats.name}</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{leaderboard.myStats.salaryCount || 0} days</span>
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
              <span style={{ fontWeight: 600, color: 'var(--danger-color)' }}>{leaderboard.myStats.totalAbsent || 0} days</span>
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
              <span style={{ fontWeight: 600, color: 'orange' }}>{leaderboard.myStats.currentStreak || 0} 🔥</span>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No data available</p>
          )}
        </div>
      </div>
    </div>
  );
};
