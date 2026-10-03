from datetime import date, timedelta

import pytest

from app.api.deps import get_today
from app.main import app
from app.services.canvy import import_templates

API = "/api/v1"
TODAY = date(2026, 10, 3)

IDEA = {
    "istota": "Mobilny punkt kontaktowy dla samotnych seniorów na wsi, raz w tygodniu.",
    "odbiorca": "Samotni seniorzy z małych miejscowości",
    "etap": "test_mikroskala",
    "obszar": "dla-seniorow",
    "lokalizacja": "gmina Zielonki",
    "potrzeby": "Samochód i dwóch wolontariuszy",
}

NABOR = {
    "nazwa": "Nabór testowy",
    "termin_od": str(TODAY - timedelta(days=5)),
    "termin_do": str(TODAY + timedelta(days=20)),
    "obszary": ["dla-seniorow"],
    "odbiorcy": ["senior"],
    "pola": [
        {"klucz": "opis", "etykieta": "Opis projektu", "limit": 400, "zrodla": ["istota", "etap"]},
        {"klucz": "grupa", "etykieta": "Grupa docelowa", "limit": 200, "zrodla": ["odbiorca"]},
        {"klucz": "budzet", "etykieta": "Budżet", "limit": 300, "zrodla": []},
    ],
    "kryteria": [{"nazwa": "Innowacyjność", "opis": "Czy rozwiązanie jest nowe?"}],
}


@pytest.fixture
async def kreator(admin_client, session_factory):
    app.dependency_overrides[get_today] = lambda: TODAY
    async with session_factory() as session:
        await import_templates(session)
    return admin_client


async def new_fiszka(client, **fields):
    response = await client.post(f"{API}/kreator/fiszki", json=fields or IDEA)
    assert response.status_code == 201, response.text
    return response.json()


async def new_nabor(client, **changes):
    response = await client.post(f"{API}/admin/nabory", json={**NABOR, **changes})
    assert response.status_code == 201, response.text
    return response.json()


async def test_zlota_sciezka_fiszka_trafia_do_skrzynki_admina(kreator):
    fiszka = await new_fiszka(kreator, istota="Punkt dla seniorów")
    token = fiszka["token"]
    assert fiszka["status"] == "szkic"

    # Autozapis szkicu, powrót do niedokończonej fiszki
    await kreator.put(f"{API}/kreator/fiszki/{token}", json=IDEA)
    assert (await kreator.get(f"{API}/kreator/fiszki/{token}")).json()["lokalizacja"] == (
        "gmina Zielonki"
    )

    sent = await kreator.post(f"{API}/kreator/fiszki/{token}/wyslij", json={})
    assert sent.status_code == 200
    thread = (await kreator.get(f"{API}/zgloszenia/watek/{sent.json()['token_watku']}")).json()
    assert thread["status"] == "nowe"
    assert thread["wiadomosci"][0]["tresc"].startswith("[Pomysł z Kreatora]")
    assert "Samotni seniorzy" in thread["wiadomosci"][0]["tresc"]

    inbox = (await kreator.get(f"{API}/admin/zgloszenia")).json()
    assert inbox["total"] == 1
    notifications = (await kreator.get(f"{API}/admin/powiadomienia")).json()
    assert notifications["nieprzeczytane"] == 1

    # Wysłanej fiszki nie da się już zmieniać, a ponowne wysłanie nie dubluje zgłoszenia
    assert (
        await kreator.put(f"{API}/kreator/fiszki/{token}", json={"istota": "Inaczej"})
    ).status_code == 409
    again = await kreator.post(f"{API}/kreator/fiszki/{token}/wyslij", json={})
    assert again.json() == sent.json()
    assert (await kreator.get(f"{API}/admin/zgloszenia")).json()["total"] == 1


async def test_wyslanie_wymaga_pol_obowiazkowych(kreator):
    fiszka = await new_fiszka(kreator, istota="Sam pomysł bez odbiorcy i etapu")
    response = await kreator.post(f"{API}/kreator/fiszki/{fiszka['token']}/wyslij", json={})
    assert response.status_code == 422
    assert "dla kogo jest" in response.json()["detail"]
    assert (await kreator.get(f"{API}/admin/zgloszenia")).json()["total"] == 0


