import { useState, useRef, useCallback, useEffect } from 'react';
import { previewCSV, analyzeImport, importCSVAdvanced } from '../services/storage';
import { usersApi } from '../services/api';

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

const STATUSES = [
  { id: 'nouveau', label: 'Nouveau' },
  { id: 'en_cours', label: 'En cours' },
  { id: 'rappel', label: 'Rappel' },
  { id: 'interesse', label: 'Intéressé' },
  { id: 'vendu', label: 'Vendu' },
  { id: 'pas_interesse', label: 'Pas intéressé' },
  { id: 'sans_reponse', label: 'Sans réponse' },
];

const SOURCES = [
  '', 'Achat fichier', 'Réseau social', 'Site web', 'Recommandation',
  'Publicité', 'Partenariat', 'Salon/Événement', 'Autre',
];

function readFileWithEncoding(file) {
  return new Promise((resolve, reject) => {
    // Try UTF-8 first
    const readerUtf8 = new FileReader();
    readerUtf8.onload = (e) => {
      const text = e.target.result;
      // If replacement character appears, file may not be UTF-8 → try Latin-1
      if (text.includes('\uFFFD')) {
        const readerLatin = new FileReader();
        readerLatin.onload = (e2) => resolve(e2.target.result);
        readerLatin.onerror = reject;
        readerLatin.readAsText(file, 'ISO-8859-1');
      } else {
        resolve(text);
      }
    };
    readerUtf8.onerror = reject;
    readerUtf8.readAsText(file, 'UTF-8');
  });
}

