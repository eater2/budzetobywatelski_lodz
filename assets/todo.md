
# Specyfikacja: Strona „Budżet Obywatelski Łódź 2025–2026 – mapa i lista projektów”

## Cel

Static site (SSR na etapie builda), bardzo szybka, hostowana na Vercel. Strona główna z mapą projektów i linkiem do listy. Podstrona z listą zawiera zdjęcie miejsca z Google Street View, koszt, opis, linki do mapy (do podglądu lokalizacji), filtry po kategoriach/typie/koszcie/osiedlach. Wersja mobilna i desktop. Admin może dodać własny banner jako plik HTML. SEO pod frazy „budżet obywatelski łódź mapa”.

## Dane wejściowe

* Lista projektów: `https://budzetobywatelski.uml.lodz.pl/zlozone-projekty-2026#`
* Pojedyncza karta projektu – przykład:
  `https://budzetobywatelski.uml.lodz.pl/szczegoly-projektu-2026-1401956735-1401956971-45818753838a0f1ad4e84fc223c3f39d`
* PDF z listą projektów (dostarczony przez użytkownika).

## Architektura / Technologia

**HTML + Tailwind CSS + JS** (ES modules).
* Mapa: **Leaflet + OpenStreetMap** tiles (bez kluczy, szybkie).
* Street View: **Google Street View Static API** przez **serwerless proxy** (Vercel Function), żeby nie wystawiać klucza w przeglądarce.
* SSR na etapie builda: skrypt node’owy generuje statyczne pliki HTML na podstawie zebranych danych (lista + JSON per projekt). Hosting na Vercel jako static output + 1 funkcja edge dla Street View (proxy).
* Geokodowanie adresów/lokalizacji: **Nominatim (OSM)** na etapie builda (z backoffem i cache), aby uzyskać lat/lng do mapy i Street View.
* Treści statyczne, bez dynamicznego backendu (poza proxy do obrazów Street View).
* Styl: prosty, responsywny CSS (flex/grid), bez frameworków. Tylko jeden minifikowany plik CSS.

## Struktura repozytorium

```
/
├─ public/
│  ├─ index.html                 # Strona główna – mapa
│  ├─ lista.html                 # Podstrona – lista projektów + filtry
│  ├─ projekty/                  # (opcjonalnie) statyczne strony per projekt
│  ├─ banner/                    # katalog na customowy banner admina
│  │  └─ banner.html             # admin podmienia ręcznie
│  ├─ assets/
│  │  ├─ styles.css
│  │  ├─ logo.svg
│  │  └─ icons.svg
│  ├─ data/
│  │  ├─ projekty.json           # zdenormalizowana lista (dla listy i mapy)
│  │  └─ projekty.geo.json       # GeoJSON do Leaflet (FeatureCollection)
│  ├─ sitemap.xml
│  ├─ robots.txt
│  └─ manifest.webmanifest
├─ scripts/
│  ├─ scrape.js                  # pobranie danych: lista → karty → parse → JSON
│  ├─ geocode.js                 # Nominatim + cache
│  ├─ build.js                   # orchestration: scrape→geocode→generate HTML/JSON
│  └─ utils/
│     ├─ html.js                 # generator prostych stron (SSR build-time)
│     └─ io.js                   # zapis/odczyt, cache
├─ api/
│  └─ streetview.js              # Vercel Edge Function proxy do Google SV Static API
├─ src/
│  ├─ map.js                     # logika mapy i filtrów na stronie głównej
│  ├─ list.js                    # logika filtrów i renderu kart na liście
│  ├─ filters.js                 # wspólne filtry
│  └─ seo.js                     # generowanie JSON-LD i meta (na buildzie)
├─ vercel.json
├─ package.json
└─ README.md
```

## Model danych projektu (`projekty.json`)

Każdy projekt:

```json
{
  "id": "B001BD",
  "nazwa": "Cywilizacja parkowania na Starych Bałutach",
  "typ": "OSIEDLOWE | PONADOSIEDLOWE | OGÓLNOMIEJSKIE",
  "kategoria": "Tereny zielone | Infrastruktura drogowa | ...",
  "osiedle": "Bałuty – Bałuty Doły",
  "lokalizacjaTekst": "ul. ...; skrzyżowanie ...",
  "lat": 51.78,
  "lng": 19.45,
  "koszt": 250000,
  "opis": "Krótki opis projektu…",
  "linkZrodlowy": "https://budzetobywatelski.../szczegoly-projektu-...",
  "linkGoogleMaps": "https://www.google.com/maps?q=51.78,19.45",
  "streetView": {
    "heading": 0,
    "pitch": 0,
    "fov": 90
  }
}
```