async def test_cudze_szkice_sa_chronione_tokenem(kreator):
    mine = await new_fiszka(kreator)
    other = await new_fiszka(kreator, istota="Cudzy pomysł")
    assert mine["token"] != other["token"]
    for method, path in [
        ("get", "/kreator/fiszki/zly-token-1234567890"),
        ("put", "/kreator/fiszki/zly-token-1234567890"),
        ("get", "/kreator/fiszki/zly-token-1234567890/podobne"),
        ("get", "/kreator/wnioski/zly-token-1234567890"),
        ("get", "/kreator/canvy/zly-token-1234567890"),
    ]:
        response = await getattr(kreator, method)(
            f"{API}{path}", **({"json": {}} if method == "put" else {})
        )
        assert response.status_code == 404, path
    # Fiszki nie da się wylistować: nie ma endpointu bez tokenu
    assert (await kreator.get(f"{API}/kreator/fiszki")).status_code in (404, 405)


async def test_ai_wypelnia_pola_i_odrzuca_wartosci_spoza_slownikow(kreator, ai_enabled):
    ai_enabled.json_response = {
        "istota": "Punkt dla seniorów",
        "odbiorca": "Seniorzy",
        "etap": "super-etap",
        "obszar": "wymyslony-obszar",
        "lokalizacja": None,
        "potrzeby": 5,
    }
    response = await kreator.post(
        f"{API}/kreator/ai/wypelnij", json={"opis": "Chcę pomagać samotnym seniorom na wsi."}
    )
    body = response.json()
    assert body["ai_uzyte"] is True
    assert body["pola"]["istota"] == "Punkt dla seniorów"
    assert body["pola"]["etap"] is None
    assert body["pola"]["obszar"] is None
    assert body["pola"]["potrzeby"] is None
    assert "OPIS" in ai_enabled.json_calls[0]["user"]


async def test_ai_bez_klucza_dziala_lagodnie(kreator):
    response = await kreator.post(
        f"{API}/kreator/ai/wypelnij", json={"opis": "Chcę pomagać samotnym seniorom na wsi."}
    )
    body = response.json()
    assert response.status_code == 200
    assert body["ai_uzyte"] is False
    assert "ręcznie" in body["komunikat"]


async def test_podobne_innowacje_ze_zrodlem(kreator):
    created = await kreator.post(
        f"{API}/admin/karty",
        json={
            "nazwa": "Mobilny punkt dla seniorów",
            "problem": "Samotni seniorzy na wsi nie mają kontaktu z pomocą",
            "grupa_docelowa": "Samotni seniorzy z małych miejscowości",
            "kategorie": ["dla-seniorow"],
        },
    )
    slug = created.json()["slug"]
    await kreator.patch(f"{API}/admin/karty/{slug}", json={"status": "opublikowana"})
    fiszka = await new_fiszka(kreator)
    similar = (await kreator.get(f"{API}/kreator/fiszki/{fiszka['token']}/podobne")).json()
    assert [i["slug"] for i in similar["items"]] == [slug]
    assert similar["items"][0]["url"]
    assert similar["items"][0]["zrodlo"].startswith("Biblioteka Innowacji")

    unrelated = await new_fiszka(kreator, istota="Kosmiczne rakiety na paliwo jądrowe dla Marsa")
    other = (await kreator.get(f"{API}/kreator/fiszki/{unrelated['token']}/podobne")).json()
    assert other["items"] == []


