"""
Workflow 01 — Scraping Google Places → CRM Google Sheets
Déclencheur : lundi + mercredi à 2h (GitHub Actions cron)

Pour chaque secteur × ville, interroge Google Places Text Search,
enrichit avec Place Details (téléphone, site), extrait l'email du site,
calcule un score 0-100 et écrit les prospects qualifiés dans PROSPECTS.
"""

import os
import re
import sys
import json
import hashlib
import requests
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from scripts.utils import sheets

PLACES_KEY = os.environ.get("GOOGLE_PLACES_KEY", "")
TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

# Chargement config
with open(os.path.join(os.path.dirname(__file__), "..", "config", "settings.json")) as f:
    SETTINGS = json.load(f)

SCORING = SETTINGS["scoring"]
SECTEURS = SETTINGS["ciblage"]["secteurs"]
VILLES = SETTINGS["ciblage"]["villes"]

# Emails parasites à ignorer
EMAIL_BLACKLIST = re.compile(
    r"(noreply|no-reply|donotreply|support|contact@sentry|@example|@test)",
    re.I,
)
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")


# ---------------------------------------------------------------------------
# Google Places
# ---------------------------------------------------------------------------

def search_places(query: str, city: str) -> list[dict]:
    params = {
        "query": f"{query} {city}",
        "language": "fr",
        "key": PLACES_KEY,
    }
    r = requests.get(TEXT_SEARCH_URL, params=params, timeout=15)
    r.raise_for_status()
    data = r.json()
    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        raise RuntimeError(f"Places API error: {data.get('status')} — {data.get('error_message', '')}")
    return data.get("results", [])


def get_place_details(place_id: str) -> dict:
    params = {
        "place_id": place_id,
        "fields": "name,formatted_phone_number,website,opening_hours",
        "language": "fr",
        "key": PLACES_KEY,
    }
    r = requests.get(DETAILS_URL, params=params, timeout=15)
    r.raise_for_status()
    return r.json().get("result", {})


# ---------------------------------------------------------------------------
# Extraction email
# ---------------------------------------------------------------------------

def extract_email_from_website(url: str) -> str | None:
    if not url:
        return None
    try:
        r = requests.get(url, timeout=8, allow_redirects=True, headers={"User-Agent": "Mozilla/5.0"})
        matches = EMAIL_RE.findall(r.text)
        for email in matches:
            if not EMAIL_BLACKLIST.search(email):
                return email.lower()
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def compute_score(nb_avis: int, nb_sans_reponse: int, note_google: float) -> int:
    """Score 0-100 pondéré selon les poids de settings.json."""
    pct_sans_reponse = nb_sans_reponse / nb_avis if nb_avis else 0

    # Poids 50% : % sans réponse (plus c'est élevé, plus le score est haut)
    score_pct = pct_sans_reponse * 100 * SCORING["poids_pct_sans_reponse"]

    # Poids 30% : volume d'avis (normalisé sur 500)
    score_vol = min(nb_avis / 500, 1.0) * 100 * SCORING["poids_nb_avis"]

    # Poids 20% : note faible = plus de potentiel d'amélioration (inverse)
    score_note = (1 - (note_google - 1) / 4) * 100 * SCORING["poids_note_google"]

    return round(score_pct + score_vol + score_note)


def estimate_unanswered(nb_avis: int, secteur_id: str) -> int:
    """Estimation du nombre d'avis sans réponse (basée sur les taux observés par secteur)."""
    rates = {
        "restauration": 0.76, "beaute": 0.74, "automobile": 0.78,
        "auto_ecole": 0.79, "sante": 0.80, "artisanat": 0.80,
        "hotellerie": 0.64, "services": 0.89, "sport_loisirs": 0.75, "commerce": 0.73,
    }
    rate = rates.get(secteur_id, 0.75)
    return round(nb_avis * rate)


# ---------------------------------------------------------------------------
# Dedup
# ---------------------------------------------------------------------------

