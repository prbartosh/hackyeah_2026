"""Run every scraper (idempotent: existing downloads are skipped)."""
import mapa_wyzwan
import obserwator
import publikacje
import raporty

for m in (raporty, publikacje, mapa_wyzwan, obserwator):
    print("==", m.__name__)
    m.main()
