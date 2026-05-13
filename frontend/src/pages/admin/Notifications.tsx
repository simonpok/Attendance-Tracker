import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, CheckCircle, Clock, X } from 'lucide-react';
import { DeleteModal } from '../../components/DeleteModal';

interface PendingNotification {
  userId: string;
  userName: string;
  milestone: number;
  currentDays: number;
}

interface ClearedNotification {
  id: string;
  userName: string;
  milestone: number;
  clearedAt: string;
}

export const Notifications: React.FC = () => {
  const [pending, setPending] = useState<PendingNotification[]>([]);
  const [cleared, setCleared] = useState<ClearedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ClearedNotification | null>(null);
  const { token } = useAuth();

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPending(data.pending || []);
      setCleared(data.cleared || []);
      // Sync sidebar badge
      window.dispatchEvent(new CustomEvent('refreshNotifications'));
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchNotifications();
  }, [token]);

  const handleClear = async (userId: string, milestone: number) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/notifications/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId, milestone })
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to clear salary', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    console.log('Frontend: Attempting to delete notification:', deleteTarget.id);
    try {
      const url = `${import.meta.env.VITE_API_URL || ""}/api/direct-delete-salary/${deleteTarget.id}`;
      console.log('Frontend: DELETE URL:', url);
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setDeleteTarget(null);
        fetchNotifications();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Failed to delete notification', error);
    }
  };

  if (loading) return <div className="card">Loading notifications...</div>;

  return (
    <div className="notifications-page" style={{ paddingBottom: '2rem' }}>
      <div className="notifications-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Pending Side */}
        <div className="notification-column">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#eab308' }}>
            <Clock size={20} /> Pending Action
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pending.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', borderStyle: 'dashed' }}>
                No pending salary notifications
              </div>
            ) : (
              pending.map((p) => (
                <div key={`${p.userId}-${p.milestone}`} className="card" style={{ borderLeft: '4px solid #eab308', position: 'relative' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{p.userName}</div>
                  <div style={{ fontSize: '0.8rem', color: '#eab308', fontWeight: 600, marginBottom: '0.75rem' }}>{p.milestone} DAYS MILESTONE</div>
                  <p style={{ fontSize: '0.95rem', marginBottom: '1.25rem', color: 'var(--text-main)' }}>
                    This employee completed {p.milestone} working days. Did you send salary?
                  </p>
                  <button 
                    className="btn-primary" 
                    onClick={() => handleClear(p.userId, p.milestone)}
                    style={{ width: '100%', background: '#eab308', border: 'none', fontWeight: 600 }}
                  >
                    Yes
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Clear Side */}
        <div className="notification-column">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#10b981' }}>
            <CheckCircle size={20} /> Cleared History
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cleared.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', borderStyle: 'dashed' }}>
                No cleared payments yet
              </div>
            ) : (
              cleared.map(c => (
                <div key={c.id} className="card" style={{ borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#047857' }}>{c.userName}</div>
                      <p style={{ fontSize: '0.875rem', margin: '0.25rem 0' }}>
                        {c.milestone} days salary cleared.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <CheckCircle size={16} color="#10b981" />
                      <button 
                        onClick={() => setDeleteTarget(c)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#94a3b8' }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Cleared on: {new Date(c.clearedAt).toLocaleDateString()} at {new Date(c.clearedAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <DeleteModal 
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        itemName={`${deleteTarget?.milestone} days salary for ${deleteTarget?.userName}`}
        itemType="Salary Record"
      />
    </div>
  );
};
