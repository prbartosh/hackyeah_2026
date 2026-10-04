// Kontrakt przewodnika po platformie (zadanie 0046). Silnik: tour/engine, treść: tour/chapters/*.ts.
// Kroki to dane: silnik przechodzi na trasę, czeka na element z atrybutem data-tour i pokazuje nad nim chmurkę.

/** Wspólny stan przewodnika, żyje w sessionStorage przez całe przejście (np. token utworzonego wątku). */
export interface TourContext {
  get(key: string): string | undefined
  set(key: string, value: string): void
  /** Zapytanie do API względem /api/v1. Z `admin: true` silnik dokłada token panelu. Rzuca przy statusie ≥ 400. */
  api<T = unknown>(path: string, init?: RequestInit & { admin?: boolean }): Promise<T>
}

type Value = string | ((ctx: TourContext) => string | Promise<string>)

/** Trasa przed krokiem, np. '/zasobnik' albo funkcja, która wylicza ją z API lub z ctx. */
export type RouteSpec = Value

/** Co silnik robi po kliknięciu „Zrób to za mnie”. Kolejno, z krótką animacją, żeby było widać, co się dzieje. */
export type TourAction =
  | { kind: 'fill'; target: string; value: Value } // wpisuje tekst w input/textarea (działa z kontrolowanymi polami React)
  | { kind: 'select'; target: string; value: Value } // wybiera opcję w <select>
  | { kind: 'check'; target: string; checked?: boolean } // checkbox / radio
  | { kind: 'click'; target: string }
  | { kind: 'upload'; target: string; url: string; filename: string } // wstawia plik pobrany z url do input[type=file] (target: input albo jego kontener)
  | { kind: 'capture'; target: string; key: string; from: 'href' | 'text' | 'value'; pattern?: string }
// capture: zapisuje do ctx wartość z elementu, np. token wątku z linku po wysłaniu zgłoszenia.
// pattern: opcjonalne wyrażenie regularne, pierwsza grupa to wartość (np. '/watek/([^/?#]+)').

/** Kiedy krok sam przechodzi dalej. Bez tego: przycisk „Dalej”. */
export type AdvanceOn =
  | { kind: 'click'; target: string } // użytkownik kliknął element
  | { kind: 'appear'; target: string; timeoutMs?: number } // pojawił się element (np. wyniki czatu)
  | { kind: 'route'; startsWith: string } // użytkownik przeszedł na trasę

export interface TourStep {
  /** Unikalny w całym przewodniku: '<rozdział>.<krok>', np. 'czat.rola'. */
  id: string
  route?: RouteSpec
  /** Wartość atrybutu data-tour elementu, nad którym stoi chmurka. Brak = chmurka na środku ekranu. */
  target?: string
  title: string
  /** 1–3 krótkie akapity: co to jest, po co, dla kogo. Bez żargonu. */
  body: string[]
  /** Zadanie dla użytkownika, np. „Kliknij »Ciemny«, żeby zobaczyć motyw ciemny.” */
  hint?: string
  /** Kryterium oceny lub wartość dla ROPS, pokazywane jako mała etykieta (np. „Dostępność”, „Moduł V”). */
  tag?: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  /** Krok wymaga zalogowania w panelu ROPS. Bez tokenu silnik pokazuje chmurkę przy formularzu logowania i czeka. */
  admin?: boolean
  /** Przygotowanie danych przed krokiem (np. utworzenie rekordu przez API, zapis do ctx). */
  prepare?: (ctx: TourContext) => Promise<void>
  /** Akcje dla „Zrób to za mnie”. Brak = przycisku nie ma. */
  actions?: TourAction[]
  advanceOn?: AdvanceOn
  /** Czekaj na element przed pokazaniem chmurki (np. odpowiedź modelu). Domyślnie czeka na target do 8 s. */
  waitFor?: { target: string; timeoutMs?: number; message?: string }
}

export interface TourChapter {
  /** Krótki identyfikator, ten sam co przedrostek id kroków, np. 'czat'. */
  id: string
  title: string
  /** Etykieta modułu z zadania konkursowego, np. 'Moduł I', albo brak dla rozdziałów ogólnych. */
  module?: string
  /** Jedno zdanie do spisu rozdziałów. */
  summary: string
  /** Szacowany czas w minutach. */
  minutes: number
  steps: TourStep[]
}
