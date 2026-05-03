import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';

export const Settings: React.FC = () => {
  const { token } = useAuth();
  
  const [settings, setSettings] = useState({
    officeLat: 27.7172,
    officeLng: 85.3240,
    allowedRadius: 100,
    qrCodePayload: 'officetrack-auth-123'
  });

  const fetchSettings = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/settings`, {
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
    await fetch(`${import.meta.env.VITE_API_URL}/api/admin/settings`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(settings),
    });
    alert('Settings saved successfully');
  };

  return (
    <div className="settings-container" style={{ display: 'flex', gap: '2rem' }}>
      <div className="card" style={{ flex: 1 }}>
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

      <div className="card" style={{ flex: 1, textAlign: 'center' }}>
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
  );
};
