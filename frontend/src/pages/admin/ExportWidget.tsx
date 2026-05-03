import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { downloadCSV, downloadPDF, downloadExcel } from '../../utils/exportUtils';
import { FileText, Download, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';

export const ExportWidget: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataset, setDataset] = useState<'employees' | 'records' | 'leaderboard'>('employees');

  const handleExport = async (formatType: 'csv' | 'excel' | 'pdf') => {
    setLoading(true);
    try {
      let url = '';
      let dataName = '';
      let title = '';

      if (dataset === 'employees') {
        url = `${import.meta.env.VITE_API_URL}/api/admin/employees`;
        dataName = 'Employees';
        title = 'Employee Directory';
      } else if (dataset === 'records') {
        url = `${import.meta.env.VITE_API_URL}/api/admin/records`;
        dataName = 'AttendanceRecords';
        title = 'Global Attendance Records';
      } else if (dataset === 'leaderboard') {
        url = `${import.meta.env.VITE_API_URL}/api/leaderboards`;
        dataName = 'Leaderboard';
        title = 'Leaderboards - Highest Attendance';
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let data = await res.json();

      // Normalize data to flat objects
      let flatData: any[] = [];
      if (dataset === 'employees') {
        flatData = data.map((e: any) => ({
          ID: e.employeeId,
          Name: e.name,
          Email: e.email,
          Phone: e.phone || '',
          Status: e.isActive ? 'Active' : 'Inactive',
          JoinedAt: format(new Date(e.createdAt), 'yyyy-MM-dd')
        }));
      } else if (dataset === 'records') {
        flatData = data.map((r: any) => ({
          Date: r.date,
          Employee: r.user.name,
          EmployeeID: r.user.employeeId,
          CheckIn: r.checkInTime ? format(new Date(r.checkInTime), 'hh:mm a') : 'N/A',
          CheckOut: r.checkOutTime ? format(new Date(r.checkOutTime), 'hh:mm a') : 'N/A',
          Status: r.status,
          IsManual: r.isManualCheckout ? 'Yes' : 'No'
        }));
      } else if (dataset === 'leaderboard') {
        flatData = data.highestAttendance.map((l: any, i: number) => ({
          Rank: i + 1,
          Employee: l.name,
          TotalPresentDays: l.totalPresent,
          CurrentStreak: l.currentStreak
        }));
      }

      const fileName = `${dataName}_Export_${format(new Date(), 'yyyyMMdd')}`;

      if (formatType === 'csv') downloadCSV(flatData, fileName);
      if (formatType === 'excel') downloadExcel(flatData, fileName);
      if (formatType === 'pdf') downloadPDF(flatData, fileName, title);

    } catch (error) {
      console.error(error);
      alert('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="widget card export-widget" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Download size={20} className="text-primary" /> Data Exports
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        Download your system data in various formats.
      </p>

      <div className="input-group" style={{ marginBottom: 0 }}>
        <label>Select Dataset</label>
        <select 
          value={dataset} 
          onChange={(e: any) => setDataset(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', background: 'white' }}
        >
          <option value="employees">Employee Directory</option>
          <option value="records">Attendance Records</option>
          <option value="leaderboard">Leaderboards</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button 
          className="primary-btn" 
          onClick={() => handleExport('csv')} 
          disabled={loading}
          style={{ background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid #e2e8f0' }}
        >
          <FileSpreadsheet size={16} className="text-success" /> CSV
        </button>
        <button 
          className="primary-btn" 
          onClick={() => handleExport('excel')} 
          disabled={loading}
          style={{ background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid #e2e8f0' }}
        >
          <FileSpreadsheet size={16} className="text-primary" /> Excel
        </button>
        <button 
          className="primary-btn" 
          onClick={() => handleExport('pdf')} 
          disabled={loading}
          style={{ background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid #e2e8f0' }}
        >
          <FileText size={16} className="text-danger" /> PDF
        </button>
      </div>
    </div>
  );
};
