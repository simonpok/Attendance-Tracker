import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';

export const CheckIn: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        err => {
          setError('Location access denied. Please allow location to check in.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const startScanner = () => {
    if (!location) {
      setError('Waiting for location data...');
      return;
    }
    
    setIsScanning(true);
    setError('');
    
    // Tiny timeout to let the DOM render the element
    setTimeout(() => {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      
      scannerRef.current.render(onScanSuccess, onScanFailure);
    }, 100);
  };

  const onScanSuccess = async (decodedText: string) => {
    if (scannerRef.current) {
      await scannerRef.current.clear();
      setIsScanning(false);
    }

    try {
      // First try to check in
      let res = await fetch(`${import.meta.env.VITE_API_URL}/api/attendance/check-in`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          lat: location?.lat, 
          lng: location?.lng, 
          qrPayload: decodedText 
        })
      });

      let data = await res.json();

      if (res.ok) {
        setSuccessMsg('Checked IN successfully!');
        setTimeout(() => navigate('/employee'), 2000);
        return;
      }

      // If already checked in today, try to check out
      if (data.error === 'Already checked in today') {
        res = await fetch(`${import.meta.env.VITE_API_URL}/api/attendance/check-out`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ 
            lat: location?.lat, 
            lng: location?.lng, 
            qrPayload: decodedText 
          })
        });

        data = await res.json();

        if (res.ok) {
          setSuccessMsg('Checked OUT successfully!');
          setTimeout(() => navigate('/employee'), 2000);
        } else {
          setError(data.error || 'Check-out failed');
        }
      } else {
        setError(data.error || 'Check-in failed');
      }

    } catch (err) {
      setError('Network error');
    }
  };

  const onScanFailure = (err: any) => {
    // ignore frequent scan failures
  };

  return (
    <div className="content-scroll">
      <h2>Check In / Out</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        You must be at the office location to scan the QR code.
      </p>

      {error && <div className="error-message">{error}</div>}
      {successMsg && <div className="error-message" style={{ background: '#dcfce7', color: 'var(--accent-color)' }}>{successMsg}</div>}

      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <strong>Location Status: </strong> 
          {location ? <span className="text-success">Acquired ✅</span> : <span className="text-danger">Waiting... ⏳</span>}
        </div>

        {!isScanning ? (
          <button 
            className="primary-btn" 
            onClick={startScanner}
            disabled={!location || !!successMsg}
            style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}
          >
            Start Scanner
          </button>
        ) : (
          <div>
            <div id="qr-reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}></div>
            <button 
              onClick={() => {
                scannerRef.current?.clear();
                setIsScanning(false);
              }}
              style={{ marginTop: '1rem', color: 'var(--danger-color)', textDecoration: 'underline' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
