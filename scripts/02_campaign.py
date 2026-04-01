"""
Workflow 02 — Campagne envoi (Sheets → Claude → Brevo)
Déclencheur : mardi + mercredi à 9h (GitHub Actions cron)

Lit les prospects "nouveau" avec score >= 60, génère un email
personnalisé via Claude et l'envoie via Brevo (max 20 par batch).
"""

import os
import sys
import json
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from scripts.utils import sheets, brevo, claude_client

# Chargement config + prompts
with open(os.path.join(os.path.dirname(__file__), "..", "config", "settings.json")) as f:
    SETTINGS = json.load(f)
with open(os.path.join(os.path.dirname(__file__), "..", "prompts", "email_templates.json")) as f:
    PROMPTS = json.load(f)

PRODUIT = SETTINGS["produit"]
BATCH_SIZE = SETTINGS["campagne"]["nb_max_prospects_par_batch"]
MIN_SCORE = SETTINGS["scoring"]["seuil_envoi_campagne"]
SYSTEM_PROMPT = PROMPTS["systeme"]
SECTEURS_SPEC = PROMPTS.get("secteurs_specificites", {})

ALERT_EMAIL = os.environ.get("ALERT_EMAIL", PRODUIT["expediteur_email"])


# ---------------------------------------------------------------------------
# Génération email
# ---------------------------------------------------------------------------

def _preview_url(prospect: dict) -> str:
    slug = prospect.get("ENTREPRISE", "").lower().replace(" ", "-")[:30]
    return f"{PRODUIT['url']}/apercu/{slug}"


def _unsubscribe_url(prospect_id: str) -> str:
    return f"{PRODUIT['url']}/desinscription?id={prospect_id}"


def generate_email(prospect: dict) -> tuple[str, str]:
    """Retourne (sujet, corps_html) générés par Claude."""
    ctx = {
        "prenom": prospect.get("PRENOM") or prospect.get("ENTREPRISE", "").split()[0],
        "entreprise": prospect.get("ENTREPRISE", ""),
        "secteur": prospect.get("SECTEUR", ""),
        "ville": prospect.get("VILLE", ""),
        "nb_avis": prospect.get("NB_AVIS", ""),
        "avis_sans_reponse": prospect.get("NB_AVIS_SANS_REPONSE", ""),
        "pct_sans_reponse": prospect.get("PCT_SANS_REPONSE", ""),
        "note_google": prospect.get("NOTE_GOOGLE", ""),
        "produit_nom": PRODUIT["nom"],
        "produit_pitch": PRODUIT["pitch_court"],
        "url_essai": PRODUIT["url_essai"],
        "essai": PRODUIT["essai"],
        "url_preview_site": _preview_url(prospect),
    }

    secteur_id = prospect.get("SECTEUR_ID", "")
    spec = SECTEURS_SPEC.get(secteur_id, "")
    system = SYSTEM_PROMPT + (f"\n\nContexte secteur : {spec}" if spec else "")

    prompt_obj = PROMPTS["email_initial"]["prompt_generation_objet"].format(**ctx)
    prompt_corps = PROMPTS["email_initial"]["prompt_generation_corps"].format(**ctx)

    subject, body_text = claude_client.generate_subject_and_body(
        prompt_obj, prompt_corps, system=system
    )

    # Enveloppe HTML minimale
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

    prospects = sheets.read_prospects(status_filter="nouveau", min_score=MIN_SCORE)
    prospects.sort(key=lambda p: p["_score_int"], reverse=True)
    batch = prospects[:BATCH_SIZE]

    if not batch:
        print("Aucun prospect éligible.")
        return

    print(f"{len(batch)} prospects à contacter.")
    sent = 0

    # Lire la liste complète pour obtenir les index de ligne
    all_rows = sheets.read_tab("PROSPECTS")
    headers = all_rows[0]
    id_idx = headers.index("ID") if "ID" in headers else None

    def find_row_index(pid: str) -> int | None:
        if id_idx is None:
            return None
        for i, row in enumerate(all_rows[1:]):
            if len(row) > id_idx and row[id_idx] == pid:
                return i
        return None

    for prospect in batch:
        pid = prospect.get("ID", "")
        email = prospect.get("EMAIL", "")
        if not email:
            continue

        try:
            subject, html_body = generate_email(prospect)
        except Exception as e:
            print(f"  ✗ Claude échoué pour {prospect['ENTREPRISE']}: {e}")
            sheets.append_log("02_campaign", pid, "claude_error", "error", str(e))
            continue

        try:
            brevo.upsert_contact(
                email,
                {
                    "ENTREPRISE": prospect.get("ENTREPRISE", ""),
                    "SECTEUR": prospect.get("SECTEUR", ""),
                    "VILLE": prospect.get("VILLE", ""),
                    "SCORE": prospect.get("SCORE", ""),
                },
            )
            brevo.send_email(
                to_email=email,
                to_name=prospect.get("ENTREPRISE", ""),
                subject=subject,
                html_body=html_body,
                tags=[prospect.get("SECTEUR_ID", ""), "campagne_initiale"],
                headers={
                    "X-Prospect-ID": pid,
                    "X-Relance-Type": "initial",
                },
            )
        except Exception as e:
            print(f"  ✗ Brevo échoué pour {prospect['ENTREPRISE']}: {e}")
            sheets.append_log("02_campaign", pid, "brevo_error", "error", str(e))
            continue

        # Mise à jour Sheets
        row_idx = find_row_index(pid)
        if row_idx is not None:
            sheets.update_prospect_fields(row_idx, {
                "STATUT": "contacté",
                "EMAIL_OBJET": subject,
                "EMAIL_CORPS": html_body[:500],
                "DATE_DERNIER_ENVOI": now,
                "DATE_DERNIERE_ACTION": now,
            })

        sheets.append_log("02_campaign", pid, "email_envoyé", "ok",
                          f"{prospect['ENTREPRISE']} | {email} | {subject}")
        print(f"  ✓ {prospect['ENTREPRISE']} ({email})")
        sent += 1

    print(f"\nTerminé : {sent}/{len(batch)} emails envoyés.")
    sheets.append_log("02_campaign", "", "run_terminé", "ok", f"sent={sent}")


if __name__ == "__main__":
    run()
