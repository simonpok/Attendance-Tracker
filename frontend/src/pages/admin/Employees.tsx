import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Key, X, Check } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  plainPassword?: string | null;
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
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [phone, setPhone] = useState('');

  // Password visibility & editing states
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  
  // Password change modal states
  const [passwordModalEmp, setPasswordModalEmp] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmployees(data);
      }
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
        setName('');
        setEmployeeId('');
        setEmail('');
        setPassword('');
        setPhone('');
        fetchEmployees();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to add employee');
      }
    } catch (err) {
      alert('Network error while adding employee');
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/employees/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      fetchEmployees();
    } catch (err) {
      console.error('Failed to update status', err);
    }
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

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const openChangePasswordModal = (emp: Employee) => {
    setPasswordModalEmp(emp);
    setNewPassword('');
    setShowModalPassword(false);
    setPasswordSuccess('');
    setPasswordError('');
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalEmp) return;
    if (!newPassword.trim()) {
      setPasswordError('Please enter a new password');
      return;
    }

    setPasswordSubmitting(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/admin/employees/${passwordModalEmp.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        setPasswordSuccess('Password updated successfully!');
        // Update local employee state immediately
        setEmployees(prev => prev.map(emp => 
          emp.id === passwordModalEmp.id ? { ...emp, plainPassword: newPassword } : emp
        ));
        setTimeout(() => {
          setPasswordModalEmp(null);
          setPasswordSuccess('');
        }, 1200);
      } else {
        setPasswordError(data.error || 'Failed to update password');
      }
    } catch (err) {
      setPasswordError('Network error while updating password');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className="employees-container">
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2>Employee Management</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn-secondary"
            onClick={() => setShowAllPasswords(!showAllPasswords)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              fontSize: '0.875rem',
              padding: '0.5rem 0.85rem'
            }}
          >
            {showAllPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
            {showAllPasswords ? 'Hide Passwords' : 'View All Passwords'}
          </button>
          <button className="primary-btn" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? 'Cancel' : '+ Add Employee'}
          </button>
        </div>
      </div>

      {showAdd && (
        <form className="card" onSubmit={handleAddEmployee} style={{ marginBottom: '2rem' }}>
          <h3>Add New Employee</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
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
              <div style={{ position: 'relative' }}>
                <input 
                  type={showAddPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  style={{ width: '100%', paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowAddPassword(!showAddPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showAddPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="submit-btn" style={{ width: 'auto' }}>Create Employee</button>
        </form>
      )}

      <div className="card table-container" style={{ padding: 0 }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '750px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--table-header-bg)' }}>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem' }}>ID</th>
              <th style={{ padding: '1rem' }}>Email</th>
              <th style={{ padding: '1rem' }}>Password</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => {
              const isPasswordVisible = showAllPasswords || !!visiblePasswords[emp.id];
              return (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{emp.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{emp.employeeId}</td>
                  <td style={{ padding: '1rem' }}>{emp.email}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {emp.plainPassword ? (
                        <>
                          <span style={{ 
                            fontFamily: isPasswordVisible ? 'monospace' : 'inherit',
                            fontSize: isPasswordVisible ? '0.9rem' : '1.1rem',
                            letterSpacing: isPasswordVisible ? '0.5px' : '2px',
                            color: 'var(--text-main)',
                            fontWeight: isPasswordVisible ? 600 : 700,
                            userSelect: isPasswordVisible ? 'all' : 'none'
                          }}>
                            {isPasswordVisible ? emp.plainPassword : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(emp.id)}
                            title={isPasswordVisible ? 'Hide password' : 'View password'}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '2px 4px',
                              borderRadius: '4px'
                            }}
                          >
                            {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                          Not visible
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => openChangePasswordModal(emp)}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--primary-color)',
                          cursor: 'pointer',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          marginLeft: '0.25rem'
                        }}
                        title="Change employee password"
                      >
                        <Key size={12} />
                        Change
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span className={emp.isActive ? 'text-success' : 'text-danger'} style={{ fontWeight: 500 }}>
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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Change Password Modal */}
      {passwordModalEmp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1rem',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            color: 'var(--text-main)',
            width: '100%',
            maxWidth: '420px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            animation: 'modalSlideUp 0.3s ease-out'
          }}>
            <div style={{ padding: '1.5rem', position: 'relative' }}>
              <button
                type="button"
                onClick={() => setPasswordModalEmp(null)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                <X size={20} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary-color)'
                }}>
                  <Key size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Change Password</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {passwordModalEmp.name} ({passwordModalEmp.employeeId})
                  </p>
                </div>
              </div>

              {passwordSuccess ? (
                <div style={{ 
                  marginTop: '1.5rem', 
                  padding: '1rem', 
                  background: 'var(--badge-present-bg)', 
                  color: 'var(--badge-present-text)', 
                  borderRadius: 'var(--radius-md)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  fontWeight: 500
                }}>
                  <Check size={18} />
                  <span>{passwordSuccess}</span>
                </div>
              ) : (
                <form onSubmit={handleUpdatePassword} style={{ marginTop: '1.25rem' }}>
                  <div className="input-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                      New Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showModalPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                        autoFocus
                        style={{
                          width: '100%',
                          padding: '0.65rem 2.5rem 0.65rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          background: 'var(--input-bg)',
                          color: 'var(--input-color)',
                          fontSize: '0.95rem'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowModalPassword(!showModalPassword)}
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {showModalPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {passwordError && (
                    <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
                      {passwordError}
                    </p>
                  )}

                  <div style={{
                    marginTop: '1.5rem',
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end'
                  }}>
                    <button
                      type="button"
                      onClick={() => setPasswordModalEmp(null)}
                      className="btn-secondary"
                      style={{ padding: '0.55rem 1rem', fontSize: '0.9rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={passwordSubmitting}
                      className="primary-btn"
                      style={{ padding: '0.55rem 1.25rem', fontSize: '0.9rem' }}
                    >
                      {passwordSubmitting ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
