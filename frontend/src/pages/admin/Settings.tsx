import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Mail, 
  Download, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Eye, 
  EyeOff, 
  Save, 
  Server,
  FileSpreadsheet
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { token } = useAuth();
  
  // Location & QR Settings
  const [locationSettings, setLocationSettings] = useState({
    officeLat: 27.7172,
    officeLng: 85.3240,
    allowedRadius: 100,
    qrCodePayload: 'officetrack-auth-123'
  });

  // Email Configuration Settings (stored in database)
  const [emailConfig, setEmailConfig] = useState({
    smtpHost: 'smtp.titan.email',
    smtpPort: 465,
    smtpUser: 'info@corewalkers.com',
    smtpPass: '',
    reportRecipient: 'info@corewalkers.com',
    reportBcc: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Month Selection for Test & Download
  const getLastMonthStr = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const [testMonth, setTestMonth] = useState(getLastMonthStr());
  const [sendingTest, setSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [downloading, setDownloading] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data) {
        setLocationSettings({
          officeLat: data.officeLat ?? 27.7172,
          officeLng: data.officeLng ?? 85.3240,
          allowedRadius: data.allowedRadius ?? 100,
          qrCodePayload: data.qrCodePayload ?? 'officetrack-auth-123'
        });

        setEmailConfig({
          smtpHost: data.smtpHost || 'smtp.titan.email',
          smtpPort: data.smtpPort || 465,
          smtpUser: data.smtpUser || 'info@corewalkers.com',
          smtpPass: data.smtpPass || '',
          reportRecipient: data.reportRecipient || 'info@corewalkers.com',
          reportBcc: data.reportBcc || ''
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save Email Automation Settings to Database
  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setSaveStatus(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/settings`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(emailConfig),
      });

      if (res.ok) {
        setSaveStatus({
          type: 'success',
          message: 'Email & Report Automation settings saved successfully!'
        });
        setTimeout(() => setSaveStatus(null), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveStatus({
          type: 'error',
          message: err.error || 'Failed to save email settings'
        });
      }
    } catch (err: any) {
      setSaveStatus({
        type: 'error',
        message: err.message || 'Network error while saving settings'
      });
    } finally {
      setSavingConfig(false);
    }
  };

  // Save Office Location Settings
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/settings`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(locationSettings),
      });
      if (res.ok) {
        alert('Office location settings saved successfully');
      } else {
        alert('Failed to save location settings');
      }
    } catch (err) {
      alert('Network error while saving location settings');
    }
  };

  // Immediate Test Email Sender
  const handleSendTestEmail = async () => {
    setSendingTest(true);
    setTestStatus(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/reports/send-monthly-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          month: testMonth,
          recipient: emailConfig.reportRecipient,
          bcc: emailConfig.reportBcc
        })
      });

      const data = await res.json();
      if (res.ok) {
        setTestStatus({
          type: 'success',
          message: `Report sent immediately to ${data.recipient}${data.bcc?.length ? ` (BCC: ${Array.isArray(data.bcc) ? data.bcc.join(', ') : data.bcc})` : ''}!`
        });
      } else {
        setTestStatus({
          type: 'error',
          message: data.error || 'Failed to send report. Please verify email and password.'
        });
      }
    } catch (err: any) {
      setTestStatus({
        type: 'error',
        message: err.message || 'Network error while sending test email.'
      });
    } finally {
      setSendingTest(false);
    }
  };

  // Download Multi-Tab Excel directly in browser
  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/reports/download-monthly-excel?month=${testMonth}`, {
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
      a.download = `Attendance_Report_${testMonth}.xlsx`;
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
      
      {/* 1. Email & Monthly Report Automation Card */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ 
            width: '44px', 
            height: '44px', 
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
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Monthly Report Email Automation</h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Configure sender, recipients, and BCCs directly from here. Automatically sent at the end of every month.
            </p>
          </div>
        </div>

        {/* Schedule & Sheet Explanation Badge */}
        <div style={{ 
          background: 'var(--bg-secondary)', 
          padding: '1.25rem', 
          borderRadius: 'var(--radius-md)', 
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          color: 'var(--text-main)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--primary-color)' }}>
            <Clock size={18} /> Automatic Schedule: 1st of every month at 12:00 AM (Asia/Kathmandu)
          </div>
          <div style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              Attached Excel File Structure (2 Tabs):
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              <li>
                <strong>Tab 1 (Month Attendance):</strong> Total present days count and absent days count for every employee for that month.
              </li>
              <li>
                <strong>Tab 2 (Overall All-Time to Date):</strong> All attendance details from each employee's start/join date up to that date overall (Overall Working Days, All-Time Present Days, All-Time Absent Days, Total Hours, and Daily Average Time).
              </li>
            </ul>
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSaveEmailConfig}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            
            <div className="input-group">
              <label style={{ fontWeight: 600 }}>Sender Email</label>
              <input 
                type="email" 
                value={emailConfig.smtpUser} 
                onChange={e => setEmailConfig({ ...emailConfig, smtpUser: e.target.value })}
                placeholder="info@corewalkers.com"
                required
                style={{ width: '100%' }}
              />
            </div>

            <div className="input-group">
              <label style={{ fontWeight: 600 }}>Sender Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={emailConfig.smtpPass} 
                  onChange={e => setEmailConfig({ ...emailConfig, smtpPass: e.target.value })}
                  placeholder="Enter email account password"
                  style={{ width: '100%', paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label style={{ fontWeight: 600 }}>Primary Recipient Email</label>
              <input 
                type="email" 
                value={emailConfig.reportRecipient} 
                onChange={e => setEmailConfig({ ...emailConfig, reportRecipient: e.target.value })}
                placeholder="e.g. info@corewalkers.com"
                required
                style={{ width: '100%' }}
              />
            </div>

            <div className="input-group">
              <label style={{ fontWeight: 600 }}>BCC Emails (comma-separated)</label>
              <input 
                type="text" 
                value={emailConfig.reportBcc} 
                onChange={e => setEmailConfig({ ...emailConfig, reportBcc: e.target.value })}
                placeholder="e.g. roshan@corewalkers.com, admin@corewalkers.com"
                style={{ width: '100%' }}
              />
            </div>

            <div className="input-group">
              <label style={{ fontWeight: 600 }}>SMTP Server Host</label>
              <input 
                type="text" 
                value={emailConfig.smtpHost} 
                onChange={e => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })}
                placeholder="smtp.titan.email"
                style={{ width: '100%' }}
              />
            </div>

            <div className="input-group">
              <label style={{ fontWeight: 600 }}>SMTP Port</label>
              <input 
                type="number" 
                value={emailConfig.smtpPort} 
                onChange={e => setEmailConfig({ ...emailConfig, smtpPort: parseInt(e.target.value, 10) || 465 })}
                placeholder="465"
                style={{ width: '100%' }}
              />
            </div>

          </div>

          {saveStatus && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              background: saveStatus.type === 'success' ? 'var(--badge-present-bg)' : '#fef2f2',
              color: saveStatus.type === 'success' ? 'var(--badge-present-text)' : '#ef4444',
              border: saveStatus.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca'
            }}>
              {saveStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{saveStatus.message}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
            <button 
              type="submit" 
              className="primary-btn" 
              disabled={savingConfig}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
            >
              <Save size={18} />
              {savingConfig ? 'Saving Settings...' : 'Save Email Settings'}
            </button>
          </div>
        </form>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

        {/* Immediate Test & On-Demand Report Section */}
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Send Test Email or Download Excel Report</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Choose any month to immediately test sending the email or download the 2-tab Excel report.
          </p>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Target Month:</label>
              <input 
                type="month" 
                value={testMonth} 
                onChange={e => setTestMonth(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
              />
            </div>

            <button 
              type="button" 
              className="primary-btn" 
              onClick={handleSendTestEmail} 
              disabled={sendingTest}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0284c7' }}
            >
              <Send size={16} />
              {sendingTest ? 'Sending Test Email...' : 'Send Test Email Now'}
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

          {testStatus && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              background: testStatus.type === 'success' ? 'var(--badge-present-bg)' : '#fef2f2',
              color: testStatus.type === 'success' ? 'var(--badge-present-text)' : '#ef4444',
              border: testStatus.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca'
            }}>
              {testStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{testStatus.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Office Location & QR Code Section */}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1 1 350px' }}>
          <h2>Office Location Settings</h2>
          <form onSubmit={handleSaveLocation} style={{ marginTop: '1.5rem' }}>
            <div className="input-group">
              <label>Office Latitude</label>
              <input 
                type="number" 
                step="any"
                value={locationSettings.officeLat} 
                onChange={e => setLocationSettings({...locationSettings, officeLat: parseFloat(e.target.value)})} 
              />
            </div>
            <div className="input-group">
              <label>Office Longitude</label>
              <input 
                type="number" 
                step="any"
                value={locationSettings.officeLng} 
                onChange={e => setLocationSettings({...locationSettings, officeLng: parseFloat(e.target.value)})} 
              />
            </div>
            <div className="input-group">
              <label>Allowed Radius (meters)</label>
              <input 
                type="number" 
                value={locationSettings.allowedRadius} 
                onChange={e => setLocationSettings({...locationSettings, allowedRadius: parseInt(e.target.value)})} 
              />
            </div>
            <div className="input-group">
              <label>QR Code Payload</label>
              <input 
                type="text" 
                value={locationSettings.qrCodePayload} 
                onChange={e => setLocationSettings({...locationSettings, qrCodePayload: e.target.value})} 
              />
            </div>
            <button type="submit" className="primary-btn">Save Location Settings</button>
          </form>
        </div>

        <div className="card" style={{ flex: '1 1 350px', textAlign: 'center' }}>
          <h2>Office QR Code</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Print this QR code and paste it on the wall for employees to scan.
          </p>
          <div style={{ background: '#fff', padding: '1rem', display: 'inline-block', border: '1px solid #e2e8f0' }}>
            <QRCodeSVG value={locationSettings.qrCodePayload} size={256} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <button className="primary-btn" onClick={() => window.print()}>Print QR Code</button>
          </div>
        </div>
      </div>

    </div>
  );
};
