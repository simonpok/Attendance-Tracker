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
  const [isDragging, setIsDragging] = useState(false);
  const [draggedUserId, setDraggedUserId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [editForm, setEditForm] = useState({ checkIn: '', checkOut: '' });
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

  const handleDragStart = (e: React.DragEvent, userId: string) => {
    console.log('Drag Start:', userId);
    setDraggedUserId(userId);
    e.dataTransfer.setData('text/plain', userId); // Fallback
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    console.log('Drag End');
    setIsDragging(false);
    setDraggedUserId(null);
  };

  const handleDrop = async (e: React.DragEvent, type: 'PRESENT' | 'ABSENT', date: string) => {
    e.preventDefault();
    setIsDragging(false);
    const userId = draggedUserId || e.dataTransfer.getData('text/plain');
    console.log('Drop:', { userId, type, date });
    if (!userId) {
      console.warn('Drop failed: No userId found in state or dataTransfer');
      return;
    }
    setDraggedUserId(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/records/mark-attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, date, type })
      });
      
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update attendance');
      }
    } catch (error) {
      console.error('Drop failed', error);
    }
  };

  const handleEditClick = (record: Record) => {
    setEditingRecord(record);
    setEditForm({
      checkIn: record.checkInTime ? format(new Date(record.checkInTime), 'HH:mm') : '',
      checkOut: record.checkOutTime ? format(new Date(record.checkOutTime), 'HH:mm') : ''
    });
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    console.log('Updating record:', { id: editingRecord.id, form: editForm });

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/attendance-records-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: editingRecord.id,
          checkInTime: editForm.checkIn,
          checkOutTime: editForm.checkOut || null
        })
      });

      if (res.ok) {
        console.log('Update successful');
        setEditingRecord(null);
        fetchData();
      } else {
        const err = await res.json();
        console.error('Update failed:', err);
        alert(err.error || 'Failed to update record');
      }
    } catch (error) {
      console.error('Update fetch error:', error);
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
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => handleDrop(e, 'PRESENT', date)}
                  style={{ 
                    background: 'white', 
                    padding: '1.5rem', 
                    minHeight: '300px',
                    transition: 'all 0.2s ease',
                    outline: isDragging ? '2px dashed #10b981' : 'none',
                    outlineOffset: '-4px'
                  }}
                >
                  <h3 style={{ marginBottom: '1.25rem', color: '#10b981', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                    Checked In ({checkedInUserIds.size})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {Object.values(dateRecords).map((group: any) => (
                      <div 
                        key={group.user.id} 
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, group.user.id)}
                        onDragEnd={handleDragEnd}
                        style={{ 
                          padding: '1rem', 
                          border: '1px solid #f1f5f9', 
                          borderRadius: 'var(--radius-md)', 
                          background: '#fcfcfc',
                          cursor: 'grab',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{group.user.name}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {group.sessions.sort((a: any, b: any) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime()).map((sess: any) => (
                            <div 
                              key={sess.id} 
                              onClick={() => handleEditClick(sess)}
                              title="Click to edit times"
                              style={{ 
                                fontSize: '0.7rem', 
                                background: '#f0fdf4', 
                                border: '1px solid #dcfce7',
                                color: '#166534',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'transform 0.1s ease'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
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
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => handleDrop(e, 'ABSENT', date)}
                  style={{ 
                    background: '#f8fafc', 
                    padding: '1.5rem', 
                    minHeight: '300px',
                    transition: 'all 0.2s ease',
                    outline: isDragging ? '2px dashed #ef4444' : 'none',
                    outlineOffset: '-4px'
                  }}
                >
                  <h3 style={{ marginBottom: '1.25rem', color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div>
                    Haven't Checked In ({haventCheckedIn.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {haventCheckedIn.map(emp => (
                      <div 
                        key={emp.id} 
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, emp.id)}
                        onDragEnd={handleDragEnd}
                        style={{ 
                          padding: '0.75rem 1rem', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: 'var(--radius-md)', 
                          background: 'white',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'grab',
                          userSelect: 'none'
                        }}
                      >
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

      {/* Edit Modal */}
      {editingRecord && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Edit Attendance</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Employee: <strong>{editingRecord.user.name}</strong><br/>
              Date: <strong>{editingRecord.date}</strong>
            </p>
            
            <form onSubmit={handleUpdateRecord}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Check-in Time</label>
                <input 
                  type="time" 
                  value={editForm.checkIn}
                  onChange={(e) => setEditForm({...editForm, checkIn: e.target.value})}
                  required
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)' }}
                />
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Check-out Time</label>
                <input 
                  type="time" 
                  value={editForm.checkOut}
                  onChange={(e) => setEditForm({...editForm, checkOut: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Leave empty for active session</span>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setEditingRecord(null)}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
