import { normalizePhone } from '../utils/phoneNormalizer';

const KEY_USERS    = 'crm_users_v1';
const KEY_LEADS    = 'crm_leads_v1';
const KEY_GROUPS   = 'crm_groups_v1';
const KEY_SETTINGS = 'crm_settings_v1';
const KEY_STATUSES = 'crm_statuses_v1';
const KEY_LOGS     = 'crm_login_logs_v1';
const MAX_LOGS     = 500;

const DEFAULT_GROUPS = [
  { id: 'leads', name: 'Lead', description: 'Prospects à traiter et qualifier', color: '#38bdf8', builtin: true },
  { id: 'data',  name: 'Data', description: 'Contacts et données brutes',       color: '#a78bfa', builtin: true },
];

const DEFAULT_STATUSES = [
  { id: 'nouveau',       label: 'Nouveau',        color: '#a78bfa', builtin: true },
  { id: 'en_cours',      label: 'En cours',        color: '#38bdf8', builtin: true },
  { id: 'rappel',        label: 'Rappel',           color: '#fb923c', builtin: true },
  { id: 'transforme',    label: 'Transformé',       color: '#34d399', builtin: true },
  { id: 'ne_repond_pas', label: 'Ne répond pas',   color: '#94a3b8', builtin: true },
  { id: 'refus',         label: 'Refus',            color: '#fb7185', builtin: true },
];

