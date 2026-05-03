import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { downloadExcel, downloadPDF } from '../../utils/exportUtils';
import { FileText, FileSpreadsheet } from 'lucide-react';

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

export const Records: React.FC = () => {
  const [records, setRecords] = useState<Record[]>([]);
  const [filterDate, setFilterDate] = useState<string>('');
  const { token } = useAuth();

  const fetchRecords = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/records`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setRecords(data);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleDownload = (type: 'xml' | 'pdf') => {
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
  const grouped = records.reduce((acc: any, rec) => {
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
              style={{ background: 'white', border: '1px solid #e2e8f0', padding: '0.5rem', borderRadius: 'var(--radius-md)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <FileText size={18} /> <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>PDF</span>
            </button>
            <button 
              onClick={() => handleDownload('excel')}
              className="icon-btn"
              title="Download Excel"
              style={{ background: 'white', border: '1px solid #e2e8f0', padding: '0.5rem', borderRadius: 'var(--radius-md)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <FileSpreadsheet size={18} /> <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>EXCEL</span>
            </button>
          </div>

          {/* Date Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
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
              <div className="card" style={{ borderRadius: '0 0 var(--radius-md) var(--radius-md)', padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'left', width: '30%' }}>Employee</th>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'left' }}>Sessions (Check In - Check Out)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(grouped[date]).map((group: any) => (
                      <tr key={group.user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
                                background: '#f8fafc',
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #e2e8f0',
                                width: 'fit-content'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>IN:</span>
                                  <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                                    {sess.checkInTime ? format(new Date(sess.checkInTime), 'hh:mm a') : '-'}
                                  </span>
                                </div>
                                <div style={{ width: '1px', height: '12px', background: '#cbd5e1' }}></div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>OUT:</span>
                                  <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>
                                    {sess.checkOutTime ? format(new Date(sess.checkOutTime), 'hh:mm a') : 'Active'}
                                  </span>
                                </div>
                                {sess.isManualCheckout && (
                                  <span style={{ 
                                    fontSize: '0.65rem', 
                                    background: '#fff7ed', 
                                    color: '#c2410c', 
                                    padding: '0.125rem 0.375rem', 
                                    borderRadius: '4px',
                                    border: '1px solid #ffedd5',
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
    </div>
  );
};
