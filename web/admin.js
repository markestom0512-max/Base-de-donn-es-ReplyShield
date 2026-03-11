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
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    loadData();
  });
});

// ── Data loading ──────────────────────────────────────────
async function loadData() {
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