async def test_nabory_widoczne_tylko_w_terminie(kreator):
    created = await new_nabor(kreator)
    assert created["status"] == "aktywny"
    await new_nabor(
        kreator,
        nazwa="Nabór przyszły",
        termin_od=str(TODAY + timedelta(days=60)),
        termin_do=str(TODAY + timedelta(days=90)),
    )
    await new_nabor(
        kreator,
        nazwa="Nabór miniony",
        termin_od=str(TODAY - timedelta(days=90)),
        termin_do=str(TODAY - timedelta(days=30)),
    )
    overview = (await kreator.get(f"{API}/kreator/nabory")).json()
    assert [a["nabor"]["slug"] for a in overview["aktywne"]] == [created["slug"]]
    assert overview["kolejny"]["nazwa"] == "Nabór przyszły"
    assert overview["ostatni_zakonczony"]["nazwa"] == "Nabór miniony"

    # Granice terminów: ostatni dzień naboru jest jeszcze aktywny, następny już nie
    app.dependency_overrides[get_today] = lambda: TODAY + timedelta(days=20)
    assert len((await kreator.get(f"{API}/kreator/nabory")).json()["aktywne"]) == 1
    app.dependency_overrides[get_today] = lambda: TODAY + timedelta(days=21)
    after = (await kreator.get(f"{API}/kreator/nabory")).json()
    assert after["aktywne"] == []
    assert after["kolejny"]["nazwa"] == "Nabór przyszły"


async def test_wniosek_tylko_w_aktywnym_naborze(kreator):
    fiszka = await new_fiszka(kreator)
    past = await new_nabor(
        kreator,
        nazwa="Nabór miniony",
        termin_od=str(TODAY - timedelta(days=90)),
        termin_do=str(TODAY - timedelta(days=30)),
    )
    response = await kreator.post(
        f"{API}/kreator/wnioski", json={"fiszka_token": fiszka["token"], "nabor_slug": past["slug"]}
    )
    assert response.status_code == 409
    assert "zakończył się" in response.json()["detail"]


async def test_mapowanie_fiszki_na_pola_bez_zmyslania(kreator):
    fiszka = await new_fiszka(kreator)
    nabor = await new_nabor(kreator)
    response = await kreator.post(
        f"{API}/kreator/wnioski",
        json={"fiszka_token": fiszka["token"], "nabor_slug": nabor["slug"]},
    )
    assert response.status_code == 201
    wniosek = response.json()
    fields = {f["klucz"]: f for f in wniosek["pola"]}

    # Bez AI: tekst składany z samych danych fiszki, z oznaczeniem źródeł
    assert fields["grupa"]["tekst"] == IDEA["odbiorca"]
    assert fields["grupa"]["zrodlo"] == "fiszka"
    assert fields["grupa"]["uzyte_pola"] == ["Dla kogo jest"]
    assert IDEA["istota"] in fields["opis"]["tekst"]
    assert "Etap realizacji: Test w mikroskali" in fields["opis"]["tekst"]
    assert fields["opis"]["uzyte_pola"] == ["Istota pomysłu", "Etap realizacji"]
    # Budżetu nie ma w fiszce: pole zostaje puste i oznaczone „do uzupełnienia”
    assert fields["budzet"]["tekst"] == ""
    assert fields["budzet"]["do_uzupelnienia"] is True
    assert fields["budzet"]["zrodlo"] == "brak"
    assert wniosek["komunikat_ai"] is not None
    assert wniosek["kryteria"][0]["nazwa"] == "Innowacyjność"

    # Powrót daje ten sam szkic
    again = await kreator.post(
        f"{API}/kreator/wnioski",
        json={"fiszka_token": fiszka["token"], "nabor_slug": nabor["slug"]},
    )
    assert again.json()["token"] == wniosek["token"]


