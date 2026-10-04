from pathlib import Path

from app.core.config import settings
from app.services.embeddings import TfidfIndex
from app.services.matching import (
    card_score,
    labels,
    load_vocabulary,
    rank_key,
    similar_text,
    tag_text,
    valid_tags,
)

VOCABULARY = load_vocabulary(Path(settings.innovations_path).parent / "slownik.json")
LABELS = labels(VOCABULARY)


def test_tagi_po_frazach_i_fleksji():
    tags = tag_text("Seniorzy z naszej gminy wiejskiej są odcięci, panuje izolacja", VOCABULARY)
    assert "seniorzy" in tags["grupy_docelowe"]
    assert tags["problemy"] == ["samotnosc"]  # alias „izolacja”


def test_tag_tylko_calymi_frazami():
    # „domowy” nie jest frazą „dom”, a „wypal” nie jest aliasem „wypalenie zawodowe”.
    assert tag_text("Domowy wypał", VOCABULARY) == {}


def test_tekst_bez_slow_ze_slownika_nie_dostaje_tagow():
    assert tag_text("Chcemy festiwal latawców nad jeziorem", VOCABULARY) == {}


def test_pokrycie_tagow_jest_wazone_i_ma_powody():
    ticket_tags = {"problemy": ["samotnosc"], "grupy_docelowe": ["seniorzy"]}
    overlay = {"problemy": ["samotnosc"], "grupy_docelowe": ["dzieci"]}
    match = card_score(ticket_tags, overlay, LABELS, "tekst zgłoszenia", "opis karty")
    assert match.score == 3 / 5  # problem waży 3, grupa docelowa 2, pokryty tylko problem
    assert match.powody == ["Samotność"]


def test_karta_bez_nakladki_oceniana_trigramem():
    text = "Brak autobusu do przychodni dla seniorów"
    match = card_score({"problemy": ["samotnosc"]}, None, LABELS, text, text)
    assert match.powody == []
    assert match.score == match.trigram > 0.99


def test_zgloszenie_bez_tagow_oceniane_trigramem():
    match = card_score({}, {"problemy": ["samotnosc"]}, LABELS, "abc def", "abc def")
    assert match.powody == [] and match.score == match.trigram


def test_wynik_jest_powtarzalny():
    a = card_score({"problemy": ["samotnosc"]}, {"problemy": ["samotnosc"]}, LABELS, "x y", "y z")
    b = card_score({"problemy": ["samotnosc"]}, {"problemy": ["samotnosc"]}, LABELS, "x y", "y z")
    assert a == b


def test_podobienstwo_tekstu_odporne_na_fleksje():
    assert similar_text("demencji seniorów", "demencja senior") > 0.5
    assert similar_text("autobus", "festiwal latawców") < 0.2


def test_tagi_od_modelu_tylko_ze_slownika():
    raw = {
        "problemy": ["samotnosc", "wymyslony", "samotnosc"],
        "grupy_docelowe": "seniorzy",
        "nieznana_sekcja": ["x"],
    }
    assert valid_tags(raw, VOCABULARY) == {"problemy": ["samotnosc"]}
    assert valid_tags("nie słownik", VOCABULARY) == {}


def test_potoczny_opis_przemocy_dostaje_tag():
    assert tag_text("Mama mnie bije", VOCABULARY)["problemy"] == ["przemoc"]
    assert tag_text("Bicie w domu", VOCABULARY)["problemy"] == ["przemoc"]


def test_tfidf_wybiera_dokument_o_rzadkich_slowach_zapytania():
    docs = [
        "Klub dla osób z demencją i ich opiekunów, spotkania w świetlicy",
        "Autobus dla osób starszych dojeżdżający do przychodni w gminie",
        "Warsztaty dla osób młodych w świetlicy",
    ]
    scores = TfidfIndex(docs).scores("opiekun osoby z demencja")
    assert scores.index(max(scores)) == 0
    assert scores[0] > scores[1] > 0 or scores[1] == 0


def test_tfidf_zapytanie_bez_wspolnych_slow_daje_zero():
    assert TfidfIndex(["klub seniora"]).scores("festiwal latawców") == [0.0]


def test_bez_tagow_wynik_to_znormalizowany_tfidf():
    match = card_score({}, None, LABELS, "abc", "xyz", vector=0.125)
    assert match.score == 0.5 and match.vector == 0.125


def test_ogolny_tag_bez_wspolnych_slow_przegrywa_z_tekstem():
    tags = {"grupy_docelowe": ["dzieci"]}
    overlay = {"grupy_docelowe": ["dzieci"]}
    generic = card_score(tags, overlay, LABELS, "t", "k", vector=0.0)
    textual = card_score(tags, overlay, LABELS, "t", "k", vector=0.25)
    assert abs(generic.score - 0.3) < 1e-9 and abs(textual.score - 1.0) < 1e-9
    assert rank_key(textual) > rank_key(generic)


def test_potoczne_sformulowania_dostaja_tagi():
    cases = {
        "Babcia nie radzi sobie z telefonem": ("problemy", "wykluczenie-cyfrowe"),
        "Mama ma początki demencji": ("grupy_docelowe", "osoby-z-demencja"),
        "Mama dwa razy upadła w domu": ("problemy", "zagrozenie-bezpieczenstwa"),
        "Jestem niewidomy": ("grupy_docelowe", "osoby-niewidome"),
    }
    for text, (section, slug) in cases.items():
        assert slug in tag_text(text, VOCABULARY).get(section, []), text
