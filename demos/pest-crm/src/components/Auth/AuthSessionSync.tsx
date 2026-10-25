import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AUTH_SESSION_INVALID_EVENT } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

/** Единая точка выхода при 401 и «Сбросить демо» — без window.location.hash. */
export function AuthSessionSync() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handlingRef = useRef(false);

  useEffect(() => {
    const onInvalid = () => {
      if (handlingRef.current) return;
      handlingRef.current = true;
      logout();
      navigate('/login', { replace: true });
      window.setTimeout(() => {
        handlingRef.current = false;
      }, 300);
    };
    window.addEventListener(AUTH_SESSION_INVALID_EVENT, onInvalid);
    return () => window.removeEventListener(AUTH_SESSION_INVALID_EVENT, onInvalid);
  }, [logout, navigate]);

  return null;
}