def prospect_id(name: str, city: str) -> str:
    return hashlib.md5(f"{name.lower()}{city.lower()}".encode()).hexdigest()[:12]


def get_existing_ids() -> set[str]:
    try:
        rows = sheets.read_tab("PROSPECTS")
        if len(rows) < 2:
            return set()
        headers = rows[0]
        if "ID" not in headers:
            return set()
        idx = headers.index("ID")
        return {r[idx] for r in rows[1:] if len(r) > idx}
    except Exception:
        return set()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run():
    if not PLACES_KEY:
        raise EnvironmentError("GOOGLE_PLACES_KEY manquant")

    existing_ids = get_existing_ids()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    added = 0
    skipped = 0

    for secteur in SECTEURS:
        secteur_id = secteur["id"]
        secteur_label = secteur["label"]
        min_avis = secteur["score_min_avis"]

        for ville in VILLES:
            for query in secteur["queries_google"]:
                print(f"  → {query} / {ville}")
                try:
                    results = search_places(query, ville)
                except Exception as e:
                    print(f"    ⚠ Erreur Places: {e}")
                    sheets.append_log("01_scrape", "", "search_error", "error", f"{query} {ville}: {e}")
                    continue

                for place in results:
                    nb_avis = place.get("user_ratings_total", 0)
                    note = place.get("rating", 0.0)
                    name = place.get("name", "")
                    address = place.get("formatted_address", "")
                    place_id = place.get("place_id", "")

                    if nb_avis < min_avis:
                        continue

                    pid = prospect_id(name, ville)
                    if pid in existing_ids:
                        skipped += 1
                        continue

                    # Enrichissement
                    try:
                        details = get_place_details(place_id)
                    except Exception:
                        details = {}

                    website = details.get("website", "")
                    phone = details.get("formatted_phone_number", "")
                    email = extract_email_from_website(website)

                    nb_sans_reponse = estimate_unanswered(nb_avis, secteur_id)
                    pct_sans_reponse = round(nb_sans_reponse / nb_avis * 100) if nb_avis else 0
                    score = compute_score(nb_avis, nb_sans_reponse, note)

                    if score < 55 or not email:
                        skipped += 1
                        continue

                    prospect = {
                        "ID": pid,
                        "DATE_AJOUT": now,
                        "PRENOM": "",
                        "NOM": "",
                        "EMAIL": email,
                        "ENTREPRISE": name,
                        "SECTEUR": secteur_label,
                        "SECTEUR_ID": secteur_id,
                        "VILLE": ville,
                        "ADRESSE": address,
                        "TELEPHONE": phone,
                        "SITE_WEB": website,
                        "NOTE_GOOGLE": note,
                        "NB_AVIS": nb_avis,
                        "NB_AVIS_SANS_REPONSE": nb_sans_reponse,
                        "PCT_SANS_REPONSE": pct_sans_reponse,
                        "SCORE": score,
                        "STATUT": "nouveau",
                        "NB_OUVERTURES": 0,
                        "NB_CLICS": 0,
                        "DATE_DERNIER_ENVOI": "",
                        "DATE_DERNIERE_ACTION": "",
                        "EMAIL_OBJET": "",
                        "EMAIL_CORPS": "",
                        "RELANCE_1_OBJET": "",
                        "RELANCE_1_CORPS": "",
                        "RELANCE_2_OBJET": "",
                        "RELANCE_2_CORPS": "",
                        "NOTES": "",
                    }

                    try:
                        sheets.append_prospect(prospect)
                        existing_ids.add(pid)
                        added += 1
                        sheets.append_log(
                            "01_scrape", pid, "prospect_ajouté", "ok",
                            f"{name} | {ville} | score={score} | {email}",
                        )
                    except Exception as e:
                        print(f"    ⚠ Erreur Sheets: {e}")

    print(f"\nTerminé : {added} ajoutés, {skipped} ignorés.")
    sheets.append_log("01_scrape", "", "run_terminé", "ok", f"added={added} skipped={skipped}")


if __name__ == "__main__":
    run()
