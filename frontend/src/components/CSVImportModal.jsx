import { useState, useRef, useCallback, useEffect } from 'react';
import { previewCSV } from '../services/storage';
import { leadsApi, usersApi } from '../services/api';

const LEAD_FIELDS = [
  { value: '', label: '— Ignorer —' },
  { value: 'first_name', label: 'Prénom' },
  { value: 'last_name', label: 'Nom' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'email', label: 'Email' },
  { value: 'address', label: 'Adresse' },
  { value: 'city', label: 'Ville' },
  { value: 'postal_code', label: 'Code postal' },
  { value: 'source', label: 'Source' },
  { value: 'comment', label: 'Commentaire' },
];

const SOURCES = ['', 'Achat fichier', 'Réseau social', 'Site web', 'Recommandation', 'Publicité', 'Autre'];

export default function CSVImportModal({ groups, onClose }) {
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [source, setSource] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [users, setUsers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef();
  useEffect(() => { usersApi.list().then(r => setUsers(r.data || [])).catch(() => {}); }, []);

  const processFile = useCallback(async (f) => {
    if (!f || !f.name.match(/\.csv$/i)) { setError('Fichier CSV uniquement'); return; }
    setError('');
    setLoading(true);
    try {
      const text = await f.text();
      const prev = previewCSV(text);
      if (!prev.headers.length) { setError('Fichier vide'); setLoading(false); return; }
      setFile(f);
      setFileName(f.name);
      setPreview(prev);
      setMapping(prev.mapping);
      setStep('mapping');
    } catch (e) { setError('Erreur: ' + e.message); }
    setLoading(false);
  }, []);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (groupId) formData.append('group_id', groupId);
      if (source) formData.append('source', source);
      if (assignedTo) formData.append('assigned_to', assignedTo);
      const res = await leadsApi.importCSV(formData);
      setResult({ imported: res.data.imported || 0, duplicates: res.data.duplicates || 0, message: res.data.message });
      setStep('result');
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
    setLoading(false);
  };

  const label = { display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 };
  const select = { width: '100%', background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'white', padding: '9px 12px' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 11000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1c1c1e', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #0a84ff, #0055d4)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between' }}>
          <div><div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem', fontWeight: 700 }}>IMPORT CSV</div><div style={{ color: 'white', fontWeight: 800, marginTop: 2 }}>{step === 'upload' ? 'Chargement' : step === 'mapping' ? 'Configuration' : 'Résultat'}</div></div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: 'white', padding: '6px 12px', cursor: 'pointer' }}>Fermer</button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>
          {step === 'upload' && (
            <div>
              <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed rgba(255,255,255,0.18)', borderRadius: 16, padding: '40px', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: '2.5rem' }}>📄</div>
                <div style={{ color: 'white', fontWeight: 700, marginTop: 12 }}>Cliquer pour sélectionner un CSV</div>
                <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => processFile(e.target.files[0])} />
              </div>
              {error && <div style={{ color: '#ff453a', marginTop: 8 }}>{error}</div>}
            </div>
          )}
          {step === 'mapping' && preview && (
            <div>
              <div style={{ marginBottom: 16, color: 'rgba(255,255,255,0.6)' }}>Fichier: <b style={{ color: 'white' }}>{fileName}</b> - {preview.total} lignes</div>
              <div style={{ marginBottom: 20 }}>
                <div style={label}>Colonnes</div>
                {preview.headers.map(h => (
                  <div key={h} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 12px', color: 'white' }}>{h}</div>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>→</span>
                    <select value={mapping[h] || ''} onChange={e => setMapping(p => ({ ...p, [h]: e.target.value }))} style={{ ...select, flex: 1 }}>
                      {LEAD_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1 }}><div style={label}>Groupe</div><select value={groupId} onChange={e => setGroupId(e.target.value)} style={select}><option value="">Aucun</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                <div style={{ flex: 1 }}><div style={label}>Source</div><select value={source} onChange={e => setSource(e.target.value)} style={select}>{SOURCES.map(s => <option key={s} value={s}>{s || '— Aucune —'}</option>)}</select></div>
                <div style={{ flex: 1 }}><div style={label}>Assigner à</div><select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={select}><option value="">— Aucun —</option>{users.filter(u => u.role !== 'admin').map(u => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}</select></div>
              </div>
              {error && <div style={{ color: '#ff453a', marginBottom: 12 }}>{error}</div>}
              <button onClick={handleImport} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 12, background: '#30d158', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer' }}>{loading ? 'Import...' : 'Importer ' + preview.total + ' prospects'}</button>
            </div>
          )}
          {step === 'result' && result && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem' }}>✅</div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '1.1rem', margin: '8px 0' }}>Import terminé</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>{result.message}</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14 }}><div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>IMPORTÉS</div><div style={{ fontSize: '2rem', fontWeight: 800, color: '#30d158' }}>{result.imported}</div></div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14 }}><div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>DOUBLONS</div><div style={{ fontSize: '2rem', fontWeight: 800, color: '#ff9f0a' }}>{result.duplicates}</div></div>
              </div>
              <button onClick={onClose} style={{ width: '100%', padding: '13px', borderRadius: 12, background: '#0a84ff', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Fermer</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
