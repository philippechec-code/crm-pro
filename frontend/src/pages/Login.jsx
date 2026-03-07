import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
    <div className="auth-page" style={{display:'flex',height:'100vh',alignItems:'center',justifyContent:'center'}}>
      <form className="card" onSubmit={handleSubmit} style={{width:360}} autoComplete="off">
        <h2 style={{marginBottom:8}}>Connexion</h2>
        <div style={{color:'#ccc',marginBottom:12}}>Entrez votre identifiant et mot de passe</div>
        {error && <div className="form-error" style={{marginBottom:8,color:'#ffb4b4'}}>{error}</div>}

        <div className="form-group">
          <label className="form-label">Identifiant (email)</label>
          <input className="form-control" value={identifier} onChange={e=>setIdentifier(e.target.value)} required autoComplete="off" />
        </div>

        <div className="form-group">
          <label className="form-label">Mot de passe</label>
          <input type="password" className="form-control" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="new-password" />
        </div>

        <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Connexion...' : 'Se connecter'}</button>
        </div>
      </form>
    </div>
  );
}