> Uwaga: `heading/pitch/fov` domyślne; skrypt może zostawić null – frontend ustawi sensowne wartości.

## Import danych (build pipeline)

1. **Scrape**:

   * Z listy projektów odczytaj linki do wszystkich kart (paginacja/scroll – ale tu zwykła lista linków).
   * Dla każdej karty pobierz:

     * Numer pełny / ID projektu (np. B001BD),
     * Nazwę, rodzaj (osiedlowe/…), kategorię, osiedle,
     * Lokalizację jako tekst (adres/opis miejsca),
     * Koszt (liczba; usuń spacje i zł),
     * Opis (zachowaj podstawowe formatowanie do plain-text),
     * Link źródłowy.
2. **Geocode**:

   * Nominatim (OSM), `email` w User-Agent, rate-limit: max 1 req/s, retry z exponential backoff.
   * Cache w `./.cache/geocode.json` → nie powtarzaj zapytań.
3. **Street View (parametry)**:

   * Nie wołaj Google API na buildzie. Zapisz tylko `lat/lng`.
   * Zdjęcie będzie pobierane **w przeglądarce** z `/api/streetview?lat=...&lng=...&size=640x360&fov=90&heading=...` (proxy ukrywa KEY).
4. **Generuj pliki**:

   * `public/data/projekty.json` i `projekty.geo.json`.
   * `public/index.html` (mapa) i `public/lista.html` (lista + filtry).
   * (Opcjonalnie) wygeneruj `public/projekty/{id}.html` – prosty SSR z danymi + meta, żeby wzmocnić SEO long-tail.
5. **SEO**:

   * `sitemap.xml` z wpisami: `/`, `/lista.html`, `/projekty/{id}.html`.
   * `robots.txt` zezwalający na indeksację.
   * W każdej stronie:

     * `<title>` i `<meta name="description">` z kluczowymi frazami.
     * **Keywords**: `budżet obywatelski łódź mapa, lbo łódź mapa, projekty budżetu obywatelskiego łódź 2025, 2026`.
     * **JSON-LD** typu `ItemList` (lista) i `CreativeWork` (karta projektu) z polami: name, description, areaServed („Łódź”), location (GeoCoordinates), url.
   * OpenGraph/Twitter meta (tytuł, opis, thumb – można użyć standardowego obrazka).

## Strona główna – `index.html` (Mapa)

* **Header**: logo/tytuł, krótki opis, link do `/lista.html`.
* **Panel filtrów** (sticky na mobile, boczny na desktop):

  * Kategorie (checkboxy),
  * Typ (radio: osiedlowe/ponad…/ogólnomiejskie),
  * Osiedla (select wielokrotnego wyboru),
  * Zakres kosztów (input min/max).
* **Mapa Leaflet**:

  * Wczytuje `projekty.geo.json`.
  * Markery kategoryzowane (różne ikonki/shape; bez zewn. sprite’ów – proste SVG inline).
  * Klik w marker → popup: nazwa, koszt, krótki opis, link „Zobacz w Google Maps”, link „Szczegóły” (do `/lista.html#B001BD` lub `/projekty/B001BD.html` jeśli generujesz podstrony).
* **Banner admina**:

  * Wczytaj przez `<iframe src="/banner/banner.html" loading="lazy">` (wysokość auto; na mobile 100% szerokości).
  * Jeśli plik nie istnieje – sekcja ukryta.

## Lista projektów – `lista.html`

* **Filtry** identyczne jak na mapie + pole szukania po nazwie/lokalizacji.
* **Sortowanie**: koszt (rosnąco/malejąco), nazwa A–Z, osiedle A–Z.
* **Karty projektów** (responsywna siatka):

  * Miniatura Street View: `<img src="/api/streetview?...">` (z `loading="lazy"` i `decoding="async"`, rozmyty placeholder).
  * Nazwa (H3), koszt (wyraźnie), kategoria, typ, osiedle.
  * Opis (skrót 2–3 linie, `line-clamp`).
  * Przyciski:

    * „Pokaż na mapie” (scroll/otwarcie `index.html` z hash param `?id=B001BD` i automatyczne przybliżenie),
    * „Otwórz w Google Maps” (link do `https://www.google.com/maps?q=lat,lng`),
    * „Szczegóły” (do `/projekty/B001BD.html` jeśli generujesz).
