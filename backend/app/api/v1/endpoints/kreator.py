from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Query, Response, status

from app.api.deps import (
    AIGatewayDep,
    AsystentServiceDep,
    CanvaServiceDep,
    FiszkaServiceDep,
    NaborServiceDep,
    SessionDep,
    TodayDep,
    WniosekServiceDep,
)
from app.schemas.kreator import (
    AiFillRequest,
    AiFillResponse,
    AsystentRead,
    CanvaCreate,
    CanvaRead,
    CanvaUpdate,
    FiszkaFields,
    FiszkaRead,
    FiszkaSend,
    FiszkaSent,
    NaboryRead,
    PodobneRead,
    SzablonCanvy,
    WniosekCreate,
    WniosekRead,
    WniosekUpdate,
)
from app.services.kreator_ai import fill_fiszka
from app.services.wnioski import WniosekService

# Publiczne, bez kont: dostęp do fiszki, wniosku i canvy daje sekretny token z adresu.
router = APIRouter()

DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


async def _fiszka_read(service: FiszkaServiceDep, token: str) -> FiszkaRead:
    fiszka = await service.get(token)
    return FiszkaRead(**service.read_dict(fiszka, await service.card_of(fiszka)))


@router.post("/fiszki", response_model=FiszkaRead, status_code=status.HTTP_201_CREATED)
async def create_fiszka(data: FiszkaFields, service: FiszkaServiceDep) -> FiszkaRead:
    fiszka = await service.create(data)
    return await _fiszka_read(service, fiszka.token)


@router.post(
    "/fiszki/z-karty/{slug}",
    response_model=FiszkaRead,
    status_code=status.HTTP_201_CREATED,
    summary="Fiszka wypełniona z karty innowacji (ścieżka „Znajdź finansowanie”)",
)
async def create_fiszka_from_card(slug: str, service: FiszkaServiceDep) -> FiszkaRead:
    fiszka = await service.create_from_card(slug)
    return await _fiszka_read(service, fiszka.token)


@router.get("/fiszki/{token}", response_model=FiszkaRead)
async def get_fiszka(token: str, service: FiszkaServiceDep) -> FiszkaRead:
    return await _fiszka_read(service, token)


@router.put("/fiszki/{token}", response_model=FiszkaRead, summary="Autozapis szkicu")
async def update_fiszka(token: str, data: FiszkaFields, service: FiszkaServiceDep) -> FiszkaRead:
    await service.update(token, data)
    return await _fiszka_read(service, token)


@router.get(
    "/fiszki/{token}/podobne",
    response_model=PodobneRead,
    summary="Podobne innowacje z bazy ROPS (dopasowanie po tagach, ze źródłem)",
)
async def similar(token: str, service: FiszkaServiceDep) -> PodobneRead:
    return PodobneRead(items=await service.similar(await service.get(token)))


@router.post("/fiszki/{token}/wyslij", response_model=FiszkaSent)
async def send_fiszka(token: str, data: FiszkaSend, service: FiszkaServiceDep) -> FiszkaSent:
    return FiszkaSent(token_watku=await service.send(token, data))


@router.post(
    "/fiszki/{token}/asystent",
    response_model=AsystentRead,
    summary="Braki w fiszce, pytania doprecyzowujące i kolejne kroki",
)
async def advise(token: str, service: AsystentServiceDep) -> AsystentRead:
    return await service.advise(token)


@router.post(
    "/ai/wypelnij",
    response_model=AiFillResponse,
    summary="AI wstępnie wypełnia pola fiszki z opisu własnymi słowami",
)
async def ai_fill(
    data: AiFillRequest, ai: AIGatewayDep, service: FiszkaServiceDep, session: SessionDep
) -> AiFillResponse:
    fields, used, message = await fill_fiszka(ai, data.opis, service.categories())
    await session.commit()  # licznik wywołań AI
    return AiFillResponse(pola=fields, ai_uzyte=used, komunikat=message)


