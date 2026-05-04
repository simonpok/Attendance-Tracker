import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export const Home: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [manualTime, setManualTime] = useState('');

  const fetchStats = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/attendance/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setStats(data);
  };

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  const handleManualCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stats?.missedCheckout) return;

    const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/attendance/manual-check-out`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ 
        date: stats.missedCheckout.date, 
        time: manualTime 
      })
    });

    if (res.ok) {
      alert('Manual check-out recorded');
      fetchStats();
    } else {
      alert('Failed to save manual check-out');
    }
  };

  if (!stats) return <div className="loading-spinner">Loading...</div>;

  return (
    <div className="content-scroll">
      {stats.missedCheckout && (
        <div className="card text-danger" style={{ background: '#fef2f2', border: '1px solid #fecaca', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Missed Check-Out Alert!</h3>
          <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
            You forgot to check out yesterday ({stats.missedCheckout.date}). Please enter your check-out time.
          </p>
          <form onSubmit={handleManualCheckout} style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="time" 
              required 
              value={manualTime}
              onChange={e => setManualTime(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button type="submit" className="primary-btn" style={{ padding: '0.5rem 1rem' }}>Submit</button>
          </form>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card card">
          <span className="stat-label">Present</span>
          <span className="stat-value text-success">{stats.totalPresent}</span>
        </div>
        <div className="stat-card card">
          <span className="stat-label">Absent</span>
          <span className="stat-value text-danger">{stats.totalAbsent}</span>
        </div>
        <div className="stat-card card">
          <span className="stat-label">Streak</span>
          <span className="stat-value text-primary">{stats.currentStreak}🔥</span>
        </div>
      </div>

      <div className="action-card card gradient-bg" onClick={() => navigate('/employee/checkin')} style={{ cursor: 'pointer' }}>
        <h3>Ready to Check In/Out?</h3>
        <p>You must be at the office location to scan the QR.</p>
        <button className="primary-btn full-width" style={{ background: 'var(--accent-color)', pointerEvents: 'none' }}>
          {!stats.todayRecord || stats.todayRecord.checkOutTime ? 'Check In' : 'Check Out'}
        </button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Recent Activity</h3>
        <div className="card">
          {stats.recentRecords.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>No recent activity</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {stats.recentRecords.map((rec: any) => (
                <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{rec.date}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      In: {rec.checkInTime ? format(new Date(rec.checkInTime), 'hh:mm a') : '-'} | 
                      Out: {rec.checkOutTime ? format(new Date(rec.checkOutTime), 'hh:mm a') : '-'}
                      {rec.isManualCheckout && <span style={{ color: 'orange', marginLeft: '0.25rem' }}>(Manual)</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className={`badge ${rec.status.toLowerCase()} ${rec.checkOutTime ? 'checked_out' : ''}`}>
                      {rec.status === 'PRESENT' ? (rec.checkOutTime ? 'CHECKED OUT' : 'CHECKED IN') : rec.status}
                      {rec.sessionNumber > 1 ? ` ${rec.sessionNumber}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
