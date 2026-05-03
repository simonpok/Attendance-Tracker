import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSaturday, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';

interface Holiday {
  id: string;
  date: string;
  name: string;
}

interface HolidayCalendarProps {
  holidays: Holiday[];
  isAdmin: boolean;
  onAddHoliday?: (date: string, name: string) => Promise<void>;
  onDeleteHoliday?: (id: string) => Promise<void>;
}

export const HolidayCalendar: React.FC<HolidayCalendarProps> = ({ 
  holidays, 
  isAdmin, 
  onAddHoliday, 
  onDeleteHoliday 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [date, setDate] = useState('');
  const [name, setName] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddHoliday) {
      await onAddHoliday(date, name);
      setDate('');
      setName('');
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="holiday-calendar-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Holiday Calendar</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={prevMonth} className="icon-btn"><ChevronLeft size={20} /></button>
          <h3 style={{ margin: 0, minWidth: '150px', textAlign: 'center' }}>{format(currentMonth, 'MMMM yyyy')}</h3>
          <button onClick={nextMonth} className="icon-btn"><ChevronRight size={20} /></button>
        </div>
      </div>
      
      {isAdmin && onAddHoliday && (
        <form className="card" onSubmit={handleAdd} style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="input-group" style={{ flex: 2, marginBottom: 0 }}>
            <label>Holiday Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Dashain Festival" />
          </div>
          <button type="submit" className="primary-btn" style={{ padding: '0.75rem 1.5rem' }}>Add Holiday</button>
        </form>
      )}

      <div className="card" style={{ padding: '1rem', overflowX: 'auto' }}>
        <div className="calendar-grid" style={{ minWidth: '600px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid #e2e8f0' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {day}
            </div>
          ))}
          {calendarDays.map((day, i) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const holiday = holidays.find(h => h.date === dateStr);
            const isSat = isSaturday(day);
            const isHoliday = !!holiday || isSat;
            const isCurrentMonth = isSameMonth(day, monthStart);

            return (
              <div 
                key={dateStr} 
                className={`calendar-day ${isHoliday ? 'holiday' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
                style={{ 
                  height: isAdmin ? '100px' : '80px', 
                  borderRight: (i + 1) % 7 === 0 ? 'none' : '1px solid #e2e8f0', 
                  borderBottom: '1px solid #e2e8f0',
                  padding: '0.5rem',
                  position: 'relative',
                  backgroundColor: isHoliday && isCurrentMonth ? '#fef2f2' : (isCurrentMonth ? 'white' : '#f1f5f9'),
                  color: isCurrentMonth ? 'inherit' : '#94a3b8',
                  transition: 'background-color 0.2s',
                  cursor: isCurrentMonth && isAdmin ? 'pointer' : 'default'
                }}
                onClick={() => isAdmin && isCurrentMonth && setDate(dateStr)}
              >
                <div style={{ fontWeight: isSameDay(day, new Date()) ? 'bold' : 'normal', color: isSameDay(day, new Date()) ? 'var(--primary-color)' : 'inherit', fontSize: '0.875rem' }}>
                  {format(day, 'd')}
                </div>
                {isHoliday && isCurrentMonth && (
                  <div 
                    title={holiday ? holiday.name : 'Saturday (Weekly Holiday)'}
                    style={{ 
                      marginTop: '0.4rem', 
                      padding: '0.2rem 0.4rem', 
                      backgroundColor: holiday ? '#ef4444' : '#94a3b8', 
                      color: 'white', 
                      fontSize: '0.65rem', 
                      borderRadius: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                  >
                    <Info size={10} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {holiday ? holiday.name : 'Saturday'}
                    </span>
                    {isAdmin && holiday && onDeleteHoliday && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteHoliday(holiday.id); }} 
                        style={{ background: 'none', border: 'none', color: 'white', padding: 0, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .calendar-day:hover {
          background-color: ${isAdmin ? '#f8fafc' : 'transparent'} !important;
        }
        .calendar-day.holiday:hover {
          background-color: ${isAdmin ? '#fee2e2' : 'transparent'} !important;
        }
        .other-month {
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};
