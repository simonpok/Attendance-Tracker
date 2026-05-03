import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Trophy, Flame } from 'lucide-react';

export const Leaderboard: React.FC = () => {
  const { token } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    
    fetch(`${import.meta.env.VITE_API_URL}/api/leaderboards`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setLeaderboard(data))
    .catch(console.error);
  }, [token]);

  if (!leaderboard) return <div className="loading-spinner">Loading...</div>;

  return (
    <div className="content-scroll">
      <h2 style={{ marginBottom: '1.5rem' }}>Your Stats</h2>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>
          <Trophy size={20} className="text-primary" /> Attendance
        </h3>
        {leaderboard.myStats ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontWeight: 500 }}>{leaderboard.myStats.name}</span>
            </div>
            <div style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{leaderboard.myStats.totalPresent} days</div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No data available</p>
        )}
      </div>

      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'orange' }}>
          <Flame size={20} color="orange" /> Your Streak
        </h3>
        {leaderboard.myStats ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontWeight: 500 }}>{leaderboard.myStats.name}</span>
            </div>
            <div style={{ fontWeight: 600, color: 'orange' }}>{leaderboard.myStats.currentStreak} 🔥</div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No data available</p>
        )}
      </div>
    </div>
  );
};
