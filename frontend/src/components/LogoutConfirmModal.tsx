import React from 'react';
import { LogOut } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmModal: React.FC<Props> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-icon">
          <LogOut size={32} />
        </div>
        <h2 style={{ marginBottom: '0.5rem' }}>Ready to Leave?</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Are you sure you want to log out of your account?
        </p>
        <div className="modal-actions">
          <button 
            className="card" 
            onClick={onClose}
            style={{ 
              padding: '0.75rem', 
              fontSize: '0.9rem', 
              fontWeight: 600, 
              border: '1px solid #e2e8f0',
              background: 'white'
            }}
          >
            Cancel
          </button>
          <button 
            className="primary-btn" 
            onClick={onConfirm}
            style={{ 
              background: 'var(--danger-color)',
              padding: '0.75rem', 
              fontSize: '0.9rem', 
              fontWeight: 600
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};