* **Paginacja** po stronie klienta (virtualized render dla wydajności przy 500+ rekordach).

## Street View – proxy (`/api/streetview`)

* Vercel Edge Function (`api/streetview.js`).
* Parametry query: `lat`, `lng`, `size`, `fov`, `heading`, `pitch`.
* Buduje URL do `https://maps.googleapis.com/maps/api/streetview?...&key=process.env.GOOGLE_MAPS_API_KEY`.
* Ustaw nagłówki cache: `s-maxage=2592000, stale-while-revalidate=86400`.
* Zwraca obraz (passthrough), statusy błędów (np. 404 jeśli brak panoramy).

## UI/UX i wydajność

* **Performance**: bez zbędnych bibliotek; tylko Leaflet (CDN), własny JS \~< 50 KB min.
* **Lazy load**: obrazki i sekcje poniżej folda.
* **Preload**: `projekty.json` i podstawowe ikony jako `preload`/`prefetch`.
* **A11y**: kontrast, focus ring, alt dla obrazków, semantic HTML.
* **Responsywność**: mobile-first; siatka 1–2 kolumny mobile, 3–4 desktop.
* **PWA (opcjonalnie)**: manifest + service worker tylko dla asset cache (bez dynamicznej treści).
* **Favicon i meta kolorów**: podstawowe.

## Filtry (logika)

* Po załadowaniu `projekty.json` zbuduj listy unikalnych: `kategoria`, `typ`, `osiedle`.
* Filtrowanie w pamięci (JS), debounce dla pola wyszukiwania (200 ms).
* Query string synchronizuje stan filtrów (`?kategoria=Tereny%20zielone&osiedle=Radogoszcz&min=0&max=500000`).
* `localStorage` – ostatnio użyte filtry.

## SEO/SSR

* Strony HTML budowane skryptem (`scripts/build.js`) mają kompletny markup (tekst widoczny bez JS).
* `index.html` i `lista.html` zawierają wstępnie wyrenderowany krytyczny kontent (np. pierwsze 20 projektów) + progressive enhancement JS.
* **Meta**:

  * `title`: „Budżet Obywatelski Łódź – mapa projektów 2025/2026”
  * `description`: „Interaktywna mapa i lista projektów BO Łódź 2025/2026. Filtruj po kategoriach, osiedlach i kosztach. Zobacz lokalizacje na mapie i Street View.”
  * **Keywords**: `budżet obywatelski łódź mapa, budżet obywatelski 2025 łódź, bo łódź 2026, mapa projektów łódź, lbo łódź mapa`.
* **JSON-LD**:

  * `ItemList` na `lista.html` (pozycje z name/url).
  * `Map` na `index.html` z `geo` i `hasMap`.

## Vercel – konfiguracja

* `vercel.json`:

  * Routes: statyczne pliki z `public/`.
  * Functions: `api/streetview.js` jako Edge Function.
  * Headers: security + caching dla `/data/*` i `/api/streetview`.
* Environment Variables:

  * `GOOGLE_MAPS_API_KEY` (tylko na serwerze).
* Deploy: `npm run build` generuje `public/` (statyczny output). `api/` wdraża się automatycznie.

## Zadania do implementacji

1. `scripts/scrape.js`: pobierz listę projektów + szczegóły z podstron; fallback: jeśli scraping zablokowany, sparsuj dostarczony PDF (tylko kolumny potrzebne do listy i geokodowania).
2. `scripts/geocode.js`: przemapuj `lokalizacjaTekst` → `lat,lng` (Nominatim, cache).
3. `scripts/build.js`: złącz dane → `projekty.json` i `projekty.geo.json`; wygeneruj `index.html`, `lista.html`, (opcjonalnie) `/projekty/{id}.html`; stwórz `sitemap.xml`, `robots.txt`, `manifest`.
4. `api/streetview.js`: proxy do Street View Static API (obsługa błędów, cache).
5. `public/index.html` + `src/map.js`: mapa Leaflet, wczytywanie GeoJSON, filtry, deep-link do wybranego projektu (`?id=`).
6. `public/lista.html` + `src/list.js`: render kart, Street View miniatury, filtry, sort/pagination, linki do mapy (`index.html?id=...`) i do Google Maps.
7. `public/banner/banner.html`: pusta plansza z instrukcją — admin może wkleić własny HTML (np. promocja własnego projektu).
8. `assets/styles.css`: prosty, lekki, responsywny styl 

## Akceptacja (checklista)

