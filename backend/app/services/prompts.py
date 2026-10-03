"""System prompt i narzędzia modelu dla matchmakingu (spec: docs/DEMO.md)."""

import json
from typing import Any

from app.schemas.chat import ChatAction, ChatState
from app.schemas.innovation import Innovation

MAX_ROUNDS = 4
MAX_RESULTS = 5
MAX_SEARCH = 8

PROBLEM_FIELDS = {
    "kogo_dotyczy": "Kogo dotyczy problem (grupa, wiek, liczba osób).",
    "gdzie": "Gdzie występuje (gmina, miejscowość, placówka).",
    "skala": "Skala: pojedyncza osoba/rodzina, sołectwo lub osiedle, gmina, powiat, region.",
    "przyczyna": "Główna przyczyna problemu (nie objaw).",
    "co_probowano": "Co już próbowano i dlaczego nie zadziałało.",
    "zasoby": "Dostępne zasoby: ludzie, lokale, organizacje, budżet.",
}

ROLES = {
    "mieszkaniec": (
        "osoba prywatna szukająca pomocy dla siebie lub bliskiej osoby (też opiekun, rodzic)"
    ),
    "ngo": "organizacja pozarządowa, stowarzyszenie, fundacja, grupa nieformalna",
    "jst": "samorząd: wójt, burmistrz, urzędnik gminy lub powiatu",
    "cus_ops": "pracownik Centrum Usług Społecznych, OPS/MOPS/GOPS, placówki pomocy społecznej",
    "ekspert": "ekspert, badacz, doradca pracujący z innowacjami lub JST",
}

SYSTEM_PROMPT = """\
Jesteś asystentem platformy Splot - Małopolskiego Hubu Innowacji Społecznych prowadzonego przez \
Regionalny Ośrodek Polityki Społecznej w Krakowie (ROPS). Użytkownik opisuje problem społeczny \
własnymi słowami. Twoje zadanie: ustalić, kim jest, pomóc mu doprecyzować problem i dopasować \
do niego innowacje społeczne z Biblioteki Innowacji ROPS (katalog niżej).

Z platformy korzystają osoby w różnym wieku i o różnych umiejętnościach cyfrowych, także seniorzy. \
Pisz po polsku, prostym językiem, krótkimi zdaniami. Bez żargonu urzędowego.

# Role użytkownika
{roles}

# Przebieg rozmowy
Działasz wyłącznie przez narzędzia. Poza nimi możesz napisać najwyżej jedno krótkie zdanie \
(np. potwierdzenie, że rozumiesz). Treść pytań, podsumowań i wyników podajesz tylko w narzędziach.

1. Po pierwszej wiadomości wywołaj `set_role` (chyba że stan mówi, że rolę ustalił użytkownik) \
i `update_problem` ze wszystkim, co już wiadomo.
2. Doprecyzowanie: `ask_question` - jedno pytanie na turę, tylko o pola, których brakuje \
i które naprawdę pomogą w dopasowaniu. Pytaj tak, żeby użytkownik sam lepiej zrozumiał problem. \
Daj 3-4 krótkie odpowiedzi do kliknięcia. Nie dodawaj opcji „inne” - interfejs dodaje ją sam. \
Najwyżej {max_rounds} rundy pytań w całej rozmowie. Jeśli informacji wystarczy, pytaj mniej.
3. Po każdej odpowiedzi użytkownika wywołaj `update_problem` z nowymi informacjami.
4. Gdy wiesz wystarczająco dużo albo skończył się limit pytań: `propose_summary` - podsumowanie \
„Twój problem w skrócie” (2-4 zdania) do potwierdzenia przez użytkownika.
5. Gdy użytkownik potwierdzi podsumowanie albo poprosi o wyniki od razu: wybierz z katalogu \
do {max_search} kandydatów i wywołaj `search`, potem `show_results` z najwyżej {max_results} \
najlepszymi. Jeśli użytkownik poprawi podsumowanie, uwzględnij poprawki (`update_problem`) \
i zaproponuj nowe podsumowanie albo przejdź do wyników.

Rola wpływa na sposób zadawania pytań i kolejność wyników: mieszkańcowi pokazuj najpierw to, \
z czego może skorzystać sam lub z czym może pójść do instytucji; JST, CUS/OPS i NGO - to, \
co mogą wdrożyć u siebie (pole „kto może skorzystać”).

# Zasady wyników
- Proponuj wyłącznie innowacje z katalogu, podając ich `slug`.
- `why_relevant` (1-3 zdania) opieraj tylko na polach karty zwróconej przez `search`. \
Nie podawaj kontaktów, linków, kosztów, liczb ani faktów spoza karty - kontakt i linki \
interfejs pokazuje sam z bazy.
- Jedna innowacja `main` (najlepsza), pozostałe `complementary`.
- Gdy nic nie pasuje dobrze, powiedz to wprost: `no_good_match: true`, w `note` napisz, czym \
najbliższe wyniki różnią się od problemu, i i tak pokaż najbliższe.

Stan rozmowy (rola, panel problemu, liczba rund) dostajesz w każdej wiadomości użytkownika \
w znaczniku <stan_rozmowy>. Instrukcje dla bieżącej tury są w <instrukcja_tury> i mają \
pierwszeństwo przed ogólnym przebiegiem.

# Katalog innowacji
Format: slug | nazwa | kategoria | jakiego problemu dotyczy | grupa docelowa | kto może skorzystać

{catalog}
"""


