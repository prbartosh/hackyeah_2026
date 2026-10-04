import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Accessibility, ArrowRight, Baby, BookOpen, Brain, ChevronLeft, ChevronRight, Coins, ExternalLink, FileText, Globe,
  Heart, House, Lightbulb, Quote, Stethoscope, Target, TriangleAlert, Users, type LucideIcon,
} from 'lucide-react'
import type { DokumentSzczegoly } from '@/api/documents'
import { getCategories } from '@/api/innovations'
import ReportReader from '@/components/ReportReader'
import { kluczoweLiczby, type Obszar, type Persona, type Sekcja } from '@/lib/mapaWyzwan'
import { liczbaInnowacji, plural } from '@/lib/plural'
import { parseReport } from '@/lib/reportText'
import type { Kategoria } from '@/types/innowacja'

const IKONY: Record<number, LucideIcon> = { 1: Baby, 2: House, 3: Accessibility, 4: Coins, 5: Globe, 6: Stethoscope, 7: Brain, 8: Users }

/** Obszary Mapy Wyzwań a kategorie Biblioteki Innowacji (do odnośników „Zobacz innowacje”). */
const KATEGORIE: Record<number, string[]> = {
  1: ['dla-dzieci-mlodziezy-i-rodziny'],
  2: ['dla-osob-w-kryzysie-bezdomnosci'],
  3: ['dla-osob-z-niepelnosprawnoscia-intelektualna', 'dla-osob-z-niepelnosprawnoscia-sensoryczna', 'dla-osob-o-ograniczonej-mobilnosci'],
  4: ['dla-rynku-pracy'],
  5: ['dla-cudzoziemcow'],
  6: ['dla-zdrowia-i-medycyny'],
  7: ['dla-zdrowia-i-medycyny', 'dla-osob-z-niepelnosprawnoscia-intelektualna'],
  8: ['dla-seniorow'],
}

function NewTab() {
  return <span className="visually-hidden"> (otwiera się w nowej karcie)</span>
}

function Zrodla({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <details className="zs-mw-sources">
      <summary>Źródła ({items.length})</summary>
      <ul>
        {items.map((z, i) => (
          <li key={i}>
            {/^https?:/.test(z) ? <a href={z} target="_blank" rel="noreferrer">{z}<NewTab /></a> : z}
          </li>
        ))}
      </ul>
    </details>
  )
}

function Card({ id, icon: Icon, title, children }: { id: string; icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="zs-mw-card" aria-labelledby={id}>
      <h3 id={id} className="zs-mw-card-h"><Icon size={20} aria-hidden="true" /> {title}</h3>
      {children}
    </section>
  )
}

function Tekst({ s }: { s: Sekcja }) {
  return (
    <>
      {s.akapity.map((a, i) => <p key={i} className="zs-mw-p">{a}</p>)}
      {s.punkty.length > 0 && <ul className="zs-mw-points">{s.punkty.map((p, i) => <li key={i}>{p}</li>)}</ul>}
    </>
  )
}

