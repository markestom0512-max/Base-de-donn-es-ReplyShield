# 🛡️ ReplyShield — Base de Données B2B Prospects

**Répondez automatiquement aux avis Google grâce à l'IA**

Une base de données complète de **110 prospects B2B qualifiés** en France, Belgique et Suisse, prêts pour une campagne de prospection ciblée.

---

## 📊 Vue d'ensemble

| Métrique | Valeur |
|---|---|
| **Total prospects** | 110 entreprises |
| **Avec email direct** | 110 (100%) |
| **Avis moyen** | 2 480 |
| **Avis sans réponse (moy.)** | 1 880 (76%) |
| **Note Google moyenne** | 3,99 / 5 ⭐ |
| **Secteurs couverts** | 8 (Restauration, Beauté, Auto, Santé, etc.) |
| **Villes couvertes** | 24 villes francophones |

---

## 📁 Structure du projet

```
replyshield-export/
├── README.md                          # Ce fichier
├── PROSPECTS.csv                      # Base de données complète (110 prospects)
├── PROSPECTS_BREVO.csv               # Format Brevo pour import direct
├── docs/
│   ├── GUIDE_PROSPECTION.md          # Guide complet de prospection
│   ├── SECTEURS.md                   # Analyse par secteur
│   ├── VILLES.md                     # Analyse par ville
│   └── STATISTIQUES.md               # Statistiques détaillées
├── web/
│   ├── index.html                    # Dashboard web statique
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
├── data/
│   ├── prospects_raw.json            # Données brutes JSON
│   └── schema.json                   # Schéma des données
└── scripts/
    ├── generate_csv.py               # Générer CSV depuis JSON
    └── validate_data.py              # Valider les données
```

---

## 🎯 Secteurs prioritaires

| Secteur | Nb | % Moy. sans réponse | Potentiel |
|---|---|---|---|
| **Restauration** | 21 | 76% | ⭐⭐⭐⭐⭐ |
| **Beauté** | 13 | 74% | ⭐⭐⭐⭐⭐ |
| **Automobile** | 10 | 78% | ⭐⭐⭐⭐ |
| **Auto-école** | 8 | 79% | ⭐⭐⭐⭐ |
| **Santé** | 8 | 80% | ⭐⭐⭐⭐ |
| **Artisanat** | 8 | 80% | ⭐⭐⭐⭐ |
| **Hôtellerie** | 7 | 64% | ⭐⭐⭐ |
| **Services** | 5 | 89% | ⭐⭐⭐⭐⭐ |

---

## 🚀 Démarrage rapide

### 1. Importer dans Brevo (ou autre plateforme d'emailing)

```bash
# Utiliser le fichier PROSPECTS_BREVO.csv
# Format : UTF-8 avec BOM, 19 colonnes, guillemets doubles
# Colonnes : EMAIL, PRENOM, NOM, SMS, ENTREPRISE, SECTEUR, VILLE, ...
```

**Étapes :**
1. Télécharger `PROSPECTS_BREVO.csv`
2. Aller sur Brevo → Contacts → Importer
3. Sélectionner le fichier CSV
4. Mapper les colonnes (EMAIL, PRENOM, NOM, etc.)
5. Valider l'import

### 2. Utiliser le dashboard web

```bash
# Ouvrir index.html dans un navigateur
# Filtrer par secteur, ville, priorité
# Exporter les segments filtrés
```

### 3. Analyser les données

```bash
# Voir les statistiques détaillées
cat docs/STATISTIQUES.md

# Analyser par secteur
cat docs/SECTEURS.md

# Analyser par ville
cat docs/VILLES.md
```

---

## 📋 Colonnes des données

| Colonne | Description | Exemple |
|---|---|---|
| `EMAIL` | Email du dirigeant | jean.leroy@drjeanleroy.fr |
| `PRENOM` | Prénom du contact | Jean |
| `NOM` | Nom du contact | Leroy |
| `SMS` | Numéro de téléphone | +33687187599 |
| `ENTREPRISE` | Nom de l'établissement | Dr. Jean Leroy |
| `SECTEUR` | Secteur d'activité | Santé |
| `VILLE` | Ville | Grenoble |
| `ADRESSE` | Adresse complète | 110 rue de la Paix 22018 Grenoble |
| `TELEPHONE` | Téléphone professionnel | +33366357778 |
| `SITE_WEB` | URL du site web | https://... |
| `NOTE_GOOGLE` | Note Google actuelle | 3.7 |
| `NB_AVIS` | Nombre total d'avis | 491 |
| `AVIS_SANS_REPONSE` | Avis sans réponse | 279 |
| `EMAIL_OBJET` | Objet du premier email | Jean, 93 avis attendent votre réponse |
| `EMAIL_CORPS` | Corps du premier email | Votre établissement... |
| `RELANCE_1_OBJET` | Objet de la relance 1 | Juste un rappel, Jean 👋 |
| `RELANCE_1_CORPS` | Corps de la relance 1 | Jean, avez-vous eu le temps... |
| `RELANCE_2_OBJET` | Objet de la relance 2 | Dernier message, promis. |
| `RELANCE_2_CORPS` | Corps de la relance 2 | Je ferme votre dossier demain... |

---

## 💡 Stratégie de prospection recommandée

### Phase 1 : Préparation (Jour 1-2)
- ✅ Importer les prospects dans Brevo
- ✅ Segmenter par secteur
- ✅ Personnaliser les messages d'accueil

