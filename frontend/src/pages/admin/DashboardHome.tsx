import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

interface Employee {
  id: string;
  name: string;
  employeeId: string;
}

interface Record {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  isManualCheckout: boolean;
  user: Employee;
}

export const DashboardHome: React.FC = () => {
  const [records, setRecords] = useState<Record[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filterDate, setFilterDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const { token } = useAuth();

  const fetchData = async () => {
    try {
      const [recordsRes, employeesRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/records`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/employees`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      const recordsData = await recordsRes.json();
      const employeesData = await employeesRes.json();
      
      setRecords(recordsData);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  // If filtered, we want to show the filtered date even if no records exist
  const displayDates = filterDate ? [filterDate] : sortedDates;

  return (
    <div className="dashboard-home">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2>Daily Attendance Summary</h2>
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
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {displayDates.map(date => {
          const dateRecords = grouped[date] || {};
          const checkedInUserIds = new Set(Object.keys(dateRecords));
          const haventCheckedIn = employees.filter(emp => !checkedInUserIds.has(emp.id));

          return (
            <div key={date} className="record-date-group">
              <div style={{ 
                background: 'var(--primary-color)', 
                color: 'white', 
                padding: '0.75rem 1.5rem', 
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                fontWeight: 600,
                fontSize: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div><span style={{ opacity: 0.8 }}>Date:</span> {date}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  {checkedInUserIds.size} Present | {haventCheckedIn.length} Absent
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: '#e2e8f0', border: '1px solid #e2e8f0', borderRadius: '0 0 var(--radius-md) var(--radius-md)', overflow: 'hidden' }}>
                {/* Left Column: Checked In */}
                <div style={{ background: 'white', padding: '1.5rem', minHeight: '300px' }}>
                  <h3 style={{ marginBottom: '1.25rem', color: '#10b981', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                    Checked In ({checkedInUserIds.size})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {Object.values(dateRecords).map((group: any) => (
                      <div key={group.user.id} style={{ padding: '1rem', border: '1px solid #f1f5f9', borderRadius: 'var(--radius-md)', background: '#fcfcfc' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{group.user.name}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {group.sessions.sort((a: any, b: any) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime()).map((sess: any) => (
                            <div key={sess.id} style={{ 
                              fontSize: '0.7rem', 
                              background: '#f0fdf4', 
                              border: '1px solid #dcfce7',
                              color: '#166534',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontWeight: 500
                            }}>
                              {sess.checkInTime ? format(new Date(sess.checkInTime), 'hh:mm a') : '-'} - {sess.checkOutTime ? format(new Date(sess.checkOutTime), 'hh:mm a') : '...'}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {checkedInUserIds.size === 0 && (
                      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        No attendance recorded for this date.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Haven't Checked In */}
                <div style={{ background: '#f8fafc', padding: '1.5rem', minHeight: '300px' }}>
                  <h3 style={{ marginBottom: '1.25rem', color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div>
                    Haven't Checked In ({haventCheckedIn.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {haventCheckedIn.map(emp => (
                      <div key={emp.id} style={{ 
                        padding: '0.75rem 1rem', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: 'var(--radius-md)', 
                        background: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{emp.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{emp.employeeId}</div>
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ef4444', opacity: 0.7 }}>ABSENT</div>
                      </div>
                    ))}
                    {haventCheckedIn.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Everyone checked in! 🎉
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
