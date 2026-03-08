# Guide d'installation — Outil de prospection B2B automatisé

## Ce que ça fait, une fois en place

```
Chaque semaine, automatiquement :
  1. Scraping Google Maps → nouveaux prospects qualifiés dans ton CRM
  2. Claude génère des emails personnalisés pour chaque prospect
  3. Brevo envoie les emails + relances aux bons moments
  4. Dès qu'un prospect ouvre 3x ou clique → tu reçois une alerte email immédiate
```

---

## Ce que tu dois créer / avoir

| Service | Status | Action |
|---|---|---|
| **Google Cloud** | Déjà ok | Activer 2 APIs (voir ci-dessous) |
| **Brevo** | Déjà ok | Récupérer la clé API |
| **Anthropic (Claude)** | À créer | 5 min sur console.anthropic.com |
| **N8N** | À créer | Compte gratuit sur n8n.io |

**Total : 2 nouvelles étapes seulement.**

---

## Étape 1 — Google Cloud (5 min)

Tu as déjà un compte. Il faut juste activer 2 APIs :

1. Va sur [console.cloud.google.com](https://console.cloud.google.com)
2. **APIs & Services → Bibliothèque**
3. Cherche et active : **"Places API"**
4. Cherche et active : **"Google Sheets API"**
5. **APIs & Services → Credentials → Create Credentials → API Key**
6. Copie cette clé → tu l'utiliseras dans N8N (étape 4)

Pour Google Sheets, il faut un Service Account :
1. **Credentials → Create Credentials → Service Account**
2. Donne-lui un nom (ex: `prospection-bot`)
3. Role : **Editor**
4. Une fois créé, clique dessus → **Keys → Add Key → JSON**
5. Télécharge le fichier JSON → renomme-le `credentials.json`
6. Place-le dans `scripts/credentials.json`

---

## Étape 2 — Initialiser le CRM Google Sheets (3 min)

```bash
# Installer les dépendances Python
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client

# Lancer le script
python scripts/init_google_sheets.py
```

Le script va :
- Créer un Google Sheet avec 4 onglets (PROSPECTS, CONFIG, STATS, LOGS)
- Appliquer les mises en forme (couleurs, validations, dégradés score)
- Mettre à jour automatiquement `config/settings.json` avec le Spreadsheet ID

**Copie le lien du Google Sheet** — tu en auras besoin dans N8N.

---

## Étape 3 — Créer ton compte Anthropic (5 min)

1. Va sur [console.anthropic.com](https://console.anthropic.com)
2. Crée un compte (email + mot de passe)
3. **API Keys → Create Key** → copie la clé

**Coût estimé** : ~0.50€ pour 100 emails (modèle Sonnet). Les alertes utilisent Haiku (encore moins cher).

---

## Étape 4 — Installer N8N (10 min)

### Option A : N8N Cloud (recommandé pour commencer)
1. Va sur [n8n.io](https://n8n.io) → **Start for free**
2. Crée un compte — plan gratuit suffisant pour démarrer
3. Accède à ton dashboard N8N

### Option B : Self-hosted (Docker, si tu as un VPS)
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```
Accès sur `http://localhost:5678`

---

## Étape 5 — Configurer les credentials dans N8N (10 min)

Dans N8N → **Settings → Credentials → Add Credential** :

### 1. Google Places API
- Type : **HTTP Query Auth**
- Name : `Google Places API Key`
- Query parameter name : `key`
- Value : ta clé Google Cloud

### 2. Google Sheets
- Type : **Google Sheets OAuth2 API** ou **Service Account**
- Si OAuth2 : connecte ton compte Google
- Si Service Account : colle le contenu du fichier `credentials.json`

### 3. Anthropic (Claude)
- Type : **HTTP Basic Auth**
- Name : `Anthropic API Key`
- Password : ta clé Anthropic (le champ "password" sert de porteur)

### 4. Brevo
- Type : **HTTP Basic Auth**
- Name : `Brevo API Key`
- Password : ta clé API Brevo (dans Brevo → Settings → API Keys)

---

## Étape 6 — Configurer les variables N8N

Dans N8N → **Settings → Variables** (ou via l'interface de chaque workflow) :

| Variable | Valeur |
|---|---|
| `SPREADSHEET_ID` | L'ID de ton Google Sheet (visible dans l'URL) |
| `ALERTE_EMAIL` | Ton email pour recevoir les alertes prospects chauds |

---

## Étape 7 — Importer les 4 workflows (5 min)

Dans N8N → **Workflows → Import from file** :

1. `workflows/01_scraping_google_places.json`
2. `workflows/02_campagne_envoi.json`
3. `workflows/03_relances_automatiques.json`
4. `workflows/04_detection_prospects_chauds.json`

Pour chaque workflow importé :
- **Vérifier** que les credentials sont bien mappés (N8N te demandera de les assigner)
- **Tester** avec "Execute manually" avant d'activer

---

## Étape 8 — Configurer Brevo Webhooks (5 min)

Pour que la détection de prospects chauds fonctionne :

1. Va dans **Brevo → Settings → Webhooks → Add webhook**
2. URL : `https://TON-N8N.app.n8n.cloud/webhook/brevo-events`
3. Events à cocher : **Email opened**, **Email clicked**, **Email replied**
4. Sauvegarde

L'URL exacte du webhook est visible dans N8N → Workflow 04 → nœud "Webhook — Événements Brevo".

---

## Étape 9 — Importer la base existante (optionnel)

Tu as déjà 110 prospects dans `PROSPECTS_BREVO (1).csv`. Pour les importer dans ton nouveau CRM :

1. Ouvre ton Google Sheet
2. Onglet **PROSPECTS**
3. **File → Import → Upload** → sélectionne le CSV
4. Option : "Append to current sheet"
5. Mets le statut de tous ces prospects à `nouveau`

---

## Étape 10 — Activer les workflows

Activer dans cet ordre :
1. **Workflow 04** (webhook) → activer en premier, toujours en écoute
2. **Workflow 01** (scraping) → activera chaque lun+mer à 2h
3. **Workflow 03** (relances) → activera chaque jour à 10h
4. **Workflow 02** (campagne) → activer en dernier, mar+mer à 9h

---

## Calendrier automatique résultant

```
LUNDI 2h00   → Scraping Google Places (nouveaux prospects)
MARDI 9h00   → Envoi emails initiaux (batch de 20, score > 60)
MERCREDI 2h00 → Scraping Google Places (suite)
MERCREDI 9h00 → Envoi emails initiaux (suite)
CHAQUE JOUR 10h → Relances automatiques J+7 et J+14
EN TEMPS RÉEL → Alerte email si prospect ouvre 3x ou clique
```

---

## Personnaliser pour un autre produit

Pour adapter le système à un autre produit SaaS/service :

1. **`config/settings.json`** → changer `produit.*` (nom, URL, pitch)
2. **`prompts/email_templates.json`** → adapter les prompts Claude
3. **Workflow 02, nœud "Préparer les prompts Claude"** → actualiser les variables produit
4. Changer les secteurs dans `settings.json → ciblage.secteurs`

---

## Coûts mensuels estimés

| Service | Plan | Coût |
|---|---|---|
| N8N Cloud | Starter | 0-20€/mois |
| Google Places API | Pay as you go | ~5-15€/mois (selon volume) |
| Anthropic (Claude Sonnet) | Pay as you go | ~2-5€/mois |
| Brevo | Starter | 0-25€/mois |
| **Total** | | **~7-65€/mois** |

Pour 0€, utilise N8N self-hosted + le plan gratuit Brevo (300 emails/jour).

---

## Dépannage rapide

| Problème | Solution |
|---|---|
| Le scraping ne trouve rien | Vérifier que Places API est activée + quota suffisant |
| Emails non envoyés | Vérifier clé Brevo + domaine validé dans Brevo |
| Claude renvoie une erreur | Vérifier solde Anthropic + format de la clé dans credentials |
| Webhook non déclenché | Vérifier URL dans Brevo Settings → doit être l'URL exacte N8N |
| Google Sheets accès refusé | Vérifier que le Service Account a accès au Sheet (partager avec son email) |
