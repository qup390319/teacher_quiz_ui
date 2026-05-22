import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';

const TYPE_CONFIG = {
  success: {
    bg: '#5C8A2E',
    icon: 'check_circle',
    label: '成功',
  },
  error: {
    bg: '#D35400',
    icon: 'error',
    label: '錯誤',
  },
  info: {
    bg: '#2E86C1',
    icon: 'info',
    label: '資訊',
  },
};

function ToastItem({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false);

  // Trigger slide-in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const config = TYPE_CONFIG[toast.type] ?? TYPE_CONFIG.info;

  const handleClose = () => {
    setVisible(false);
    // Wait for transition before removing from DOM
    setTimeout(() => onDismiss(toast.id), 300);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        backgroundColor: config.bg,
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: '280px',
        maxWidth: '380px',
        padding: '12px 14px',
        transform: visible ? 'translateX(0)' : 'translateX(110%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease',
        willChange: 'transform, opacity',
      }}
    >
      {/* Icon */}
      <span
        className="material-symbols-rounded"
        style={{ fontSize: '22px', flexShrink: 0 }}
      >
        {config.icon}
      </span>

      {/* Message */}
      <span style={{ flex: 1, fontSize: '14px', lineHeight: '1.5', wordBreak: 'break-word' }}>
        {toast.message}
      </span>

      {/* Close button */}
      <button
        onClick={handleClose}
        aria-label="關閉通知"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.85)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: '2px',
          flexShrink: 0,
          borderRadius: '6px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
      >
        <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
          close
        </span>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="通知區域"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
