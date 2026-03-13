// ============================================================
//  ReplyShield — Preview Generator
//  Génère un aperçu de site web personnalisé à partir des
//  paramètres URL : nom, secteur, ville, note, nb_avis,
//  sans_rep, telephone, adresse, prenom
// ============================================================

// ── VARIANTES DE STYLE PAR SECTEUR ───────────────────────────
// Chaque secteur propose 3 styles : moderne (défaut), élégant, lumineux
const SECTOR_VARIANTS = {
  restauration: [
    { label: 'Chaleureux',  color: '#C0392B', gradient: 'linear-gradient(135deg, #1a0600 0%, #3d1000 100%)' },
    { label: 'Élégant',     color: '#2C3E50', gradient: 'linear-gradient(135deg, #0a0d10 0%, #1a2530 100%)' },
    { label: 'Méditerranée',color: '#1A7F5A', gradient: 'linear-gradient(135deg, #001a10 0%, #003320 100%)' }
  ],
  beaute: [
    { label: 'Rose',        color: '#8E44AD', gradient: 'linear-gradient(135deg, #1a0010 0%, #3d0030 100%)' },
    { label: 'Nude',        color: '#A0522D', gradient: 'linear-gradient(135deg, #1a0d00 0%, #3d1800 100%)' },
    { label: 'Moderne',     color: '#1565C0', gradient: 'linear-gradient(135deg, #000d1a 0%, #001530 100%)' }
  ],
  automobile: [
    { label: 'Bleu acier',  color: '#1565C0', gradient: 'linear-gradient(135deg, #000d1a 0%, #001530 100%)' },
    { label: 'Graphite',    color: '#37474F', gradient: 'linear-gradient(135deg, #0a0d10 0%, #1a252d 100%)' },
    { label: 'Racing',      color: '#B71C1C', gradient: 'linear-gradient(135deg, #1a0000 0%, #3d0000 100%)' }
  ],
  auto_ecole: [
    { label: 'Vert',        color: '#2E7D32', gradient: 'linear-gradient(135deg, #001a00 0%, #003300 100%)' },
    { label: 'Orange',      color: '#E65100', gradient: 'linear-gradient(135deg, #1a0500 0%, #3d1200 100%)' },
    { label: 'Bleu',        color: '#0277BD', gradient: 'linear-gradient(135deg, #000d1a 0%, #001a30 100%)' }
  ],
  sante: [
    { label: 'Teal',        color: '#00838F', gradient: 'linear-gradient(135deg, #001a1c 0%, #003336 100%)' },
    { label: 'Bleu nuit',   color: '#1565C0', gradient: 'linear-gradient(135deg, #000d1a 0%, #001530 100%)' },
    { label: 'Vert sauge',  color: '#388E3C', gradient: 'linear-gradient(135deg, #001a00 0%, #003300 100%)' }
  ],
  artisanat: [
    { label: 'Bois',        color: '#7B3F00', gradient: 'linear-gradient(135deg, #1a0d00 0%, #3d1f00 100%)' },
    { label: 'Ardoise',     color: '#455A64', gradient: 'linear-gradient(135deg, #0a0d10 0%, #1a252d 100%)' },
    { label: 'Terracotta',  color: '#BF360C', gradient: 'linear-gradient(135deg, #1a0500 0%, #3d1000 100%)' }
  ],
  hotellerie: [
    { label: 'Violet',      color: '#6A1B9A', gradient: 'linear-gradient(135deg, #0d001a 0%, #20003d 100%)' },
    { label: 'Or',          color: '#B8860B', gradient: 'linear-gradient(135deg, #1a1000 0%, #3d2800 100%)' },
    { label: 'Minuit',      color: '#1A237E', gradient: 'linear-gradient(135deg, #00001a 0%, #00003d 100%)' }
  ],
  services: [
    { label: 'Gris bleu',   color: '#37474F', gradient: 'linear-gradient(135deg, #0a0d10 0%, #1a252d 100%)' },
    { label: 'Indigo',      color: '#283593', gradient: 'linear-gradient(135deg, #00001a 0%, #00003d 100%)' },
    { label: 'Vert forêt',  color: '#1B5E20', gradient: 'linear-gradient(135deg, #001a00 0%, #003300 100%)' }
  ]
};

