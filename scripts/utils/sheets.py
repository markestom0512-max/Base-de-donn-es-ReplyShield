"""Helper Google Sheets — lecture et écriture dans le CRM."""

import os
import json
import base64
from datetime import datetime

from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

_service = None


def _get_service():
    global _service
    if _service:
        return _service

    raw = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    if not raw:
        raise EnvironmentError("GOOGLE_SERVICE_ACCOUNT_JSON manquant")

    # Accepte base64 ou JSON brut
    try:
        info = json.loads(raw)
    except json.JSONDecodeError:
        info = json.loads(base64.b64decode(raw).decode())

    creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    _service = build("sheets", "v4", credentials=creds, cache_discovery=False)
    return _service


def _spreadsheet_id():
    sid = os.environ.get("SPREADSHEET_ID")
    if not sid:
        raise EnvironmentError("SPREADSHEET_ID manquant")
    return sid


def read_tab(tab: str) -> list[list]:
    """Retourne toutes les lignes (incluant en-tête) d'un onglet."""
    svc = _get_service()
    result = (
        svc.spreadsheets()
        .values()
        .get(spreadsheetId=_spreadsheet_id(), range=tab)
        .execute()
    )
    return result.get("values", [])


def read_prospects(status_filter: str | None = None, min_score: int = 0) -> list[dict]:
    """
    Lit l'onglet PROSPECTS et retourne une liste de dicts.
    Filtre optionnel sur STATUT et SCORE.
    """
    rows = read_tab("PROSPECTS")
    if not rows:
        return []

    headers = rows[0]
    prospects = []
    for row in rows[1:]:
        # Compléter les colonnes manquantes
        padded = row + [""] * (len(headers) - len(row))
        p = dict(zip(headers, padded))

        if status_filter and p.get("STATUT", "").strip() != status_filter:
            continue
        try:
            score = int(p.get("SCORE", 0) or 0)
        except ValueError:
            score = 0
        if score < min_score:
            continue

        p["_score_int"] = score
        prospects.append(p)

    return prospects


def append_prospect(prospect: dict):
    """Ajoute une ligne dans l'onglet PROSPECTS."""
    rows = read_tab("PROSPECTS")
    if not rows:
        raise ValueError("Onglet PROSPECTS vide ou inexistant")
    headers = rows[0]
    row = [prospect.get(h, "") for h in headers]
    _append_rows("PROSPECTS", [row])


def update_prospect_fields(row_index: int, fields: dict):
    """
    Met à jour des champs précis d'un prospect.
    row_index = index 0-based dans rows[1:] (i.e. ligne Sheet = row_index + 2).
    """
    rows = read_tab("PROSPECTS")
    headers = rows[0]
    sheet_row = row_index + 2  # +1 header, +1 base-1

    svc = _get_service()
    for field, value in fields.items():
        if field not in headers:
            continue
        col_idx = headers.index(field)
        col_letter = _col_letter(col_idx)
        cell = f"PROSPECTS!{col_letter}{sheet_row}"
        svc.spreadsheets().values().update(
            spreadsheetId=_spreadsheet_id(),
            range=cell,
            valueInputOption="RAW",
            body={"values": [[value]]},
        ).execute()


def append_log(workflow: str, prospect_id: str, action: str, status: str, details: str, error: str = ""):
    """Ajoute une ligne dans l'onglet LOGS."""
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    _append_rows("LOGS", [[now, workflow, prospect_id, action, status, details, error]])


def _append_rows(tab: str, rows: list[list]):
    svc = _get_service()
    svc.spreadsheets().values().append(
        spreadsheetId=_spreadsheet_id(),
        range=tab,
        valueInputOption="RAW",
        insertDataOption="INSERT_ROWS",
        body={"values": rows},
    ).execute()


def _col_letter(idx: int) -> str:
    """Convertit un index de colonne 0-based en lettre (A, B, … Z, AA, …)."""
    result = ""
    idx += 1
    while idx:
        idx, rem = divmod(idx - 1, 26)
        result = chr(65 + rem) + result
    return result
