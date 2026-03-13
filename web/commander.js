// ============================================================
//  ReplyShield — Commander Page Logic
//  Pré-remplit depuis URL params, gère le choix d'offre,
//  soumet le brief dans la table `devis` de Supabase
// ============================================================

// ── INIT SUPABASE ──────────────────────────────────────────
let sb = null;

function initSupabase() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.warn('config.js non chargé — Supabase indisponible');
    return;
  }
  try {
    sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  } catch (e) {
    console.error('Erreur init Supabase:', e);
  }
}

// ── LECTURE PARAMS URL ─────────────────────────────────────
function getParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    nom:     decodeURIComponent(p.get('nom')    || ''),
    secteur: p.get('secteur') || '',
    ville:   decodeURIComponent(p.get('ville')  || ''),
    offre:   p.get('offre')   || 'essentiel',
    prenom:  decodeURIComponent(p.get('prenom') || '')
  };
}

// ── CHOIX D'OFFRE ──────────────────────────────────────────
function setOffre(offre) {
  document.getElementById('offreChoisie').value = offre;
  document.getElementById('btn-essentiel').classList.toggle('active', offre === 'essentiel');
  document.getElementById('btn-premium').classList.toggle('active', offre === 'premium');
}

function choisirOffre(offre) {
  setOffre(offre);
  document.getElementById('brief').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── SOUMISSION BRIEF ───────────────────────────────────────
async function submitBrief(e) {
  e.preventDefault();

  const errorEl   = document.getElementById('cmdError');
  const successEl = document.getElementById('cmdSuccess');
  const submitBtn = document.getElementById('cmdSubmitBtn');

  errorEl.hidden   = true;
  successEl.hidden = true;

  const offre     = document.getElementById('offreChoisie').value;
  const nom       = document.getElementById('fNom').value.trim();
  const entreprise= document.getElementById('fEntreprise').value.trim();
  const email     = document.getElementById('fEmail').value.trim();
  const tel       = document.getElementById('fTel').value.trim();
  const secteur   = document.getElementById('fSecteur').value;
  const ville     = document.getElementById('fVille').value.trim();
  const hasLogo   = document.getElementById('hasLogo').checked;
  const hasPhotos = document.getElementById('hasPhotos').checked;
  const hasSite   = document.getElementById('hasSite').checked;
  const message   = document.getElementById('fMessage').value.trim();
  const siteActuel= document.getElementById('fSiteActuel').value.trim();

  if (!nom || !entreprise || !email || !tel) {
    errorEl.textContent = 'Veuillez remplir tous les champs obligatoires (*)';
    errorEl.hidden = false;
    return;
  }

  const budget = offre === 'premium' ? '1200' : '490';
  const description = JSON.stringify({
    offre,
    secteur,
    ville,
    hasLogo,
    hasPhotos,
    hasSite,
    siteActuel: siteActuel || null,
    message: message || null
  });

  submitBtn.disabled    = true;
  submitBtn.textContent = 'Envoi en cours…';

  if (!sb) {
    // Fallback sans Supabase — simule le succès pour le dev local
    await new Promise(r => setTimeout(r, 800));
    showSuccess(nom, offre);
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Envoyer mon brief →';
    return;
  }

  try {
    const { error } = await sb.from('devis').insert([{
      name:         nom,
      company:      entreprise,
      email:        email,
      phone:        tel,
      service_type: `site_${offre}`,
      budget:       budget,
      description:  description,
      status:       'nouveau'
    }]);

    if (error) throw error;

    showSuccess(nom, offre);
    document.getElementById('cmdForm').reset();
    setOffre('essentiel');

  } catch (err) {
    console.error('Erreur Supabase:', err);
    errorEl.textContent = `Une erreur est survenue : ${err.message || 'réessayez dans quelques instants.'}`;
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Envoyer mon brief →';
  }
}

function showSuccess(nom, offre) {
  const label = offre === 'premium' ? 'Premium (1 200 €)' : 'Essentiel (490 €)';
  const successEl = document.getElementById('cmdSuccess');
  successEl.innerHTML = `
    ✅ <strong>Brief reçu, ${nom} !</strong><br/>
    Formule choisie : <strong>${label}</strong><br/>
    Nous vous recontactons sous 24h pour valider ensemble et lancer la création.
  `;
  successEl.hidden = false;
  successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── PRÉ-REMPLISSAGE DEPUIS URL ─────────────────────────────
function prefillFromParams() {
  const params = getParams();

  if (params.prenom)    document.getElementById('fNom').value = params.prenom;
  if (params.nom)       document.getElementById('fEntreprise').value = params.nom;
  if (params.ville)     document.getElementById('fVille').value = params.ville;

  if (params.secteur) {
    const secteurMap = {
      restauration: 'restauration',
      beaute:       'beaute',
      automobile:   'automobile',
      auto_ecole:   'auto_ecole',
      sante:        'sante',
      artisanat:    'artisanat',
      hotellerie:   'hotellerie',
      services:     'services'
    };
    const sel = document.getElementById('fSecteur');
    const val = secteurMap[params.secteur];
    if (val) sel.value = val;
  }

  setOffre(params.offre === 'premium' ? 'premium' : 'essentiel');
}

// ── NAVBAR SCROLL ──────────────────────────────────────────
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

// ── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  prefillFromParams();
  initNavbar();
});
