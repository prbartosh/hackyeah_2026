"""„Podobne przypadki”: zagregowane potrzeby zapisane przy wynikach czatu (zadanie 0025).

Przypadek jest podobny, gdy ma ten sam główny problem i co najmniej jedną wspólną grupę
docelową (slugi ze słownika). Pokazujemy tylko liczby, od progu `MIN_CASES`, bez treści rozmów.
"""

from collections import Counter

from app.models import Potrzeba
from app.repositories.innovation import InnovationRepository
from app.schemas.chat import PodobnaInnowacjaPrzypadkow, SimilarCasesEvent

# Próg prywatności k: poniżej tylu przypadków blok się nie pojawia.
MIN_CASES = 5
TOP_INNOVATIONS = 3


def similar_cases(
    need: Potrzeba, history: list[Potrzeba], innovations: InnovationRepository
) -> SimilarCasesEvent | None:
    if not need.problemy or not need.grupy_docelowe:
        return None
    main_problem = need.problemy[0]
    groups = set(need.grupy_docelowe)
    similar = [
        p
        for p in history
        if main_problem in (p.problemy or []) and groups & set(p.grupy_docelowe or [])
    ]
    if len(similar) < MIN_CASES:
        return None
    counts = Counter(slug for p in similar for slug in dict.fromkeys(p.innowacje or []))
    items = []
    for slug, count in counts.most_common():
        innovation = innovations.get(slug)
        if innovation is not None:
            items.append(
                PodobnaInnowacjaPrzypadkow(slug=slug, nazwa=innovation.nazwa, liczba=count)
            )
        if len(items) == TOP_INNOVATIONS:
            break
    label = next(
        (
            v["etykieta"]
            for v in innovations.vocabulary().get("problemy", [])
            if v["slug"] == main_problem
        ),
        main_problem,
    )
    return SimilarCasesEvent(liczba=len(similar), problem=label, innowacje=items)
