import { createContext, useContext, useEffect, useState } from 'react';
import storage from '../services/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { const raw = localStorage.getItem('crm_user'); return raw ? JSON.parse(raw) : null; } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.initStorage();
    setLoading(false);
  }, []);

  // Listen for force-logout signals from other tabs
  useEffect(() => {
    function handleStorage(e){
      if (!e.key) return;
      if (e.key.startsWith('crm_force_logout_')){
        const uid = e.key.replace('crm_force_logout_','');
        if (user && user.id === uid){
          // remove the flag and logout
          try { localStorage.removeItem(e.key); } catch(e){}
          logout();
        }
      }
    }
    window.addEventListener('storage', handleStorage);
    // on mount: check if a force logout already exists for current user
    if (user){ const key = `crm_force_logout_${user.id}`; if (localStorage.getItem(key)){ try{ localStorage.removeItem(key); }catch(e){}; logout(); } }
    return () => window.removeEventListener('storage', handleStorage);
  }, [user]);

  const login = async ({ username, password }) => {
    // accept email or username in username field
    const u = storage.loginUser({ email: username, password });
    if (!u) throw new Error('Identifiants incorrects');
    localStorage.setItem('crm_user', JSON.stringify(u));
    setUser(u);
    storage.logLogin(u.id);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('crm_user');
    setUser(null);
    window.location.href = '/login';
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(){ const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be used inside AuthProvider'); return ctx; }

export default AuthContext;
