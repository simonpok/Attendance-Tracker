import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface WorkReportEntry {
  id: string;
  userId: string;
  name: string;
  employeeId: string;
  checkOutTime: string;
  summary: string;
  createdAt: string;
}

interface WorkReportSummary {
  date: string;
  submitted: WorkReportEntry[];
  notSubmitted: { userId: string; name: string; employeeId: string }[];
}

const MIN_CHARS = 100;
const MAX_CHARS = 500;

export const Home: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [manualTime, setManualTime] = useState('');
  const [manualSummary, setManualSummary] = useState('');
  const [manualError, setManualError] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  // Daily Work Reports (read-only for all employees)
  const [workReportDate, setWorkReportDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [workReportSummary, setWorkReportSummary] = useState<WorkReportSummary | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const fetchWorkReports = async (date: string) => {
    setLoadingReports(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/work-reports/daily-summary?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWorkReportSummary(data);
      } else {
        setWorkReportSummary({ date, submitted: [], notSubmitted: [] });
      }
    } catch (err) {
      console.error('Failed to fetch work reports', err);
      setWorkReportSummary({ date, submitted: [], notSubmitted: [] });
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchWorkReports(workReportDate);
    }
  }, [token, workReportDate]);

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

    if (!manualTime) {
      setManualError('Please select your check-out time.');
      return;
    }
    if (!manualSummary.trim() || manualSummary.trim().length < MIN_CHARS) {
      setManualError("Come on! At least 100 characters of work. If nothing else, just go 'blah blah blah'");
      return;
    }
    if (manualSummary.length > MAX_CHARS) {
      setManualError(`Summary must not exceed ${MAX_CHARS} characters.`);
      return;
    }

    setSubmittingManual(true);
    setManualError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/attendance/manual-check-out`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          date: stats.missedCheckout.date, 
          time: manualTime,
          summary: manualSummary.trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert('Check-out and daily work report recorded successfully! 🎉');
        setManualTime('');
        setManualSummary('');
        setManualError('');
        fetchStats();
        fetchWorkReports(workReportDate);
      } else {
        setManualError(data.error || 'Failed to save manual check-out');
      }
    } catch (err: any) {
      setManualError('Network error. Please try again.');
    } finally {
      setSubmittingManual(false);
    }
  };

  if (!stats) return <div className="loading-spinner">Loading...</div>;

  return (
    <div className="content-scroll">
      {stats.missedCheckout && (
        <div className="card text-danger" style={{ background: '#fef2f2', border: '1px solid #fecaca', marginBottom: '1.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '1.3rem' }}>⚠️</span>
            <h3 style={{ margin: 0, color: '#b91c1c', fontSize: '1.15rem' }}>Missed Check-Out Alert!</h3>
          </div>
          <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem', color: '#7f1d1d', lineHeight: '1.5' }}>
            You forgot to check out on <strong>{stats.missedCheckout.date}</strong>. Please enter your check-out time and submit your daily work report for that day to complete your attendance.
          </p>
          <form onSubmit={handleManualCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Check-out Time:
              </label>
              <input 
                type="time" 
                required 
                value={manualTime}
                onChange={e => {
                  setManualTime(e.target.value);
                  setManualError('');
                }}
                style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                What did you work on on {stats.missedCheckout.date}?
              </label>
              <textarea
                value={manualSummary}
                onChange={e => {
                  setManualSummary(e.target.value);
                  setManualError('');
                }}
                placeholder="• Completed task A...&#10;• Fixed issue B...&#10;• Collaborated with team on C..."
                rows={4}
                maxLength={MAX_CHARS}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${manualSummary.length > MAX_CHARS ? '#ef4444' : 'var(--border-color)'}`,
                  background: 'var(--card-bg)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  lineHeight: '1.6',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '0.3rem',
                fontSize: '0.78rem',
                color: manualSummary.length < MIN_CHARS ? '#d97706' : '#10b981',
                fontWeight: 500
              }}>
                <span>
                  {manualSummary.length < MIN_CHARS 
                    ? `Min. ${MIN_CHARS} chars (${MIN_CHARS - manualSummary.length} more needed)` 
                    : `Requirement met ✓`}
                </span>
                <span>
                  {manualSummary.length} / {MAX_CHARS}
                </span>
              </div>
            </div>

            {manualError && (
              <div style={{
                padding: '0.6rem 0.9rem',
                background: '#fee2e2',
                color: '#b91c1c',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                border: '1px solid #fca5a5'
              }}>
                {manualError}
              </div>
            )}

            <div>
              <button 
                type="submit" 
                className="primary-btn" 
                disabled={submittingManual || manualSummary.length > MAX_CHARS}
                style={{ padding: '0.65rem 1.4rem' }}
              >
                {submittingManual ? 'Submitting...' : '✅ Submit Work Report & Check Out'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card card">
          <span className="stat-label">Working Days</span>
          <span className="stat-value text-success">{stats.attendanceCount || 0}</span>
        </div>
        <div className="stat-card card">
          <span className="stat-label">Attendance Count</span>
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

      {/* ══════════════════════════════════════════════════════════
          DAILY WORK REPORTS (TEAM OVERVIEW - VIEW ONLY)
      ══════════════════════════════════════════════════════════ */}
      <div style={{ marginTop: '2.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
              <span>📝</span> Daily Work Reports
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Team work summaries submitted upon check-out
            </p>
          </div>

          {/* Date filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--card-bg)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Date:</span>
            <input
              type="date"
              value={workReportDate}
              onChange={e => setWorkReportDate(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '0.825rem', color: 'var(--primary-color)', fontWeight: 600, cursor: 'pointer', background: 'transparent' }}
            />
          </div>
        </div>

        {loadingReports ? (
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Loading team reports...
          </div>
        ) : !workReportSummary ? null : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

            {/* Submitted reports */}
            {Array.isArray(workReportSummary.submitted) && workReportSummary.submitted.length > 0 && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1.25rem', background: 'var(--primary-color)', color: 'white', fontWeight: 600, fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={15} />
                  Submitted — {workReportSummary.submitted.length} employee{workReportSummary.submitted.length !== 1 ? 's' : ''}
                </div>
                <div>
                  {workReportSummary.submitted.map((entry, idx) => (
                    <div key={entry.id} style={{ borderBottom: idx < workReportSummary.submitted.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                      <div
                        onClick={() => setExpandedReport(expandedReport === entry.id ? null : entry.id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.85rem 1.25rem', cursor: 'pointer',
                          background: expandedReport === entry.id ? 'var(--bg-secondary)' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{entry.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{entry.employeeId}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {entry.checkOutTime ? format(new Date(entry.checkOutTime), 'hh:mm a') : '-'}
                          </span>
                          <span style={{
                            background: 'var(--badge-present-bg)', color: 'var(--badge-present-text)',
                            padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 600
                          }}>Submitted ✓</span>
                          {expandedReport === entry.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </div>
                      </div>

                      {/* Expandable summary */}
                      {expandedReport === entry.id && (
                        <div style={{
                          padding: '0 1.25rem 1rem 1.25rem',
                          background: 'var(--bg-secondary)',
                          borderTop: '1px solid var(--border-light)'
                        }}>
                          <p style={{ margin: '0.6rem 0 0.25rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Work Summary
                          </p>
                          <div style={{
                            background: 'var(--card-bg)', borderRadius: 'var(--radius-md)',
                            padding: '0.75rem 0.85rem', fontSize: '0.85rem', lineHeight: '1.6',
                            color: 'var(--text-main)', border: '1px solid var(--border-color)',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {entry.summary}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending employees */}
            {Array.isArray(workReportSummary.notSubmitted) && workReportSummary.notSubmitted.length > 0 && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1.25rem', background: '#f59e0b', color: 'white', fontWeight: 600, fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={15} />
                  Not Yet Submitted — {workReportSummary.notSubmitted.length} employee{workReportSummary.notSubmitted.length !== 1 ? 's' : ''}
                </div>
                <div style={{ padding: '0.25rem 0' }}>
                  {workReportSummary.notSubmitted.map((e, idx) => (
                    <div key={e.userId} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.75rem 1.25rem',
                      borderBottom: idx < workReportSummary.notSubmitted.length - 1 ? '1px solid var(--border-light)' : 'none'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>{e.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{e.employeeId}</div>
                      </div>
                      <span style={{
                        background: '#fef3c7', color: '#92400e',
                        padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 600,
                        border: '1px solid #fde68a'
                      }}>Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!Array.isArray(workReportSummary.submitted) || workReportSummary.submitted.length === 0) &&
              (!Array.isArray(workReportSummary.notSubmitted) || workReportSummary.notSubmitted.length === 0) && (
              <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No active employees found.
              </div>
            )}

            {Array.isArray(workReportSummary.submitted) && workReportSummary.submitted.length === 0 &&
              Array.isArray(workReportSummary.notSubmitted) && workReportSummary.notSubmitted.length > 0 && (
              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem' }}>
                No reports submitted on {workReportDate} yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
