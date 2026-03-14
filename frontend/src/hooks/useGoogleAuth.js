import { useState, useEffect, useCallback } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function useGoogleAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [oauthAvailable, setOauthAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/status`);
      const data = await res.json();
      setAuthenticated(data.authenticated);
      setOauthAvailable(data.oauth_available);
    } catch {
      setAuthenticated(false);
      setOauthAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();

    // Check if we just came back from OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      // Clean URL and recheck
      window.history.replaceState({}, '', window.location.pathname);
      checkStatus();
    }
  }, [checkStatus]);

  const login = useCallback(() => {
    window.location.href = `${BACKEND_URL}/api/auth/login`;
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${BACKEND_URL}/api/auth/logout`);
    setAuthenticated(false);
  }, []);

  return { authenticated, oauthAvailable, loading, login, logout };
}
