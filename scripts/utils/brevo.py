"""Helper Brevo — contacts, envoi SMTP, lecture events."""

import os
import requests

BASE = "https://api.brevo.com/v3"


def _headers():
    key = os.environ.get("BREVO_KEY")
    if not key:
        raise EnvironmentError("BREVO_KEY manquant")
    return {"api-key": key, "Content-Type": "application/json"}


def upsert_contact(email: str, attributes: dict, list_ids: list[int] | None = None):
    """Crée ou met à jour un contact Brevo."""
    payload = {"email": email, "attributes": attributes, "updateEnabled": True}
    if list_ids:
        payload["listIds"] = list_ids
    r = requests.post(f"{BASE}/contacts", json=payload, headers=_headers(), timeout=15)
    r.raise_for_status()
    return r.json() if r.text else {}


def send_email(
    to_email: str,
    to_name: str,
    subject: str,
    html_body: str,
    sender_name: str = "Manus",
    sender_email: str = "manus@replyshield.io",
    tags: list[str] | None = None,
    headers: dict | None = None,
):
    """Envoie un email transactionnel via Brevo SMTP."""
    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "htmlContent": html_body,
    }
    if tags:
        payload["tags"] = tags
    if headers:
        payload["headers"] = headers

    r = requests.post(f"{BASE}/smtp/email", json=payload, headers=_headers(), timeout=15)
    r.raise_for_status()
    return r.json()


def get_email_events(limit: int = 100, event_type: str | None = None, since_date: str | None = None) -> list[dict]:
    """
    Récupère les événements email récents (open, click, reply…).
    since_date format : "YYYY-MM-DD HH:MM:SS"
    """
    params: dict = {"limit": limit, "sort": "desc"}
    if event_type:
        params["event"] = event_type
    if since_date:
        params["startDate"] = since_date[:10]  # Brevo attend YYYY-MM-DD

    r = requests.get(f"{BASE}/smtp/statistics/events", params=params, headers=_headers(), timeout=15)
    r.raise_for_status()
    return r.json().get("events", [])
