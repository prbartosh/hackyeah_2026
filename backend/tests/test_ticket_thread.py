from app.core.config import settings
from app.services.email import LogEmailSender
from tests.test_tickets import API, first_ticket_id, submit


async def test_autor_dopisuje_do_watku(admin_client):
    token = await submit(admin_client, "Mama ma demencję i zapomina o lekach, szukam pomocy")
    ticket_id = await first_ticket_id(admin_client)
    await admin_client.post(
        f"{API}/admin/zgloszenia/{ticket_id}/odpowiedz",
        json={"tresc": "Dzień dobry.", "zrodla": []},
    )
    thread = (await admin_client.get(f"{API}/zgloszenia/watek/{token}")).json()
    assert thread["status"] == "odpowiedziane"

    sent = await admin_client.post(
        f"{API}/zgloszenia/watek/{token}/wiadomosci", json={"tresc": "  Dziękuję, mam pytanie.  "}
    )
    assert sent.status_code == 201
    assert sent.json()["autor_rola"] == "uzytkownik"
    assert sent.json()["tresc"] == "Dziękuję, mam pytanie."

    thread = (await admin_client.get(f"{API}/zgloszenia/watek/{token}")).json()
    assert [m["autor_rola"] for m in thread["wiadomosci"]] == ["uzytkownik", "admin", "uzytkownik"]
    assert thread["status"] == "w_trakcie"

    ticket = (await admin_client.get(f"{API}/admin/zgloszenia/{ticket_id}")).json()
    assert ticket["wiadomosci"][-1]["tresc"] == "Dziękuję, mam pytanie."
    notifications = (await admin_client.get(f"{API}/admin/powiadomienia")).json()["items"]
    assert f"Nowa wiadomość w zgłoszeniu #{ticket_id}" in [n["tekst"] for n in notifications]


async def test_odpowiedz_autora_walidacja_i_zly_token(admin_client):
    token = await submit(admin_client, "Opis sprawy na co najmniej dziesięć znaków")
    url = f"{API}/zgloszenia/watek/{token}/wiadomosci"
    assert (await admin_client.post(url, json={"tresc": "   "})).status_code == 422
    assert (await admin_client.post(url, json={"tresc": "x" * 4001})).status_code == 422
    missing = await admin_client.post(
        f"{API}/zgloszenia/watek/nie-ma/wiadomosci", json={"tresc": "Dzień dobry"}
    )
    assert missing.status_code == 404


async def test_odpowiedz_autora_wysyla_mail_do_zespolu_i_nie_cofa_nowego(admin_client, monkeypatch):
    sent: list[tuple[str, str]] = []

    async def fake_send(self, to, subject, body):
        sent.append((to, subject))

    monkeypatch.setattr(LogEmailSender, "send", fake_send)
    monkeypatch.setattr(settings, "admin_notify_email", "zespol@example.test")
    token = await submit(admin_client, "Opis sprawy na co najmniej dziesięć znaków")
    ticket_id = await first_ticket_id(admin_client)
    sent.clear()
    await admin_client.post(f"{API}/zgloszenia/watek/{token}/wiadomosci", json={"tresc": "Dopisek"})
    assert sent == [("zespol@example.test", f"Nowa wiadomość w zgłoszeniu #{ticket_id}")]
    thread = (await admin_client.get(f"{API}/zgloszenia/watek/{token}")).json()
    assert thread["status"] == "nowe"
