"""
Workflow 04 — Détection prospects chauds (polling Brevo)
Déclencheur : toutes les 15 min (GitHub Actions cron)

Interroge l'API Brevo pour récupérer les événements open/click
des 20 dernières minutes, met à jour les compteurs dans Sheets,
et envoie une alerte email si un prospect dépasse le seuil.
"""

import os
import sys
import json
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from scripts.utils import sheets, brevo, claude_client

with open(os.path.join(os.path.dirname(__file__), "..", "config", "settings.json")) as f:
    SETTINGS = json.load(f)
with open(os.path.join(os.path.dirname(__file__), "..", "prompts", "email_templates.json")) as f:
    PROMPTS = json.load(f)

PRODUIT = SETTINGS["produit"]
SEUIL_OUVERTURES = SETTINGS["campagne"]["seuil_ouvertures_prospect_chaud"]  # 3
SEUIL_SCORE_CHAUD = SETTINGS["scoring"]["seuil_prospect_chaud"]             # 80
ALERT_EMAIL = os.environ.get("ALERT_EMAIL", "")

SHEETS_URL = f"https://docs.google.com/spreadsheets/d/{os.environ.get('SPREADSHEET_ID', '')}"


# ---------------------------------------------------------------------------
# Génération alerte
# ---------------------------------------------------------------------------

def generate_alert_text(prospect: dict) -> str:
    ctx = {
        "prenom": prospect.get("PRENOM") or prospect.get("ENTREPRISE", "").split()[0],
        "entreprise": prospect.get("ENTREPRISE", ""),
        "secteur": prospect.get("SECTEUR", ""),
        "ville": prospect.get("VILLE", ""),
        "nb_ouvertures": prospect.get("NB_OUVERTURES", 0),
        "score": prospect.get("SCORE", 0),
    }
    prompt = PROMPTS["alerte_prospect_chaud"]["prompt_generation"].format(**ctx)
    try:
        return claude_client.generate(prompt, model="claude-haiku-4-5-20251001", max_tokens=100)
    except Exception:
        return f"Contactez {ctx['prenom']} de {ctx['entreprise']} maintenant — prospect très engagé."