function uid(prefix='id'){
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

function read(key){
  try{ return JSON.parse(localStorage.getItem(key) || 'null'); }catch(e){return null}
}
function write(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

export function initStorage(){
  // seed users
  let users = read(KEY_USERS) || [];
  if (!users || users.length === 0){
    users = [
      { id: uid('u'), email: 'admin@crm.fr',  password: 'admin123', role: 'admin', full_name: 'Administrateur', active: true },
      { id: uid('u'), email: 'agent@crm.fr',  password: 'agent123', role: 'agent', full_name: 'Agent Test',     active: true },
    ];
    write(KEY_USERS, users);
  } else if (!users.find(u => u.email === 'agent@crm.fr')) {
    // add test agent if missing
    users.push({ id: uid('u'), email: 'agent@crm.fr', password: 'agent123', role: 'agent', full_name: 'Agent Test', active: true });
    write(KEY_USERS, users);
  }

  // seed / migrate statuses — always sync builtin colors
  const stored = read(KEY_STATUSES);
  if (!stored) {
    write(KEY_STATUSES, DEFAULT_STATUSES);
  } else {
    const merged = stored.map(s => {
      const def = DEFAULT_STATUSES.find(d => d.id === s.id && d.builtin);
      return def ? { ...s, color: def.color, label: def.label, builtin: true } : s;
    });
    write(KEY_STATUSES, merged);
  }

  // seed leads
  const existingLeads = read(KEY_LEADS);
  if (!existingLeads || existingLeads.length === 0){
    const allUsers = read(KEY_USERS) || [];
    const agentUser = allUsers.find(u => u.role === 'agent');
    const adminUser = allUsers.find(u => u.role === 'admin');
    const agentId   = agentUser?.id || null;
    const adminId   = adminUser?.id || null;
    const agentName = agentUser?.full_name || 'Agent Test';
    const adminName = adminUser?.full_name || 'Administrateur';

    function mkLead(d){
      const past = (days) => new Date(Date.now() - days * 86400000).toISOString();
      const t = d.created_at || past(0);
      return {
        id: uid('l'),
        first_name: d.first_name, last_name: d.last_name,
        phone: d.phone, phone_normalized: normalizePhone(d.phone),
        email: d.email || '', email_lower: (d.email || '').toLowerCase(),
        address: d.address || '', city: d.city || '', postal_code: d.postal_code || '',
        status: d.status || 'nouveau', source: d.source || '',
        comment: d.comment || '',
        group_id: d.group_id || null,
        assigned_to: d.assigned_to || null,
        created_at: t, updated_at: t,
        history: [{ id: uid('h'), user_id: adminId, user_name: adminName, action: 'created', note: 'Lead de démonstration', created_at: t }],
      };
    }
    const past = (days) => new Date(Date.now() - days * 86400000).toISOString();

    const testLeads = [
      // ── Groupe LEADS (qualifiés) ──────────────────────────────
      mkLead({ first_name:'Jean',      last_name:'Dupont',    phone:'0612345678', email:'jean.dupont@exemple.fr',    address:'12 rue de la Paix',       city:'Paris',      postal_code:'75001', status:'nouveau',       source:'Site web',     comment:'Très intéressé par nos offres premium.',    group_id:'leads', assigned_to:agentId, created_at:past(5) }),
      mkLead({ first_name:'Marie',     last_name:'Martin',    phone:'0698765432', email:'marie.martin@exemple.fr',   address:'5 av. Victor Hugo',       city:'Lyon',       postal_code:'69001', status:'en_cours',      source:'Téléphone',    comment:'Rappeler jeudi matin.',                     group_id:'leads', assigned_to:agentId, created_at:past(4) }),
      mkLead({ first_name:'Pierre',    last_name:'Bernard',   phone:'0671234567', email:'pierre.bernard@gmail.com',  address:'8 bd Gambetta',           city:'Bordeaux',   postal_code:'33000', status:'rappel',        source:'Partenaire',   comment:'Rendez-vous à confirmer.',                  group_id:'leads', assigned_to:agentId, created_at:past(3) }),
      mkLead({ first_name:'Sophie',    last_name:'Leblanc',   phone:'0654321987', email:'sophie.leblanc@orange.fr',  address:'22 rue du Marché',        city:'Nantes',     postal_code:'44000', status:'transforme',    source:'Email',        comment:'Contrat signé le 28/02.',                   group_id:'leads', assigned_to:agentId, created_at:past(8) }),
      mkLead({ first_name:'Thomas',    last_name:'Moreau',    phone:'0623456789', email:'thomas.moreau@example.fr',  address:'3 impasse des Lilas',     city:'Toulouse',   postal_code:'31000', status:'ne_repond_pas', source:'Site web',     comment:'3 tentatives sans réponse.',                group_id:'leads', assigned_to:agentId, created_at:past(6) }),
      mkLead({ first_name:'Isabelle',  last_name:'Petit',     phone:'0687654321', email:'isabelle.petit@sfr.fr',     address:'17 avenue du Parc',       city:'Strasbourg', postal_code:'67000', status:'refus',         source:'Cold call',    comment:'Pas intéressée pour le moment.',             group_id:'leads', assigned_to:null,    created_at:past(10) }),
      mkLead({ first_name:'Nicolas',   last_name:'Lefebvre',  phone:'0611223344', email:'n.lefebvre@gmail.com',      address:'9 rue de la République',  city:'Marseille',  postal_code:'13001', status:'nouveau',       source:'Partenaire',   comment:'',                                          group_id:'leads', assigned_to:null,    created_at:past(1) }),
      mkLead({ first_name:'Camille',   last_name:'Roux',      phone:'0699887766', email:'camille.roux@example.fr',   address:'4 chemin des Peupliers',  city:'Rennes',     postal_code:'35000', status:'en_cours',      source:'Site web',     comment:'Devis envoyé par email.',                   group_id:'leads', assigned_to:agentId, created_at:past(2) }),
      mkLead({ first_name:'Julien',    last_name:'Simon',     phone:'0633445566', email:'julien.simon@hotmail.fr',   address:'30 rue Pasteur',          city:'Lille',      postal_code:'59000', status:'rappel',        source:'Email',        comment:'Demande de rappel lundi 14h.',               group_id:'leads', assigned_to:agentId, created_at:past(3) }),
      mkLead({ first_name:'Céline',    last_name:'Durand',    phone:'0644556677', email:'celine.durand@outlook.fr',  address:'6 allée des Roses',       city:'Nice',       postal_code:'06000', status:'nouveau',       source:'Téléphone',    comment:'',                                          group_id:'leads', assigned_to:null,    created_at:past(0) }),
      // ── Groupe DATA (fichier brut) ────────────────────────────
      mkLead({ first_name:'François',  last_name:'Garnier',   phone:'0755667788', email:'f.garnier@mail.fr',         address:'11 rue des Acacias',      city:'Tours',      postal_code:'37000', status:'nouveau',       source:'Achat fichier',comment:'',                                          group_id:'data', assigned_to:null,    created_at:past(7) }),
      mkLead({ first_name:'Aurélie',   last_name:'Morin',     phone:'0766778899', email:'aurelie.morin@mail.fr',     address:'25 bd de la Mer',         city:'Montpellier',postal_code:'34000', status:'nouveau',       source:'Achat fichier',comment:'',                                          group_id:'data', assigned_to:null,    created_at:past(7) }),
      mkLead({ first_name:'Patrick',   last_name:'Fontaine',  phone:'0744556699', email:'p.fontaine@gmail.com',      address:'2 rue Victor Hugo',       city:'Grenoble',   postal_code:'38000', status:'nouveau',       source:'Achat fichier',comment:'',                                          group_id:'data', assigned_to:agentId, created_at:past(7) }),
      mkLead({ first_name:'Nathalie',  last_name:'Henry',     phone:'0733221144', email:'nathalie.henry@sfr.fr',     address:'18 place de la Liberté',  city:'Dijon',      postal_code:'21000', status:'nouveau',       source:'Achat fichier',comment:'',                                          group_id:'data', assigned_to:agentId, created_at:past(7) }),
      mkLead({ first_name:'Sébastien', last_name:'David',     phone:'0722334455', email:'s.david@free.fr',           address:'7 rue de la Fontaine',    city:'Angers',     postal_code:'49000', status:'nouveau',       source:'Achat fichier',comment:'',                                          group_id:'data', assigned_to:null,    created_at:past(7) }),
      mkLead({ first_name:'Laetitia',  last_name:'Brun',      phone:'0711223300', email:'laetitia.brun@orange.fr',   address:'33 rue Nationale',        city:'Clermont',   postal_code:'63000', status:'nouveau',       source:'Achat fichier',comment:'',                                          group_id:'data', assigned_to:null,    created_at:past(7) }),
      mkLead({ first_name:'Mathieu',   last_name:'Perrin',    phone:'0788990011', email:'m.perrin@gmail.com',        address:'14 avenue de Lyon',       city:'Metz',       postal_code:'57000', status:'en_cours',      source:'Achat fichier',comment:'Rappel pris en charge.',                    group_id:'data', assigned_to:agentId, created_at:past(5) }),
      mkLead({ first_name:'Virginie',  last_name:'Renaud',    phone:'0777888999', email:'virginie.renaud@mail.fr',   address:'5 rue de la Gare',        city:'Reims',      postal_code:'51100', status:'nouveau',       source:'Achat fichier',comment:'',                                          group_id:'data', assigned_to:null,    created_at:past(7) }),
      mkLead({ first_name:'Rémi',      last_name:'Chevalier', phone:'0766554433', email:'remi.chevalier@hotmail.fr', address:'10 allée des Pins',       city:'Rouen',      postal_code:'76000', status:'ne_repond_pas', source:'Achat fichier',comment:'Pas décroché.',                              group_id:'data', assigned_to:agentId, created_at:past(4) }),
      mkLead({ first_name:'Élodie',    last_name:'Lambert',   phone:'0755443322', email:'elodie.lambert@exemple.fr', address:'28 rue de la Mairie',     city:'Caen',       postal_code:'14000', status:'nouveau',       source:'Achat fichier',comment:'',                                          group_id:'data', assigned_to:null,    created_at:past(7) }),
    ];
    write(KEY_LEADS, testLeads);
  }

  // seed / migrate groups — always ensure builtin groups exist
  const storedGroups = read(KEY_GROUPS);
  if (!storedGroups || storedGroups.length === 0) {
    write(KEY_GROUPS, DEFAULT_GROUPS);
  } else {
    const hasAllBuiltin = DEFAULT_GROUPS.every(d => storedGroups.find(g => g.id === d.id));
    if (!hasAllBuiltin) {
      const merged = [
        ...DEFAULT_GROUPS.filter(d => !storedGroups.find(g => g.id === d.id)),
        ...storedGroups,
      ];
      write(KEY_GROUPS, merged);
    }
  }
  if (!read(KEY_SETTINGS)) write(KEY_SETTINGS, { theme: 'dark' });
}

// ─── Users ────────────────────────────────────────────────────────────────────
export function getUsers(){ return read(KEY_USERS) || []; }
export function findUserByEmail(email){ if(!email) return null; return getUsers().find(u => u.email.toLowerCase()===email.toLowerCase()); }
export function createUser({email,password,role='agent',full_name}){
  const users = getUsers();
  const u = { id: uid('u'), email, password, role, full_name, active: true };
  users.push(u); write(KEY_USERS, users); return u;
}
export function updateUser(id, patch){ const users = getUsers(); const i = users.findIndex(u=>u.id===id); if(i>-1){ users[i] = {...users[i], ...patch}; write(KEY_USERS, users); return users[i]; } return null; }
export function deleteUser(id){ const users = getUsers().filter(u=>u.id!==id); write(KEY_USERS, users); }

// Change user password with audit
export function changeUserPassword(id, newPassword, actorId){
  const users = getUsers();
  const i = users.findIndex(u=>u.id===id);
  if(i===-1) return null;
  users[i].password = newPassword;
  users[i].last_password_changed_at = new Date().toISOString();
  users[i].history = users[i].history || [];
  users[i].history.unshift({ id: uid('uh'), user_id: actorId || null, action: 'password_changed', note: 'Mot de passe changé par admin', created_at: new Date().toISOString() });
  write(KEY_USERS, users);
  // signal other tabs to force logout for that user
  try { localStorage.setItem(`crm_force_logout_${id}`, String(Date.now())); } catch(e){}
  return users[i];
}

export function loginUser({email,password}){
  const u = findUserByEmail(email);
  if (!u) return null;
  if (u.active === false) return null;
  if (u.password !== password) return null;
  return { id: u.id, email: u.email, role: u.role, full_name: u.full_name };
}

// ─── Statuses ─────────────────────────────────────────────────────────────────
export function getStatuses(){ return read(KEY_STATUSES) || DEFAULT_STATUSES; }

export function createStatus({ label, color }){
  const statuses = getStatuses();
  const id = label.toLowerCase().trim().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
  if (!id) return null;
  if (statuses.find(s => s.id === id)) return null;
  const s = { id, label: label.trim(), color: color || '#8e8e93', builtin: false };
  statuses.push(s);
  write(KEY_STATUSES, statuses);
  return s;
}

export function updateStatus(id, patch){
  const statuses = getStatuses();
  const i = statuses.findIndex(s => s.id === id);
  if (i === -1) return null;
  statuses[i] = { ...statuses[i], ...patch };
  write(KEY_STATUSES, statuses);
  return statuses[i];
}

export function deleteStatus(id){
  const statuses = getStatuses();
  const s = statuses.find(x => x.id === id);
  if (!s) return false;
  write(KEY_STATUSES, statuses.filter(x => x.id !== id));
  return true;
}

// ─── Groups ───────────────────────────────────────────────────────────────────
export function getGroups(){ return read(KEY_GROUPS) || DEFAULT_GROUPS; }
export function createGroup({ name, description, color }){ const groups = getGroups(); const g = { id: uid('g'), name, description: description || '', color: color || '#60a5fa', builtin: false }; groups.push(g); write(KEY_GROUPS, groups); return g; }
export function updateGroup(id, patch){ const groups = getGroups(); const i = groups.findIndex(g=>g.id===id); if(i>-1){ groups[i] = {...groups[i], ...patch}; write(KEY_GROUPS, groups); return groups[i]; } return null; }
export function deleteGroup(id){ const groups = getGroups(); const g = groups.find(x=>x.id===id); if(!g || g.builtin) return false; write(KEY_GROUPS, groups.filter(x=>x.id!==id)); return true; }

// ─── Leads ────────────────────────────────────────────────────────────────────
export function getLeads(){ return read(KEY_LEADS) || []; }
export function findLeadById(id){ return getLeads().find(l=>l.id===id); }

function leadHistoryEntry(userId, action, note){
  const actor = userId ? getUsers().find(u => u.id === userId) : null;
  return {
    id: uid('h'),
    user_id: userId || null,
    user_name: actor ? (actor.full_name || actor.email) : null,
    action,
    note,
    created_at: new Date().toISOString(),
  };
}

export function createLead(data, currentUserId){
  const leads = getLeads();
  const l = {
    id: uid('l'),
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    address: data.address || '',
    city: data.city || '',
    postal_code: data.postal_code || '',
    phone: data.phone || '',
    phone_normalized: normalizePhone(data.phone || ''),
    email: data.email || '',
    email_lower: (data.email || '').toLowerCase(),
    status: data.status || 'nouveau',
    source: data.source || '',
    comment: data.comment || '',
    group_id: data.group_id || null,
    assigned_to: data.assigned_to || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    history: [leadHistoryEntry(currentUserId, 'created', 'Création manuelle')]
  };
  leads.unshift(l); write(KEY_LEADS, leads); return l;
}

export function updateLead(id, patch, currentUserId){
  const leads = getLeads(); const i = leads.findIndex(x=>x.id===id); if(i===-1) return null;
  const old = leads[i]; const updated = {...old, ...patch, updated_at: new Date().toISOString()};
  const statuses = getStatuses();
  Object.keys(patch).forEach(k => {
    if (k === 'comment'){
      updated.history = updated.history || [];
      updated.history.unshift(leadHistoryEntry(currentUserId, 'comment', String(patch[k])));
    } else if (k === 'status' && old[k] !== patch[k]){
      const oldLabel = statuses.find(s => s.id === old[k])?.label || old[k];
      const newLabel = statuses.find(s => s.id === patch[k])?.label || patch[k];
      updated.history = updated.history || [];
      updated.history.unshift(leadHistoryEntry(currentUserId, 'status_changed', `${oldLabel} → ${newLabel}`));
    } else if (old[k] !== patch[k]){
      updated.history = updated.history || [];
      updated.history.unshift(leadHistoryEntry(currentUserId, 'updated', `${k} → ${String(patch[k])}`));
    }
  });
  leads[i] = updated; write(KEY_LEADS, leads); return updated;
}

export function deleteLead(id){ const leads = getLeads().filter(l=>l.id!==id); write(KEY_LEADS, leads); }

export function addCommentToLead(id, note, currentUserId){
  const lead = findLeadById(id); if(!lead) return null;
  const entry = leadHistoryEntry(currentUserId, 'comment', note);
  lead.history = lead.history || [];
  lead.history.unshift(entry);
  lead.comment = note;
  lead.updated_at = new Date().toISOString();
  updateLead(id, { comment: note }, currentUserId);
  return lead;
}

export function detectDuplicate({email, phone}){
  const leads = getLeads();
  const emailLower = (email||'').toLowerCase();
  const phoneNorm = normalizePhone(phone||'');
  const dupEmail = emailLower ? leads.find(l=>l.email_lower===emailLower) : null;
  const dupPhone = phoneNorm ? leads.find(l=>l.phone_normalized===phoneNorm) : null;
  return { dupEmail, dupPhone };
}

export function roundRobinAssign(leadIds = [], agentIds = null, currentUserId = null){
  const actor = getUsers().find(u=>u.id===currentUserId);
  if(!actor || actor.role !== 'admin') return [];
  const agents = agentIds && agentIds.length ? agentIds : getUsers().filter(u=>u.role!=='admin').map(u=>u.id);
  if(!agents || agents.length===0) return [];
  const settings = read(KEY_SETTINGS) || {};
  let idx = settings.__last_rr_index || 0;
  const updated = [];
  leadIds.forEach((leadId)=>{
    const agent = agents[idx % agents.length];
    const res = updateLead(leadId, { assigned_to: agent }, currentUserId);
    if(res) updated.push(res);
    idx = idx + 1;
  });
  settings.__last_rr_index = idx % agents.length;
  write(KEY_SETTINGS, settings);
  return updated;
}

export function assignLead(leadId, userId, currentUserId){
  const lead = findLeadById(leadId); if(!lead) return null;
  const actor = getUsers().find(u=>u.id===currentUserId);
  if(!actor || actor.role !== 'admin') return null;
  return updateLead(leadId, { assigned_to: userId }, currentUserId);
}

export function importCSV(csvText, { groupId=null, source=null, currentUserId=null }={}){
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length===0) return { total:0, imported:0, duplicates:0, errors:0, errors_list:[] };
  const delim = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delim).map(h=>h.trim().toLowerCase());
  let imported = 0, duplicates = 0, errors = 0; const errors_list = [];
  for (let i=1;i<lines.length;i++){
    const parts = lines[i].split(delim).map(p=>p.trim());
    if (parts.length===0) continue;
    const row = {};
    headers.forEach((h,idx)=> row[h]=parts[idx]||'');
    const candidate = {
      first_name: row.first_name||row.prenom||row.firstname||'',
      last_name: row.last_name||row.nom||row.lastname||'',
      phone: row.phone||row.telephone||row.tele||'',
      email: row.email||row.mail||'',
      address: row.address||row.adresse||'',
      city: row.city||'',
      postal_code: row.postal_code||row.code_postal||'',
      comment: row.comment||row.note||'',
      source: row.source||source||'',
      group_id: groupId
    };
    const d = detectDuplicate(candidate);
    if (d.dupEmail || d.dupPhone){ duplicates++; continue; }
    try{ createLead(candidate, currentUserId); imported++; }catch(e){ errors++; errors_list.push({row:i+1,error:e.message}); }
  }
  return { total: lines.length-1, imported, duplicates, errors, errors_list };
}