const SECTORS = {
  restauration: {
    label: 'Restaurant',
    icon: '🍽️',
    color: '#C0392B',
    gradient: 'linear-gradient(135deg, #1a0600 0%, #3d1000 100%)',
    heroTitle: 'Une cuisine qui vous transporte',
    heroSub: 'Savoureuse, authentique et conviviale — chaque plat est une invitation au voyage.',
    servicesSub: 'Tout ce que nous vous proposons',
    services: [
      { icon: '🍽️', title: 'Déjeuner', desc: 'Formules du midi à partir de 14€, changées chaque semaine.' },
      { icon: '🍷', title: 'Dîner', desc: 'Carte gastronomique et vins soigneusement sélectionnés.' },
      { icon: '🎉', title: 'Privatisation', desc: 'Réservez l\'espace pour vos événements privés ou professionnels.' },
      { icon: '🥡', title: 'À emporter', desc: 'Commandez vos plats préférés et repartez en quelques minutes.' }
    ],
    reviews: [
      {
        name: 'Sophie M.',
        initial: 'S',
        color: '#E74C3C',
        date: 'Il y a 3 jours',
        stars: 5,
        text: 'Excellent repas, service impeccable et cadre très chaleureux. L\'accueil était parfait du début à la fin. Je reviendrai sans hésiter !',
        reply: 'Merci infiniment Sophie pour ce magnifique retour ! Votre satisfaction est notre plus grande récompense. Nous serons ravis de vous accueillir à nouveau très bientôt. À très vite !'
      },
      {
        name: 'Thomas B.',
        initial: 'T',
        color: '#3498DB',
        date: 'Il y a 1 semaine',
        stars: 4,
        text: 'Très bonne adresse, plats généreux et savoureux. Le service pourrait être un peu plus rapide aux heures de pointe mais dans l\'ensemble excellent.',
        reply: 'Merci Thomas pour votre avis constructif ! Nous notons votre remarque sur les délais aux heures de pointe et travaillons à améliorer cela. Heureux que les plats vous aient plu — à bientôt !'
      }
    ],
    contactColor: '#C0392B'
  },

  beaute: {
    label: 'Salon de beauté',
    icon: '✨',
    color: '#8E44AD',
    gradient: 'linear-gradient(135deg, #1a0010 0%, #3d0030 100%)',
    heroTitle: 'Révélez votre beauté naturelle',
    heroSub: 'Expertise, douceur et élégance — parce que vous méritez le meilleur.',
    servicesSub: 'Nos soins et prestations',
    services: [
      { icon: '✂️', title: 'Coupe & Coiffure', desc: 'Coupe, brushing et mise en forme sur mesure.' },
      { icon: '🎨', title: 'Coloration', desc: 'Balayage, mèches et colorations tendance réalisés par des experts.' },
      { icon: '💅', title: 'Manucure & Pédicure', desc: 'Ongles naturels, gel et nail art personnalisé.' },
      { icon: '🌿', title: 'Soins visage', desc: 'Soins hydratants, anti-âge et luminosité.' }
    ],
    reviews: [
      {
        name: 'Camille D.',
        initial: 'C',
        color: '#9B59B6',
        date: 'Il y a 2 jours',
        stars: 5,
        text: 'Super salon ! Je suis ravie de ma coupe et de ma couleur. L\'équipe est professionnelle, à l\'écoute et l\'ambiance est super agréable.',
        reply: 'Merci Camille pour votre confiance et ce beau témoignage ! C\'est un vrai plaisir de prendre soin de vous. Nous vous attendons pour votre prochaine visite !'
      },
      {
        name: 'Léa R.',
        initial: 'L',
        color: '#E91E8C',
        date: 'Il y a 5 jours',
        stars: 5,
        text: 'Prestation parfaite, résultat exactement comme je le souhaitais. La manucure a tenu 3 semaines sans s\'abîmer. Je recommande vivement !',
        reply: 'Merci Léa pour cette belle recommandation ! Nous sommes ravis que la prestation vous ait satisfaite. À très bientôt pour prendre encore soin de vous !'
      }
    ],
    contactColor: '#8E44AD'
  },

  automobile: {
    label: 'Garage automobile',
    icon: '🔧',
    color: '#1565C0',
    gradient: 'linear-gradient(135deg, #000d1a 0%, #001530 100%)',
    heroTitle: 'Votre véhicule entre de bonnes mains',
    heroSub: 'Expertise technique, transparence et réactivité — nous prenons soin de votre voiture.',
    servicesSub: 'Nos prestations mécaniques',
    services: [
      { icon: '🔧', title: 'Entretien', desc: 'Révision complète, vidange et remplacement de filtres.' },
      { icon: '🔩', title: 'Réparation', desc: 'Diagnostic électronique et réparation toutes marques.' },
      { icon: '🚗', title: 'Carrosserie', desc: 'Débosselage, peinture et remplacement de vitres.' },
      { icon: '📋', title: 'Contrôle technique', desc: 'Passage et contre-visite effectués sur place.' }
    ],
    reviews: [
      {
        name: 'Marc L.',
        initial: 'M',
        color: '#1565C0',
        date: 'Il y a 4 jours',
        stars: 5,
        text: 'Intervention rapide et honnête. Devis respecté à l\'euro près, pas de mauvaise surprise. Le technicien a tout expliqué clairement. Je recommande vivement !',
        reply: 'Merci Marc pour ce retour très positif ! La transparence et l\'honnêteté sont au cœur de notre métier. N\'hésitez pas à revenir pour votre prochain entretien. À bientôt !'
      },
      {
        name: 'Julie P.',
        initial: 'J',
        color: '#2E86C1',
        date: 'Il y a 1 semaine',
        stars: 4,
        text: 'Bon garage sérieux. Problème diagnostiqué rapidement et réparé dans les délais annoncés. Prix raisonnables. Je reviendrai.',
        reply: 'Merci Julie pour votre confiance ! Nous faisons notre maximum pour être efficaces et respecter nos engagements. Votre fidélité nous est précieuse. À très bientôt !'
      }
    ],
    contactColor: '#1565C0'
  },

  auto_ecole: {
    label: 'Auto-école',
    icon: '🚗',
    color: '#2E7D32',
    gradient: 'linear-gradient(135deg, #001a00 0%, #003300 100%)',
    heroTitle: 'Votre permis, notre passion',
    heroSub: 'Formateurs certifiés, pédagogie bienveillante et taux de réussite élevé.',
    servicesSub: 'Nos formations',
    services: [
      { icon: '📚', title: 'Code de la route', desc: 'Formation en salle et accès illimité à la plateforme en ligne.' },
      { icon: '🚗', title: 'Conduite', desc: 'Leçons de conduite avec des moniteurs diplômés et patients.' },
      { icon: '⚡', title: 'Permis accéléré', desc: 'Formation intensive pour obtenir votre permis en 3 semaines.' },
      { icon: '🔄', title: 'Conduite accompagnée', desc: 'Formation AAC disponible dès 15 ans.' }
    ],
    reviews: [
      {
        name: 'Thomas R.',
        initial: 'T',
        color: '#2E7D32',
        date: 'Il y a 3 jours',
        stars: 5,
        text: 'J\'ai obtenu mon permis du premier coup grâce à cette auto-école ! Les moniteurs sont patients, pédagogues et vraiment à l\'écoute. Merci à toute l\'équipe !',
        reply: 'Félicitations Thomas pour cette belle réussite ! Toute l\'équipe est très fière de vous. Nous vous souhaitons de belles aventures sur la route. Conduisez prudemment !'
      },
      {
        name: 'Emma V.',
        initial: 'E',
        color: '#388E3C',
        date: 'Il y a 6 jours',
        stars: 5,
        text: 'Excellente auto-école ! J\'avais peur après deux échecs ailleurs mais ici j\'ai retrouvé confiance. Moniteur super pédago et très encourageant. Permis obtenu !',
        reply: 'Merci Emma, votre témoignage nous touche vraiment ! Surmonter les difficultés ensemble, c\'est exactement notre mission. Bravo à vous et bonne route !'
      }
    ],
    contactColor: '#2E7D32'
  },

  sante: {
    label: 'Cabinet médical',
    icon: '🏥',
    color: '#00838F',
    gradient: 'linear-gradient(135deg, #001a1c 0%, #003336 100%)',
    heroTitle: 'Votre santé, notre priorité',
    heroSub: 'Des soins de qualité, une écoute attentive et un suivi personnalisé.',
    servicesSub: 'Nos consultations et soins',
    services: [
      { icon: '🏥', title: 'Consultation', desc: 'Rendez-vous en cabinet avec prise en charge immédiate.' },
      { icon: '💊', title: 'Prescriptions', desc: 'Ordonnances, renouvellements et certificats médicaux.' },
      { icon: '🔬', title: 'Bilans de santé', desc: 'Examens biologiques, dépistage et prévention.' },
      { icon: '📱', title: 'Téléconsultation', desc: 'Consultez depuis chez vous en toute simplicité.' }
    ],
    reviews: [
      {
        name: 'Isabelle P.',
        initial: 'I',
        color: '#00838F',
        date: 'Il y a 2 jours',
        stars: 5,
        text: 'Médecin très attentif et à l\'écoute. Les explications sont claires et rassurantes. Je me sens vraiment prise en charge. Merci docteur !',
        reply: 'Merci Isabelle pour votre confiance. Prendre le temps d\'écouter chaque patient est fondamental pour nous. Nous restons disponibles pour votre suivi. Prenez bien soin de vous !'
      },
      {
        name: 'Robert D.',
        initial: 'R',
        color: '#0097A7',
        date: 'Il y a 1 semaine',
        stars: 5,
        text: 'Cabinet très bien organisé, pas d\'attente excessive et personnel accueillant. Le médecin prend le temps d\'expliquer chaque diagnostic. Excellent.',
        reply: 'Merci Robert pour ce retour bienveillant ! Nous faisons notre maximum pour que chaque consultation se passe dans les meilleures conditions. À bientôt pour votre suivi !'
      }
    ],
    contactColor: '#00838F'
  },

  artisanat: {
    label: 'Artisan',
    icon: '🔨',
    color: '#7B3F00',
    gradient: 'linear-gradient(135deg, #1a0d00 0%, #3d1f00 100%)',
    heroTitle: 'Le savoir-faire artisanal à votre service',
    heroSub: 'Qualité, ponctualité et prix honnêtes — votre projet mérite le meilleur.',
    servicesSub: 'Nos prestations',
    services: [
      { icon: '🏠', title: 'Rénovation', desc: 'Transformation complète et remise en état de vos espaces.' },
      { icon: '🔨', title: 'Installation', desc: 'Pose et mise en service dans les règles de l\'art.' },
      { icon: '🛠️', title: 'Entretien', desc: 'Contrat de maintenance préventive et dépannage rapide.' },
      { icon: '📋', title: 'Devis gratuit', desc: 'Estimation détaillée sous 24h, sans engagement.' }
    ],
    reviews: [
      {
        name: 'Pierre V.',
        initial: 'P',
        color: '#7B3F00',
        date: 'Il y a 5 jours',
        stars: 5,
        text: 'Travail soigné et propre, délais parfaitement respectés. Artisan sérieux qui sait ce qu\'il fait. Le résultat dépasse mes attentes. Très professionnel.',
        reply: 'Merci beaucoup Pierre ! Le soin du travail bien fait et le respect de nos engagements sont notre priorité. N\'hésitez pas pour vos futurs projets — à bientôt !'
      },
      {
        name: 'Nathalie H.',
        initial: 'N',
        color: '#A0522D',
        date: 'Il y a 2 semaines',
        stars: 5,
        text: 'Intervention rapide, propre et efficace. Prix conforme au devis. L\'artisan est poli et respectueux de chez soi. Je recommande sans hésitation.',
        reply: 'Merci Nathalie pour ce beau retour ! Respecter votre domicile est aussi important que la qualité du travail. Votre recommandation nous touche beaucoup. À très bientôt !'
      }
    ],
    contactColor: '#7B3F00'
  },

  hotellerie: {
    label: 'Hôtel',
    icon: '🏨',
    color: '#6A1B9A',
    gradient: 'linear-gradient(135deg, #0d001a 0%, #20003d 100%)',
    heroTitle: 'Votre home away from home',
    heroSub: 'Confort, élégance et service personnalisé pour un séjour inoubliable.',
    servicesSub: 'Nos prestations & équipements',
    services: [
      { icon: '🛏️', title: 'Chambres & Suites', desc: 'Chambres climatisées, décorées avec soin et vue panoramique.' },
      { icon: '🍳', title: 'Petit-déjeuner', desc: 'Buffet maison servi de 7h à 10h30 avec produits locaux.' },
      { icon: '🧖', title: 'Spa & Bien-être', desc: 'Piscine intérieure, sauna et massages sur réservation.' },
      { icon: '💼', title: 'Séminaires', desc: 'Salles équipées pour vos réunions et événements professionnels.' }
    ],
    reviews: [
      {
        name: 'Julie H.',
        initial: 'J',
        color: '#7B1FA2',
        date: 'Il y a 3 jours',
        stars: 5,
        text: 'Séjour absolument magique ! Chambre impeccable, personnel aux petits soins et petit-déjeuner délicieux. On reviendra à coup sûr !',
        reply: 'Merci Julie pour ce magnifique témoignage ! Votre bonheur est notre plus belle récompense. Nous serons ravis de vous accueillir à nouveau. À très bientôt !'
      },
      {
        name: 'Antoine M.',
        initial: 'A',
        color: '#8E24AA',
        date: 'Il y a 1 semaine',
        stars: 5,
        text: 'Hôtel de grande qualité, rapport qualité-prix excellent. Le spa est fantastique et la literie parfaite. L\'équipe est disponible et souriante.',
        reply: 'Merci Antoine pour ce beau retour ! Votre satisfaction est notre priorité et nous sommes ravis que le spa ait fait partie de vos moments forts. Revenez nous voir !'
      }
    ],
    contactColor: '#6A1B9A'
  },

  services: {
    label: 'Services professionnels',
    icon: '💼',
    color: '#37474F',
    gradient: 'linear-gradient(135deg, #0a0d10 0%, #1a252d 100%)',
    heroTitle: 'Des solutions sur mesure pour votre activité',
    heroSub: 'Expertise reconnue, réactivité et résultats mesurables — votre succès est notre objectif.',
    servicesSub: 'Ce que nous faisons pour vous',
    services: [
      { icon: '💡', title: 'Conseil', desc: 'Accompagnement stratégique personnalisé pour votre développement.' },
      { icon: '📊', title: 'Audit', desc: 'Analyse approfondie et recommandations actionnables.' },
      { icon: '🎓', title: 'Formation', desc: 'Programmes adaptés à vos équipes et vos objectifs.' },
      { icon: '🤝', title: 'Support continu', desc: 'Assistance et suivi pour garantir vos résultats dans la durée.' }
    ],
    reviews: [
      {
        name: 'Laurent B.',
        initial: 'L',
        color: '#455A64',
        date: 'Il y a 4 jours',
        stars: 5,
        text: 'Accompagnement professionnel, efficace et vraiment personnalisé. Les résultats sont au rendez-vous, l\'équipe est réactive et de bon conseil. Je recommande vivement.',
        reply: 'Merci Laurent pour cette belle recommandation ! Votre réussite est notre moteur. Nous restons pleinement disponibles pour la suite de vos projets. N\'hésitez pas !'
      },
      {
        name: 'Marie-Claire F.',
        initial: 'M',
        color: '#546E7A',
        date: 'Il y a 2 semaines',
        stars: 5,
        text: 'Prestataire sérieux et compétent. La formation était claire, bien structurée et immédiatement applicable. Excellent rapport qualité-prix.',
        reply: 'Merci Marie-Claire ! C\'est gratifiant d\'entendre que la formation vous a apporté des outils concrets et applicables. Nous restons à votre disposition pour tout accompagnement complémentaire !'
      }
    ],
    contactColor: '#37474F'
  }
};

