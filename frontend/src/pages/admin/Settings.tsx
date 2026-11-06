import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { Mail, Download, Send, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export const Settings: React.FC = () => {
  const { token } = useAuth();
  
  const [settings, setSettings] = useState({
    officeLat: 27.7172,
    officeLng: 85.3240,
    allowedRadius: 100,
    qrCodePayload: 'officetrack-auth-123'
  });

  // Monthly Report states
  const getCurrentMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const [reportMonth, setReportMonth] = useState(getCurrentMonthStr());
  const [recipientEmail, setRecipientEmail] = useState('info@corewalkers.com');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [downloading, setDownloading] = useState(false);

  const fetchSettings = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data) setSettings(data);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/settings`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(settings),
    });
    alert('Settings saved successfully');
  };

  const handleSendTestEmail = async () => {
    setSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/reports/send-monthly-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          month: reportMonth,
          recipient: recipientEmail
        })
      });

      const data = await res.json();
      if (res.ok) {
        setEmailStatus({
          type: 'success',
          message: `Monthly report email sent successfully to ${recipientEmail}!`
        });
      } else {
        setEmailStatus({
          type: 'error',
          message: data.error || 'Failed to send email. Check SMTP settings.'
        });
      }
    } catch (err: any) {
      setEmailStatus({
        type: 'error',
        message: err.message || 'Network error while triggering email.'
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/reports/download-monthly-excel?month=${reportMonth}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to generate Excel report');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Attendance_Report_${reportMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Error downloading Excel report');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="settings-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Monthly Report Email Automation Card */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '50%', 
            background: 'var(--bg-secondary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--primary-color)'
          }}>
            <Mail size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Monthly Attendance Email Automation</h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Automatically emails an organized multi-tab Excel spreadsheet at the end of every month.
            </p>
          </div>
        </div>

        <div style={{ 
          background: 'var(--bg-secondary)', 
          padding: '1rem', 
          borderRadius: 'var(--radius-md)', 
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          color: 'var(--text-main)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <Clock size={16} /> Schedule: 1st of every month at 12:00 AM (Asia/Kathmandu)
          </div>
          <div style={{ color: 'var(--text-muted)' }}>
            <strong>Organized Sheets in Attached Excel:</strong>
            <ul style={{ margin: '0.25rem 0 0 1.25rem' }}>
              <li><strong>Tab 1 (Attendance Summary):</strong> Employee ID, Name, Total Present Days Count, and Absent Days Count.</li>
              <li><strong>Tab 2 (Presence & Duration):</strong> Total Present Count, Absent Count, Total Presence Hours, and Daily Average Time.</li>
            </ul>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="input-group">
            <label>Select Month</label>
            <input 
              type="month" 
              value={reportMonth} 
              onChange={e => setReportMonth(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div className="input-group">
            <label>Recipient Email</label>
            <input 
              type="email" 
              value={recipientEmail} 
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="e.g. info@corewalkers.com"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {emailStatus && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            background: emailStatus.type === 'success' ? 'var(--badge-present-bg)' : '#fef2f2',
            color: emailStatus.type === 'success' ? 'var(--badge-present-text)' : '#ef4444',
            border: emailStatus.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca'
          }}>
            {emailStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{emailStatus.message}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="primary-btn" 
            onClick={handleSendTestEmail} 
            disabled={sendingEmail}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Send size={16} />
            {sendingEmail ? 'Sending Email...' : 'Send Test Email Now'}
          </button>

          <button 
            type="button" 
            className="btn-secondary" 
            onClick={handleDownloadExcel} 
            disabled={downloading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Download size={16} />
            {downloading ? 'Generating...' : 'Download Excel Sheet (2 Tabs)'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1 1 350px' }}>
          <h2>Office Location Settings</h2>
          <form onSubmit={handleSave} style={{ marginTop: '1.5rem' }}>
            <div className="input-group">
              <label>Office Latitude</label>
              <input 
                type="number" 
                step="any"
                value={settings.officeLat} 
                onChange={e => setSettings({...settings, officeLat: parseFloat(e.target.value)})} 
              />
            </div>
            <div className="input-group">
              <label>Office Longitude</label>
              <input 
                type="number" 
                step="any"
                value={settings.officeLng} 
                onChange={e => setSettings({...settings, officeLng: parseFloat(e.target.value)})} 
              />
            </div>
            <div className="input-group">
              <label>Allowed Radius (meters)</label>
              <input 
                type="number" 
                value={settings.allowedRadius} 
                onChange={e => setSettings({...settings, allowedRadius: parseInt(e.target.value)})} 
              />
            </div>
            <div className="input-group">
              <label>QR Code Payload</label>
              <input 
                type="text" 
                value={settings.qrCodePayload} 
                onChange={e => setSettings({...settings, qrCodePayload: e.target.value})} 
              />
            </div>
            <button type="submit" className="primary-btn">Save Settings</button>
          </form>
        </div>

        <div className="card" style={{ flex: '1 1 350px', textAlign: 'center' }}>
          <h2>Office QR Code</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Print this QR code and paste it on the wall for employees to scan.
          </p>
          <div style={{ background: '#fff', padding: '1rem', display: 'inline-block', border: '1px solid #e2e8f0' }}>
            <QRCodeSVG value={settings.qrCodePayload} size={256} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <button className="primary-btn" onClick={() => window.print()}>Print QR Code</button>
          </div>
        </div>
      </div>
    </div>
  );
};
