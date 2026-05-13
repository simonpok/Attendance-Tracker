import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Coins, Medal, Edit2 } from 'lucide-react';

interface LeaderboardItem {
  id: string;
  name: string;
  salaryCount: number;
  attendanceAdjustment?: number;
}

export const SalaryLeaderboard: React.FC = () => {
  const [data, setData] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustingUser, setAdjustingUser] = useState<LeaderboardItem | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const { token } = useAuth();

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/leaderboards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      
      const sorted = (result.highestSalary || []).sort((a: any, b: any) => {
        if (b.salaryCount !== a.salaryCount) {
          return b.salaryCount - a.salaryCount;
        }
        return a.name.localeCompare(b.name);
      });

      setData(sorted);
    } catch (error) {
      console.error('Failed to fetch salary leaderboard', error);
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

  const handleAdjustClick = (item: LeaderboardItem) => {
    setAdjustingUser(item);
    setAdjustmentValue('');
  };
  const handleAdjustSave = async () => {
    if (!adjustingUser || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/employees/${adjustingUser.id}/adjust-attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ adjustment: adjustmentValue })
      });
      
      if (res.ok) {
        setAdjustingUser(null);
        fetchLeaderboard();
        // Also trigger a refresh of the other leaderboard if possible, 
        // but for now, the user can refresh or we rely on the next fetch.
        window.dispatchEvent(new CustomEvent('refreshLeaderboard'));
      } else {
        alert('Failed to update adjustment');
      }
    } catch (error) {
      console.error('Adjustment failed', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="card">Loading Salary records...</div>;

  const maxCount = data.length > 0 ? Math.max(...data.map(d => d.salaryCount)) : 0;

  return (
    <div className="card" style={{ padding: '1.5rem', width: '100%' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#6366f1' }}>
        <Coins size={22} color="#fbbf24" /> Salary / Day Counting (Working Days)
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {data.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No records yet</p>
        ) : (
          data.map((item, index) => {
            const isTop = item.salaryCount === maxCount && maxCount > 0;
            return (
              <div 
                key={item.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: isTop ? '#fefce8' : 'white',
                  border: isTop ? '1px solid #fbbf24' : '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  transition: 'transform 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    background: isTop ? '#fbbf24' : '#f1f5f9',
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
                    <button 
                      onClick={() => handleAdjustClick(item)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        padding: '4px', 
                        cursor: 'pointer', 
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '4px'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                      title="Adjust days manually"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isTop && <Medal size={16} color="#fbbf24" />}
                  <span style={{ 
                    fontWeight: 700, 
                    color: isTop ? '#b45309' : 'var(--primary-color)',
                    fontSize: '1.125rem'
                  }}>
                    {item.salaryCount}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>DAYS</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {adjustingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem'
        }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '320px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Adjust Days</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Add or subtract days for <strong>{adjustingUser.name}</strong>.
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>Change Amount (+/-)</label>
              <input 
                type="number" 
                value={adjustmentValue}
                onChange={(e) => setAdjustmentValue(e.target.value)}
                placeholder="e.g. 2 or -1"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Use negative numbers to subtract days.</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setAdjustingUser(null)} className="btn-secondary" style={{ flex: 1 }} disabled={isSaving}>Cancel</button>
              <button onClick={handleAdjustSave} className="btn-primary" style={{ flex: 1 }} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: '#fefce8', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: '#b45309', textAlign: 'center', fontWeight: 500 }}>
        Rules: Check-ins + (Saturdays & Holidays credit) + Manual Adjustments
      </div>
    </div>
  );
};
