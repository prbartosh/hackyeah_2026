from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.api.deps import ChatServiceDep
from app.schemas.chat import ChatRequest
from app.services.chat import ChatService, ChatUnavailableError, InvalidConversationError

router = APIRouter()


async def _sse(service: ChatService, request: ChatRequest) -> AsyncIterator[str]:
    async for event in service.run(request):
        yield f"event: {event.name}\ndata: {event.data.model_dump_json()}\n\n"


@router.post(
    "",
    response_class=StreamingResponse,
    responses={200: {"content": {"text/event-stream": {}}}},
    summary="Rozmowa matchmakingu (strumień SSE)",
)
async def chat(request: ChatRequest, service: ChatServiceDep) -> StreamingResponse:
    try:
        service.ensure_available()
    except ChatUnavailableError as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(e)) from None
    try:
        service.validate(request)
    except InvalidConversationError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(e)) from None
    return StreamingResponse(
        _sse(service, request),
        media_type="text/event-stream",
        # X-Accel-Buffering: nginx nie buforuje strumienia.
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
