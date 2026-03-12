import { useEffect, useState } from 'react';
import storage from '../services/storage';
import { leadsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function UserDashboard(){
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(()=>{
    // Init via API
    leadsApi.list().then(res => { const all = res.data?.leads || []; setLeads(all.filter(l => l.assigned_to === user?.id)); }).catch(e => console.error(e)); const all = [];
    setLeads(all.filter(l=> l.assigned_to === (user?.id) ));
  },[user]);

  const refresh = () => leadsApi.list().then(res => setLeads((res.data?.leads || []).filter(l => l.assigned_to === user?.id))).catch(e => console.error(e));

  const changeStatus = (id, status)=>{ leadsApi.update(id, { status }).then(() => refresh()).catch(e => console.error(e)); };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Mon tableau de bord</div>
          <div className="page-subtitle">Prospects qui vous sont assignés</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:16}}>
        <div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>ID</th><th>Nom</th><th>Téléphone</th><th>Statut</th><th></th></tr>
              </thead>
              <tbody>
                {leads.map(l=> (
                  <tr key={l.id}>
                    <td>{l.id}</td>
                    <td>{l.full_name || l.name}</td>
                    <td>{l.phone}</td>
                    <td>{l.status}</td>
                    <td>
                      <select value={l.status} onChange={e=>changeStatus(l.id, e.target.value)}>
                        <option value="nouveau">Nouveau</option>
                        <option value="en_cours">En cours</option>
                        <option value="rappel">Rappel</option>
                        <option value="transforme">Transformé</option>
                        <option value="refus">Refus</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-title">Détails</div>
            <div style={{marginTop:12}}>
              {selected ? (
                <div>
                  <div><b>Nom:</b> {selected.full_name}</div>
                  <div><b>Téléphone:</b> {selected.phone}</div>
                  <div><b>Email:</b> {selected.email}</div>
                  <div><b>Historique:</b>
                    <ul>{(selected.history||[]).map(h=> (<li key={h.id}>{h.created_at}: {h.action} {h.note}</li>))}</ul>
                  </div>
                </div>
              ) : (
                <div>Sélectionnez un lead pour voir les détails</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
