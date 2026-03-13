/* ============================================================
   ReplyShield — Admin Dashboard JS
   ============================================================ */

'use strict';

// ── Init Supabase ─────────────────────────────────────────
const CONFIG_OK = window.SUPABASE_URL && !window.SUPABASE_URL.includes('VOTRE_PROJECT_ID');

let sb;
try {
  if (!window.supabase) throw new Error('La librairie Supabase ne s\'est pas chargée. Vérifiez votre connexion internet.');
  if (!CONFIG_OK)       throw new Error('Remplissez SUPABASE_URL et SUPABASE_ANON_KEY dans web/config.js avant d\'utiliser l\'admin.');
  sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
} catch (e) {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0b0f;font-family:Inter,sans-serif;padding:24px">
      <div style="background:#111318;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:36px;max-width:460px;width:100%;text-align:center">
        <div style="font-size:1.4rem;font-weight:800;margin-bottom:16px;color:#e8eaf0">Reply<span style="color:#6c63ff">Shield</span></div>
        <p style="color:#ef4444;font-size:.95rem;line-height:1.6;margin-bottom:20px">${e.message}</p>
        <p style="color:#8b90a0;font-size:.82rem">Consultez la console (F12) pour plus de détails.</p>
      </div>
    </div>`;
  throw e;
}

// ── State ─────────────────────────────────────────────────
let currentTab    = 'contacts';
let allRows       = [];
let currentRowId  = null;

// Colonnes par table
const COLUMNS = {
  contacts: [
    { key: 'created_at', label: 'Date',       render: fmtDate },
    { key: 'name',       label: 'Nom' },
    { key: 'company',    label: 'Entreprise' },
    { key: 'email',      label: 'Email' },
    { key: 'service',    label: 'Service',    render: fmtService },
    { key: 'message',    label: 'Message' },
    { key: 'status',     label: 'Statut',     render: fmtBadge },
  ],
  devis: [
    { key: 'created_at',   label: 'Date',       render: fmtDate },
    { key: 'name',         label: 'Nom' },
    { key: 'company',      label: 'Entreprise' },
    { key: 'email',        label: 'Email' },
    { key: 'phone',        label: 'Téléphone' },
    { key: 'service_type', label: 'Service' },
    { key: 'budget',       label: 'Budget' },
    { key: 'status',       label: 'Statut',     render: fmtBadge },
  ],
};

const MODAL_FIELDS = {
  contacts: [
    { key: 'created_at',   label: 'Date',        render: fmtDate },
    { key: 'name',         label: 'Nom' },
    { key: 'company',      label: 'Entreprise' },
    { key: 'email',        label: 'Email' },
    { key: 'service',      label: 'Service',     render: fmtService },
    { key: 'message',      label: 'Message' },
    { key: 'notes',        label: 'Notes',        hide: true },
  ],
  devis: [
    { key: 'created_at',   label: 'Date',        render: fmtDate },
    { key: 'name',         label: 'Nom' },
    { key: 'company',      label: 'Entreprise' },
    { key: 'email',        label: 'Email' },
    { key: 'phone',        label: 'Téléphone' },
    { key: 'service_type', label: 'Service' },
    { key: 'budget',       label: 'Budget' },
    { key: 'description',  label: 'Description' },
    { key: 'notes',        label: 'Notes',        hide: true },
  ],
};

const SERVICE_LABELS = {
  reply:   'Réponses avis Google',
  site:    'Création de site web',
  both:    'Les deux',
};

// ── Helpers ───────────────────────────────────────────────
function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function fmtBadge(v) {
  const labels = { nouveau: 'Nouveau', en_cours: 'En cours', traite: 'Traité' };
  return `<span class="badge badge-${v}">${labels[v] || v}</span>`;
}

function fmtService(v) {
  return SERVICE_LABELS[v] || v || '—';
}

function escHtml(str) {
  if (!str) return '—';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Auth ──────────────────────────────────────────────────
const loginScreen = document.getElementById('loginScreen');
const dashboard   = document.getElementById('dashboard');
const loginForm   = document.getElementById('loginForm');
const loginError  = document.getElementById('loginError');
const loginBtn    = document.getElementById('loginBtn');
const adminEmail  = document.getElementById('adminEmail');
const logoutBtn   = document.getElementById('logoutBtn');

async function checkSession() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      showDashboard(session.user.email);
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

function showLogin() {
  loginScreen.hidden = false;
  dashboard.hidden   = true;
}

function showDashboard(email) {
  loginScreen.hidden = true;
  dashboard.hidden   = false;
  adminEmail.textContent = email;
  loadData();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  loginBtn.textContent = 'Connexion…';
  loginBtn.disabled = true;

  try {
    const { error } = await sb.auth.signInWithPassword({
      email:    document.getElementById('loginEmail').value.trim(),
      password: document.getElementById('loginPassword').value,
    });

    if (error) throw error;

    const { data: { user } } = await sb.auth.getUser();
    showDashboard(user.email);
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('Invalid login') || msg.includes('invalid_grant')) {
      loginError.textContent = 'Email ou mot de passe incorrect.';
    } else if (msg.includes('Email not confirmed')) {
      loginError.textContent = 'Email non confirmé. Vérifiez votre boîte mail ou désactivez la confirmation dans Supabase > Authentication > Providers > Email.';
    } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) {
      loginError.textContent = 'Impossible de contacter Supabase. Vérifiez votre SUPABASE_URL dans config.js et votre connexion internet.';
    } else {
      loginError.textContent = `Erreur : ${msg}`;
    }
    loginError.hidden = false;
    loginBtn.textContent = 'Se connecter';
    loginBtn.disabled = false;
  }
});

logoutBtn.addEventListener('click', async () => {
  await sb.auth.signOut();
  showLogin();
});

// ── Tabs ──────────────────────────────────────────────────
const filtersDefault  = document.getElementById('filtersDefault');
const filtersAvis     = document.getElementById('filtersAvis');
const filtersClients  = document.getElementById('filtersClients');
const tableWrapper    = document.getElementById('tableWrapper');
const avisWrapper     = document.getElementById('avisWrapper');
const clientsWrapper  = document.getElementById('clientsWrapper');

function switchTab(tabName) {
  currentTab = tabName;

  const isDefault  = tabName === 'contacts' || tabName === 'devis';
  const isAvis     = tabName === 'avis';
  const isClients  = tabName === 'clients';

  filtersDefault.hidden  = !isDefault;
  filtersAvis.hidden     = !isAvis;
  filtersClients.hidden  = !isClients;

  tableWrapper.hidden    = !isDefault;
  avisWrapper.hidden     = !isAvis;
  clientsWrapper.hidden  = !isClients;

  loadData();
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    switchTab(tab.dataset.tab);
  });
});

// ── Data loading ──────────────────────────────────────────
async function loadData() {
  if (currentTab === 'avis')    { loadAvis();    return; }
  if (currentTab === 'clients') { loadClients(); return; }

  document.getElementById('tableBody').innerHTML =
    '<tr><td colspan="99" class="table-empty">Chargement…</td></tr>';

  const { data, error } = await sb
    .from(currentTab)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('tableBody').innerHTML =
      `<tr><td colspan="99" class="table-empty">Erreur : ${escHtml(error.message)}</td></tr>`;
    return;
  }

  allRows = data || [];
  renderTable(allRows);
  updateStats(allRows);
}

// ── Avis Google ────────────────────────────────────────────
let allAvis = [];

async function loadAvis() {
  const grid = document.getElementById('avisGrid');
  grid.innerHTML = '<div class="table-empty">Chargement…</div>';

  const { data, error } = await sb
    .from('avis_google')
    .select('*, clients(name, company, sector)')
    .order('created_at', { ascending: false });

  if (error) {
    grid.innerHTML = `<div class="table-empty">Erreur : ${escHtml(error.message)}</div>`;
    return;
  }

  allAvis = data || [];
  renderAvis(allAvis);
}

function renderAvis(rows) {
  const grid = document.getElementById('avisGrid');

  if (!rows.length) {
    grid.innerHTML = '<div class="table-empty">Aucun avis pour le moment</div>';
    return;
  }

  grid.innerHTML = rows.map(avis => {
    const stars    = '⭐'.repeat(avis.rating || 0) + '☆'.repeat(5 - (avis.rating || 0));
    const client   = avis.clients ? `${avis.clients.company || avis.clients.name}` : '—';
    const date     = avis.review_date ? fmtDate(avis.review_date) : fmtDate(avis.created_at);
    const statusCls = { repondu: 'badge-done', en_attente: 'badge-progress', erreur: 'badge-danger', nouveau: 'badge-new' }[avis.status] || '';
    const statusLbl = { repondu: 'Répondu ✅', en_attente: 'En attente ⏳', erreur: 'Erreur ❌', nouveau: 'Nouveau' }[avis.status] || avis.status;

    return `
      <div class="avis-card">
        <div class="avis-card-header">
          <div>
            <div class="avis-reviewer">${escHtml(avis.reviewer_name || 'Anonyme')}</div>
            <div class="avis-client">${escHtml(client)}</div>
          </div>
          <div class="avis-meta">
            <div class="avis-stars">${stars}</div>
            <span class="badge ${statusCls}">${statusLbl}</span>
          </div>
        </div>
        ${avis.review_text ? `<p class="avis-text">${escHtml(avis.review_text)}</p>` : '<p class="avis-text avis-no-text">— Avis sans texte —</p>'}
        ${avis.response_text ? `
          <div class="avis-response">
            <div class="avis-response-label">Réponse IA</div>
            <p>${escHtml(avis.response_text)}</p>
          </div>` : ''}
        <div class="avis-footer">${date}</div>
      </div>`;
  }).join('');
}

function applyAvisFilters() {
  const search = document.getElementById('searchAvis').value.toLowerCase();
  const rating = document.getElementById('ratingFilter').value;
  const status = document.getElementById('avisStatusFilter').value;

  const filtered = allAvis.filter(avis => {
    const client = avis.clients ? `${avis.clients.company || avis.clients.name}` : '';
    const matchSearch = !search || [avis.reviewer_name, avis.review_text, client]
      .some(v => v && v.toLowerCase().includes(search));
    const matchRating = !rating || String(avis.rating) === rating;
    const matchStatus = !status || avis.status === status;
    return matchSearch && matchRating && matchStatus;
  });

  renderAvis(filtered);
}

document.getElementById('searchAvis').addEventListener('input', applyAvisFilters);
document.getElementById('ratingFilter').addEventListener('change', applyAvisFilters);
document.getElementById('avisStatusFilter').addEventListener('change', applyAvisFilters);
document.getElementById('refreshAvisBtn').addEventListener('click', loadAvis);

// ── Clients ReplyShield ────────────────────────────────────
let allClients = [];

async function loadClients() {
  document.getElementById('clientsTableBody').innerHTML =
    '<tr><td colspan="99" class="table-empty">Chargement…</td></tr>';

  const { data, error } = await sb
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('clientsTableBody').innerHTML =
      `<tr><td colspan="99" class="table-empty">Erreur : ${escHtml(error.message)}</td></tr>`;
    return;
  }

  allClients = data || [];
  renderClients(allClients);
}

function renderClients(rows) {
  const thead = document.getElementById('clientsTableHead');
  const tbody = document.getElementById('clientsTableBody');

  thead.innerHTML = `<tr>
    <th>Client</th><th>Email</th><th>Secteur</th><th>Ville</th>
    <th>Plan</th><th>Statut</th><th>Google</th><th>Avis répondus</th><th>Depuis</th>
  </tr>`;

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="table-empty">Aucun client pour le moment</td></tr>';
    return;
  }

  const planCls  = { starter: '', pro: 'badge-progress', business: 'badge-new' };
  const statusCls = { actif: 'badge-done', pending: 'badge-new', pause: 'badge-progress', resilie: 'badge-danger' };
  const statusLbl = { actif: 'Actif ✅', pending: 'En attente', pause: 'En pause', resilie: 'Résilié' };

  tbody.innerHTML = rows.map(c => `
    <tr>
      <td><strong>${escHtml(c.name || '—')}</strong><br><span style="color:var(--text-muted);font-size:.82rem">${escHtml(c.company || '')}</span></td>
      <td>${escHtml(c.email)}</td>
      <td>${escHtml(fmtSecteur(c.sector))}</td>
      <td>${escHtml(c.city || '—')}</td>
      <td><span class="badge ${planCls[c.plan] || ''}">${(c.plan || 'starter').charAt(0).toUpperCase() + (c.plan || 'starter').slice(1)}</span></td>
      <td><span class="badge ${statusCls[c.status] || ''}">${statusLbl[c.status] || c.status || '—'}</span></td>
      <td style="text-align:center">${c.google_connected_at ? '✅' : '❌'}</td>
      <td style="text-align:center">${c.total_reviews_answered || 0}</td>
      <td>${fmtDate(c.created_at)}</td>
    </tr>`).join('');
}

function fmtSecteur(s) {
  const map = {
    restauration: 'Restauration', beaute: 'Beauté', automobile: 'Automobile',
    auto_ecole: 'Auto-école', sante: 'Santé', artisanat: 'Artisanat',
    hotellerie: 'Hôtellerie', services: 'Services'
  };
  return map[s] || s || '—';
}

function applyClientsFilters() {
  const search = document.getElementById('searchClients').value.toLowerCase();
  const status = document.getElementById('clientStatusFilter').value;

  const filtered = allClients.filter(c => {
    const matchSearch = !search || [c.name, c.email, c.company]
      .some(v => v && v.toLowerCase().includes(search));
    const matchStatus = !status || c.status === status;
    return matchSearch && matchStatus;
  });

  renderClients(filtered);
}

document.getElementById('searchClients').addEventListener('input', applyClientsFilters);
document.getElementById('clientStatusFilter').addEventListener('change', applyClientsFilters);
document.getElementById('refreshClientsBtn').addEventListener('click', loadClients);

// ── Stats ─────────────────────────────────────────────────
function updateStats(rows) {
  const total    = rows.length;
  const nouveau  = rows.filter(r => r.status === 'nouveau').length;
  const en_cours = rows.filter(r => r.status === 'en_cours').length;
  const traite   = rows.filter(r => r.status === 'traite').length;

  document.querySelector('#statTotal    .stat-value').textContent = total;
  document.querySelector('#statNew      .stat-value').textContent = nouveau;
  document.querySelector('#statProgress .stat-value').textContent = en_cours;
  document.querySelector('#statDone     .stat-value').textContent = traite;
}

// ── Table render ──────────────────────────────────────────
function renderTable(rows) {
  const cols = COLUMNS[currentTab];

  // Header
  document.getElementById('tableHead').innerHTML =
    '<tr>' + cols.map(c => `<th>${c.label}</th>`).join('') + '</tr>';

  // Body
  if (!rows.length) {
    document.getElementById('tableBody').innerHTML =
      `<tr><td colspan="${cols.length}" class="table-empty">Aucune donnée</td></tr>`;
    return;
  }

  document.getElementById('tableBody').innerHTML = rows.map(row =>
    `<tr data-id="${row.id}">` +
      cols.map(c => {
        const raw = row[c.key];
        const val = c.render ? c.render(raw) : escHtml(raw) || '<span style="color:var(--text-muted)">—</span>';
        return `<td>${val}</td>`;
      }).join('') +
    '</tr>'
  ).join('');

  // Row click → open modal
  document.querySelectorAll('#tableBody tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => {
      const row = allRows.find(r => r.id === tr.dataset.id);
      if (row) openModal(row);
    });
  });
}

// ── Filters ───────────────────────────────────────────────
const searchInput  = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const refreshBtn   = document.getElementById('refreshBtn');

function applyFilters() {
  const search = searchInput.value.toLowerCase();
  const status = statusFilter.value;

  const filtered = allRows.filter(row => {
    const matchSearch = !search || [row.name, row.email, row.company]
      .some(v => v && v.toLowerCase().includes(search));
    const matchStatus = !status || row.status === status;
    return matchSearch && matchStatus;
  });

  renderTable(filtered);
  updateStats(filtered);
}

searchInput.addEventListener('input', applyFilters);
statusFilter.addEventListener('change', applyFilters);
refreshBtn.addEventListener('click', loadData);

// ── Modal ─────────────────────────────────────────────────
const modal       = document.getElementById('modal');
const modalClose  = document.getElementById('modalClose');
const modalTitle  = document.getElementById('modalTitle');
const modalFields = document.getElementById('modalFields');
const modalStatus = document.getElementById('modalStatus');
const modalNotes  = document.getElementById('modalNotes');
const modalSave   = document.getElementById('modalSave');
const modalDelete = document.getElementById('modalDelete');

function openModal(row) {
  currentRowId = row.id;
  modalTitle.textContent = `${row.name}${row.company ? ' — ' + row.company : ''}`;

  const fields = MODAL_FIELDS[currentTab].filter(f => !f.hide);
  modalFields.innerHTML = fields.map(f => {
    const raw = row[f.key];
    const val = f.render ? f.render(raw) : escHtml(raw) || '—';
    return `
      <div class="modal-field">
        <span class="modal-field-label">${f.label}</span>
        <span class="modal-field-value">${val}</span>
      </div>`;
  }).join('');

  modalStatus.value = row.status || 'nouveau';
  modalNotes.value  = row.notes  || '';
  modal.hidden = false;
}

function closeModal() {
  modal.hidden = true;
  currentRowId = null;
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

modalSave.addEventListener('click', async () => {
  if (!currentRowId) return;
  modalSave.textContent = 'Enregistrement…';
  modalSave.disabled = true;

  const { error } = await sb
    .from(currentTab)
    .update({ status: modalStatus.value, notes: modalNotes.value })
    .eq('id', currentRowId);

  modalSave.textContent = 'Enregistrer';
  modalSave.disabled = false;

  if (error) {
    alert('Erreur lors de la sauvegarde : ' + error.message);
    return;
  }

  // Update local cache
  const idx = allRows.findIndex(r => r.id === currentRowId);
  if (idx !== -1) {
    allRows[idx].status = modalStatus.value;
    allRows[idx].notes  = modalNotes.value;
  }

  applyFilters();
  closeModal();
});

modalDelete.addEventListener('click', async () => {
  if (!currentRowId) return;
  if (!confirm('Supprimer définitivement cette entrée ?')) return;

  const { error } = await sb
    .from(currentTab)
    .delete()
    .eq('id', currentRowId);

  if (error) {
    alert('Erreur lors de la suppression : ' + error.message);
    return;
  }

  allRows = allRows.filter(r => r.id !== currentRowId);
  applyFilters();
  closeModal();
});

// ── Boot ──────────────────────────────────────────────────
checkSession();
