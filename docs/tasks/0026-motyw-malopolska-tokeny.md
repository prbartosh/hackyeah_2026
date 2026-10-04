# 0026. Motyw Małopolska: kolory, typografia, tokeny

- Status: todo
- Osoba: 
- PR: 

## Cel

Aplikacja ma wygląd regionalny (Małopolska), a nie ogólny „niebieski SaaS”. Tylko tokeny i style, bez zmian logiki. Trzy motywy (jasny, ciemny, wysoki kontrast) działają dalej i spełniają WCAG 2.1 AA. Zadania 0027–0034 korzystają z tych tokenów.

## Kroki

- [x] Sprawdzić System Identyfikacji Wizualnej Województwa Małopolskiego (malopolska.pl/marka-malopolska) i spisać w Notatkach kolory i zasady użycia znaku. Nie zgadujemy wartości HEX. Logo województwa i herb tylko za zgodą i zgodnie z księgą znaku. Bez zgody tworzymy własny znak Splotu „w duchu” regionu.
- [ ] Paleta jasna w `styles/index.css` (`:root`). Kierunek: czerwień małopolska (herb) jako akcent marki, granat (Wisła, Tatry) jako `--primary` w przyciskach i linkach, złoto (Wawel, korona) jako akcent dekoracyjny, ciepłe tło (len, papier) zamiast `#f5f7fc`. Każda para tekst/tło ≥ 4,5:1, elementy UI ≥ 3:1.
- [ ] Nowe tokeny semantyczne: `--accent` (czerwień), `--accent-gold`, `--surface-warm`, `--info`, `--warning`, `--success`, `--error` z wariantami `-soft` i `on-*`. Usunąć bezpośrednie kolory z modułów: `#000`/`#fff` w `kreator.css`, `zasobnik.css` i `service-card.css` (oprócz masek i druku), `rgba(...)` poświat w `zasobnik.css`.
- [ ] Motyw ciemny: te same barwy, przyciemnione i mniej nasycone, nie odwrócone. Kontrast sprawdzony osobno.
- [ ] Wysoki kontrast: bez zmian merytorycznych (żółty na czarnym), sprawdzić, że nowe tokeny (`--accent*`) też są nadpisane.
- [ ] Typografia: zostać przy Open Sans albo przejść na krój o wysokiej czytelności (np. Atkinson Hyperlegible Next, Lexend) z pełnymi polskimi znakami (ą, ę, ł, ż, ź, ć, ń, ó, ś). Nagłówki mogą mieć krój z charakterem (np. szeryfowy), treść zostaje bezszeryfowa.
- [x] Fonty hostowane lokalnie (`@fontsource`, zrobione w 0020; Google Fonts usunięte). Jeśli zmieniamy krój, zostaje lokalnie, `font-display: swap`.
- [ ] Skala typografii i odstępów jako tokeny (`--fs-*`, `--space-*` w rytmie 4/8 px), promienie (`--radius-sm/md/lg`), cienie (`--shadow-1/2`), z-index (`--z-sticky`, `--z-overlay`, `--z-skip`).
- [ ] `favicon` w `index.html` w nowych kolorach, `theme-color` w meta dla jasnego i ciemnego motywu.
- [ ] axe na wszystkich trasach w 3 motywach × 2 szerokościach (skrypt z 0022): 0 naruszeń. Ręcznie: duży i bardzo duży tekst.

## Notatki

- Priorytet: najwyższy z zadań UI. Bez tego 0027–0034 nie mają na czym stanąć.
- Do weryfikacji: PR #60 dodał `styles/malopolska.css` (barwy marki `--mp-*`: pasek nad nagłówkiem i stopką, pasek pod pozycją menu, tło grani jasne/ciemne; wysoki kontrast bez ozdób) i nie zmienia `--primary`, więc kroki palety i tokenów zostają otwarte. Ustalić, skąd wartości `--mp-*` (SIW?), i czy kierunek „granat jako `--primary`” nadal obowiązuje.
- Kryteria: 10% atrakcyjność UI, 20% dostępność. Motyw nie może obniżyć wyniku axe.
- Klucze `hubmi-theme` i `hubmi-font-size` w `localStorage` zostają.
- Sprawdzić z ROPS lub w regulaminie, czy wolno używać znaku „Małopolska”. Jeśli nie, motyw opiera się na barwach i ornamentach (0027), bez logo.