### Phase 2 : Envoi initial (Jour 3-5)
- ✅ Envoyer le premier email (objet + corps préparés)
- ✅ Cibler les prospects avec >70% d'avis sans réponse
- ✅ Prioriser les secteurs à fort potentiel

### Phase 3 : Relances (Jour 10-15)
- ✅ Relance 1 : "Juste un rappel"
- ✅ Attendre 5 jours
- ✅ Relance 2 : "Dernier message"

### Phase 4 : Suivi (Jour 20+)
- ✅ Analyser les taux d'ouverture/clic
- ✅ Identifier les prospects chauds
- ✅ Adapter la stratégie par secteur

---

## 📊 Statistiques détaillées

### Par secteur
- **Restauration** : 21 prospects, note moy. 3,95, 1 870 avis sans rép. moy.
- **Beauté** : 13 prospects, note moy. 3,87, 1 750 avis sans rép. moy.
- **Automobile** : 10 prospects, note moy. 4,02, 1 920 avis sans rép. moy.

### Par ville (Top 10)
1. **Bordeaux** : 12 prospects
2. **Bruxelles** : 9 prospects
3. **Genève** : 7 prospects
4. **Grenoble** : 11 prospects
5. **Lille** : 8 prospects
6. **Lyon** : 9 prospects
7. **Marseille** : 5 prospects
8. **Montpellier** : 8 prospects
9. **Nantes** : 11 prospects
10. **Nice** : 9 prospects

---

## 🔧 Outils et ressources

### Fichiers fournis
- `PROSPECTS.csv` — Base de données complète (format standard)
- `PROSPECTS_BREVO.csv` — Format optimisé pour Brevo
- `prospects_raw.json` — Données brutes en JSON
- `index.html` — Dashboard web interactif
- Scripts Python pour validation/génération

### Logiciels recommandés
- **Brevo** — Plateforme d'emailing (import facile)
- **Google Sheets** — Analyse des données
- **Excel** — Manipulation avancée
- **VS Code** — Édition des fichiers

---

## 📝 Fichiers de documentation

### 1. **GUIDE_PROSPECTION.md**
Guide complet avec stratégie, templates, calendrier de campagne

### 2. **SECTEURS.md**
Analyse détaillée par secteur : potentiel, caractéristiques, meilleurs moments

### 3. **VILLES.md**
Répartition géographique, densité de prospects, analyse locale

### 4. **STATISTIQUES.md**
Statistiques complètes : moyennes, distributions, corrélations

---

## 🎓 Cas d'usage

### Cas 1 : Campagne par secteur
```
Objectif : Cibler les restaurants avec >80% d'avis sans réponse
Étapes :
1. Filtrer SECTEUR = "Restauration"
2. Filtrer AVIS_SANS_REPONSE > 80%
3. Exporter les 15 prospects
4. Importer dans Brevo
5. Envoyer campagne ciblée
```

### Cas 2 : Expansion géographique
```
Objectif : Conquérir la région Auvergne-Rhône-Alpes
Étapes :
1. Filtrer VILLE IN (Lyon, Grenoble, Montpellier)
2. Analyser par secteur
3. Prioriser les secteurs manquants
4. Créer des listes de prospects
```

### Cas 3 : Prospection B2B multi-secteurs
```
Objectif : Campagne générale tous secteurs
Étapes :
1. Importer tous les 110 prospects
2. Segmenter par secteur (8 segments)
3. Personnaliser les messages par secteur
4. Lancer les 8 campagnes en parallèle
5. Mesurer les taux de réponse
```

---

## ⚙️ Configuration technique

### Prérequis
- Python 3.8+
- Node.js 16+ (pour le dashboard web)
- Navigateur moderne (Chrome, Firefox, Safari)

### Installation locale

```bash
# Cloner le repository
git clone https://github.com/yourusername/replyshield.git
cd replyshield

# Installer les dépendances Python
pip install -r requirements.txt

# Valider les données
python scripts/validate_data.py

# Générer les CSV
python scripts/generate_csv.py

# Ouvrir le dashboard
open web/index.html
```

---

## 📞 Support et questions

### FAQ

**Q : Comment importer dans Brevo ?**
A : Voir la section "Démarrage rapide" → Importer dans Brevo

**Q : Puis-je modifier les données ?**
A : Oui, éditez `prospects_raw.json` puis relancez `generate_csv.py`

**Q : Quel est le meilleur secteur pour commencer ?**
A : Restauration et Beauté (76-74% sans réponse, fort potentiel)

**Q : Comment segmenter les prospects ?**
A : Utilisez le dashboard web ou filtrez les CSV avec Excel/Sheets

---

## 📄 Licence

Ce projet est fourni à titre informatif pour la prospection B2B.

**Conditions d'utilisation :**
- ✅ Utilisation pour prospection commerciale
- ✅ Modification des données
- ✅ Export et partage interne
- ❌ Revente des données
- ❌ Utilisation pour spam ou harcèlement

---

## 🔗 Liens utiles

- [Site ReplyShield](https://replyshield.io)
- [Dashboard web](./web/index.html)
- [Documentation complète](./docs/)
- [Données brutes](./data/prospects_raw.json)

---

**Dernière mise à jour :** 4 mars 2026

**Version :** 1.0.0

**Auteur :** Manus AI — Prospection B2B Automatisée