// ── LECTURE DES PARAMÈTRES URL ──────────────────────────────
function getParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    nom:         decodeURIComponent(p.get('nom')      || 'Votre établissement'),
    secteur:     p.get('secteur')    || 'restauration',
    ville:       decodeURIComponent(p.get('ville')    || 'Votre ville'),
    note:        parseFloat(p.get('note'))  || 4.2,
    nb_avis:     parseInt(p.get('nb_avis')) || 0,
    sans_rep:    parseInt(p.get('sans_rep'))|| 0,
    telephone:   decodeURIComponent(p.get('telephone') || ''),
    adresse:     decodeURIComponent(p.get('adresse')   || ''),
    prenom:      decodeURIComponent(p.get('prenom')    || '')
  };
}

// ── ÉTOILES ──────────────────────────────────────────────────
function renderStars(n) {
  const full  = Math.round(n);
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
}

// ── RENDU ────────────────────────────────────────────────────
function render() {
  const params  = getParams();
  const sector  = SECTORS[params.secteur] || SECTORS['restauration'];
  const nomDisp = params.nom;

  // Titre de l'onglet
  document.title = `${nomDisp} — Aperçu ReplyShield`;

  // Bannière
  document.getElementById('bannerNom').textContent = nomDisp;

  // Couleur CSS primaire
  document.documentElement.style.setProperty('--pv-primary', sector.color);

  // Navbar logo
  document.getElementById('pvLogo').textContent = nomDisp;
  document.getElementById('pvFooterLogo').textContent = nomDisp;

  // Hero
  const hero = document.getElementById('pvHero');
  hero.style.background = sector.gradient;
  document.getElementById('pvTag').textContent    = sector.label;
  document.getElementById('pvTitle').textContent  = sector.heroTitle;
  document.getElementById('pvSub').textContent    = sector.heroSub;
  document.getElementById('pvHeroIcon').textContent = sector.icon;
  document.getElementById('pvNote').textContent   = params.note.toFixed(1) + ' ★';
  document.getElementById('pvNbAvis').textContent = params.nb_avis > 0 ? params.nb_avis.toLocaleString('fr-FR') : '—';
  document.getElementById('pvVille').textContent  = params.ville;

  // Bouton primaire hero (couleur dynamique)
  document.querySelectorAll('.pv-btn-primary').forEach(btn => {
    btn.style.color = sector.color;
  });

  // Services
  document.getElementById('pvServicesSub').textContent = sector.servicesSub;
  const grid = document.getElementById('pvServicesGrid');
  grid.innerHTML = sector.services.map(s => `
    <div class="pv-service-card">
      <div class="pv-service-icon">${s.icon}</div>
      <div class="pv-service-title">${s.title}</div>
      <div class="pv-service-desc">${s.desc}</div>
    </div>
  `).join('');

  // Avis
  document.getElementById('pvReviewsNote').textContent  = params.note.toFixed(1) + ' / 5';
  document.getElementById('pvReviewsCount').textContent =
    params.nb_avis > 0 ? `${params.nb_avis.toLocaleString('fr-FR')} avis` : '';

  const reviewsGrid = document.getElementById('pvReviewsGrid');
  reviewsGrid.innerHTML = sector.reviews.map(r => `
    <div class="pv-review-card">
      <div class="pv-review-header">
        <div class="pv-review-avatar" style="background:${r.color}">${r.initial}</div>
        <div class="pv-review-meta">
          <strong>${r.name}</strong>
          <span>${r.date}</span>
        </div>
        <div class="pv-review-stars" style="margin-left:auto">${renderStars(r.stars)}</div>
      </div>
      <p class="pv-review-text">${r.text}</p>
      <div class="pv-review-reply">
        <div class="pv-review-reply-label">
          <span>🤖</span> Réponse du propriétaire · <em>via ReplyShield</em>
        </div>
        <p class="pv-review-reply-text">${r.reply}</p>
      </div>
    </div>
  `).join('');

  // Contact
  const contactSection = document.querySelector('.pv-contact');
  contactSection.style.background = sector.gradient;
  document.querySelector('.pv-section-title--light').style.color = '#fff';

  const contactItems = [];
  if (params.adresse) {
    contactItems.push({ icon: '📍', label: 'Adresse', value: params.adresse });
  }
  if (params.telephone) {
    contactItems.push({ icon: '📞', label: 'Téléphone', value: params.telephone });
  }
  contactItems.push({ icon: '📍', label: 'Ville', value: params.ville });

  document.getElementById('pvContactItems').innerHTML = contactItems.map(item => `
    <div class="pv-contact-item">
      <div class="pv-contact-item-icon">${item.icon}</div>
      <div class="pv-contact-item-text">
        <strong>${item.label}</strong>
        <span>${item.value}</span>
      </div>
    </div>
  `).join('');

  // Footer
  document.getElementById('pvFooterCity').textContent = `${sector.label} · ${params.ville}`;

  // Stat avis sans réponse dans les stats hero (si disponible)
  if (params.sans_rep > 0) {
    const statsEl = document.getElementById('pvStats');
    statsEl.innerHTML += `
      <div class="pv-stat-sep"></div>
      <div class="pv-stat">
        <span class="pv-stat-value" style="color:#FFB347">${params.sans_rep.toLocaleString('fr-FR')}</span>
        <span class="pv-stat-label">Avis sans réponse</span>
      </div>
    `;
  }
}

