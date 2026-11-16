import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { downloadExcel, downloadPDF } from '../../utils/exportUtils';
import { FileText, FileSpreadsheet, Download, ChevronDown, ChevronUp, CheckCircle, Clock } from 'lucide-react';

interface Record {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  isManualCheckout: boolean;
  user: {
    id: string;
    name: string;
    employeeId: string;
  };
}

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

export const Records: React.FC = () => {
  const [records, setRecords] = useState<Record[]>([]);
  const [filterDate, setFilterDate] = useState<string>('');
  const { token } = useAuth();

  // Work Reports state
  const [workReportDate, setWorkReportDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [workReportSummary, setWorkReportSummary] = useState<WorkReportSummary | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [downloadingReports, setDownloadingReports] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const fetchRecords = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/records`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setRecords(data);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchWorkReports = async (date: string) => {
    setLoadingReports(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/work-reports/admin-summary?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setWorkReportSummary(data);
    } catch (err) {
      console.error('Failed to fetch work reports', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchWorkReports(workReportDate);
  }, [workReportDate]);

  const handleDownloadReportsExcel = async () => {
    setDownloadingReports(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/work-reports/download-excel`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) { alert('Failed to download report'); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DailyWorkReports_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Error downloading report');
    } finally {
      setDownloadingReports(false);
    }
  };

  const handleDownload = (type: 'excel' | 'pdf') => {
    if (!records.length) return;

    // Prepare flat data for export
    const exportData = records.map(r => ({
      Date: r.date,
      Employee: r.user.name,
      'Employee ID': r.user.employeeId,
      'Check In': r.checkInTime ? format(new Date(r.checkInTime), 'hh:mm a') : '-',
      'Check Out': r.checkOutTime ? format(new Date(r.checkOutTime), 'hh:mm a') : '-',
      'Manual': r.isManualCheckout ? 'Yes' : 'No'
    }));

    if (type === 'excel') {
      downloadExcel(exportData, `Attendance_Records_${format(new Date(), 'yyyy-MM-dd')}`);
    } else {
      downloadPDF(exportData, `Attendance_Records_${format(new Date(), 'yyyy-MM-dd')}`, 'Attendance Records History');
    }
  };

  // Group records by date, then by user
  const grouped: { [key: string]: { [key: string]: { user: Record['user'], sessions: Record[] } } } = records.reduce((acc: any, rec) => {
    if (filterDate && rec.date !== filterDate) return acc;
    
    if (!acc[rec.date]) acc[rec.date] = {};
    if (!acc[rec.date][rec.user.id]) {
      acc[rec.date][rec.user.id] = {
        user: rec.user,
        sessions: []
      };
    }
    acc[rec.date][rec.user.id].sessions.push(rec);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="records-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2>Attendance Records</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Download Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => handleDownload('pdf')}
              className="icon-btn"
              title="Download PDF"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: 'var(--radius-md)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <FileText size={18} /> <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>PDF</span>
            </button>
            <button 
              onClick={() => handleDownload('excel')}
              className="icon-btn"
              title="Download Excel"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: 'var(--radius-md)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <FileSpreadsheet size={18} /> <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>EXCEL</span>
            </button>
          </div>

          {/* Date Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--card-bg)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Filter Date:</span>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{ 
                border: 'none', 
                outline: 'none', 
                fontSize: '0.875rem', 
                color: 'var(--primary-color)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            />
            {filterDate && (
              <button 
                onClick={() => setFilterDate('')}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {sortedDates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No records found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {sortedDates.map(date => (
            <div key={date} className="record-date-group">
              <div style={{ 
                background: 'var(--primary-color)', 
                color: 'white', 
                padding: '0.75rem 1.5rem', 
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                fontWeight: 600,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ opacity: 0.8 }}>Date:</span> {date}
              </div>
              <div className="card table-container" style={{ borderRadius: '0 0 var(--radius-md) var(--radius-md)', padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--table-header-bg)' }}>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'left', width: '30%' }}>Employee</th>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'left' }}>Sessions (Check In - Check Out)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(grouped[date]).map((group: any) => (
                      <tr key={group.user.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '1.25rem 1.5rem', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{group.user.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{group.user.employeeId}</div>
                        </td>
                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {group.sessions.sort((a: any, b: any) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime()).map((sess: any) => (
                              <div key={sess.id} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '1rem',
                                background: 'var(--session-box-bg)',
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                width: 'fit-content'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>IN:</span>
                                  <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                                    {sess.checkInTime ? format(new Date(sess.checkInTime), 'hh:mm a') : '-'}
                                  </span>
                                </div>
                                <div style={{ width: '1px', height: '12px', background: 'var(--session-divider)' }}></div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>OUT:</span>
                                  <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>
                                    {sess.checkOutTime ? format(new Date(sess.checkOutTime), 'hh:mm a') : 'Active'}
                                  </span>
                                </div>
                                {sess.isManualCheckout && (
                                  <span style={{ 
                                    fontSize: '0.65rem', 
                                    background: 'var(--manual-badge-bg)', 
                                    color: 'var(--manual-badge-text)', 
                                    padding: '0.125rem 0.375rem', 
                                    borderRadius: '4px',
                                    border: '1px solid var(--manual-badge-border)',
                                    fontWeight: 600
                                  }}>MANUAL</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          DAILY WORK REPORTS SECTION
      ══════════════════════════════════════════════════════════ */}
      <div style={{ marginTop: '3rem' }}>
        {/* Section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span>📝</span> Daily Work Reports
            </h2>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Employee end-of-day work summaries submitted during check-out.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Date picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--card-bg)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Date:</span>
              <input
                type="date"
                value={workReportDate}
                onChange={e => setWorkReportDate(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '0.875rem', color: 'var(--primary-color)', fontWeight: 600, cursor: 'pointer', background: 'transparent' }}
              />
            </div>

            {/* Download all reports */}
            <button
              onClick={handleDownloadReportsExcel}
              disabled={downloadingReports}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: '#10b981', color: 'white', border: 'none',
                padding: '0.55rem 1.1rem', borderRadius: 'var(--radius-md)',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
              }}
            >
              <Download size={16} />
              {downloadingReports ? 'Generating...' : 'Download All Reports (Excel)'}
            </button>
          </div>
        </div>

        {loadingReports ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Loading reports...
          </div>
        ) : !workReportSummary ? null : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Submitted reports */}
            {workReportSummary.submitted.length > 0 && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '0.85rem 1.5rem', background: 'var(--primary-color)', color: 'white', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} />
                  Submitted — {workReportSummary.submitted.length} employee{workReportSummary.submitted.length !== 1 ? 's' : ''}
                </div>
                <div>
                  {workReportSummary.submitted.map((entry, idx) => (
                    <div key={entry.id} style={{ borderBottom: idx < workReportSummary.submitted.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                      {/* Row header */}
                      <div
                        onClick={() => setExpandedReport(expandedReport === entry.id ? null : entry.id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '1rem 1.5rem', cursor: 'pointer',
                          background: expandedReport === entry.id ? 'var(--bg-secondary)' : 'transparent'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{entry.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{entry.employeeId}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Checked out at {format(new Date(entry.checkOutTime), 'hh:mm a')}
                          </span>
                          <span style={{
                            background: 'var(--badge-present-bg)', color: 'var(--badge-present-text)',
                            padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600
                          }}>Submitted ✓</span>
                          {expandedReport === entry.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {/* Expanded summary */}
                      {expandedReport === entry.id && (
                        <div style={{
                          padding: '0 1.5rem 1.25rem 1.5rem',
                          background: 'var(--bg-secondary)',
                          borderTop: '1px solid var(--border-light)'
                        }}>
                          <p style={{ margin: '0.75rem 0 0.3rem', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Work Summary
                          </p>
                          <div style={{
                            background: 'var(--card-bg)', borderRadius: 'var(--radius-md)',
                            padding: '0.9rem 1rem', fontSize: '0.9rem', lineHeight: '1.7',
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

            {/* Not-submitted employees */}
            {workReportSummary.notSubmitted.length > 0 && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '0.85rem 1.5rem', background: '#f59e0b', color: 'white', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} />
                  Not Yet Submitted — {workReportSummary.notSubmitted.length} employee{workReportSummary.notSubmitted.length !== 1 ? 's' : ''}
                </div>
                <div style={{ padding: '0.5rem 0' }}>
                  {workReportSummary.notSubmitted.map((e, idx) => (
                    <div key={e.userId} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.85rem 1.5rem',
                      borderBottom: idx < workReportSummary.notSubmitted.length - 1 ? '1px solid var(--border-light)' : 'none'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{e.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.employeeId}</div>
                      </div>
                      <span style={{
                        background: '#fef3c7', color: '#92400e',
                        padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
                        border: '1px solid #fde68a'
                      }}>Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {workReportSummary.submitted.length === 0 && workReportSummary.notSubmitted.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                No active employees found.
              </div>
            )}

            {workReportSummary.submitted.length === 0 && workReportSummary.notSubmitted.length > 0 && workReportSummary.submitted.length === 0 && (
              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem' }}>
                No reports submitted on {workReportDate} yet.
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