// ─── Advanced CSV import ──────────────────────────────────────────────────────

const CSV_COLUMN_ALIASES = {
  first_name:  ['prenom','prénom','firstname','first_name','givenname','given_name','nom de baptême'],
  last_name:   ['nom','name','lastname','last_name','surname','nom_famille','nom de famille'],
  phone:       ['tel','tél','telephone','téléphone','phone','mobile','portable','numero','numéro','gsm','cellulaire'],
  email:       ['email','mail','courriel','e-mail','adresse mail'],
  address:     ['adresse','address','rue','voie','adresse postale'],
  city:        ['ville','city','commune','localite','localité','municipalité'],
  postal_code: ['code_postal','codepostal','cp','postal_code','zip','code postal','code postale'],
  source:      ['source','origine','origin','provenance','canal'],
  comment:     ['commentaire','note','notes','remarque','remarques','comment','observations'],
};

function normHeader(h) {
  return h.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function detectDelim(firstLine) {
  const counts = { ';': 0, ',': 0, '\t': 0 };
  for (const c of firstLine) if (c in counts) counts[c]++;
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
}

function parseCSVLine(line, delim) {
  const fields = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i+1] === '"') { cur += '"'; i++; }
        else inQuote = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === delim) {
      fields.push(cur.trim()); cur = '';
    } else cur += ch;
  }
  fields.push(cur.trim());
  return fields;
}

