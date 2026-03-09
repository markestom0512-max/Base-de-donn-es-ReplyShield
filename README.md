# ReplyShield — Système de prospection B2B automatisé

Outil complet pour acquérir des clients B2B pour ReplyShield (réponses IA aux avis Google).

**Pipeline automatisé :** scraping Google Maps → emails personnalisés via Claude → envoi Brevo → relances → alertes prospects chauds.

---

## Structure du projet

```
replyshield/
├── config/
│   └── settings.json               # Configuration centrale (secteurs, villes, scoring, campagne)
├── data/
│   └── PROSPECTS_BREVO.csv         # 110 prospects qualifiés prêts à l'import
├── docs/
│   ├── GUIDE_PROSPECTION.md        # Stratégie et calendrier de campagne
│   ├── SECTEURS.md                 # Analyse des 8 secteurs ciblés
│   ├── VILLES.md                   # Répartition géographique
│   └── STATISTIQUES.md             # Statistiques détaillées
├── prompts/
│   └── email_templates.json        # Templates et prompts Claude pour les emails
├── scripts/
│   └── init_google_sheets.py       # Initialise le CRM Google Sheets
├── web/                            # Site vitrine ReplyShield (à venir)
└── workflows/
    ├── 01_scraping_google_places.json   # Scraping + scoring prospects
    ├── 02_campagne_envoi.json           # Génération + envoi emails
    ├── 03_relances_automatiques.json    # Relances J+7, J+14, J+21
    └── 04_detection_prospects_chauds.json # Alertes ouvertures/clics
```

---

## Démarrage rapide

### Prérequis

| Service | Utilisation |
|---|---|
| Google Cloud | Places API + Sheets API + Service Account |
| Brevo | Envoi des emails + webhooks |
| Anthropic (Claude) | Génération des emails personnalisés |
| N8N | Orchestration des workflows |

### Installation

**1. Initialiser le CRM Google Sheets**
```bash
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
# Placer credentials.json (Service Account) dans scripts/
python scripts/init_google_sheets.py
```
Copier l'ID du spreadsheet créé dans `config/settings.json → google_sheets.spreadsheet_id`.

**2. Configurer les clés API dans N8N Credentials**
- `GOOGLE_PLACES_KEY` — clé API Google Cloud
- `ANTHROPIC_KEY` — clé API Anthropic
- `BREVO_KEY` — clé API Brevo

**3. Importer les workflows dans N8N**

Dans N8N → Workflows → Import from file, dans cet ordre :
1. `workflows/04_detection_prospects_chauds.json` (webhook — à activer en premier)
2. `workflows/01_scraping_google_places.json`
3. `workflows/03_relances_automatiques.json`
4. `workflows/02_campagne_envoi.json`

**4. Configurer le webhook Brevo**

Brevo → Settings → Webhooks → Add webhook
- URL : `https://TON-N8N.app.n8n.cloud/webhook/brevo-events`
- Events : Email opened, Email clicked, Email replied

**5. Importer les 110 prospects existants (optionnel)**

Importer `data/PROSPECTS_BREVO.csv` directement dans Brevo (Contacts → Importer) ou dans l'onglet PROSPECTS du Google Sheet avec statut `nouveau`.

---

## Calendrier automatique

```
LUNDI    02:00  → Scraping Google Places (nouveaux prospects)
MARDI    09:00  → Envoi emails initiaux (batch 20, score > 60)
MERCREDI 02:00  → Scraping Google Places (suite)
MERCREDI 09:00  → Envoi emails initiaux (suite)
CHAQUE JOUR 10:00 → Relances automatiques (J+7, J+14, J+21)
EN TEMPS RÉEL     → Alerte email si prospect ouvre 3x ou clique
```

---

## Prospects existants

110 prospects qualifiés dans `data/PROSPECTS_BREVO.csv` :

| Secteur | Nb | % sans réponse |
|---|---|---|
| Restauration | 21 | 76% |
| Beauté | 13 | 74% |
| Automobile | 10 | 78% |
| Auto-école | 8 | 79% |
| Santé | 8 | 80% |
| Artisanat | 8 | 80% |
| Hôtellerie | 7 | 64% |
| Services | 5 | 89% |

Note Google moyenne : 3,99 — Avis sans réponse moyen : 1 880 (76%)

---

## Configuration

Tout est centralisé dans `config/settings.json` :
- `produit` — nom, URL, pitch, expéditeur
- `ciblage` — pays, villes, secteurs et leurs requêtes Google
- `scoring` — poids et seuils pour qualifier les prospects
- `campagne` — horaires d'envoi, délais de relance, taille des batchs

Pour adapter le système à un autre produit, modifier uniquement `config/settings.json` et `prompts/email_templates.json`.

---

## Coûts estimés

| Service | Plan | Coût/mois |
|---|---|---|
| N8N Cloud Starter | — | 0–20€ |
| Google Places API | Pay as you go | ~5–15€ |
| Anthropic Claude | Pay as you go | ~2–5€ |
| Brevo | Starter | 0–25€ |
| **Total** | | **~7–65€** |

Version 0€ : N8N self-hosted + plan gratuit Brevo (300 emails/jour).
