import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface Employee {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

export const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { token } = useAuth();
  
  // Form states
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  const fetchEmployees = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/employees`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setEmployees(data);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/employees`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ name, employeeId, email, password, phone }),
    });

    if (res.ok) {
      setShowAdd(false);
      fetchEmployees();
    } else {
      alert('Failed to add employee');
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/employees/${id}/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ isActive: !currentStatus }),
    });
    fetchEmployees();
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}? All their attendance records will be permanently removed.`)) {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchEmployees();
      } else {
        alert('Failed to delete employee');
      }
    }
  };

  return (
    <div className="employees-container">
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2>Employee Management</h2>
        <button className="primary-btn" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ Add Employee'}
        </button>
      </div>

      {showAdd && (
        <form className="card" onSubmit={handleAddEmployee} style={{ marginBottom: '2rem' }}>
          <h3>Add New Employee</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div className="input-group">
              <label>Name</label>
              <input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Employee ID</label>
              <input value={employeeId} onChange={e => setEmployeeId(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="submit-btn" style={{ width: 'auto' }}>Create Employee</button>
        </form>
      )}

      <div className="card">
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem' }}>ID</th>
              <th style={{ padding: '1rem' }}>Email</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '1rem' }}>{emp.name}</td>
                <td style={{ padding: '1rem' }}>{emp.employeeId}</td>
                <td style={{ padding: '1rem' }}>{emp.email}</td>
                <td style={{ padding: '1rem' }}>
                  <span className={emp.isActive ? 'text-success' : 'text-danger'}>
                    {emp.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                      onClick={() => toggleStatus(emp.id, emp.isActive)}
                      style={{ color: 'var(--primary-color)', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {emp.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button 
                      onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                      style={{ color: '#ef4444', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