// ── LIEN COMMANDER ───────────────────────────────────────────
function buildCommanderUrl(params, secteurId) {
  const p = new URLSearchParams({
    nom:     params.nom,
    secteur: secteurId,
    ville:   params.ville,
    prenom:  params.prenom,
    offre:   'essentiel'
  });
  return `commander.html?${p.toString()}`;
}

// ── SÉLECTEUR DE STYLES ──────────────────────────────────────
function initStylePicker(params, secteurId) {
  const variants  = SECTOR_VARIANTS[secteurId] || SECTOR_VARIANTS['services'];
  const toggle    = document.getElementById('stylePickerToggle');
  const panel     = document.getElementById('stylePickerPanel');
  const optionsEl = document.getElementById('stylePickerOptions');

  // Construire les boutons de style
  optionsEl.innerHTML = variants.map((v, i) => `
    <button class="style-option ${i === (params.style || 0) ? 'active' : ''}"
            data-index="${i}"
            style="background:${v.color}">
      ${v.label}
    </button>
  `).join('');

  // Toggle panel
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.hidden = !panel.hidden;
  });
  document.addEventListener('click', () => { panel.hidden = true; });
  panel.addEventListener('click', (e) => e.stopPropagation());

  // Choix d'un style
  optionsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.style-option');
    if (!btn) return;
    const idx = parseInt(btn.dataset.index);
    applyStyle(variants[idx], idx, params, secteurId);
    panel.hidden = true;

    // Mettre à jour URL sans recharger
    const url = new URL(window.location.href);
    url.searchParams.set('style', idx);
    window.history.replaceState({}, '', url.toString());

    // Mettre à jour les boutons actifs
    optionsEl.querySelectorAll('.style-option').forEach((b, i) => {
      b.classList.toggle('active', i === idx);
    });
  });
}

