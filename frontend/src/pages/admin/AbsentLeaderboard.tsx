import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, Edit2 } from 'lucide-react';

interface LeaderboardItem {
  id: string;
  name: string;
  totalAbsent: number;
  absentAdjustment?: number;
}

export const AbsentLeaderboard: React.FC = () => {
  const [data, setData] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustingUser, setAdjustingUser] = useState<LeaderboardItem | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>('');
  const { token } = useAuth();

  const fetchLeaderboard = async () => {
    try {
      const url = filterMonth 
        ? `${import.meta.env.VITE_API_URL || ""}/api/leaderboards?absentMonth=${filterMonth}`
        : `${import.meta.env.VITE_API_URL || ""}/api/leaderboards`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      
      const sorted = (result.highestAbsent || []).sort((a: any, b: any) => {
        if (b.totalAbsent !== a.totalAbsent) {
          return b.totalAbsent - a.totalAbsent;
        }
        return a.name.localeCompare(b.name);
      });

      setData(sorted);
    } catch (error) {
      console.error('Failed to fetch absent leaderboard', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [token, filterMonth]);

  useEffect(() => {
    const handleRefresh = () => fetchLeaderboard();
    window.addEventListener('refreshLeaderboard', handleRefresh);
    return () => window.removeEventListener('refreshLeaderboard', handleRefresh);
  }, [token, filterMonth]);

  const handleAdjustClick = (item: LeaderboardItem) => {
    setAdjustingUser(item);
    setAdjustmentValue('');
  };
  const handleAdjustSave = async () => {
    if (!adjustingUser || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/employees/${adjustingUser.id}/adjust-absent`, {
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

  if (loading) return <div className="card">Loading absent list...</div>;

  const maxCount = data.length > 0 ? Math.max(...data.map(d => d.totalAbsent)) : 0;

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444', margin: 0 }}>
          <AlertCircle size={22} color="#ef4444" /> Absent Days
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Month:</span>
          <input 
            type="month" 
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem', color: 'var(--text-main)', cursor: 'pointer' }}
          />
          {filterMonth && (
            <button 
              onClick={() => setFilterMonth('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: '0 4px' }}
              title="Clear filter"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {data.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No records yet</p>
        ) : (
          data.map((item, index) => {
            const isTop = item.totalAbsent === maxCount && maxCount > 0;
            return (
              <div 
                key={item.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: isTop ? '#fef2f2' : 'white',
                  border: isTop ? '1px solid #ef4444' : '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  transition: 'transform 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    background: isTop ? '#ef4444' : '#f1f5f9',
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
                      title="Adjust absent days manually"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    fontWeight: 700, 
                    color: isTop ? '#ef4444' : 'var(--primary-color)',
                    fontSize: '1.125rem'
                  }}>
                    {item.totalAbsent}
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
            <h3 style={{ marginBottom: '1rem' }}>Adjust Absent Days</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Add or subtract absent days for <strong>{adjustingUser.name}</strong>.
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
      
      <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Updated live based on total past days not present
      </div>
    </div>
  );
};
