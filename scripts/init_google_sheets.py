"""
init_google_sheets.py
---------------------
Crée et initialise la structure CRM Google Sheets pour le système de prospection.

Usage :
  pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
  python scripts/init_google_sheets.py

Prérequis :
  - Fichier credentials.json (Service Account Google Cloud) dans le même dossier
  - API Google Sheets activée dans votre projet Google Cloud
  - Le service account doit avoir accès au Drive
"""

import json
import os
from google.oauth2 import service_account
from googleapiclient.discovery import build

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ──────────────────────────────────────────────────────────────────────────────

CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "credentials.json")
SPREADSHEET_TITLE = "ReplyShield — CRM Prospection B2B"
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

# Couleurs
BLEU_HEADER   = {"red": 0.12, "green": 0.31, "blue": 0.57}
VERT_HEADER   = {"red": 0.13, "green": 0.55, "blue": 0.13}
ORANGE_HEADER = {"red": 0.85, "green": 0.45, "blue": 0.10}
GRIS_HEADER   = {"red": 0.35, "green": 0.35, "blue": 0.35}
BLANC         = {"red": 1.0, "green": 1.0, "blue": 1.0}

# ──────────────────────────────────────────────────────────────────────────────
# STRUCTURE DES ONGLETS
# ──────────────────────────────────────────────────────────────────────────────

TABS = {
    "PROSPECTS": {
        "color": BLEU_HEADER,
        "columns": [
            "ID", "EMAIL", "PRENOM", "NOM", "TELEPHONE",
            "ENTREPRISE", "SECTEUR", "VILLE", "ADRESSE", "SITE_WEB",
            "NOTE_GOOGLE", "NB_AVIS", "AVIS_SANS_REPONSE", "PCT_SANS_REPONSE", "SCORE",
            "STATUT", "DATE_AJOUT", "DATE_DERNIER_ENVOI",
            "NB_OUVERTURES", "NB_CLICS", "DATE_DERNIERE_ACTION",
            "EMAIL_OBJET", "EMAIL_CORPS",
            "RELANCE_1_OBJET", "RELANCE_1_CORPS",
            "RELANCE_2_OBJET", "RELANCE_2_CORPS",
            "NOTES_COMMERCIALES"
        ],
        "description": "Base de données des prospects avec historique des interactions",
        "statuts_valides": ["nouveau", "contacté", "relance_1", "relance_2", "chaud", "converti", "exclu"]
    },
    "CONFIG": {
        "color": GRIS_HEADER,
        "columns": ["CLE", "VALEUR", "DESCRIPTION"],
        "data": [
            ["produit_nom",          "ReplyShield",                              "Nom du produit"],
            ["produit_url",          "https://replyshield.io",                   "URL principale"],
            ["produit_url_essai",    "https://replyshield.io/essai-gratuit",     "URL d'essai gratuit"],
            ["produit_pitch",        "Répond automatiquement aux avis Google en 30s via l'IA", "Pitch court"],
            ["produit_essai",        "14 jours gratuits, sans carte bancaire",   "Description de l'offre"],
            ["expediteur_nom",       "Manus",                                    "Nom de l'expéditeur"],
            ["expediteur_email",     "manus@replyshield.io",                     "Email de l'expéditeur"],
            ["alerte_email",         "votre@email.com",                          "Email pour recevoir les alertes prospects chauds"],
            ["score_min_campagne",   "60",                                        "Score minimum pour envoyer un email"],
            ["seuil_prospect_chaud", "3",                                        "Nb d'ouvertures pour marquer un prospect comme chaud"],
            ["batch_size",           "20",                                        "Nb max de prospects envoyés par batch"],
            ["delai_relance_1",      "7",                                        "Jours avant relance 1"],
            ["delai_relance_2",      "14",                                       "Jours avant relance 2"],
            ["actif",               "true",                                     "Activer/désactiver la campagne (true/false)"],
        ]
    },
    "STATS": {
        "color": VERT_HEADER,
        "columns": [
            "PERIODE", "SECTEUR", "VILLE",
            "TOTAL_PROSPECTS", "EMAILS_ENVOYES", "OUVERTURES",
            "CLICS", "REPONSES", "CONVERTIS",
            "TAUX_OUVERTURE", "TAUX_CLIC", "TAUX_CONVERSION"
        ],
        "description": "Statistiques automatiquement alimentées par N8N"
    },
    "LOGS": {
        "color": ORANGE_HEADER,
        "columns": [
            "TIMESTAMP", "WORKFLOW", "PROSPECT_ID",
            "ACTION", "STATUT", "DETAILS", "ERREUR"
        ],
        "description": "Journal des actions automatiques N8N"
    }
}


