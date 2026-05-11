import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, onClose, onConfirm, itemName, itemType }) => {
  if (!isOpen) return null;

  return (
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
        background: 'white',
        width: '100%',
        maxWidth: '400px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        animation: 'modalSlideUp 0.3s ease-out'
      }}>
        <div style={{ padding: '1.5rem', position: 'relative' }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8'
            }}
          >
            <X size={20} />
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              marginBottom: '1rem'
            }}>
              <AlertTriangle size={32} />
            </div>
            <h3 style={{ marginBottom: '0.5rem', color: '#1e293b' }}>Confirm Deletion</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: '1.5' }}>
              Are you sure you want to delete <strong>{itemName}</strong>?<br />
              This will permanently remove this {itemType.toLowerCase()}.
            </p>
          </div>
        </div>

        <div style={{
          padding: '1rem 1.5rem',
          background: '#f8fafc',
          display: 'flex',
          gap: '1rem',
          borderTop: '1px solid #f1f5f9'
        }}>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ flex: 1, padding: '0.75rem' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn-danger"
            style={{
              flex: 1,
              padding: '0.75rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Delete {itemType}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