function parseRawCSV(text) {
  const lines = text.split(/\r?\n/);
  const nonEmpty = lines.filter(l => l.trim());
  if (!nonEmpty.length) return { headers: [], rows: [] };
  const delim = detectDelim(nonEmpty[0]);
  const headers = parseCSVLine(nonEmpty[0], delim).map(h => h.replace(/^["']|["']$/g, '').trim());
  const rows = [];
  for (let i = 1; i < nonEmpty.length; i++) {
    const fields = parseCSVLine(nonEmpty[i], delim);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (fields[idx] || '').replace(/^["']|["']$/g, '').trim(); });
    rows.push(row);
  }
  return { headers, rows, delim };
}

function autoMapColumns(headers) {
  const mapping = {};
  headers.forEach(h => {
    const norm = normHeader(h);
    let matched = '';
    for (const [field, aliases] of Object.entries(CSV_COLUMN_ALIASES)) {
      if (aliases.includes(norm) || aliases.includes(h.toLowerCase())) {
        matched = field; break;
      }
    }
    mapping[h] = matched;
  });
  return mapping;
}

export function previewCSV(text) {
  const { headers, rows } = parseRawCSV(text);
  const mapping = autoMapColumns(headers);
  const unmapped = headers.filter(h => !mapping[h]);
  return {
    headers,
    rows,
    mapping,
    preview: rows.slice(0, 5),
    total: rows.length,
    unmapped,
  };
}

export function analyzeImport(text, mapping) {
  const { rows } = parseRawCSV(text);
  const existingLeads = read(KEY_LEADS) || [];
  let newLeads = 0, internalDups = 0, existingDups = 0;
  const seenPhones = new Set();
  const seenEmails = new Set();
  rows.forEach(row => {
    const phone = row[Object.keys(mapping).find(h => mapping[h] === 'phone')] || '';
    const email = row[Object.keys(mapping).find(h => mapping[h] === 'email')] || '';
    const phoneNorm = phone.replace(/\D/g, '');
    const emailNorm = email.toLowerCase().trim();
    // Check internal dups within the import file itself
    const intDupPhone = phoneNorm && seenPhones.has(phoneNorm);
    const intDupEmail = emailNorm && seenEmails.has(emailNorm);
    if (intDupPhone || intDupEmail) { internalDups++; return; }
    if (phoneNorm) seenPhones.add(phoneNorm);
    if (emailNorm) seenEmails.add(emailNorm);
    // Check against existing DB
    const d = detectDuplicate({ phone, email });
    if (d.dupPhone || d.dupEmail) { existingDups++; }
    else newLeads++;
  });
  return { total: rows.length, newLeads, internalDups, existingDups };
}

export function importCSVAdvanced(text, {
  mapping = {},
  groupId = null,
  status = 'nouveau',
  source = null,
  dupPolicy = 'skip', // 'skip' | 'overwrite' | 'import'
  currentUserId = null,
} = {}) {
  const { rows } = parseRawCSV(text);
  let imported = 0, duplicates = 0, overwrote = 0, errors = 0;
  const errors_list = [];
  const seenPhones = new Set();
  const seenEmails = new Set();

  // Build reverse mapping: fieldName -> header
  const fieldToHeader = {};
  Object.entries(mapping).forEach(([h, f]) => { if (f) fieldToHeader[f] = h; });

  const getField = (row, field) => row[fieldToHeader[field]] || '';

  rows.forEach((row, idx) => {
    try {
      const phone = getField(row, 'phone');
      const email = getField(row, 'email');
      const phoneNorm = phone.replace(/\D/g, '');
      const emailNorm = email.toLowerCase().trim();

      // Internal dup check
      const intDup = (phoneNorm && seenPhones.has(phoneNorm)) || (emailNorm && seenEmails.has(emailNorm));
      if (intDup) { duplicates++; return; }
      if (phoneNorm) seenPhones.add(phoneNorm);
      if (emailNorm) seenEmails.add(emailNorm);

      const candidate = {
        first_name:  getField(row, 'first_name'),
        last_name:   getField(row, 'last_name'),
        phone,
        email,
        address:     getField(row, 'address'),
        city:        getField(row, 'city'),
        postal_code: getField(row, 'postal_code'),
        comment:     getField(row, 'comment'),
        source:      getField(row, 'source') || source || '',
        status,
        group_id:    groupId,
      };

      const d = detectDuplicate(candidate);
      const dup = d.dupPhone || d.dupEmail;

      if (dup) {
        if (dupPolicy === 'skip') { duplicates++; return; }
        if (dupPolicy === 'overwrite') {
          const existingId = (d.dupPhone || d.dupEmail).id;
          updateLead(existingId, candidate, currentUserId);
          overwrote++; return;
        }
        // 'import' → fall through to create
      }

      createLead(candidate, currentUserId);
      imported++;
    } catch (e) {
      errors++;
      errors_list.push({ row: idx + 2, error: e.message });
    }
  });

  return { total: rows.length, imported, duplicates, overwrote, errors, errors_list };
}

export function computeStats({from=null,to=null,agentId=null}={}){
  const leads = getLeads();
  const filtered = leads.filter(l=>{
    if (agentId && l.assigned_to !== agentId) return false;
    if (from && new Date(l.created_at) < new Date(from)) return false;
    if (to && new Date(l.created_at) > new Date(to)) return false;
    return true;
  });
  const counts = {};
  getStatuses().forEach(s => { counts[s.id] = 0; });
  filtered.forEach(l => { counts[l.status] = (counts[l.status]||0) + 1; });
  return { total: filtered.length, byStatus: counts };
}

// ─── Login Logs ───────────────────────────────────────────────────────────────
function parseUA(ua) {
  if (!ua) return { browser: '—', os: '—' };
  let browser = 'Autre';
  if (/Edg\//.test(ua))          browser = 'Edge';
  else if (/OPR\//.test(ua))     browser = 'Opera';
  else if (/Chrome\//.test(ua))  browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua))  browser = 'Safari';

  let os = 'Autre';
  if (/Windows NT 10/.test(ua))      os = 'Windows 10/11';
  else if (/Windows NT 6\.3/.test(ua)) os = 'Windows 8.1';
  else if (/Windows/.test(ua))       os = 'Windows';
  else if (/Mac OS X/.test(ua))      os = 'macOS';
  else if (/Android/.test(ua))       os = 'Android';
  else if (/iPhone|iPad/.test(ua))   os = 'iOS';
  else if (/Linux/.test(ua))         os = 'Linux';

  return { browser, os };
}

export function logLogin(userId) {
  const users = getUsers();
  const u = users.find(x => x.id === userId);
  const ua = navigator.userAgent || '';
  const { browser, os } = parseUA(ua);
  const entry = {
    id: uid('log'),
    user_id: userId,
    user_name: u ? (u.full_name || u.email) : '—',
    user_email: u ? u.email : '—',
    user_role: u ? u.role : '—',
    browser,
    os,
    user_agent: ua,
    logged_at: new Date().toISOString(),
  };
  const logs = read(KEY_LOGS) || [];
  logs.unshift(entry);
  write(KEY_LOGS, logs.slice(0, MAX_LOGS));
}

export function getLogs() { return read(KEY_LOGS) || []; }
export function clearLogs() { write(KEY_LOGS, []); }

// ─── Reminders ────────────────────────────────────────────────────────────────
const KEY_REMINDERS = 'crm_reminders_v1';

export function getReminders() { return read(KEY_REMINDERS) || []; }

export function createReminder({ lead_id, lead_name, lead_phone, agent_id, agent_name, scheduled_at, note = '' }) {
  const reminders = getReminders();
  const r = {
    id: uid('rem'),
    lead_id, lead_name, lead_phone,
    agent_id, agent_name,
    scheduled_at,
    note,
    status: 'pending', // pending | done | cancelled
    notified_pre: false,
    notified_main: false,
    created_at: new Date().toISOString(),
    done_at: null,
  };
  reminders.unshift(r);
  write(KEY_REMINDERS, reminders);
  return r;
}

export function updateReminder(id, patch) {
  const reminders = getReminders();
  const i = reminders.findIndex(r => r.id === id);
  if (i === -1) return null;
  reminders[i] = { ...reminders[i], ...patch };
  write(KEY_REMINDERS, reminders);
  return reminders[i];
}

export function deleteReminder(id) {
  write(KEY_REMINDERS, getReminders().filter(r => r.id !== id));
}

export default {
  initStorage,
  getUsers, findUserByEmail, createUser, updateUser, deleteUser, loginUser,
  changeUserPassword,
  getStatuses, createStatus, updateStatus, deleteStatus,
  getLeads, findLeadById, createLead, updateLead, deleteLead,
  addCommentToLead, detectDuplicate,
  importCSV,
  getGroups, createGroup, updateGroup, deleteGroup,
  roundRobinAssign, assignLead,
  computeStats,
  logLogin, getLogs, clearLogs,
  getReminders, createReminder, updateReminder, deleteReminder,
};
