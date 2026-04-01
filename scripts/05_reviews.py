"""
Workflow 05 — Réponses automatiques aux avis Google
Déclencheur : toutes les 2h (GitHub Actions cron)

Pour chaque client actif dans Supabase :
  1. Rafraîchit le token Google OAuth
  2. Récupère les avis sans réponse (Google My Business API)
  3. Génère une réponse via Claude (adaptée au secteur + à la note)
  4. Publie la réponse sur Google
  5. Logue dans Supabase
"""

import os
import sys
import json
import requests
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from scripts.utils import claude_client

with open(os.path.join(os.path.dirname(__file__), "..", "prompts", "email_templates.json")) as f:
    PROMPTS = json.load(f)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")

GMB_BASE = "https://mybusiness.googleapis.com/v4"
OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"
MAX_REVIEWS_PER_RUN = 10

SYSTEM_AVIS = PROMPTS["reponses_avis_google"]["systeme_avis"]
SECTEURS_TON = PROMPTS["reponses_avis_google"].get("secteurs_ton", {})


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------

def _supa_headers() -> dict:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


def get_active_clients() -> list[dict]:
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/get_active_clients",
        headers=_supa_headers(),
        timeout=15,
    )
    r.raise_for_status()
    return r.json()


def log_review(client_id: str, review_id: str, reviewer: str, rating: int,
               review_text: str, response: str, model: str):
    payload = {
        "client_id": client_id,
        "review_id": review_id,
        "reviewer_name": reviewer,
        "rating": rating,
        "review_text": review_text,
        "ai_response": response,
        "model_version": model,
        "responded_at": datetime.now(timezone.utc).isoformat(),
    }
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/avis_google",
        headers=_supa_headers(),
        json=payload,
        timeout=15,
    )
    r.raise_for_status()


def update_client_stats(client_id: str):
    now = datetime.now(timezone.utc).isoformat()
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/clients?id=eq.{client_id}",
        headers=_supa_headers(),
        json={"last_sync_at": now},
        timeout=15,
    )
    r.raise_for_status()

    # Incrément total_reviews_answered via RPC
    requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/increment_reviews_answered",
        headers=_supa_headers(),
        json={"client_id": client_id},
        timeout=15,
    )


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------

def refresh_access_token(refresh_token: str) -> str:
    r = requests.post(OAUTH_TOKEN_URL, data={
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
    }, timeout=15)
    r.raise_for_status()
    return r.json()["access_token"]


# ---------------------------------------------------------------------------
# Google My Business
# ---------------------------------------------------------------------------

def get_unanswered_reviews(account_id: str, location_id: str, access_token: str) -> list[dict]:
    url = f"{GMB_BASE}/accounts/{account_id}/locations/{location_id}/reviews"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"pageSize": 50, "orderBy": "updateTime desc"}

    r = requests.get(url, headers=headers, params=params, timeout=15)
    r.raise_for_status()
    reviews = r.json().get("reviews", [])

    # Filtre : sans réponse uniquement
    return [rv for rv in reviews if "reviewReply" not in rv][:MAX_REVIEWS_PER_RUN]


def post_review_reply(account_id: str, location_id: str, review_id: str,
                      reply_text: str, access_token: str):
    url = f"{GMB_BASE}/accounts/{account_id}/locations/{location_id}/reviews/{review_id}/reply"
    r = requests.put(
        url,
        headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
        json={"comment": reply_text},
        timeout=15,
    )
    r.raise_for_status()


# ---------------------------------------------------------------------------
# Génération réponse
# ---------------------------------------------------------------------------

def _select_prompt(rating: int, has_text: bool) -> str:
    avis = PROMPTS["reponses_avis_google"]
    if not has_text:
        return avis["prompt_avis_sans_texte"]
    if rating >= 4:
        return avis["prompt_avis_positif"]
    if rating == 3:
        return avis["prompt_avis_neutre"]
    return avis["prompt_avis_negatif"]


def generate_review_response(company: str, sector: str, reviewer: str,
                              rating: int, review_text: str) -> str:
    has_text = bool(review_text and review_text.strip())
    prompt_tpl = _select_prompt(rating, has_text)

    ctx = {
        "company": company,
        "sector": sector,
        "reviewer_name": reviewer or "client",
        "rating": rating,
        "review_text": review_text or "",
    }

    sector_tone = SECTEURS_TON.get(sector.lower(), "")
    system = SYSTEM_AVIS + (f"\n\nTon pour ce secteur : {sector_tone}" if sector_tone else "")

    try:
        prompt = prompt_tpl.format(**ctx)
    except KeyError:
        prompt = f"Rédige une réponse courte et professionnelle à un avis {rating}/5 de {reviewer} pour {company}."

    return claude_client.generate(prompt, system=system, model="claude-sonnet-4-6", max_tokens=300)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run():
    if not all([SUPABASE_URL, SUPABASE_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET]):
        raise EnvironmentError("Variables manquantes : SUPABASE_URL, SUPABASE_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET")

    clients = get_active_clients()
    print(f"{len(clients)} clients actifs.")

    total_replied = 0

    for client in clients:
        client_id = client.get("id", "")
        company = client.get("name", "")
        sector = client.get("sector", "")
        refresh_token = client.get("google_refresh_token", "")
        account_id = client.get("google_account_id", "")
        location_id = client.get("google_location_id", "")

        if not all([refresh_token, account_id, location_id]):
            print(f"  ⚠ {company} : credentials Google manquants, ignoré.")
            continue

        print(f"\n  Client : {company}")

        try:
            access_token = refresh_access_token(refresh_token)
        except Exception as e:
            print(f"  ✗ Token refresh échoué : {e}")
            continue

        try:
            reviews = get_unanswered_reviews(account_id, location_id, access_token)
        except Exception as e:
            print(f"  ✗ Récupération avis échouée : {e}")
            continue

        print(f"    {len(reviews)} avis sans réponse.")
        replied = 0

        for review in reviews:
            review_id = review.get("reviewId", "")
            reviewer = review.get("reviewer", {}).get("displayName", "")
            rating = review.get("starRating", 0)

            # Google stocke la note en string ("FIVE", "FOUR", …)
            star_map = {"ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5}
            if isinstance(rating, str):
                rating = star_map.get(rating.upper(), 3)

            review_text = review.get("comment", "")

            try:
                response_text = generate_review_response(
                    company, sector, reviewer, rating, review_text
                )
            except Exception as e:
                print(f"    ✗ Claude échoué pour avis {review_id}: {e}")
                continue

            try:
                post_review_reply(account_id, location_id, review_id, response_text, access_token)
            except Exception as e:
                print(f"    ✗ Post réponse échoué pour {review_id}: {e}")
                continue

            try:
                log_review(
                    client_id, review_id, reviewer, rating,
                    review_text, response_text, "claude-sonnet-4-6"
                )
            except Exception as e:
                print(f"    ⚠ Log Supabase échoué: {e}")

            print(f"    ✓ Répondu à {reviewer} ({rating}★)")
            replied += 1

        if replied > 0:
            try:
                update_client_stats(client_id)
            except Exception as e:
                print(f"  ⚠ Mise à jour stats échouée: {e}")

        total_replied += replied

    print(f"\nTerminé : {total_replied} réponses publiées.")


if __name__ == "__main__":
    run()
