# ReplyShield — Système de prospection B2B automatisé

Outil complet pour acquérir des clients B2B pour ReplyShield (réponses IA aux avis Google).

**Pipeline automatisé :** scraping Google Maps → emails personnalisés via Claude → envoi Brevo → relances → alertes prospects chauds.

---

## Structure du projet

```
replyshield/
├── .github/
│   └── workflows/
│       ├── 01_scrape.yml              # Cron lundi + mercredi 2h
│       ├── 02_campaign.yml            # Cron mardi + mercredi 9h
│       ├── 03_relances.yml            # Cron lun–ven 10h
│       ├── 04_hot_leads.yml           # Cron toutes les 15 min
│       └── 05_reviews.yml             # Cron toutes les 2h
├── config/
│   └── settings.json                  # Configuration centrale
├── data/
│   └── PROSPECTS_BREVO.csv            # 110 prospects qualifiés
├── docs/
│   ├── GUIDE_PROSPECTION.md
│   ├── SECTEURS.md
│   ├── VILLES.md
│   └── STATISTIQUES.md
├── prompts/
│   └── email_templates.json           # Prompts Claude
├── scripts/
│   ├── utils/
│   │   ├── sheets.py                  # Helper Google Sheets
│   │   ├── brevo.py                   # Helper Brevo
│   │   └── claude_client.py           # Helper Claude
│   ├── 01_scrape.py                   # Scraping Google Places → Sheets
│   ├── 02_campaign.py                 # Génération + envoi emails
│   ├── 03_relances.py                 # Relances J+7 et J+14
│   ├── 04_hot_leads.py                # Détection prospects chauds
│   ├── 05_reviews.py                  # Réponses avis Google
│   └── init_google_sheets.py          # Initialise le CRM
├── requirements.txt
└── workflows/                         # Archives N8N (référence uniquement)
```

---

## Démarrage rapide

### Prérequis

| Service | Utilisation |
|---|---|
| Google Cloud | Places API + Sheets API + Service Account + OAuth (My Business) |
| Brevo | Envoi des emails |
| Anthropic (Claude) | Génération des emails et réponses avis |
| Supabase | Base de données clients (workflow 05) |

### 1. Initialiser le CRM Google Sheets

```bash
pip install -r requirements.txt
# Placer credentials.json (Service Account) dans scripts/
python scripts/init_google_sheets.py
```

Copier l'ID du spreadsheet créé dans `config/settings.json → google_sheets.spreadsheet_id`.

### 2. Configurer les Secrets GitHub

Dans ton repo GitHub → **Settings → Secrets and variables → Actions** → **New repository secret** :

| Secret | Description |
|---|---|
| `GOOGLE_PLACES_KEY` | Clé API Google Cloud (Places API activée) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Contenu du fichier `credentials.json` encodé en base64 |
| `SPREADSHEET_ID` | ID du Google Sheet CRM (ex: `1BxiM...`) |
| `ANTHROPIC_KEY` | Clé API Anthropic |
| `BREVO_KEY` | Clé API Brevo |
| `ALERT_EMAIL` | Email qui reçoit les alertes prospects chauds |
| `SUPABASE_URL` | URL de ton projet Supabase (workflow 05) |
| `SUPABASE_KEY` | Clé `service_role` Supabase (workflow 05) |
| `GOOGLE_CLIENT_ID` | OAuth client ID Google (workflow 05) |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret Google (workflow 05) |

**Encoder le Service Account en base64 :**
```bash
base64 -w 0 credentials.json
```
Coller le résultat dans le secret `GOOGLE_SERVICE_ACCOUNT_JSON`.

### 3. Pousser sur GitHub

Les workflows se déclenchent automatiquement dès que le code est sur la branche principale.
Pour tester manuellement : **GitHub → Actions → choisir un workflow → Run workflow**.

---

## Calendrier automatique

```
LUNDI      02:00  → Scraping Google Places
LUNDI–VEN  10:00  → Relances automatiques (J+7, J+14)
MARDI      09:00  → Envoi emails initiaux (batch 20, score > 60)
MERCREDI   02:00  → Scraping Google Places (suite)
MERCREDI   09:00  → Envoi emails initiaux (suite)
TOUTES LES 15 MIN → Détection prospects chauds (polling Brevo)
TOUTES LES 2H     → Réponses automatiques aux avis Google
```

---

## Lancement manuel d'un script

```bash
# Installer les dépendances
pip install -r requirements.txt

# Définir les variables d'environnement
export GOOGLE_PLACES_KEY="..."
export GOOGLE_SERVICE_ACCOUNT_JSON="$(base64 -w 0 credentials.json)"
export SPREADSHEET_ID="..."
export ANTHROPIC_KEY="..."
export BREVO_KEY="..."
export ALERT_EMAIL="..."

# Lancer un script
python scripts/01_scrape.py
python scripts/02_campaign.py
python scripts/03_relances.py
python scripts/04_hot_leads.py
python scripts/05_reviews.py
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
| GitHub Actions | Gratuit (2 000 min/mois) | 0€ |
| Google Places API | Pay as you go | ~5–15€ |
| Anthropic Claude | Pay as you go | ~2–5€ |
| Brevo | Starter | 0–25€ |
| **Total** | | **~7–45€** |
