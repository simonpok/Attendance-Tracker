import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HolidayCalendar } from '../../components/HolidayCalendar';
import { DeleteModal } from '../../components/DeleteModal';

interface Holiday {
  id: string;
  date: string;
  name: string;
  type?: string;
}

export const Holidays: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);
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

  const handleAdd = async (date: string, name: string, type: string) => {
    await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/holidays`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ date, name, type }),
    });
    fetchHolidays();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/holidays/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeleteTarget(null);
      fetchHolidays();
    } catch (error) {
      console.error('Delete failed', error);
      alert('Failed to delete');
    }
  };

  const handleDelete = (id: string) => {
    const item = holidays.find(h => h.id === id);
    if (item) setDeleteTarget(item);
  };

  return (
    <div className="holidays-page">
      <HolidayCalendar 
        holidays={holidays} 
        isAdmin={true} 
        onAddHoliday={handleAdd} 
        onDeleteHoliday={handleDelete} 
      />

      <DeleteModal 
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        itemName={deleteTarget?.name || ''}
        itemType={deleteTarget?.type || 'Holiday'}
      />
    </div>
  );
};