### SIW Województwa Małopolskiego: kolory i zasady (krok 1)

Źródło główne: „System Identyfikacji Wizualnej Województwa Małopolskiego” (UMWM, PDF 67 s., plik z 22.04.2021), kopia: `http://bip.kamionka.iap.pl/www.malopolska.pl/_userfiles/uploads/Marka%20Małopolska/System%20Identyfikacji%20Wizualnej%20Województwa%20Małopolskiego.pdf`. Oryginał (`malopolska.pl/marka-malopolska/system-identyfikacji-wizualnej-wojewodztwa-malopolskiego`) jest za Cloudflare (403 dla curl i WebFetch), więc czytano kopię BIP. Numery stron: drukowany numer (plik PDF: +1).

Księga podaje CMYK i RGB, **nie podaje Pantone ani HEX**. HEX poniżej = zapis RGB z księgi (s. 7), liczony mechanicznie, nie wartość „oficjalna” z tekstu. Nazwy z s. 8.

| Nazwa (s. 8) | CMYK | RGB (s. 7) | HEX z RGB | Pantone | na #fff | na #1a1a1a |
|---|---|---|---|---|---|---|
| magenta | C0 M100 Y0 K0 | 236 0 140 | #EC008C | brak w księdze | 4,25 | 4,10 |
| fioletowy | C80 M100 Y0 K0 | 102 51 153 | #663399 | brak | 8,41 | 2,07 |
| jasny granatowy | C80 M60 Y0 K0 | 51 102 204 | #3366CC | brak | 5,37 | 3,24 |
| ciemny granatowy | C80 M60 Y0 K30 | 51 102 153 | #336699 | brak | 6,00 | 2,90 |
| niebieski | C80 M0 Y0 K0 | 0 185 242 | #00B9F2 | brak | 2,28 | 7,64 |
| ciemny zielony | C93 M0 Y100 K0 | 0 170 79 | #00AA4F | brak | 3,06 | 5,69 |
| jasny zielony | C50 M0 Y100 K0 | 141 198 63 | #8DC63F | brak | 2,04 | 8,52 |
| żółty | C0 M25 Y100 K0 | 255 194 14 | #FFC20E | brak | 1,62 | 10,75 |
| czarny | C0 M0 Y0 K95 | 51 51 51 | #333333 | brak | 12,63 | 1,38 |

Księga (s. 8) każe w layoutach korzystać z tych 9 barw „wraz z tonami pośrednimi” (tinty) i szarości z czerni. Nie wprowadza osobnych kolorów „uzupełniających”; logo i patern (pasek 6 kolorów, s. 17-18) używają pierwszych 6 barw. Herb: s. 37 księgi odsyła do uchwały VIII/73/99; barw herbu (HEX/CMYK) w księdze ani w uchwale zmieniającej nie znaleziono (wzorzec graficzny jest załącznikiem).

