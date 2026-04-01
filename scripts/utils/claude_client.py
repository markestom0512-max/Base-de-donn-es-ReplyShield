"""Helper Anthropic Claude — génération de texte."""

import os
import anthropic

_client = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if not _client:
        key = os.environ.get("ANTHROPIC_KEY")
        if not key:
            raise EnvironmentError("ANTHROPIC_KEY manquant")
        _client = anthropic.Anthropic(api_key=key)
    return _client


def generate(
    prompt: str,
    system: str = "",
    model: str = "claude-sonnet-4-6",
    max_tokens: int = 500,
) -> str:
    """Appelle Claude et retourne le texte généré."""
    client = _get_client()
    kwargs: dict = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        kwargs["system"] = system

    message = client.messages.create(**kwargs)
    return message.content[0].text.strip()


def generate_subject_and_body(
    prompt_subject: str,
    prompt_body: str,
    system: str = "",
    model: str = "claude-sonnet-4-6",
) -> tuple[str, str]:
    """Génère objet + corps en deux appels distincts."""
    subject = generate(prompt_subject, system=system, model=model, max_tokens=100)
    body = generate(prompt_body, system=system, model=model, max_tokens=600)
    return subject, body