# ──────────────────────────────────────────────────────────────────────────────
# FONCTIONS
# ──────────────────────────────────────────────────────────────────────────────

def get_service():
    """Initialise le service Google Sheets."""
    creds = service_account.Credentials.from_service_account_file(
        CREDENTIALS_FILE, scopes=SCOPES
    )
    return build("sheets", "v4", credentials=creds)


def create_spreadsheet(service):
    """Crée le Google Sheet principal."""
    body = {
        "properties": {"title": SPREADSHEET_TITLE},
        "sheets": [
            {"properties": {"title": tab_name, "index": i}}
            for i, tab_name in enumerate(TABS.keys())
        ]
    }
    result = service.spreadsheets().create(body=body).execute()
    sheet_id = result["spreadsheetId"]
    print(f"✅ Google Sheet créé : https://docs.google.com/spreadsheets/d/{sheet_id}")
    return sheet_id, result["sheets"]


def get_sheet_ids(sheets_metadata):
    """Retourne un dict {tab_name: sheetId}."""
    return {
        s["properties"]["title"]: s["properties"]["sheetId"]
        for s in sheets_metadata
    }


def format_header(service, spreadsheet_id, sheet_id, num_columns, color):
    """Applique la mise en forme à la ligne d'en-tête."""
    requests = [
        {
            "repeatCell": {
                "range": {
                    "sheetId": sheet_id,
                    "startRowIndex": 0, "endRowIndex": 1,
                    "startColumnIndex": 0, "endColumnIndex": num_columns
                },
                "cell": {
                    "userEnteredFormat": {
                        "backgroundColor": color,
                        "textFormat": {
                            "foregroundColor": BLANC,
                            "bold": True,
                            "fontSize": 10
                        },
                        "horizontalAlignment": "CENTER",
                        "verticalAlignment": "MIDDLE"
                    }
                },
                "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)"
            }
        },
        {
            "updateSheetProperties": {
                "properties": {
                    "sheetId": sheet_id,
                    "gridProperties": {"frozenRowCount": 1}
                },
                "fields": "gridProperties.frozenRowCount"
            }
        },
        {
            "autoResizeDimensions": {
                "dimensions": {
                    "sheetId": sheet_id,
                    "dimension": "COLUMNS",
                    "startIndex": 0,
                    "endIndex": num_columns
                }
            }
        }
    ]
    service.spreadsheets().batchUpdate(
        spreadsheetId=spreadsheet_id,
        body={"requests": requests}
    ).execute()


def write_headers_and_data(service, spreadsheet_id, tab_name, tab_config):
    """Écrit les en-têtes et les données initiales."""
    range_headers = f"{tab_name}!A1"
    values = [tab_config["columns"]]

    if "data" in tab_config:
        values.extend(tab_config["data"])

    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=range_headers,
        valueInputOption="RAW",
        body={"values": values}
    ).execute()
    print(f"  ✅ En-têtes écrites dans l'onglet '{tab_name}'")


def add_data_validation_prospects(service, spreadsheet_id, sheet_id):
    """Ajoute une liste déroulante de statuts sur la colonne STATUT (col P = index 15)."""
    statuts = TABS["PROSPECTS"]["statuts_valides"]
    requests = [{
        "setDataValidation": {
            "range": {
                "sheetId": sheet_id,
                "startRowIndex": 1,
                "endRowIndex": 10000,
                "startColumnIndex": 15,
                "endColumnIndex": 16
            },
            "rule": {
                "condition": {
                    "type": "ONE_OF_LIST",
                    "values": [{"userEnteredValue": s} for s in statuts]
                },
                "showCustomUi": True,
                "strict": True
            }
        }
    }]
    service.spreadsheets().batchUpdate(
        spreadsheetId=spreadsheet_id,
        body={"requests": requests}
    ).execute()
    print("  ✅ Validation des statuts ajoutée (colonne STATUT)")