async def test_ai_nie_moze_dopisac_liczb_ani_budzetu(kreator, ai_enabled):
    fiszka = await new_fiszka(kreator)
    nabor = await new_nabor(kreator)
    ai_enabled.json_response = {
        "pola": {
            "opis": "Punkt obsłuży 500 seniorów, budżet 80 000 zł.",
            "grupa": "Samotni seniorzy z małych miejscowości.",
            "budzet": "Koszt to 80 000 zł.",
        }
    }
    wniosek = (
        await kreator.post(
            f"{API}/kreator/wnioski",
            json={"fiszka_token": fiszka["token"], "nabor_slug": nabor["slug"]},
        )
    ).json()
    fields = {f["klucz"]: f for f in wniosek["pola"]}
    assert fields["grupa"]["zrodlo"] == "ai"
    assert fields["grupa"]["tekst"] == "Samotni seniorzy z małych miejscowości."
    # Liczby spoza fiszki: tekst AI odrzucony, zostaje tekst z danych fiszki
    assert "500" not in fields["opis"]["tekst"]
    assert fields["opis"]["zrodlo"] == "fiszka"
    # Pole bez źródeł w fiszce nie dostaje tekstu nawet, gdy model go zwróci
    assert fields["budzet"]["tekst"] == ""
    assert wniosek["komunikat_ai"] is None
    # AI dostało tylko pola, do których fiszka ma dane
    assert "budzet" not in ai_enabled.json_calls[0]["user"]


async def test_edycja_wniosku_limity_eksport_i_wyslanie(kreator):
    fiszka = await new_fiszka(kreator)
    nabor = await new_nabor(kreator)
    wniosek = (
        await kreator.post(
            f"{API}/kreator/wnioski",
            json={"fiszka_token": fiszka["token"], "nabor_slug": nabor["slug"]},
        )
    ).json()
    url = f"{API}/kreator/wnioski/{wniosek['token']}"

    too_long = await kreator.put(url, json={"pola": {"grupa": "x" * 201}})
    assert too_long.status_code == 422
    unknown = await kreator.put(url, json={"pola": {"nie_ma": "x"}})
    assert unknown.status_code == 422

    edited = (await kreator.put(url, json={"pola": {"budzet": "Do ustalenia z księgową."}})).json()
    fields = {f["klucz"]: f for f in edited["pola"]}
    assert fields["budzet"]["zrodlo"] == "uzytkownik"
    assert fields["budzet"]["do_uzupelnienia"] is False

    docx = await kreator.get(f"{url}/eksport")
    assert docx.status_code == 200
    assert docx.content[:2] == b"PK"
    txt = await kreator.get(f"{url}/eksport?format=txt")
    assert "Do ustalenia z księgową." in txt.text
    assert "[DO UZUPEŁNIENIA]" not in txt.text.split("Budżet")[1]

    sent = await kreator.post(f"{url}/wyslij")
    assert sent.status_code == 200
    assert (await kreator.put(url, json={"pola": {"grupa": "Inni"}})).status_code == 409
    inbox = (await kreator.get(f"{API}/admin/zgloszenia")).json()
    assert inbox["total"] == 1


async def test_znajdz_finansowanie_dopasowanie_z_wyjasnieniem(kreator):
    await new_nabor(kreator)
    await new_nabor(
        kreator, nazwa="Nabór o rynku pracy", obszary=["dla-rynku-pracy"], odbiorcy=["bezrobotn"]
    )
    fiszka = await new_fiszka(kreator)
    overview = (await kreator.get(f"{API}/kreator/nabory?fiszka={fiszka['token']}")).json()
    first, second = overview["aktywne"]
    assert first["nabor"]["nazwa"] == "Nabór testowy"
    assert first["dopasowanie"]["pasuje"] is True
    assert "Dla seniorów" in first["dopasowanie"]["powod"]
    assert second["dopasowanie"]["pasuje"] is False


