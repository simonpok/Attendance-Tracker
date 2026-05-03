import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, UserCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const [role, setRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      login(data.token, data.user);
      navigate(role === 'ADMIN' ? '/admin' : '/employee');
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">
            <Building2 size={32} color="var(--primary-color)" />
          </div>
          <h1>OfficeTrack</h1>
          <p>Personalized Attendance System</p>
        </div>

        <div className="role-selector">
          <button 
            className={`role-btn ${role === 'EMPLOYEE' ? 'active' : ''}`}
            onClick={() => setRole('EMPLOYEE')}
            type="button"
          >
            <UserCircle size={20} />
            Employee
          </button>
          <button 
            className={`role-btn ${role === 'ADMIN' ? 'active' : ''}`}
            onClick={() => setRole('ADMIN')}
            type="button"
          >
            <Building2 size={20} />
            Admin
          </button>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input 
              type="email" 
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required 
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required 
            />
          </div>

          <button type="submit" className="submit-btn">
            Login as {role === 'ADMIN' ? 'Admin' : 'Employee'}
          </button>
        </form>
      </div>
    </div>
  );
};
