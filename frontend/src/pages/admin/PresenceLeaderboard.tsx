import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock } from 'lucide-react';

interface LeaderboardItem {
  id: string;
  name: string;
  averagePresence: number; // in ms
}

export const PresenceLeaderboard: React.FC = () => {
  const [data, setData] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/leaderboards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      setData(result.highestPresence || []);
    } catch (error) {
      console.error('Failed to fetch presence leaderboard', error);
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

  const formatDuration = (ms: number) => {
    if (!ms || ms <= 0) return '0h 0m';
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  if (loading) return <div className="card">Loading presence leaderboard...</div>;

  const maxVal = data.length > 0 ? Math.max(...data.map(d => d.averagePresence)) : 0;

  return (
    <div className="card" style={{ padding: '1.5rem', width: '100%' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#8b5cf6' }}>
        <Clock size={22} color="#8b5cf6" /> Average Presence Time (Daily)
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {data.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No records yet</p>
        ) : (
          data.map((item, index) => {
            const isTop = index === 0 && item.averagePresence > 0;
            const pct = maxVal > 0 ? (item.averagePresence / maxVal) * 100 : 0;
            
            return (
              <div 
                key={item.id} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: isTop ? '#faf5ff' : '#f8fafc',
                  border: isTop ? '1px solid #e9d5ff' : '1px solid #e2e8f0',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      color: isTop ? '#8b5cf6' : 'var(--text-muted)',
                      width: '20px'
                    }}>
                      #{index + 1}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>
                      {item.name}
                    </span>
                  </div>
                  <span style={{ 
                    fontWeight: 700, 
                    color: isTop ? '#8b5cf6' : 'var(--text-muted)',
                    fontSize: '0.925rem',
                    background: isTop ? '#f3e8ff' : '#f1f5f9',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px'
                  }}>
                    {formatDuration(item.averagePresence)}
                  </span>
                </div>
                {item.averagePresence > 0 && (
                  <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${pct}%`, 
                      height: '100%', 
                      background: isTop ? 'linear-gradient(to right, #a78bfa, #8b5cf6)' : '#94a3b8', 
                      borderRadius: '3px',
                      transition: 'width 0.5s ease-in-out'
                    }} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
