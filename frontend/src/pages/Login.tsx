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

    const baseUrl = import.meta.env.VITE_API_URL || "https://attendance-tracker-production-7b9e.up.railway.app";
    const endpoint = "/api/auth/login";
    const apiUrl = baseUrl.replace(/\/$/, '') + '/' + endpoint.replace(/^\//, '');


    console.log(`[Debug] Attempting login to: ${apiUrl}`);

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      console.log(`[Debug] Response status: ${res.status}`);
      const contentType = res.headers.get("content-type");

      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error(`[Debug] Expected JSON but got: ${text.substring(0, 100)}`);
        throw new Error('Server returned non-JSON response');
      }

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      login(data.token, data.user);
      navigate(role === 'ADMIN' ? '/admin' : '/employee');
    } catch (err: any) {
      console.error('[Debug] Login error:', err);
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        setError(`Network error: Cannot reach the server at ${apiUrl}. Please check if the backend is running.`);
      } else {
        setError(`Error: ${err.message || 'Please try again'}`);
      }
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
