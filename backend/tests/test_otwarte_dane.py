import csv
import io

from app.services.otwarte_dane import DOCUMENT_COLUMNS, INNOVATION_COLUMNS, to_csv

PREFIX = "/api/v1/otwarte-dane"
NOT_PUBLIC = {"opis", "czy_dziala", "pdf_url", "youtube_url", "materialy_url", "obraz_url"}


def parse(response) -> list[dict[str, str]]:
    text = response.content.decode("utf-8-sig")
    return list(csv.DictReader(io.StringIO(text), delimiter=";"))


async def test_innovations_json(client):
    response = await client.get(f"{PREFIX}/innowacje.json")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert "attachment" in response.headers["content-disposition"]
    rows = response.json()
    listed = (await client.get("/api/v1/innovations")).json()
    assert [r["slug"] for r in rows] == [i["slug"] for i in listed]
    assert set(rows[0]) == set(INNOVATION_COLUMNS)
    assert not NOT_PUBLIC & set(rows[0])
    assert all(r["zrodlo"] == "ROPS Kraków" for r in rows)
    assert rows[0]["url_splot"].endswith(f"/innowacja/{rows[0]['slug']}")


async def test_innovations_csv(client):
    response = await client.get(f"{PREFIX}/innowacje.csv")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "charset=utf-8" in response.headers["content-type"]
    assert response.headers["content-disposition"].startswith("attachment;")
    assert response.content.startswith(b"\xef\xbb\xbf")
    first_line = response.content.decode("utf-8-sig").splitlines()[0]
    assert first_line == ";".join(INNOVATION_COLUMNS)
    rows = parse(response)
    assert len(rows) == len((await client.get(f"{PREFIX}/innowacje.json")).json())


async def test_documents_exports_without_content(client):
    response = await client.get(f"{PREFIX}/dokumenty.json")
    assert response.status_code == 200
    rows = response.json()
    assert rows
    assert set(rows[0]) == set(DOCUMENT_COLUMNS)
    assert "tresc" not in rows[0]
    csv_response = await client.get(f"{PREFIX}/dokumenty.csv")
    assert csv_response.content.startswith(b"\xef\xbb\xbf")
    assert "attachment" in csv_response.headers["content-disposition"]
    assert len(parse(csv_response)) == len(rows)


async def test_licenses_only_where_in_data(client):
    summary = (await client.get(PREFIX)).json()
    documents = (await client.get(f"{PREFIX}/dokumenty.json")).json()
    licensed = [d for d in documents if d["licencja"]]
    assert len(licensed) == summary["dokumenty_z_licencja"]
    source = (await client.get("/api/v1/documents")).json()
    assert {d["id"] for d in licensed} == {d["id"] for d in source if d["licencja"]}
    assert summary["dokumenty"] == len(documents)


def test_csv_escapes_formulas_and_separators():
    rows = [{"a": "=SUMA(A1)", "b": ["x", "y;z"], "c": True, "d": None}]
    out = to_csv(rows, ["a", "b", "c", "d"])
    assert out.startswith(b"\xef\xbb\xbf")
    text = out.decode("utf-8-sig")
    assert text.splitlines()[1] == '\'=SUMA(A1);"x, y;z";tak;'