def add_score_conditional_formatting(service, spreadsheet_id, sheet_id):
    """Colorie la colonne SCORE (col O = index 14) en dégradé vert/orange/rouge."""
    requests = [
        {
            "addConditionalFormatRule": {
                "rule": {
                    "ranges": [{"sheetId": sheet_id, "startColumnIndex": 14, "endColumnIndex": 15, "startRowIndex": 1}],
                    "gradientRule": {
                        "minpoint": {"color": {"red": 0.95, "green": 0.27, "blue": 0.27}, "type": "NUMBER", "value": "0"},
                        "midpoint": {"color": {"red": 1.0,  "green": 0.76, "blue": 0.03}, "type": "NUMBER", "value": "50"},
                        "maxpoint": {"color": {"red": 0.20, "green": 0.78, "blue": 0.35}, "type": "NUMBER", "value": "100"}
                    }
                },
                "index": 0
            }
        }
    ]
    service.spreadsheets().batchUpdate(
        spreadsheetId=spreadsheet_id,
        body={"requests": requests}
    ).execute()
    print("  ✅ Mise en forme conditionnelle du SCORE ajoutée")


def update_settings_file(spreadsheet_id):
    """Met à jour settings.json avec le vrai spreadsheet_id."""
    settings_path = os.path.join(os.path.dirname(__file__), "..", "config", "settings.json")
    with open(settings_path, "r", encoding="utf-8") as f:
        settings = json.load(f)

    settings["google_sheets"]["spreadsheet_id"] = spreadsheet_id

    with open(settings_path, "w", encoding="utf-8") as f:
        json.dump(settings, f, ensure_ascii=False, indent=2)

    print(f"\n✅ config/settings.json mis à jour avec le spreadsheet_id : {spreadsheet_id}")


# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  Initialisation Google Sheets — CRM Prospection B2B")
    print("=" * 60)

    if not os.path.exists(CREDENTIALS_FILE):
        print(f"\n❌ Fichier credentials.json introuvable dans : {CREDENTIALS_FILE}")
        print("\nPour l'obtenir :")
        print("  1. Google Cloud Console → APIs & Services → Credentials")
        print("  2. Create Credentials → Service Account")
        print("  3. Télécharger le JSON et le renommer 'credentials.json'")
        print("  4. Placer dans le dossier scripts/")
        print("  5. Activer : Google Sheets API + Google Drive API")
        return

    print("\n📡 Connexion à Google Sheets API...")
    service = get_service()

    print("📋 Création du Google Sheet...")
    spreadsheet_id, sheets_metadata = create_spreadsheet(service)
    sheet_ids = get_sheet_ids(sheets_metadata)

    print("\n📝 Configuration des onglets...")
    for tab_name, tab_config in TABS.items():
        print(f"\n  ▶ Onglet '{tab_name}'")
        write_headers_and_data(service, spreadsheet_id, tab_name, tab_config)
        format_header(
            service, spreadsheet_id,
            sheet_ids[tab_name],
            len(tab_config["columns"]),
            tab_config["color"]
        )

    print("\n🎨 Formatages avancés sur PROSPECTS...")
    add_data_validation_prospects(service, spreadsheet_id, sheet_ids["PROSPECTS"])
    add_score_conditional_formatting(service, spreadsheet_id, sheet_ids["PROSPECTS"])

    update_settings_file(spreadsheet_id)

    print("\n" + "=" * 60)
    print("  ✅ INITIALISATION TERMINÉE")
    print("=" * 60)
    print(f"\n  🔗 Google Sheet : https://docs.google.com/spreadsheets/d/{spreadsheet_id}")
    print(f"  📋 Spreadsheet ID : {spreadsheet_id}")
    print("\n  Prochaine étape : Copier ce Spreadsheet ID dans N8N")
    print("=" * 60)


if __name__ == "__main__":
    main()