export default function CSVImportModal({ groups, onClose, currentUserId }) {
  const [step, setStep] = useState('upload'); // upload | mapping | analyze | result
  const [dragging, setDragging] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState(null); // { headers, rows, mapping, preview, total, unmapped }
  const [mapping, setMapping] = useState({});
  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [status, setStatus] = useState('nouveau');
  const [source, setSource] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [agents, setAgents] = useState([]);
  useEffect(() => { usersApi.list().then(res => setAgents(res.data?.filter(u => u.active !== false) || [])).catch(() => {}); }, []);
  const [dupPolicy, setDupPolicy] = useState('skip');
  const [analysis, setAnalysis] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef();

  const processFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.match(/\.csv$/i)) { setError('Fichier CSV uniquement (.csv)'); return; }
    setError('');
    setLoading(true);
    try {
      const text = await readFileWithEncoding(file);
      const prev = previewCSV(text);
      if (!prev.headers.length) { setError('Fichier vide ou format invalide.'); setLoading(false); return; }
      setCsvText(text);
      setFileName(file.name);
      setPreview(prev);
      setMapping(prev.mapping);
      setStep('mapping');
    } catch (e) {
      setError('Erreur de lecture : ' + e.message);
    }
    setLoading(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  }, [processFile]);

  const handleAnalyze = () => {
    setLoading(true);
    setTimeout(() => {
      const ana = analyzeImport(csvText, mapping);
      setAnalysis(ana);
      setStep('analyze');
      setLoading(false);
    }, 100);
  };

  const handleImport = () => {
    setLoading(true);
    setTimeout(() => {
      const res = importCSVAdvanced(csvText, {
        mapping,
        groupId: groupId || null,
        status,
        source: source || null,
        dupPolicy,
        assignTo: assignTo || null,
        currentUserId,
      });
      setResult(res);
      setStep('result');
      setLoading(false);
    }, 100);
  };

  const sectionStyle = { marginBottom: 20 };
  const labelStyle = { display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 };
  const selectStyle = { width: '100%', background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'white', padding: '9px 12px', fontSize: '0.88rem', outline: 'none' };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 11000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#1c1c1e', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 80px rgba(0,0,0,0.8)', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0a84ff 0%, #0055d4 100%)', padding: '18px 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Import CSV</div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '1.05rem', marginTop: 2 }}>
                {step === 'upload' && 'Chargement du fichier'}
                {step === 'mapping' && 'Correspondance des colonnes'}
                {step === 'analyze' && 'Analyse avant import'}
                {step === 'result' && 'Résultat de l\'import'}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}>
              Fermer
            </button>
          </div>
          {/* Steps */}
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            {['upload','mapping','analyze','result'].map((s, i) => (
              <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: ['upload','mapping','analyze','result'].indexOf(step) >= i ? 'white' : 'rgba(255,255,255,0.25)', transition: 'background 0.3s' }} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* STEP: UPLOAD */}
          {step === 'upload' && (
            <div>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? '#0a84ff' : 'rgba(255,255,255,0.18)'}`,
                  borderRadius: 16,
                  padding: '40px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragging ? 'rgba(10,132,255,0.08)' : 'rgba(255,255,255,0.03)',
                  transition: 'all 0.2s',
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📄</div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', marginBottom: 6 }}>
                  Glisser-déposer un fichier CSV
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>ou cliquer pour parcourir</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={e => processFile(e.target.files[0])}
                />
              </div>
              {loading && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Lecture en cours…</div>}
              {error && <div style={{ color: '#ff453a', fontSize: '0.85rem', marginTop: 8 }}>{error}</div>}
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 16px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                <b style={{ color: 'rgba(255,255,255,0.6)' }}>Formats acceptés :</b> séparateurs virgule, point-virgule ou tabulation. Encodages UTF-8 et Latin-1 supportés.
              </div>
            </div>
          )}

          {/* STEP: MAPPING */}
          {step === 'mapping' && preview && (
            <div>
              <div style={{ marginBottom: 16, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                Fichier <b style={{ color: 'white' }}>{fileName}</b> — {preview.total} ligne{preview.total > 1 ? 's' : ''}
              </div>

              {/* Column mapping */}
              <div style={sectionStyle}>
                <label style={labelStyle}>Correspondance des colonnes</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {preview.headers.map(h => (
                    <div key={h} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10 }}>
                      <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 12px', fontSize: '0.85rem', color: 'white', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>→</div>
                      <select
                        value={mapping[h] || ''}
                        onChange={e => setMapping(prev => ({ ...prev, [h]: e.target.value }))}
                        style={{ ...selectStyle, padding: '7px 10px' }}
                      >
                        {LEAD_FIELDS.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              <div style={sectionStyle}>
                <label style={labelStyle}>Aperçu (5 premières lignes)</label>
                <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {preview.headers.map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {preview.headers.map(h => (
                            <td key={h} style={{ padding: '7px 10px', color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {row[h] || <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Group / Status / Source */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Groupe</label>
                  <select value={groupId} onChange={e => setGroupId(e.target.value)} style={selectStyle}>
                    <option value="">Aucun</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Statut initial</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} style={selectStyle}>
                    {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Source</label>
                  <select value={source} onChange={e => setSource(e.target.value)} style={selectStyle}>
                    {SOURCES.map(s => <option key={s} value={s}>{s || '— Colonne CSV —'}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Assigner à</label>
                  <select value={assignTo} onChange={e => setAssignTo(e.target.value)} style={selectStyle}>
                    <option value="">— Aucun agent —</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.full_name || a.email}</option>)}
                  </select>
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={loading}
                style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg, #0a84ff, #0055d4)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
              >
                {loading ? 'Analyse…' : 'Analyser →'}
              </button>
            </div>
          )}

          {/* STEP: ANALYZE */}
          {step === 'analyze' && analysis && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
                <StatCard label="Total lignes" value={analysis.total} color="rgba(255,255,255,0.8)" />
                <StatCard label="Nouveaux" value={analysis.newLeads} color="#30d158" />
                <StatCard label="Doublons internes" value={analysis.internalDups} color="#ff9f0a" note="dans le fichier" />
                <StatCard label="Doublons existants" value={analysis.existingDups} color="#ff453a" note="déjà en base" />
              </div>

              {(analysis.existingDups > 0) && (
                <div style={{ ...sectionStyle }}>
                  <label style={labelStyle}>Gestion des doublons existants</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { value: 'skip', label: 'Ignorer', desc: 'Les doublons ne sont pas importés' },
                      { value: 'overwrite', label: 'Écraser', desc: 'Mettre à jour les fiches existantes' },
                      { value: 'import', label: 'Importer quand même', desc: 'Créer une nouvelle fiche même en doublon' },
                    ].map(opt => (
                      <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 12, background: dupPolicy === opt.value ? 'rgba(10,132,255,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${dupPolicy === opt.value ? 'rgba(10,132,255,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}>
                        <input type="radio" name="dupPolicy" value={opt.value} checked={dupPolicy === opt.value} onChange={() => setDupPolicy(opt.value)} style={{ accentColor: '#0a84ff' }} />
                        <div>
                          <div style={{ color: 'white', fontWeight: 700, fontSize: '0.88rem' }}>{opt.label}</div>
                          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {analysis.newLeads === 0 && analysis.existingDups === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem' }}>
                  Aucun nouveau prospect à importer.
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep('mapping')} style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                  ← Retour
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading || (analysis.newLeads === 0 && analysis.existingDups === 0)}
                  style={{ flex: 2, padding: '12px', borderRadius: 12, background: analysis.newLeads > 0 || (analysis.existingDups > 0 && dupPolicy !== 'skip') ? 'linear-gradient(135deg, #30d158, #25a244)' : 'rgba(255,255,255,0.08)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                >
                  {loading ? 'Import en cours…' : `Importer ${analysis.newLeads + (dupPolicy !== 'skip' ? analysis.existingDups : 0)} prospect${analysis.newLeads !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}

          {/* STEP: RESULT */}
          {step === 'result' && result && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: '3rem', marginBottom: 8 }}>{result.errors === 0 ? '✅' : '⚠️'}</div>
                <div style={{ color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>Import terminé</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
                <StatCard label="Importés" value={result.imported} color="#30d158" />
                <StatCard label="Écrasés" value={result.overwrote} color="#0a84ff" />
                <StatCard label="Doublons ignorés" value={result.duplicates} color="#ff9f0a" />
                <StatCard label="Erreurs" value={result.errors} color="#ff453a" />
              </div>

              {result.errors_list.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Détail des erreurs</label>
                  <div style={{ background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)', borderRadius: 10, padding: '10px 14px', maxHeight: 140, overflowY: 'auto' }}>
                    {result.errors_list.map((e, i) => (
                      <div key={i} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                        Ligne {e.row} : {e.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg, #0a84ff, #0055d4)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, note }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {note && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{note}</div>}
    </div>
  );
}
