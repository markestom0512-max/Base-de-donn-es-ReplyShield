"""
Workflow 03 — Relances automatiques J+7 et J+14
Déclencheur : lundi–vendredi à 10h (GitHub Actions cron)

Parcourt les prospects "contacté" ou "relance_1", calcule le nombre
de jours depuis le dernier envoi et envoie la relance appropriée.
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
DELAI_1 = SETTINGS["campagne"]["delai_relance_1_jours"]   # 7
DELAI_2 = SETTINGS["campagne"]["delai_relance_2_jours"]   # 14
SYSTEM_PROMPT = PROMPTS["systeme"]
SECTEURS_SPEC = PROMPTS.get("secteurs_specificites", {})


# ---------------------------------------------------------------------------
# Calcul jours écoulés
# ---------------------------------------------------------------------------

def days_since(date_str: str) -> int | None:
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(date_str.strip(), fmt).replace(tzinfo=timezone.utc)
            return (datetime.now(timezone.utc) - dt).days
        except ValueError:
            continue
    return None


# ---------------------------------------------------------------------------
# Génération relance
# ---------------------------------------------------------------------------

def _unsubscribe_url(prospect_id: str) -> str:
    return f"{PRODUIT['url']}/desinscription?id={prospect_id}"


def generate_relance(prospect: dict, relance_type: str) -> tuple[str, str]:
    ctx = {
        "prenom": prospect.get("PRENOM") or prospect.get("ENTREPRISE", "").split()[0],
        "entreprise": prospect.get("ENTREPRISE", ""),
        "secteur": prospect.get("SECTEUR", ""),
        "nb_avis": prospect.get("NB_AVIS", ""),
        "avis_sans_reponse": prospect.get("NB_AVIS_SANS_REPONSE", ""),
        "note_google": prospect.get("NOTE_GOOGLE", ""),
        "produit_nom": PRODUIT["nom"],
        "produit_pitch": PRODUIT["pitch_court"],
        "url_essai": PRODUIT["url_essai"],
        "essai": PRODUIT["essai"],
        "url_desinscription": _unsubscribe_url(prospect.get("ID", "")),
    }

    secteur_id = prospect.get("SECTEUR_ID", "")
    spec = SECTEURS_SPEC.get(secteur_id, "")
    system = SYSTEM_PROMPT + (f"\n\nContexte secteur : {spec}" if spec else "")

    key = "relance_1" if relance_type == "relance_1" else "relance_2"
    prompt_obj = PROMPTS[key]["prompt_generation_objet"].format(**ctx)
    prompt_corps = PROMPTS[key]["prompt_generation_corps"].format(**ctx)

    subject, body_text = claude_client.generate_subject_and_body(
        prompt_obj, prompt_corps, system=system
    )

    unsubscribe = _unsubscribe_url(prospect.get("ID", ""))
    html_body = (
        f"<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>"
        f"{body_text.replace(chr(10), '<br>')}"
        f"<hr style='margin-top:40px;border:none;border-top:1px solid #eee'>"
        f"<p style='font-size:11px;color:#999'>"
        f"<a href='{unsubscribe}'>Se désinscrire</a></p>"
        f"</div>"
    )
    return subject, html_body


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run():
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    all_rows = sheets.read_tab("PROSPECTS")
    if not all_rows or len(all_rows) < 2:
        print("Aucun prospect.")
        return

    headers = all_rows[0]
    id_idx = headers.index("ID") if "ID" in headers else None

    def find_row_index(pid: str) -> int | None:
        if id_idx is None:
            return None
        for i, row in enumerate(all_rows[1:]):
            if len(row) > id_idx and row[id_idx] == pid:
                return i
        return None

    sent_r1 = 0
    sent_r2 = 0

    for i, row in enumerate(all_rows[1:]):
        padded = row + [""] * (len(headers) - len(row))
        p = dict(zip(headers, padded))

        statut = p.get("STATUT", "").strip()
        email = p.get("EMAIL", "").strip()
        if not email:
            continue

        date_envoi = p.get("DATE_DERNIER_ENVOI", "").strip()
        jours = days_since(date_envoi)
        if jours is None:
            continue

        pid = p.get("ID", "")
        relance_type = None

        if statut == "contacté" and jours >= DELAI_1:
            relance_type = "relance_1"
        elif statut == "relance_1" and jours >= (DELAI_2 - DELAI_1):
            relance_type = "relance_2"

        if not relance_type:
            continue

        try:
            subject, html_body = generate_relance(p, relance_type)
        except Exception as e:
            print(f"  ✗ Claude échoué pour {p['ENTREPRISE']}: {e}")
            sheets.append_log("03_relances", pid, "claude_error", "error", str(e))
            continue

        try:
            brevo.send_email(
                to_email=email,
                to_name=p.get("ENTREPRISE", ""),
                subject=subject,
                html_body=html_body,
                tags=[p.get("SECTEUR_ID", ""), relance_type],
                headers={
                    "X-Prospect-ID": pid,
                    "X-Relance-Type": relance_type,
                },
            )
        except Exception as e:
            print(f"  ✗ Brevo échoué pour {p['ENTREPRISE']}: {e}")
            sheets.append_log("03_relances", pid, "brevo_error", "error", str(e))
            continue

        # Colonnes à mettre à jour selon le type
        fields = {
            "STATUT": relance_type,
            "DATE_DERNIER_ENVOI": now,
            "DATE_DERNIERE_ACTION": now,
        }
        if relance_type == "relance_1":
            fields["RELANCE_1_OBJET"] = subject
            fields["RELANCE_1_CORPS"] = html_body[:500]
            sent_r1 += 1
        else:
            fields["RELANCE_2_OBJET"] = subject
            fields["RELANCE_2_CORPS"] = html_body[:500]
            sent_r2 += 1

        row_idx = find_row_index(pid)
        if row_idx is not None:
            sheets.update_prospect_fields(row_idx, fields)

        action_label = "relance_1_envoyée" if relance_type == "relance_1" else "relance_2_envoyée"
        sheets.append_log(
            "03_relances", pid, action_label, "ok",
            f"{p['ENTREPRISE']} | j+{jours} | {email}",
        )
        print(f"  ✓ {relance_type} → {p['ENTREPRISE']} (j+{jours})")

    print(f"\nTerminé : relance_1={sent_r1}, relance_2={sent_r2}")
    sheets.append_log("03_relances", "", "run_terminé", "ok",
                      f"relance_1={sent_r1} relance_2={sent_r2}")


if __name__ == "__main__":
    run()