function applyStyle(variant, idx, params, secteurId) {
  document.documentElement.style.setProperty('--pv-primary', variant.color);
  document.getElementById('pvHero').style.background        = variant.gradient;
  document.querySelector('.pv-contact').style.background    = variant.gradient;

  // Mettre à jour le lien commander avec le style
  const cmdLink = document.getElementById('rsFooterCommander');
  if (cmdLink) {
    const p = new URLSearchParams({
      nom: params.nom, secteur: secteurId, ville: params.ville,
      prenom: params.prenom, offre: 'essentiel', style: idx
    });
    cmdLink.href = `commander.html?${p.toString()}`;
  }
  // Mettre à jour le lien bannière
  const bannerCta = document.querySelector('.rs-banner-cta');
  if (bannerCta) {
    const p = new URLSearchParams({
      nom: params.nom, secteur: secteurId, ville: params.ville,
      prenom: params.prenom, offre: 'essentiel', style: idx
    });
    bannerCta.href = `commander.html?${p.toString()}`;
  }
}

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  render();

  const params   = getParams();
  const secteurId = (new URLSearchParams(window.location.search)).get('secteur') || 'restauration';

  // Appliquer le style URL si présent
  const styleIdx = parseInt((new URLSearchParams(window.location.search)).get('style') || '0');
  const variants  = SECTOR_VARIANTS[secteurId] || SECTOR_VARIANTS['services'];
  if (styleIdx > 0 && variants[styleIdx]) {
    applyStyle(variants[styleIdx], styleIdx, params, secteurId);
  }

  // Lien "Commander" dans bannière et bandeau bas
  const commanderUrl = buildCommanderUrl(params, secteurId);
  const bannerCta    = document.querySelector('.rs-banner-cta');
  const footerBtn    = document.getElementById('rsFooterCommander');
  if (bannerCta) bannerCta.href = commanderUrl;
  if (footerBtn) footerBtn.href = commanderUrl;

  // Initialiser le sélecteur de styles
  initStylePicker({ ...params, style: styleIdx }, secteurId);
});