@router.get("/nabory", response_model=NaboryRead, summary="Aktywne nabory i dopasowanie")
async def nabory(
    service: NaborServiceDep,
    today: TodayDep,
    fiszka: Annotated[str | None, Query(max_length=64)] = None,
    karta: Annotated[str | None, Query(max_length=200)] = None,
) -> NaboryRead:
    areas, audience = await service.context(fiszka, karta)
    return await service.overview(areas=areas, audience=audience, today=today)


async def _wniosek_read(service: WniosekService, token: str, today: date) -> WniosekRead:
    return await service.read(await service.get(token), today)


@router.post(
    "/wnioski",
    response_model=WniosekRead,
    status_code=status.HTTP_201_CREATED,
    summary="Szkic wniosku z fiszki; tylko w trakcie naboru",
)
async def create_wniosek(
    data: WniosekCreate, service: WniosekServiceDep, today: TodayDep
) -> WniosekRead:
    wniosek = await service.create(data.fiszka_token, data.nabor_slug, today)
    return await service.read(wniosek, today)


@router.get("/wnioski/{token}", response_model=WniosekRead)
async def get_wniosek(token: str, service: WniosekServiceDep, today: TodayDep) -> WniosekRead:
    return await _wniosek_read(service, token, today)


@router.put("/wnioski/{token}", response_model=WniosekRead, summary="Autozapis szkicu wniosku")
async def update_wniosek(
    token: str, data: WniosekUpdate, service: WniosekServiceDep, today: TodayDep
) -> WniosekRead:
    return await service.read(await service.update(token, data.pola), today)


@router.post("/wnioski/{token}/wyslij", response_model=FiszkaSent)
async def send_wniosek(token: str, service: WniosekServiceDep, today: TodayDep) -> FiszkaSent:
    return FiszkaSent(token_watku=await service.send(token, today))


@router.get("/wnioski/{token}/eksport", summary="Pobranie wniosku jako DOCX albo tekst")
async def export_wniosek(
    token: str,
    service: WniosekServiceDep,
    today: TodayDep,
    format: Literal["docx", "txt"] = "docx",
) -> Response:
    wniosek = await service.get(token)
    if format == "txt":
        slug, text = await service.export_text(wniosek, today)
        return Response(
            text,
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="wniosek-{slug}.txt"'},
        )
    slug, content = await service.export_docx(wniosek, today)
    return Response(
        content,
        media_type=DOCX,
        headers={"Content-Disposition": f'attachment; filename="wniosek-{slug}.docx"'},
    )


@router.get("/canvy/szablony", response_model=list[SzablonCanvy])
async def canva_templates(service: CanvaServiceDep) -> list[SzablonCanvy]:
    return await service.templates()


@router.post("/canvy", response_model=CanvaRead, status_code=status.HTTP_201_CREATED)
async def create_canva(data: CanvaCreate, service: CanvaServiceDep) -> CanvaRead:
    canva = await service.create(data.szablon, data.tytul, data.fiszka_token)
    return await service.read(canva)


@router.get("/canvy/{token}", response_model=CanvaRead)
async def get_canva(token: str, service: CanvaServiceDep) -> CanvaRead:
    return await service.read(await service.get(token))


@router.put("/canvy/{token}", response_model=CanvaRead, summary="Autozapis canvy")
async def update_canva(token: str, data: CanvaUpdate, service: CanvaServiceDep) -> CanvaRead:
    return await service.read(await service.update(token, data))


@router.get("/canvy/{token}/eksport", summary="Pobranie canvy jako DOCX")
async def export_canva(token: str, service: CanvaServiceDep) -> Response:
    content = await service.export_docx(await service.get(token))
    return Response(
        content,
        media_type=DOCX,
        headers={"Content-Disposition": 'attachment; filename="canva-innowacji.docx"'},
    )

