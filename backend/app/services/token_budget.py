from datetime import date


class TokenBudget:
    """Dzienny licznik tokenów modelu (wejście + wyjście).

    Trzymany w pamięci procesu: działa przy jednym workerze i zeruje się po restarcie.
    Na demo to wystarcza, docelowo licznik w Postgresie (zadanie 0006).
    """

    def __init__(self, daily_limit: int | None) -> None:
        self.daily_limit = daily_limit
        self._day = date.today()
        self._used = 0

    def _roll(self) -> None:
        today = date.today()
        if today != self._day:
            self._day = today
            self._used = 0

    @property
    def used(self) -> int:
        self._roll()
        return self._used

    def add(self, tokens: int) -> None:
        self._roll()
        self._used += tokens

    def exhausted(self) -> bool:
        return self.daily_limit is not None and self.used >= self.daily_limit
