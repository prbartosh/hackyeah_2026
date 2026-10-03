import io

from docx import Document

from app.core.config import settings
from app.repositories.innovation import InnovationRepository

API = "/api/v1/admin"

DOC_TEXT = [
    "Projekt Sąsiedzka Świetlica Online",
    "Problem: seniorzy na wsi spędzają zimę w izolacji i nie mają z kim porozmawiać.",
    "Odbiorcy: samotni seniorzy powyżej 70 roku życia.",
    "Wdrożenie wymaga jednego koordynatora i tabletów dla uczestników.",
    "Pilotaż w dwóch gminach objął 40 osób.",
]


def make_docx(lines: list[str]) -> bytes:
    doc = Document()
    for line in lines:
        doc.add_paragraph(line)
    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


def upload(client, name="projekt.docx", data=None):
    return client.post(
        f"{API}/importy",
        files={"file": (name, data if data is not None else make_docx(DOC_TEXT))},
    )


def field(value, quote, confidence=0.9):
    return {"wartosc": value, "cytat": quote, "pewnosc": confidence}


async def test_ai_wypelnia_tylko_pola_z_cytatem_w_dokumencie(admin_client, ai_enabled):
    ai_enabled.json_response = {
        "nazwa": field("Sąsiedzka Świetlica Online", "Projekt Sąsiedzka Świetlica Online"),
        "problem": field(
            "Seniorzy na wsi są zimą w izolacji",
            "seniorzy na wsi spędzają zimę w izolacji",
            0.4,
        ),
        "poziom_kosztu": field("niski", "koszt jest bardzo niski"),  # cytatu nie ma w dokumencie
        "czas_startu": field("dni", None),  # brak cytatu
        "wymagane_zasoby": field(["koordynator", "tablety"], "jednego koordynatora i tabletów"),
        "poziom_dowodu": field("pilotaz", "Pilotaż w dwóch gminach objął 40 osób."),
    }
    response = await upload(admin_client)
    assert response.status_code == 201
    body = response.json()
    assert body["ekstrakcja_zrodlo"] == "ai"
    fields = body["pola"]
    assert fields["nazwa"]["wartosc"] == "Sąsiedzka Świetlica Online"
    assert fields["problem"]["niska_pewnosc"] is True
    assert fields["poziom_kosztu"]["wartosc"] is None
    assert fields["czas_startu"]["wartosc"] is None
    assert fields["opis"]["wartosc"] is None
    assert fields["poziom_dowodu"]["wartosc"] == "pilotaz"
    assert "Sąsiedzka Świetlica" in body["tekst"]


async def test_zatwierdzenie_tworzy_karte_widoczna_w_matchmakingu(
    admin_client, ai_enabled
):
    ai_enabled.json_response = {
        "nazwa": field("Sąsiedzka Świetlica Online", "Projekt Sąsiedzka Świetlica Online"),
        "problem": field("Izolacja seniorów zimą", "seniorzy na wsi spędzają zimę w izolacji"),
        "poziom_dowodu": field("pilotaz", "Pilotaż w dwóch gminach objął 40 osób."),
        "wymagane_zasoby": field(["koordynator"], "jednego koordynatora"),
    }
    import_id = (await upload(admin_client)).json()["id"]
    approved = await admin_client.post(f"{API}/importy/{import_id}/zatwierdz", json={})
    assert approved.status_code == 200
    slug = approved.json()["karta_slug"]
    assert approved.json()["status"] == "zatwierdzony"

    card = (await admin_client.get(f"{API}/karty/{slug}")).json()
    assert card["status"] == "opublikowana"
    assert card["zrodlo"] == "dokument"
    assert card["poziom_dowodu"] == "pilotaz"
    assert card["wdrozenie"]["wymagane_zasoby"] == ["koordynator"]
    assert card["wdrozenie"]["poziom_kosztu"] is None  # nie ma w dokumencie, puste
    assert InnovationRepository(settings.innovations_path).get(slug) is not None

    again = await admin_client.post(f"{API}/importy/{import_id}/zatwierdz", json={})
    assert again.status_code == 409


async def test_bez_ai_pola_puste_i_reczna_edycja(admin_client):
    response = await upload(admin_client)
    body = response.json()
    assert body["ekstrakcja_zrodlo"] == "reczna"
    assert "ręcznie" in body["komunikat"]
    assert all(f["wartosc"] is None for f in body["pola"].values())
    blocked = await admin_client.post(f"{API}/importy/{body['id']}/zatwierdz", json={})
    assert blocked.status_code == 422
    edited = await admin_client.patch(
        f"{API}/importy/{body['id']}",
        json={"pola": {"nazwa": "Ręczna karta", "problem": "Opisany ręcznie"}},
    )
    assert edited.json()["pola"]["nazwa"]["reczne"] is True
    ok = await admin_client.post(f"{API}/importy/{body['id']}/zatwierdz", json={})
    assert ok.status_code == 200


async def test_odrzucenie_nie_tworzy_karty(admin_client):
    import_id = (await upload(admin_client)).json()["id"]
    rejected = await admin_client.post(f"{API}/importy/{import_id}/odrzuc")
    assert rejected.json()["status"] == "odrzucony"
    assert (await admin_client.get(f"{API}/karty")).json()["total"] == 0


async def test_aktualizacja_istniejacej_karty_nie_kasuje_danych(admin_client, ai_enabled):
    created = await admin_client.post(
        f"{API}/karty",
        json={"nazwa": "Stara karta", "problem": "Stary problem", "organizacja": "Fundacja X"},
    )
    slug = created.json()["slug"]
    ai_enabled.json_response = {
        "nazwa": field("Nowa nazwa", "Projekt Sąsiedzka Świetlica Online"),
        "problem": field("Izolacja", "seniorzy na wsi spędzają zimę w izolacji"),
    }
    import_id = (await upload(admin_client)).json()["id"]
    await admin_client.post(f"{API}/importy/{import_id}/zatwierdz", json={"aktualizuj_slug": slug})
    card = (await admin_client.get(f"{API}/karty/{slug}")).json()
    assert card["nazwa"] == "Nowa nazwa"
    assert card["problem"] == "Izolacja"
    assert card["organizacja"] == "Fundacja X"
    assert card["status"] == "opublikowana"


async def test_zle_pliki(admin_client):
    txt = await upload(admin_client, "notatki.txt", b"tekst" * 100)
    assert txt.status_code == 422
    fake_pdf = await upload(admin_client, "a.pdf", b"to nie jest pdf")
    assert fake_pdf.status_code == 422
    empty_docx = await upload(admin_client, "pusty.docx", make_docx(["krótko"]))
    assert empty_docx.status_code == 422
    assert "tekstu" in empty_docx.json()["detail"]


async def test_odczyt_pdf():
    from app.services.documents import extract_text

    body = "BT /F1 12 Tf 72 720 Td (Projekt testowy pilotaz w gminie. " + "x" * 60 + ") Tj ET"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        "/Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(body)} >>\nstream\n{body}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    pdf = "%PDF-1.4\n"
    offsets = []
    for i, obj in enumerate(objects, 1):
        offsets.append(len(pdf))
        pdf += f"{i} 0 obj\n{obj}\nendobj\n"
    xref = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    pdf += "".join(f"{o:010d} 00000 n \n" for o in offsets)
    pdf += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF"
    assert "Projekt testowy" in extract_text("a.pdf", pdf.encode("latin-1"))


async def test_importy_wymagaja_tokenu(client):
    assert (await client.get(f"{API}/importy")).status_code in (401, 503)