* [ ] `/` wyświetla mapę z markerami; klik = popup z danymi + linkami.
* [ ] `/lista.html` wyświetla karty z: miniaturą Street View, kosztem, opisem, kategorią/typem/osiedlem, linkami.
* [ ] Filtry działają na obu stronach (kategoria/typ/osiedle/koszt + wyszukiwanie).
* [ ] Link „Pokaż na mapie” otwiera mapę i centruje na wskazanym projekcie.
* [ ] Banner ładuje się z `/banner/banner.html` i można go podmienić ręcznie.
* [ ] Strona działa szybko na mobile (Lighthouse Performance ≥ 90).
* [ ] SEO: sitemap, robots, meta, keywords, JSON-LD.
* [ ] Hosting na Vercel, brak odsłoniętego klucza Google.
* [ ] Całość to zwykły HTML+JS+CSS (bez frameworków), jedna funkcja proxy.

## Drobne szczegóły implementacyjne

* Użyj `Intl.NumberFormat('pl-PL')` do formatowania kosztów (`1 234 567 zł`).
* Jeśli brak geokodu/Street View – pokaż neutralny placeholder SVG z komunikatem „Brak zdjęcia”.
* Marker cluster (opcjonalnie) przy dużej liczbie projektów – Leaflet.markercluster z CDN.
* Dostępność: `prefers-reduced-motion`, focusable kontrole filtrów, `aria-label` dla przycisków.
* Pamiętaj o `rel="noopener noreferrer"` na linkach zewnętrznych.
* Zadbaj o `lang="pl"` i poprawny encoding polskich znaków.


## Specyfikacja UI/UX (light theme, white-only)
1) Układ

Dwukolumnowy layout:

Lewa kolumna (panel): szer. 420–480 px desktop, 100% szer. na mobile (nad mapą).

Prawa kolumna: mapa wypełnia resztę ekranu (100% wys. viewportu).

Sticky: pasek wyszukiwania i pasek filtrów przyklejone do góry panelu.

Marginesy/siatka: padding strony 16 px (mobile) / 24 px (desktop). Odstępy między sekcjami 12–16 px.

2) Brand / nagłówek

Lewy górny róg: strzałka „wstecz” (ikonka) + logotyp/tytuł.

Tylko skala szarości: żadnych kolorów akcentowych.

Tytuł: „Budżet Obywatelski Łódź” (bold), podtytuł lub breadcrumb opcjonalnie.

3) Pasek wyszukiwania

Pole typu search z placeholderem „Wyszukaj miejsce lub projekt…”.

Po prawej przycisk „Szukaj”.

Styl:

Wysokość: 44 px.

Promień: 12 px.

Obrys: 1 px #E6E6E6; hover: #DADADA; focus: 2 px outline #BFBFBF (dostępność).

Ikona lupy po lewej w polu (SVG, #6B6B6B).

Zachowanie:

Debounce 250 ms.

Enter = trigger wyszukiwania.

ESC czyści pole.

4) Filtry (pod search)

3 kontrolki jak na zrzucie: Kategorie, Lokalizacja/Osiedle, Twórca/Typ.

Każda kontrolka = przycisk z menu (dropdown) lub chipsy po rozwinięciu.

Styl chipów:

Tło: #F7F7F7, tekst: #333, border: 1 px #E6E6E6, radius: 999 px, padding: 6–10 px.

Aktywny chip: tło #EDEDED, tekst #111, border #CFCFCF.

Dodatkowy filtr kosztu: zakres min/max (2 inputy number) w panelu rozwijanym.

5) Lista / karta projektu (w panelu)

Każdy wynik to karta z:

Tytuł (semibold, 16–18 px, #111).

Adres / osiedle (13–14 px, #6B6B6B).

Tagi (chips, jak wyżej) – np. osiedle, kategoria, typ.

Akcje po prawej: przycisk „lokalizacja” (pin) oraz menu „więcej” (trzy kropki).

(Jeżeli chcesz): miniatura Street View nad tytułem, 16:9, zaokrąglenie 12 px.

Kafelek:

Tło #FFFFFF, cień: 0 1px 2px rgba(0,0,0,0.06), border 1 px #F0F0F0, radius 16 px.

Hover: cień 0 4px 12px rgba(0,0,0,0.08).

Odstępy: 16–20 px wewnętrznie, 12–16 px między kartami.

Interakcje:

Klik w tytuł = focus marker na mapie + otwórz popup.

Ikona „lokalizacja” = płynne przesunięcie mapy do projektu (zoom ~16).

Menu „…”: link do szczegółów, „Otwórz w Google Maps”, kopiuj link.

6) Mapa (prawa kolumna)

Warstwa: jasny, „bezkolorowy” tileset (np. Carto Positron lub Stamen Toner Lite; wyłącznie b&w/szarości).

Marker:

Kształt kropli / pin.

Wersja mono: kontur #111, wypełnienie #FFFFFF, cień 0 2px 6px rgba(0,0,0,0.15).

Stan hover/selected: wypełnienie #F2F2F2, obrys #000.

Klaster (opcjonalnie): kółko białe, border #CFCFCF, tekst #333.

Popup:

Karta jak w panelu, ale uproszczona: tytuł (bold), adres, 2 przyciski: „Szczegóły”, „Pokaż w Google Maps”.

Tło #FFFFFF, border 1 px #E6E6E6, cień 0 8px 24px rgba(0,0,0,0.15), radius 16 px.

Animacje: 150–200 ms ease-out dla pan/zoom do markera.

7) Kolorystyka (white-only)

Tła: #FFFFFF (główne), #FAFAFA/#F7F7F7 (pola/chipsy), #F2F2F2 (hover).

Tekst: #111 (nagłówki), #333 (podstawowy), #6B6B6B (drugorzędny).

Obrysy: #E6E6E6 (default), #DADADA (hover), #CFCFCF (aktywny).

Cienie: tylko czarny z niską alfą (0.06–0.15).

Brak kolorów akcentowych; stany (hover/active/focus) różnicowane szarościami i cieniami.

8) Typografia

Font: Inter lub system-ui.

Rozmiary:

H1: 24–28 px, H2: 20–22 px, H3/Tytuł karty: 16–18 px,

Body: 14–16 px, Secondary: 13–14 px.

Odstępy linii: 1.35–1.5.

9) Ikony

SVG inline w kolorze #6B6B6B (hover: #333).

Zestaw: strzałka wstecz, lupa, filtr, pin/lokalizacja, menu „kebab”.

10) Interakcje / mikro-UX

Hover i focus zawsze widoczne (WCAG): outline 2 px #BFBFBF (lub dashed na elementach klikalnych).

Klik karty synchronizuje stan listy i mapy (wyróżnij aktualny projekt cieniem lub borderem #CFCFCF).

Scroll w panelu nie przewija mapy (oddzielne obszary scrollowalne).

„Pokaż na mapie” z listy ustawia URL ?id=PROJ_ID i centruje mapę.

11) Responsywność

Mobile (<768 px): panel na górze (pełna szer.), mapa pod spodem (wys. min 60vh), filtry w poziomym scrollu.

Tablet (≥768 px): panel ~380–420 px, mapa reszta.

Desktop (≥1200 px): panel 440–480 px, większe karty (grid jednoszpaltowy w panelu).

12) Dostępność

Kontrast min 4.5:1 (teksty na białym).

Klawiatura: Tab order logiczny: nagłówek → search → filtry → lista → mapa.

aria-label na ikonach i przyciskach.

Alt na miniaturach Street View: „Zdjęcie miejsca (Street View) – {nazwa}”.

13) Komponenty (krótka „definicja gotowa do kodu”)

SearchBar

Props: value, onInput, onSubmit, placeholder.

Wysokość 44 px, radius 12, ikonka w środku po lewej (padding-left 40 px).

FilterGroup

Trzy przyciski (dropdown):

Kategorie (multi-select),

Osiedla/Lokalizacja (multi-select),

Typ (single select).

Wyświetla aktywne filtry jako chipsy pod spodem (z „x” do usunięcia).

ProjectCard

Props: title, address, tags[], cost?, onFocusOnMap, menuItems[].

Opcjonalnie thumbnailUrl (Street View).

MapView

API: center, zoom, markers[] (id, lat, lng, title, address), onMarkerClick.

Styl markera zgodnie z sekcją 6.

Popup

15) Map tiles & marker (implementacyjne)

Tiles: jasny b&w (np. Carto Positron „lite” albo Stamen Toner Lite) — brak koloru.

Marker SVG (24×32):

Obrys stroke="#111" stroke-width="1.5", wypełnienie fill="#FFF", cień CSS.

Klaster: liczba w środku, background:#FFF; border:1px solid #CFCFCF; box-shadow: var(--shadow-sm);

16) Animacje

Przejścia hover/active: transition: 150ms ease-out na cień, border, tło.

Map pan/zoom: domyślne Leaflet, bez dodatkowych tweenów.