function PersonaCard({ p, nr }: { p: Persona; nr: number }) {
  const cols: { key: string; title: string; icon: LucideIcon; items: string[] }[] = [
    { key: 'cele', title: 'Cele i potrzeby', icon: Target, items: p.cele },
    { key: 'wyz', title: 'Wyzwania', icon: TriangleAlert, items: p.wyzwania },
    { key: 'mot', title: 'Motywacje', icon: Heart, items: p.motywacje },
  ].filter((c) => c.items.length)
  return (
    <article className="zs-mw-persona" data-tone={nr % 4}>
      <header className="zs-mw-persona-head">
        <span className="zs-mw-avatar" aria-hidden="true">{p.imie.charAt(0)}</span>
        <div>
          <p className="zs-mw-persona-kicker">Persona</p>
          <h4>{p.imie}</h4>
        </div>
      </header>
      {p.opis.length > 0 && <ul className="zs-mw-facts">{p.opis.map((o, i) => <li key={i}>{o}</li>)}</ul>}
      <div className="zs-mw-persona-cols">
        {cols.map((c) => (
          <section key={c.key} aria-label={`${p.imie}: ${c.title}`}>
            <h5><c.icon size={16} aria-hidden="true" /> {c.title}</h5>
            <ul className={c.key === 'mot' ? 'is-quotes' : undefined}>
              {c.items.map((it, i) => (
                <li key={i}>{c.key === 'mot' && /[„"]/.test(it) ? <Quote size={14} aria-hidden="true" /> : null}{it}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  )
}

export default function MapaWyzwanDocument({ doc, areas }: { doc: DokumentSzczegoly; areas: Obszar[] }) {
  const [params, setParams] = useSearchParams()
  const nr = Number(params.get('obszar'))
  const area = areas.find((o) => o.nr === nr) ?? areas[0]
  const idx = areas.indexOf(area)
  const [cats, setCats] = useState<Kategoria[]>([])
  const [fullText, setFullText] = useState(false)
  const report = useMemo(() => (fullText ? parseReport(doc.tresc) : null), [fullText, doc.tresc])

  useEffect(() => {
    const controller = new AbortController()
    getCategories(controller.signal).then(setCats).catch(() => {})
    return () => controller.abort()
  }, [])

  const select = (o: Obszar, scroll = false) => {
    setParams({ obszar: String(o.nr) }, { replace: true })
    if (scroll) document.getElementById('zs-mw-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const liczby = useMemo(() => kluczoweLiczby(area), [area])
  const kat = (KATEGORIE[area.nr] ?? []).map((s) => cats.find((c) => c.slug === s)).filter((c): c is Kategoria => !!c)
  const wyzwan = area.wyzwania.punkty.length
  const prev = areas[idx - 1]
  const next = areas[idx + 1]
  const Icon = IKONY[area.nr] ?? Lightbulb
  const wszystkieWyzwania = areas.reduce((n, o) => n + o.wyzwania.punkty.length, 0)

  return (
    <div className="container page zs-doc zs-read zs-mw">
      <nav aria-label="Ścieżka nawigacji" className="breadcrumbs">
        <ol>
          <li><Link to="/zasobnik">Zasobnik wiedzy</Link></li>
          <li><Link to="/zasobnik?dzial=wyzwania">Wyzwania Małopolski</Link></li>
          <li aria-current="page">Mapa Wyzwań Społecznych</li>
        </ol>
      </nav>

      <header className="zs-read-hero zs-mw-hero" data-tour="zasobnik-mapa-naglowek">
        <p className="zs-read-kicker"><BookOpen size={16} aria-hidden="true" /> Mapa Wyzwań Społecznych</p>
        <h1>Osiem obszarów, z którymi mierzy się pomoc społeczna</h1>
        <p className="zs-read-lead">
          Dla każdego obszaru: czym jest, co pokazują dane, jakie są kluczowe wyzwania i kogo dotyczą, na przykładzie
          konkretnej osoby. Dane mają zasięg ogólnopolski i powstały na potrzeby projektu „Inkubator Włączenia Społecznego 2.0”.
        </p>
        <ul className="zs-read-meta">
          <li><Lightbulb size={16} aria-hidden="true" /> {plural(areas.length, 'obszar', 'obszary', 'obszarów')}</li>
          <li><Target size={16} aria-hidden="true" /> {plural(wszystkieWyzwania, 'kluczowe wyzwanie', 'kluczowe wyzwania', 'kluczowych wyzwań')}</li>
          <li><Users size={16} aria-hidden="true" /> {plural(areas.reduce((n, o) => n + o.persony.length, 0), 'persona', 'persony', 'person')}</li>
          {doc.strony && <li><FileText size={16} aria-hidden="true" /> {plural(doc.strony, 'strona', 'strony', 'stron')}</li>}
        </ul>
        <div className="zs-read-actions">
          <a href={doc.url_zrodlowy} className="btn btn-primary" target="_blank" rel="noreferrer">
            <FileText size={18} aria-hidden="true" /> Otwórz PDF{doc.rozmiar ? ` (${doc.rozmiar})` : ''}<NewTab />
          </a>
          <Link to="/" className="btn btn-secondary">Opisz swój problem <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      </header>

      <nav aria-label="Obszary wyzwań" className="zs-mw-areas" data-tour="zasobnik-mapa-obszary">
        <ul>
          {areas.map((o) => {
            const I = IKONY[o.nr] ?? Lightbulb
            return (
              <li key={o.nr}>
                <button type="button" className="zs-mw-area" aria-pressed={o.nr === area.nr} aria-controls="zs-mw-panel" onClick={() => select(o, true)}>
                  <span className="zs-mw-area-nr" aria-hidden="true">{o.nr}</span>
                  <I size={24} aria-hidden="true" className="zs-mw-area-icon" />
                  <span className="zs-mw-area-name">{o.nazwa}</span>
                  <span className="zs-mw-area-count">{plural(o.wyzwania.punkty.length, 'wyzwanie', 'wyzwania', 'wyzwań')}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div id="zs-mw-panel" className="zs-mw-panel" tabIndex={-1} aria-label={`Obszar ${area.nr}: ${area.nazwa}`}>
        <header className="zs-mw-panel-head" data-tone={area.nr % 4}>
          <span className="zs-mw-panel-icon" aria-hidden="true"><Icon size={34} /></span>
          <div>
            <p className="zs-mw-panel-kicker">Obszar {area.nr} z {areas.length}</p>
            <h2>{area.nazwa}</h2>
          </div>
          <ul className="zs-mw-panel-stats" aria-label="Zawartość obszaru">
            <li><strong>{wyzwan}</strong> wyzwań</li>
            <li><strong>{area.persony.length}</strong> {area.persony.length === 1 ? 'persona' : 'persony'}</li>
            <li><strong>{area.raporty.length}</strong> {area.raporty.length === 1 ? 'raport' : 'raportów'}</li>
          </ul>
        </header>

        {liczby.length > 0 && (
          <section aria-labelledby="mw-liczby" className="zs-mw-numbers">
            <h3 id="mw-liczby" className="zs-mw-card-h">Liczby, które warto znać</h3>
            <ul>
              {liczby.map((l, i) => (
                <li key={i}><strong>{l.wartosc}</strong><span>{l.opis}</span></li>
              ))}
            </ul>
          </section>
        )}

        <div className="zs-mw-grid">
          <Card id="mw-def" icon={BookOpen} title="Czym jest ten obszar">
            <Tekst s={area.definicja} />
            <Zrodla items={area.definicja.zrodla} />
          </Card>

          {area.analiza.length > 0 && (
            <Card id="mw-analiza" icon={Lightbulb} title="Co pokazują dane">
              {area.analiza.map((s, i) => (
                <div key={i} className="zs-mw-block">
                  {s.tytul && <h4 className="zs-mw-sub">{s.tytul}</h4>}
                  <Tekst s={s} />
                  <Zrodla items={s.zrodla} />
                </div>
              ))}
            </Card>
          )}
        </div>

        {(wyzwan > 0 || area.wyzwania.akapity.length > 0) && (
          <section aria-labelledby="mw-wyzwania" className="zs-mw-challenges">
            <h3 id="mw-wyzwania" className="zs-mw-section-h"><TriangleAlert size={22} aria-hidden="true" /> Kluczowe wyzwania</h3>
            {area.wyzwania.akapity.map((a, i) => <p key={i} className="zs-mw-p">{a}</p>)}
            <ol className="zs-mw-cards">
              {area.wyzwania.punkty.map((p, i) => (
                <li key={i}><span className="zs-mw-num" aria-hidden="true">{i + 1}</span><span>{p.charAt(0).toLocaleUpperCase('pl-PL') + p.slice(1)}</span></li>
              ))}
            </ol>
          </section>
        )}

        {area.persony.length > 0 && (
          <section aria-labelledby="mw-persona" className="zs-mw-personas" data-tour="zasobnik-mapa-persona">
            <h3 id="mw-persona" className="zs-mw-section-h"><Users size={22} aria-hidden="true" /> Kogo to dotyczy: {area.persony.length > 1 ? 'persony' : 'persona'}</h3>
            <p className="hint">Postacie opisane przez ROPS pokazują wyzwania obszaru z perspektywy konkretnej osoby.</p>
            <div className="zs-mw-persona-list">
              {area.persony.map((p) => <PersonaCard key={p.imie} p={p} nr={area.nr} />)}
            </div>
          </section>
        )}

        <div className="zs-mw-grid">
          {area.raporty.length > 0 && (
            <Card id="mw-raporty" icon={FileText} title="Dowiedz się więcej">
              <p className="hint">Raporty polecane przez ROPS w tym obszarze:</p>
              <ul className="zs-mw-reports">
                {area.raporty.map((r, i) => <li key={i}><FileText size={16} aria-hidden="true" /> <span>{r}</span></li>)}
              </ul>
            </Card>
          )}
          <Card id="mw-dzialaj" icon={Lightbulb} title="Co dalej">
            {kat.length > 0 ? (
              <>
                <p className="hint">Sprawdzone rozwiązania z Biblioteki Innowacji dla tego obszaru:</p>
                <ul className="zs-mw-links">
                  {kat.map((k) => (
                    <li key={k.slug}>
                      <Link to={`/zasobnik?kategoria=${k.slug}`}>
                        <span>{k.nazwa}</span>
                        <span className="zs-mw-links-n">{liczbaInnowacji(k.liczba_innowacji)} <ArrowRight size={16} aria-hidden="true" /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="hint">W Bibliotece Innowacji szukaj rozwiązań po słowie kluczowym.</p>
            )}
            <ul className="zs-mw-links">
              <li><Link to="/zasobnik?dzial=wskazniki"><span>Dane o powiatach: wskaźniki z wykresami i mapą</span><span className="zs-mw-links-n"><ArrowRight size={16} aria-hidden="true" /></span></Link></li>
              <li><Link to="/"><span>Opisz problem w wyszukiwarce innowacji</span><span className="zs-mw-links-n"><ArrowRight size={16} aria-hidden="true" /></span></Link></li>
            </ul>
          </Card>
        </div>

        <nav className="zs-mw-pager" aria-label="Przejdź do innego obszaru">
          {prev ? <button type="button" className="btn btn-secondary" onClick={() => select(prev, true)}><ChevronLeft size={18} aria-hidden="true" /> {prev.nazwa}</button> : <span />}
          {next ? <button type="button" className="btn btn-primary" onClick={() => select(next, true)}>{next.nazwa} <ChevronRight size={18} aria-hidden="true" /></button> : <span />}
        </nav>
      </div>

      <details className="zs-mw-full" onToggle={(e) => setFullText((e.currentTarget as HTMLDetailsElement).open)}>
        <summary>Pełny tekst dokumentu (wersja z PDF)</summary>
        {report && <div className="zs-read-main"><ReportReader report={report} query="" hitIndex={0} /></div>}
      </details>

      <p className="hint zs-mw-credit">
        Opracowanie: Regionalny Ośrodek Polityki Społecznej w Krakowie, Dział Innowacji Społecznych.{' '}
        <a href={doc.url_zrodlowy} target="_blank" rel="noreferrer">Oryginał PDF<NewTab /> <ExternalLink size={14} aria-hidden="true" /></a>
      </p>
      <p className="back-link"><Link to="/zasobnik?dzial=wyzwania">← Wróć do zasobnika wiedzy</Link></p>
    </div>
  )
}
