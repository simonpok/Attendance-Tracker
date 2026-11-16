import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';

const MAX_CHARS = 500;
const MIN_CHARS = 250;

export const CheckIn: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Work report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSummary, setReportSummary] = useState('');
  const [pendingCheckout, setPendingCheckout] = useState<{ qrPayload: string; lat: number; lng: number } | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        _err => {
          setError('Location access denied. Please allow location to check in.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    if (!location) {
      setError('Waiting for location data...');
      return;
    }
    
    setIsScanning(true);
    setError('');
    
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        await html5QrCode.start(
          { facingMode: "environment" }, 
          config, 
          onScanSuccess, 
          onScanFailure
        );
      } catch (err: any) {
        console.error('Camera start error:', err);
        setError('Could not start camera. Please ensure camera permissions are granted.');
        setIsScanning(false);
      }
    }, 100);
  };

  const onScanSuccess = async (decodedText: string) => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
      setIsScanning(false);
    }

    try {
      // First try to check in
      let res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/attendance/check-in`, {
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
        res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/attendance/check-out`, {
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
          // Check if the backend wants us to show the work report modal
          if (data.requiresWorkReport) {
            setPendingCheckout({ qrPayload: decodedText, lat: location!.lat, lng: location!.lng });
            setShowReportModal(true);
            return;
          }
          // Second checkout of the day — no report needed
          setSuccessMsg('Checked OUT successfully!');
          setTimeout(() => navigate('/employee'), 2000);
        } else {
          setError(data.error || 'Check-out failed');
        }
      } else {
        setError(data.error || 'Check-in failed');
      }

    } catch (_err) {
      setError('Network error');
    }
  };

  const onScanFailure = (_err: any) => {
    // ignore frequent scan failures
  };

  // Submit daily work report (which also completes checkout)
  const handleReportSubmit = async () => {
    if (!reportSummary.trim() || reportSummary.trim().length < MIN_CHARS) {
      setReportError("Come on! At least 250 characters of work. If nothing else, just go 'blah blah blah'");
      return;
    }
    if (reportSummary.length > MAX_CHARS) {
      setReportError(`Summary must not exceed ${MAX_CHARS} characters.`);
      return;
    }
    if (!pendingCheckout) return;

    setSubmittingReport(true);
    setReportError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/work-reports/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          summary: reportSummary,
          qrPayload: pendingCheckout.qrPayload,
          lat: pendingCheckout.lat,
          lng: pendingCheckout.lng
        })
      });

      const data = await res.json();

      if (res.ok) {
        setShowReportModal(false);
        setReportSummary('');
        setPendingCheckout(null);
        setSuccessMsg('Report submitted & Checked OUT successfully! 🎉');
        setTimeout(() => navigate('/employee'), 2500);
      } else {
        setReportError(data.error || 'Failed to submit report. Please try again.');
      }
    } catch (_err) {
      setReportError('Network error. Please try again.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const charsLeft = MAX_CHARS - reportSummary.length;
  const charsUsed = reportSummary.length;

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
              onClick={async () => {
                if (scannerRef.current && scannerRef.current.isScanning) {
                  await scannerRef.current.stop();
                }
                setIsScanning(false);
              }}
              style={{ marginTop: '1rem', color: 'var(--danger-color)', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* ── Daily Work Report Modal ────────────────────────────── */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Header */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.4rem' }}>📝</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>
                  Daily Work Report
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                What have you worked on today? Please summarize before checking out.
              </p>
            </div>

            {/* Text area */}
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <textarea
                autoFocus
                value={reportSummary}
                onChange={e => {
                  setReportSummary(e.target.value);
                  setReportError('');
                }}
                placeholder="• Completed the login page UI&#10;• Fixed bug in attendance API&#10;• Reviewed pull requests..."
                rows={6}
                maxLength={MAX_CHARS}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${charsLeft < 0 ? '#ef4444' : 'var(--border-color)'}`,
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  lineHeight: '1.6',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
              {/* Character counter */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '0.3rem',
                fontSize: '0.78rem',
                color: charsUsed < MIN_CHARS ? '#f59e0b' : '#10b981',
                fontWeight: 500
              }}>
                <span>
                  {charsUsed < MIN_CHARS 
                    ? `Min. ${MIN_CHARS} chars (${MIN_CHARS - charsUsed} more needed)` 
                    : `Requirement met ✓`}
                </span>
                <span>
                  {charsUsed} / {MAX_CHARS}
                </span>
              </div>
            </div>

            {/* Error */}
            {reportError && (
              <div style={{
                padding: '0.6rem 0.9rem',
                background: '#fef2f2',
                color: '#ef4444',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                border: '1px solid #fecaca'
              }}>
                {reportError}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleReportSubmit}
                disabled={submittingReport || reportSummary.length > MAX_CHARS}
                className="primary-btn"
                style={{ minWidth: '160px' }}
              >
                {submittingReport ? 'Submitting...' : '✅ Submit & Check Out'}
              </button>
            </div>

            <p style={{
              margin: '1rem 0 0',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              textAlign: 'center'
            }}>
              You must submit your daily report to complete check-out.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
