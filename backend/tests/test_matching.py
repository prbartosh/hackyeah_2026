from pathlib import Path

from app.core.config import settings
from app.services.matching import (
    card_score,
    labels,
    load_vocabulary,
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
