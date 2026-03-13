// ============================================================
//  ReplyShield — Onboarding Logic
//  Gère le flow 3 étapes : infos client → connexion Google → confirmation
//  Stocke le client dans Supabase table `clients`
// ============================================================

// ── SUPABASE ───────────────────────────────────────────────
let sb = null;

function initSupabase() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;
  try {
    sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  } catch(e) { console.error('Supabase init error:', e); }
}

// ── STATE ──────────────────────────────────────────────────
const state = {
  step:       1,
  prenom:     '',
  nom:        '',
  email:      '',
  tel:        '',
  entreprise: '',
  secteur:    'restauration',
  ville:      '',
  clientId:   null,
  googleConnected: false
};

// ── NAVIGATION ENTRE ÉTAPES ────────────────────────────────
function showStep(n) {
  document.getElementById('step1').hidden = n !== 1;
  document.getElementById('step2').hidden = n !== 2;
  document.getElementById('step3').hidden = n !== 3;
  document.getElementById('obNavStep').textContent   = `Étape ${n} / 3`;
  document.getElementById('obProgressBar').style.width = `${Math.round(n / 3 * 100)}%`;
  state.step = n;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── ÉTAPE 1 → 2 ────────────────────────────────────────────
async function goStep2(e) {
  e.preventDefault();

  state.prenom     = document.getElementById('s1Prenom').value.trim();
  state.nom        = document.getElementById('s1Nom').value.trim();
  state.email      = document.getElementById('s1Email').value.trim();
  state.tel        = document.getElementById('s1Tel').value.trim();
  state.entreprise = document.getElementById('s1Entreprise').value.trim();
  state.secteur    = document.getElementById('s1Secteur').value;
  state.ville      = document.getElementById('s1Ville').value.trim();

  // Créer ou récupérer le client dans Supabase
  await upsertClient();

  showStep(2);
}

async function upsertClient() {
  if (!sb) return;
  try {
    const { data, error } = await sb.from('clients').upsert([{
      name:    `${state.prenom} ${state.nom}`.trim(),
      company: state.entreprise,
      email:   state.email,
      phone:   state.tel,
      sector:  state.secteur,
      city:    state.ville,
      plan:    'starter',
      status:  'pending'
    }], { onConflict: 'email', ignoreDuplicates: false })
    .select('id')
    .single();

    if (error) throw error;
    if (data) state.clientId = data.id;
  } catch(err) {
    console.error('Erreur upsert client:', err);
    // Continue même si erreur (pas bloquant pour le flow)
  }
}

// ── CONNEXION GOOGLE OAUTH ─────────────────────────────────
function startGoogleAuth() {
  // L'URL OAuth Google — en production, remplacer CLIENT_ID et REDIRECT_URI
  const GOOGLE_CLIENT_ID  = window.GOOGLE_CLIENT_ID  || 'VOTRE_GOOGLE_CLIENT_ID';
  const REDIRECT_URI      = window.GOOGLE_REDIRECT_URI || `${window.location.origin}/oauth-callback.html`;

  const params = new URLSearchParams({
    client_id:     GOOGLE_CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/business.manage',
      'https://www.googleapis.com/auth/userinfo.email'
    ].join(' '),
    access_type:   'offline',
    prompt:        'consent',
    state: JSON.stringify({
      clientId:   state.clientId,
      email:      state.email,
      entreprise: state.entreprise
    })
  });

  if (GOOGLE_CLIENT_ID === 'VOTRE_GOOGLE_CLIENT_ID') {
    // Mode démo — simuler la connexion
    simulateGoogleConnection();
    return;
  }

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function simulateGoogleConnection() {
  // Mode démo / test local — simule une connexion Google réussie
  const successEl = document.getElementById('step2Success');
  const errorEl   = document.getElementById('step2Error');
  errorEl.hidden  = true;

  successEl.textContent = '✅ Mode démonstration — Google Business connecté avec succès (simulation)';
  successEl.hidden = false;

  state.googleConnected = true;

  setTimeout(() => goStep3({
    accountId:   'accounts/123456789',
    locationId:  'locations/987654321',
    refreshToken: 'demo_token'
  }), 1500);
}

// ── CONNEXION MANUELLE ─────────────────────────────────────
async function saveManualCredentials() {
  const accountId    = document.getElementById('s2AccountId').value.trim();
  const locationId   = document.getElementById('s2LocationId').value.trim();
  const refreshToken = document.getElementById('s2RefreshToken').value.trim();
  const errorEl      = document.getElementById('step2Error');
  const successEl    = document.getElementById('step2Success');

  errorEl.hidden   = true;
  successEl.hidden = true;

  if (!accountId || !locationId || !refreshToken) {
    errorEl.textContent = 'Veuillez remplir tous les champs (Account ID, Location ID, Refresh Token).';
    errorEl.hidden = false;
    return;
  }

  await saveGoogleCredentials({ accountId, locationId, refreshToken });
  goStep3({ accountId, locationId, refreshToken });
}

async function saveGoogleCredentials({ accountId, locationId, refreshToken }) {
  if (!sb || !state.clientId) return;
  try {
    await sb.from('clients').update({
      google_account_id:    accountId,
      google_location_id:   locationId,
      google_refresh_token: refreshToken,
      google_connected_at:  new Date().toISOString(),
      status: 'actif'
    }).eq('id', state.clientId);
  } catch(err) {
    console.error('Erreur save Google credentials:', err);
  }
}

// ── ÉTAPE 3 : CONFIRMATION ─────────────────────────────────
function goStep3({ accountId, locationId }) {
  // Remplir le résumé
  const summary = document.getElementById('obSummary');
  summary.innerHTML = [
    { label: 'Établissement',   value: state.entreprise },
    { label: 'Secteur',         value: formatSecteur(state.secteur) },
    { label: 'Email',           value: state.email },
    { label: 'Google Account',  value: accountId || '—' },
    { label: 'Google Location', value: locationId || '—' },
    { label: 'Formule',         value: 'Starter — Essai gratuit 14 jours' },
    { label: 'Statut',          value: '🟢 Actif' }
  ].map(item => `
    <div class="ob-summary-item">
      <span>${item.label}</span>
      <span>${item.value}</span>
    </div>
  `).join('');

  showStep(3);
}

// ── CALLBACK OAUTH (résultat du redirect Google) ───────────
function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code   = params.get('code');
  const stateParam = params.get('state');

  if (!code) return;

  // Échanger le code contre un refresh token via N8N webhook
  // (En prod : POST vers un endpoint N8N ou Supabase Edge Function)
  const EXCHANGE_URL = window.OAUTH_EXCHANGE_URL || null;

  if (!EXCHANGE_URL) {
    // Mode dev : afficher le code pour configuration manuelle
    console.log('OAuth code reçu:', code);
    return;
  }

  fetch(EXCHANGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state: stateParam })
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      goStep3({
        accountId:   data.google_account_id,
        locationId:  data.google_location_id,
        refreshToken: '(stocké de façon sécurisée)'
      });
    }
  })
  .catch(err => console.error('OAuth exchange error:', err));
}

// ── HELPERS ───────────────────────────────────────────────
function formatSecteur(s) {
  const map = {
    restauration: 'Restauration', beaute: 'Beauté / Bien-être',
    automobile: 'Automobile',    auto_ecole: 'Auto-école',
    sante: 'Santé / Médical',    artisanat: 'Artisanat / BTP',
    hotellerie: 'Hôtellerie',    services: 'Services'
  };
  return map[s] || s;
}

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();

  // Pré-remplir depuis URL si on revient d'un OAuth callback
  const params = new URLSearchParams(window.location.search);
  if (params.get('code')) {
    handleOAuthCallback();
  }
});