def send_alert(prospect: dict, recommendation: str):
    if not ALERT_EMAIL:
        print("  ⚠ ALERT_EMAIL non configuré, alerte ignorée.")
        return

    email_prospect = prospect.get("EMAIL", "")
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#e53e3e">🔥 Prospect chaud détecté</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px;font-weight:bold">Entreprise</td>
            <td style="padding:6px">{prospect.get('ENTREPRISE','')}</td></tr>
        <tr style="background:#f7f7f7">
            <td style="padding:6px;font-weight:bold">Contact</td>
            <td style="padding:6px"><a href="mailto:{email_prospect}">{email_prospect}</a></td></tr>
        <tr><td style="padding:6px;font-weight:bold">Secteur</td>
            <td style="padding:6px">{prospect.get('SECTEUR','')}</td></tr>
        <tr style="background:#f7f7f7">
            <td style="padding:6px;font-weight:bold">Score</td>
            <td style="padding:6px">{prospect.get('SCORE','')}/100</td></tr>
        <tr><td style="padding:6px;font-weight:bold">Ouvertures</td>
            <td style="padding:6px">{prospect.get('NB_OUVERTURES',0)}</td></tr>
        <tr style="background:#f7f7f7">
            <td style="padding:6px;font-weight:bold">Clics</td>
            <td style="padding:6px">{prospect.get('NB_CLICS',0)}</td></tr>
      </table>
      <div style="margin-top:20px;padding:15px;background:#fff8e1;border-left:4px solid #f6c90e">
        <strong>Recommandation IA :</strong><br>{recommendation}
      </div>
      <p style="margin-top:20px">
        <a href="{SHEETS_URL}" style="background:#4a90e2;color:white;padding:10px 20px;
           text-decoration:none;border-radius:4px">Ouvrir le CRM</a>
      </p>
    </div>
    """

    brevo.send_email(
        to_email=ALERT_EMAIL,
        to_name="Équipe ReplyShield",
        subject=f"🔥 Prospect chaud : {prospect.get('ENTREPRISE','')}",
        html_body=html,
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run():
    now = datetime.now(timezone.utc)
    # Fenêtre : 20 min en arrière (marge pour les 15 min du cron)
    since = (now - timedelta(minutes=20)).strftime("%Y-%m-%d %H:%M:%S")

    # Récupère les événements Brevo récents
    events: list[dict] = []
    for event_type in ("opened", "clicks"):
        try:
            events += brevo.get_email_events(limit=100, event_type=event_type, since_date=since)
        except Exception as e:
            print(f"  ⚠ Erreur récupération events Brevo ({event_type}): {e}")

    if not events:
        print("Aucun événement récent.")
        return

    # Lecture du CRM
    all_rows = sheets.read_tab("PROSPECTS")
    if not all_rows or len(all_rows) < 2:
        return

    headers = all_rows[0]
    id_idx = headers.index("ID") if "ID" in headers else None
    email_idx = headers.index("EMAIL") if "EMAIL" in headers else None

    def find_prospect_by_email(target_email: str) -> tuple[int, dict] | tuple[None, None]:
        for i, row in enumerate(all_rows[1:]):
            padded = row + [""] * (len(headers) - len(row))
            p = dict(zip(headers, padded))
            if p.get("EMAIL", "").strip().lower() == target_email.lower():
                return i, p
        return None, None

    now_str = now.strftime("%Y-%m-%d %H:%M:%S")
    alerted_ids: set[str] = set()

    for event in events:
        email_addr = event.get("email", "")
        event_type = event.get("event", "")
        if not email_addr:
            continue

        row_idx, prospect = find_prospect_by_email(email_addr)
        if prospect is None:
            continue

        pid = prospect.get("ID", email_addr)
        statut = prospect.get("STATUT", "")

        # Ignorer prospects déjà convertis ou exclus
        if statut in ("converti", "exclu"):
            continue

        # Incrémenter compteurs
        try:
            nb_ouv = int(prospect.get("NB_OUVERTURES", 0) or 0)
            nb_clics = int(prospect.get("NB_CLICS", 0) or 0)
        except ValueError:
            nb_ouv, nb_clics = 0, 0

        if "open" in event_type.lower():
            nb_ouv += 1
        elif "click" in event_type.lower():
            nb_clics += 1

        already_hot = statut == "chaud"
        is_hot = nb_ouv >= SEUIL_OUVERTURES or nb_clics >= 1

        fields = {
            "NB_OUVERTURES": nb_ouv,
            "NB_CLICS": nb_clics,
            "DATE_DERNIERE_ACTION": now_str,
        }
        if is_hot and not already_hot:
            fields["STATUT"] = "chaud"

        if row_idx is not None:
            sheets.update_prospect_fields(row_idx, fields)

        sheets.append_log(
            "04_hot_leads", pid, f"compteur_{event_type}", "ok",
            f"{prospect.get('ENTREPRISE','')} | ouv={nb_ouv} clics={nb_clics}",
        )

        # Alerte une seule fois par prospect + par run
        if is_hot and not already_hot and pid not in alerted_ids:
            prospect["NB_OUVERTURES"] = nb_ouv
            prospect["NB_CLICS"] = nb_clics
            recommendation = generate_alert_text(prospect)
            try:
                send_alert(prospect, recommendation)
                alerted_ids.add(pid)
                sheets.append_log(
                    "04_hot_leads", pid, "alerte_envoyée", "ok",
                    f"{prospect.get('ENTREPRISE','')} | {ALERT_EMAIL}",
                )
                print(f"  🔥 Alerte envoyée : {prospect.get('ENTREPRISE','')} (ouv={nb_ouv}, clics={nb_clics})")
            except Exception as e:
                print(f"  ✗ Alerte échouée: {e}")

    print(f"Terminé : {len(events)} events traités, {len(alerted_ids)} alertes envoyées.")


if __name__ == "__main__":
    run()
