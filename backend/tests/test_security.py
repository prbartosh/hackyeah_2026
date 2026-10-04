import logging

from app.services.email import LogEmailSender

API = "/api/v1"


async def test_template_items_api_is_not_public(client):
    response = await client.get(f"{API}/items")
    schema = (await client.get("/openapi.json")).json()

    assert response.status_code == 404
    assert f"{API}/items" not in schema["paths"]


async def test_log_email_sender_does_not_log_personal_data_or_thread_token(caplog):
    sender = LogEmailSender("noreply@example.test")
    secrets = [
        "person@example.test",
        "Poufna treść zgłoszenia",
        "sekretny-token-watku",
        "Temat zawierający nazwisko",
    ]

    with caplog.at_level(logging.INFO, logger="app.services.email"):
        await sender.send(
            secrets[0],
            secrets[3],
            f"{secrets[1]} https://example.test/watek/{secrets[2]}",
        )

    assert "przyjęty do wysłania" in caplog.text
    assert all(secret not in caplog.text for secret in secrets)
