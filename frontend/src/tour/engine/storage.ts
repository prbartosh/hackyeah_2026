// Bezpieczny dostęp do storage (tryb prywatny, zablokowane dane): każdy odczyt i zapis w try/catch.

type Kind = 'session' | 'local'

function area(kind: Kind): Storage | null {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage
  } catch {
    return null
  }
}

export function readJson<T>(kind: Kind, key: string): T | null {
  try {
    const raw = area(kind)?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeJson(kind: Kind, key: string, value: unknown): void {
  try {
    area(kind)?.setItem(key, JSON.stringify(value))
  } catch {
    /* brak miejsca albo storage zablokowany: stan zostaje w pamięci */
  }
}

export function removeKey(kind: Kind, key: string): void {
  try {
    area(kind)?.removeItem(key)
  } catch {
    /* noop */
  }
}
