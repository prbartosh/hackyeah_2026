"""Adapter wysyłki e-mail. Na demo tylko logowanie; prawdziwy nadawca (SMTP) wchodzi tu."""

import logging
from typing import Protocol

from app.core.config import Settings

logger = logging.getLogger(__name__)


class EmailSender(Protocol):
    async def send(self, to: str, subject: str, body: str) -> None: ...


class LogEmailSender:
    def __init__(self, sender: str) -> None:
        self.sender = sender

    async def send(self, to: str, subject: str, body: str) -> None:
        # Adres odbiorcy, treść i link do wątku mogą zawierać dane osobowe lub token dostępu.
        # Adapter demonstracyjny potwierdza wyłącznie zdarzenie, nigdy payload wiadomości.
        logger.info("E-mail (stub) przyjęty do wysłania")


def get_email_sender(settings: Settings) -> EmailSender:
    # EMAIL_BACKEND=log to jedyna implementacja; inne wartości dodajemy tutaj.
    return LogEmailSender(settings.email_from)
