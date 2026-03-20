import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const styles = `
@keyframes float1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(100px, -50px) scale(1.1); }
  50% { transform: translate(50px, 100px) scale(0.9); }
  75% { transform: translate(-50px, 50px) scale(1.05); }
}
@keyframes float2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(-80px, 80px) scale(1.15); }
  50% { transform: translate(-120px, -40px) scale(0.95); }
  75% { transform: translate(60px, -80px) scale(1.1); }
}
@keyframes float3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(70px, 70px) scale(0.9); }
  50% { transform: translate(-60px, 120px) scale(1.1); }
  75% { transform: translate(-100px, -30px) scale(1); }
}
@keyframes float4 {
  0%, 100% { transform: translate(0, 0) scale(1.1); }
  25% { transform: translate(-90px, -60px) scale(0.95); }
  50% { transform: translate(80px, -100px) scale(1.15); }
  75% { transform: translate(40px, 80px) scale(1); }
}
@keyframes float5 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(60px, -80px) scale(1.1); }
  66% { transform: translate(-70px, 60px) scale(0.9); }
}
.login-bg {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, #0f0c29 0%, #1a1a3e 50%, #24243e 100%);
  overflow: hidden;
  z-index: 0;
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
  mix-blend-mode: screen;
}
.orb-1 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, #667eea 0%, transparent 70%);
  top: -10%; left: -10%;
  animation: float1 20s ease-in-out infinite;
}
.orb-2 {
  width: 600px; height: 600px;
  background: radial-gradient(circle, #764ba2 0%, transparent 70%);
  top: 50%; right: -15%;
  animation: float2 25s ease-in-out infinite;
}
.orb-3 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, #6B8DD6 0%, transparent 70%);
  bottom: -10%; left: 20%;
  animation: float3 22s ease-in-out infinite;
}
.orb-4 {
  width: 350px; height: 350px;
  background: radial-gradient(circle, #8E54E9 0%, transparent 70%);
  top: 30%; left: 50%;
  animation: float4 18s ease-in-out infinite;
}
.orb-5 {
  width: 450px; height: 450px;
  background: radial-gradient(circle, #4776E6 0%, transparent 70%);
  bottom: 20%; right: 20%;
  animation: float5 23s ease-in-out infinite;
}
.login-container {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  padding: 20px;
  box-sizing: border-box;
}
.login-card {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 40px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
  box-sizing: border-box;
}
.login-card h2 {
  margin: 0 0 8px 0;
  font-size: 1.8rem;
  font-weight: 700;
  color: #fff;
  text-align: center;
}
.login-card .subtitle {
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  margin-bottom: 28px;
  font-size: 0.9rem;
}
.login-card .form-group {
  margin-bottom: 20px;
}
.login-card .form-label {
  display: block;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 8px;
}
.login-card .form-input {
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}
.login-card .form-input:focus {
  outline: none;
  border-color: #667eea;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.25);
}
.login-card .form-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}
.login-card .btn-login {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 8px;
  min-height: 50px;
}
.login-card .btn-login:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
}
.login-card .btn-login:active:not(:disabled) {
  transform: translateY(0);
}
.login-card .btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.login-card .error-msg {
  background: rgba(255, 100, 100, 0.15);
  border: 1px solid rgba(255, 100, 100, 0.3);
  color: #ff9999;
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 20px;
  font-size: 0.85rem;
  text-align: center;
}
.login-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 24px;
}
.login-logo svg {
  width: 40px;
  height: 40px;
}
.login-logo span {
  font-size: 1.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Tablet */
@media (max-width: 768px) {
  .orb { filter: blur(60px); opacity: 0.5; }
  .orb-1 { width: 350px; height: 350px; }
  .orb-2 { width: 400px; height: 400px; }
  .orb-3 { width: 300px; height: 300px; }
  .orb-4 { width: 250px; height: 250px; }
  .orb-5 { width: 300px; height: 300px; }
  .login-card { padding: 32px 28px; }
}

/* Mobile */
@media (max-width: 480px) {
  .login-container { padding: 16px; }
  .login-card {
    padding: 28px 20px;
    border-radius: 16px;
  }
  .login-card h2 { font-size: 1.5rem; }
  .login-card .subtitle { font-size: 0.85rem; margin-bottom: 24px; }
  .login-logo svg { width: 32px; height: 32px; }
  .login-logo span { font-size: 1.3rem; }
  .login-card .form-input { padding: 12px 14px; }
  .login-card .btn-login { padding: 12px; min-height: 48px; }
  .orb { filter: blur(50px); opacity: 0.4; }
  .orb-1 { width: 250px; height: 250px; }
  .orb-2 { width: 300px; height: 300px; }
  .orb-3 { width: 200px; height: 200px; }
  .orb-4 { width: 180px; height: 180px; }
  .orb-5 { width: 220px; height: 220px; }
}
`;

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ username: identifier, password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Échec de la connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="login-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="orb orb-4"></div>
        <div className="orb orb-5"></div>
      </div>
      <div className="login-container">
        <form className="login-card" onSubmit={handleSubmit} autoComplete="off">
          <div className="login-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" strokeWidth="2">
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
              </defs>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>CRM Pro</span>
          </div>
          <h2>Bienvenue</h2>
          <div className="subtitle">Connectez-vous à votre espace</div>
          
          {error && <div className="error-msg">{error}</div>}
          
          <div className="form-group">
            <label className="form-label">Email ou identifiant</label>
            <input 
              className="form-input" 
              value={identifier} 
              onChange={e => setIdentifier(e.target.value)} 
              required 
              autoComplete="off"
              placeholder="Entrez votre email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input 
              type="password" 
              className="form-input" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </>
  );
}