async def test_finansowanie_z_karty_innowacji_wypelnia_fiszke(kreator):
    created = await kreator.post(
        f"{API}/admin/karty",
        json={
            "nazwa": "Kody QR dla seniorów",
            "problem": "Seniorzy z demencją zapominają o lekach",
            "grupa_docelowa": "Seniorzy",
            "kategorie": ["dla-seniorow"],
        },
    )
    slug = created.json()["slug"]
    await kreator.patch(f"{API}/admin/karty/{slug}", json={"status": "opublikowana"})
    nabor = await new_nabor(kreator)

    overview = (await kreator.get(f"{API}/kreator/nabory?karta={slug}")).json()
    assert overview["aktywne"][0]["dopasowanie"]["pasuje"] is True

    fiszka = (await kreator.post(f"{API}/kreator/fiszki/z-karty/{slug}")).json()
    assert fiszka["karta"]["slug"] == slug
    assert "Kody QR dla seniorów" in fiszka["istota"]
    assert fiszka["obszar"] == "dla-seniorow"
    wniosek = await kreator.post(
        f"{API}/kreator/wnioski",
        json={"fiszka_token": fiszka["token"], "nabor_slug": nabor["slug"]},
    )
    assert wniosek.status_code == 201

    missing = await kreator.post(f"{API}/kreator/fiszki/z-karty/nie-ma-takiej")
    assert missing.status_code == 404


async def test_admin_nabory_wymagaja_tokenu_i_waliduja_terminy(kreator, client):
    unauthorized = await client.get(f"{API}/admin/nabory")
    assert unauthorized.status_code in (401, 503)
    bad = await kreator.post(
        f"{API}/admin/nabory",
        json={**NABOR, "termin_od": str(TODAY), "termin_do": str(TODAY - timedelta(days=1))},
    )
    assert bad.status_code == 422
    duplicate_keys = await kreator.post(
        f"{API}/admin/nabory", json={**NABOR, "pola": [NABOR["pola"][0], NABOR["pola"][0]]}
    )
    assert duplicate_keys.status_code == 422
    created = await new_nabor(kreator)
    updated = await kreator.put(
        f"{API}/admin/nabory/{created['slug']}", json={**NABOR, "nazwa": "Nowa nazwa"}
    )
    assert updated.json()["nazwa"] == "Nowa nazwa"
    listing = (await kreator.get(f"{API}/admin/nabory")).json()
    assert listing["total"] == 1


async def test_canva_zapis_powrot_i_eksport(kreator):
    templates = (await kreator.get(f"{API}/kreator/canvy/szablony")).json()
    assert templates[0]["slug"] == "innowacji-spolecznych"
    assert len(templates[0]["sekcje"]) >= 10

    fiszka = await new_fiszka(kreator)
    canva = (
        await kreator.post(
            f"{API}/kreator/canvy",
            json={"tytul": "Mój pomysł", "fiszka_token": fiszka["token"]},
        )
    ).json()
    assert canva["fiszka_token"] == fiszka["token"]
    url = f"{API}/kreator/canvy/{canva['token']}"

    saved = await kreator.put(url, json={"wartosci": {"problem_skala": "Wąska grupa"}})
    assert saved.json()["wartosci"] == {"problem_skala": "Wąska grupa"}
    again = await kreator.put(url, json={"wartosci": {"koszty_stale": "Koordynator"}})
    assert set(again.json()["wartosci"]) == {"problem_skala", "koszty_stale"}
    assert (await kreator.put(url, json={"wartosci": {"nie_ma": "x"}})).status_code == 422
    export = await kreator.get(f"{url}/eksport")
    assert export.content[:2] == b"PK"


async def test_asystent_wskazuje_braki_i_kroki_bez_ai(kreator):
    fiszka = await new_fiszka(kreator, istota="Punkt dla seniorów", etap="pomysl")
    advice = (await kreator.post(f"{API}/kreator/fiszki/{fiszka['token']}/asystent")).json()
    assert "Dla kogo jest" in advice["braki"]
    assert "Istota pomysłu" not in advice["braki"]
    assert advice["kolejne_kroki"]
    assert advice["ai_uzyte"] is False


async def test_asystent_pytania_z_ai(kreator, ai_enabled):
    fiszka = await new_fiszka(kreator, istota="Punkt dla seniorów")
    ai_enabled.json_response = {"pytania": ["Kto będzie korzystał z punktu?", "", 5]}
    advice = (await kreator.post(f"{API}/kreator/fiszki/{fiszka['token']}/asystent")).json()
    assert advice["pytania"] == ["Kto będzie korzystał z punktu?"]
    assert advice["ai_uzyte"] is True
