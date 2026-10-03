from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.kreator import POLA_FISZKI_ETYKIETY, AsystentRead
from app.services.ai import AIGateway
from app.services.fiszki import FiszkaService
from app.services.kreator_ai import NEXT_STEPS, NEXT_STEPS_DEFAULT, assistant_questions, values_of

# Pola, których brak najbardziej osłabia pomysł (kolejność = ważność).
CORE_FIELDS = ("istota", "odbiorca", "etap", "potrzeby", "lokalizacja", "obszar")


class AsystentService:
    """Pomocnik dopracowania pomysłu: braki i kroki z reguł, pytania z AI (gdy dostępne).

    Nie wymyśla faktów o pomyśle: pyta o to, czego fiszka nie mówi.
    """

    def __init__(self, session: AsyncSession, ai: AIGateway, fiszki: FiszkaService) -> None:
        self.session = session
        self.ai = ai
        self.fiszki = fiszki

    async def advise(self, token: str) -> AsystentRead:
        fiszka = await self.fiszki.get(token)
        values = values_of(fiszka, self.fiszki.categories())
        gaps = [POLA_FISZKI_ETYKIETY[f] for f in CORE_FIELDS if f not in values]
        steps = NEXT_STEPS.get(fiszka.etap or "", NEXT_STEPS_DEFAULT)
        questions: list[str] = []
        ai_used, message = False, None
        if values:
            questions, ai_used, message = await assistant_questions(self.ai, values, gaps)
            await self.session.commit()  # licznik wywołań AI
        return AsystentRead(
            braki=gaps,
            pytania=questions,
            kolejne_kroki=steps,
            ai_uzyte=ai_used,
            komunikat=message,
        )
