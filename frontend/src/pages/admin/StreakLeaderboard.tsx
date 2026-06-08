import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Flame } from 'lucide-react';

interface LeaderboardItem {
  id: string;
  name: string;
  currentStreak: number;
}

export const StreakLeaderboard: React.FC = () => {
  const [data, setData] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/leaderboards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      
      const sorted = (result.highestStreak || []).sort((a: any, b: any) => {
        if (b.currentStreak !== a.currentStreak) {
          return b.currentStreak - a.currentStreak;
        }
        return a.name.localeCompare(b.name);
      });

      setData(sorted);
    } catch (error) {
      console.error('Failed to fetch leaderboard', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    const handleRefresh = () => fetchLeaderboard();
    window.addEventListener('refreshLeaderboard', handleRefresh);
    return () => window.removeEventListener('refreshLeaderboard', handleRefresh);
  }, [token]);

  if (loading) return <div className="card">Loading streak leaderboard...</div>;

  const maxCount = data.length > 0 ? Math.max(...data.map(d => d.currentStreak)) : 0;

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#f97316' }}>
        <Flame size={22} color="#f97316" /> Current Streaks
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {data.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No streaks yet</p>
        ) : (
          data.map((item, index) => {
            const isTop = item.currentStreak === maxCount && maxCount > 0;
            return (
              <div 
                key={item.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: isTop ? '#fff7ed' : 'white',
                  border: isTop ? '1px solid #f97316' : '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  transition: 'transform 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    background: isTop ? '#f97316' : '#f1f5f9',
                    color: isTop ? 'white' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isTop && <Flame size={16} color="#f97316" />}
                  <span style={{ 
                    fontWeight: 700, 
                    color: isTop ? '#f97316' : 'var(--primary-color)',
                    fontSize: '1.125rem'
                  }}>
                    {item.currentStreak}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>DAYS</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Consecutive working days streak
      </div>
    </div>
  );
};