def _clean(text: str | None) -> str:
    return " ".join((text or "-").split())


def build_system_prompt(innovations: list[Innovation]) -> str:
    catalog = "\n".join(
        " | ".join(
            [
                i.slug,
                _clean(i.nazwa),
                ", ".join(i.kategorie),
                _clean(i.problem),
                _clean(i.grupa_docelowa),
                _clean(i.kto_moze_skorzystac),
            ]
        )
        for i in innovations
    )
    roles = "\n".join(f"- `{k}`: {v}" for k, v in ROLES.items())
    return SYSTEM_PROMPT.format(
        roles=roles,
        catalog=catalog,
        max_rounds=MAX_ROUNDS,
        max_results=MAX_RESULTS,
        max_search=MAX_SEARCH,
    )


def build_turn_context(state: ChatState, action: ChatAction | None) -> str:
    """Zmienny kontekst doklejany do ostatniej wiadomości użytkownika (poza cache)."""
    state_json = json.dumps(state.model_dump(), ensure_ascii=False)
    rounds_left = max(MAX_ROUNDS - state.rounds, 0)

    if action == "show_results_now":
        instruction = (
            "Użytkownik kliknął „Pokaż wyniki teraz”. Nie zadawaj pytań i nie proponuj "
            "podsumowania. Na podstawie tego, co wiesz, wywołaj `search`, a potem `show_results`."
        )
    elif action == "confirm_summary":
        instruction = (
            "Użytkownik potwierdził podsumowanie. Wywołaj `search`, a potem `show_results`."
        )
    elif rounds_left == 0:
        instruction = (
            "Limit pytań wyczerpany - nie używaj `ask_question`. Uzupełnij panel, jeśli trzeba, "
            "i wywołaj `propose_summary`."
        )
    else:
        instruction = f"Pozostało rund pytań: {rounds_left}."

    if state.role_locked:
        instruction += " Rolę ustalił użytkownik - nie wywołuj `set_role`."

    return (
        f"<stan_rozmowy>{state_json}</stan_rozmowy>\n"
        f"<instrukcja_tury>{instruction}</instrukcja_tury>"
    )


def _nullable_str(description: str) -> dict[str, Any]:
    return {"type": ["string", "null"], "description": description}


# Zestaw narzędzi jest stały (limity egzekwuje backend), żeby nie psuć cache promptu.
TOOLS: list[dict[str, Any]] = [
    {
        "name": "set_role",
        "description": "Ustala rolę użytkownika na podstawie jego wiadomości.",
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {"role": {"type": "string", "enum": list(ROLES)}},
            "required": ["role"],
            "additionalProperties": False,
        },
    },
    {
        "name": "update_problem",
        "description": (
            "Uzupełnia panel „Twój problem” nowymi informacjami z rozmowy. "
            "Pole null = bez zmian. Podawaj krótkie sformułowania (kilka słów do zdania)."
        ),
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {k: _nullable_str(v) for k, v in PROBLEM_FIELDS.items()},
            "required": list(PROBLEM_FIELDS),
            "additionalProperties": False,
        },
    },
    {
        "name": "ask_question",
        "description": (
            "Zadaje użytkownikowi jedno pytanie doprecyzowujące z 3-4 odpowiedziami do kliknięcia. "
            "Kończy turę - czekasz na odpowiedź."
        ),
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Treść pytania."},
                "options": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "3-4 krótkie odpowiedzi, bez opcji „inne”.",
                },
            },
            "required": ["text", "options"],
            "additionalProperties": False,
        },
    },
    {
        "name": "propose_summary",
        "description": (
            "Pokazuje podsumowanie „Twój problem w skrócie” do potwierdzenia lub poprawy. "
            "Kończy turę."
        ),
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {"summary": {"type": "string", "description": "2-4 zdania."}},
            "required": ["summary"],
            "additionalProperties": False,
        },
    },
    {
        "name": "search",
        "description": (
            f"Zwraca pełne karty wybranych z katalogu innowacji (do {MAX_SEARCH}). "
            "Wywołaj przed `show_results` - uzasadnienia opierasz na tych kartach."
        ),
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "slugs": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Slugi kandydatów z katalogu, od najlepiej pasującego.",
                }
            },
            "required": ["slugs"],
            "additionalProperties": False,
        },
    },
    {
        "name": "show_results",
        "description": (
            f"Pokazuje użytkownikowi do {MAX_RESULTS} dopasowanych innowacji. Kończy turę."
        ),
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "slug": {"type": "string"},
                            "match": {"type": "string", "enum": ["main", "complementary"]},
                            "why_relevant": {
                                "type": "string",
                                "description": "1-3 zdania, tylko na podstawie karty.",
                            },
                        },
                        "required": ["slug", "match", "why_relevant"],
                        "additionalProperties": False,
                    },
                },
                "no_good_match": {"type": "boolean"},
                "note": _nullable_str(
                    "Gdy no_good_match: czym najbliższe wyniki różnią się od problemu."
                ),
            },
            "required": ["items", "no_good_match", "note"],
            "additionalProperties": False,
        },
    },
]
