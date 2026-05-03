import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HolidayCalendar } from '../../components/HolidayCalendar';

interface Holiday {
  id: string;
  date: string;
  name: string;
}

export const Holidays: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;
    fetch(`${import.meta.env.VITE_API_URL}/api/attendance/holidays`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setHolidays(data))
    .catch(console.error);
  }, [token]);

  return (
    <div className="content-scroll">
      <HolidayCalendar 
        holidays={holidays} 
        isAdmin={false} 
      />
      <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
        * Saturdays are standard weekly holidays.
      </p>
    </div>
  );
};
