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

  const fetchHolidays = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/attendance/holidays`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setHolidays(data);
  };

  useEffect(() => {
    if (token) {
      fetchHolidays();
    }
  }, [token]);

  const handleAdd = async (date: string, name: string) => {
    await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/holidays`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ date, name }),
    });
    fetchHolidays();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this holiday?')) {
      await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/holidays/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchHolidays();
    }
  };

  return (
    <div className="holidays-page">
      <HolidayCalendar 
        holidays={holidays} 
        isAdmin={true} 
        onAddHoliday={handleAdd} 
        onDeleteHoliday={handleDelete} 
      />
    </div>
  );
};