Kontrast (WCAG 2.1, wartości liczone): tekst >= 4,5:1 na jasnym tle: fioletowy, jasny i ciemny granatowy, czarny (#333). Magenta #EC008C 4,25 NIE (tylko UI/duży tekst >= 3:1). Ciemny zielony 3,06: tylko UI. Niebieski, jasny zielony, żółty < 3: tylko dekoracja (nie jako jedyny nośnik informacji). Na ciemnym #1a1a1a tekst >= 4,5: niebieski, ciemny zielony, jasny zielony, żółty; magenta 4,10 (na #111 4,45) tylko UI; jasny granat 3,24 tylko UI; fioletowy, ciemny granat, czarny nie nadają się. Wniosek: granat `#336699`/`#3366CC` i fiolet dobre jako tekst/`--primary` w jasnym motywie (granat jasny z białym tekstem na przycisku 5,37); w ciemnym trzeba jaśniejszych tintów (nie surowych barw). Czerwień „herbowa” z kroku 2 nie wynika z księgi (marka jest magenta, nie czerwona).

Zgodność z `frontend/src/styles/malopolska.css`: żadna wartość `--mp-*` nie zgadza się z księgą.

`--mp-*` w `malopolska.css` poprawione na wartości z księgi (dopasowanie po nazwie barwy: magenta, fioletowy, jasny granat, niebieski, jasny zielony, żółty). Do sprawdzenia, czy patern z księgi (s. 17–18) używa tych samych 6 barw. W kodzie brak ciemnego zielonego, ciemnego granatu i #333.

Zasady użycia znaku (księga + strona „Akceptacja użycia logo Małopolski”, `malopolska.pl/marka-malopolska/system-identyfikacji-wizualnej-wojewodztwa-malopolskiego/akceptacja-uzycia-logo-malopolski.html`, kopia `bip.kamionka.iap.pl/www.malopolska.pl/...`):
- Zgoda: każdy projekt graficzny z logo trzeba przesłać do akceptacji Zespołu ds. Marketingu Regionu w Kancelarii Zarządu UMWM (podmioty koordynowane i „pozostałe podmioty”, np. realizujące zadania przy wsparciu województwa). Kontakt: strona „Akceptacja użycia logo” na malopolska.pl. W razie wątpliwości co do reprodukcji pytać ten zespół (s. 9). Brak zgody = nie używamy logo.
- Pole ochronne: min. 0,5 modułu (moduł = wysokość litery M logotypu), s. 5-6. Min. wielkość: wariant centralny 11 mm, poziomy 14 mm szerokości (s. 9).
- Zakazy: zmiana proporcji, deformacja, zmiana/zamiana kolorów, jasności i nasycenia piktogramu, jakakolwiek ingerencja w formę, użycie przy słabym kontraście (s. 9-10). Biały logotyp na ciemnym, czarny na jasnym tle. Patern: zakaz tworzenia nowych paternów, zmiany proporcji i zamiany kolorów (s. 17).
- Barwy bez znaku: księga jest „otwarta”, zaleca korzystanie z barw składowych znaku w gridach i layoutach (s. 8). Użycie samych barw (np. motyw w duchu regionu) nie jest zakazane i jest przez księgę wprost zalecane. Ostrożnie z paternem (pasek 6 kolorów): to element systemu, więc kopia 1:1 może sugerować oficjalność; własny wariant (np. inny układ/proporcje) bezpieczniejszy, ale zakaz „nowych paternów” dotyczy materiałów samego systemu, nie jest tu jednoznaczny.
- Herb: uchwała XXV/388/12 (Dz. Urz. Woj. Małop. 2012 poz. 3851, zmiana VIII/73/99) §3 ust. 4-5: użycie herbu/flagi na przedmiotach w obrocie handlowym i w znaku towarowym wymaga zgody Zarządu Województwa (uchwała, pisemny wniosek); herb tylko w kształcie, proporcjach i kolorach ze wzorca; symbole chronione z mocy prawa. Księga s. 37: herb dla komunikacji władz województwa, nie razem z logo; przy patronacie Marszałka logo, nie herb. Wniosek: nie używamy herbu w aplikacji.
- Typografia księgi (s. 19-20): Aller Bold (tytuły), uzupełniająco Helvetica/Arial, Roboto lub Open Sans. Open Sans (obecny) jest zgodny z księgą.

Wątpliwości: (1) czytano kopię PDF z 2021 na mirrorze BIP, nie oryginał z malopolska.pl (Cloudflare); stan może być nowszy. (2) Pantone w księdze brak; HEX z RGB księgi (konwersja CMYK->RGB w księdze jest ich własna, ekran może różnić się od wydruku). (3) Barw herbu nie ustalono. (4) Czy ROPS/UMWM zgodzi się na logo: pytanie do organizatora, do czasu odpowiedzi własny znak Splotu.
