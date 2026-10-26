# BookLedger Basic — Sitzungs-Anker

**Was das hier ist (Klaus 2026-10-26):** die **PWA-Fassung** von BookLedgerPro. Klaus: „wenn wir mit diesem BookLedgerPro
hier fertig sind, dann kopieren wir das einmal komplett rüber in BookLedger-Basic und dann wandeln wir das hier um als die
Pro-Version Nativ-App inklusive Windows-Version." Das Pro-Repo (`lausiklauskn-png/BookLedgerPro`) wird die native App
(Android + Windows, Tresorordner); **dieses Repo ist die PWA** unter `https://lausiklauskn-png.github.io/BookLedger-Basic/`.

## Goldene Regeln

1. **Kopierte Dateien nie von Hand ändern.** Alles außer den Basic-eigenen Dateien kommt aus BookLedgerPro:
   `node tools/pro-nachziehen.mjs --pro ../BookLedgerPro` (Pro-Klon daneben, auf dem gewünschten Stand). Das Werkzeug nimmt
   `git ls-files` aus Pro, schreibt die Whitelist-Dateien mit `tools/basic-regeln.mjs` um, löscht, was Pro nicht mehr hat, und
   pinnt alles in `HERKUNFT-PRO.json` (Pro-Commit, Regel-Fassung, SHA-256 je Datei, Baum-Hash). `node tests/basic_gleichstand.mjs`
   schlägt bei jeder Handänderung an.
2. **Basic-eigen** sind nur: `CLAUDE.md`, `README.md`, `HERKUNFT-PRO.json`, `tools/pro-nachziehen.mjs`, `tools/basic-regeln.mjs`,
   `tests/basic_gleichstand.mjs`. Nicht aus Pro übernommen: dessen `CLAUDE.md`, `README.md`, `ROADMAP.md`, `docs/PULS.md`,
   `docs/SESSIONS.md`.
3. **Was die Regeln ändern** (`basic-regeln.mjs`, Fassung 1; nur `index.html`, `sw.js`, `manifest.webmanifest`, `src/**` ohne
   `src/sbkim/`, `tests/**`):
   - Adressen `…/BookLedgerPro/` → `…/BookLedger-Basic/`, Repo-Links ebenso.
   - **DB-Endung der App `bookledgerbasic`** (`src/core/db.js`) — Pro-PWA und Basic liegen unter demselben Ursprung
     (`lausiklauskn-png.github.io`), IndexedDB ist dort gemeinsam; mit derselben Endung läsen zwei Apps dieselben Bücher.
     **Nie ändern** (Regel #3 aus Pro gilt sinngemäß). Folge: Basic startet mit einem **leeren Tresor** — Daten kommen per
     Sicherung aus dem Pro-PWA (dort erstellen, hier einspielen).
   - **Vorrat des Service-Workers `blpb-`** statt `blpr-` — CacheStorage gehört dem ganzen Ursprung, der Worker löscht beim
     Aktivieren alte Vorräte mit seinem Präfix (Lehre Workflow PDF #131: nie fremde Schalen löschen).
   - Name **„BookLedger Basic"** (Manifest `name`, `short_name` „BL Basic", Titel, Oberflächentexte in `i18n.js`).
   - **Unverändert (Verträge und Knoten):** `quelle: 'bookledgerpro'` (Datenvertrag mit den WorkFlohs), `bookledgerpro-austausch`,
     `von=BookLedgerPro` (Absender gegenüber Workflow PDF), die SBKIM-Schublade `bookledgerpro-sbkim` und alles unter `sbkim/`
     und `src/sbkim/` (Spore, SIGNAL, nodeProfile) — Basic trägt **die Knoten-Identität des Pro-PWA**, bis Klaus im Siegel neu
     signiert; die committete Spore nennt noch die Pro-Adresse. `apps/`, `assets/wfpdf/`, `vendor/` byte-1:1 wie in Pro.
4. **Build-frei, offline, GitHub Pages** — wie Pro. Cache-Bump kommt mit dem Nachziehen aus Pro (`CACHE_VERSION`).
5. Alle übrigen Regeln (Datendurabilität, Krypto-Disziplin, GoBD, EU-KI opt-in, Ehrlichkeit, Freibrief zum Selbst-Mergen) stehen in
   Pros `CLAUDE.md` und netzweit in
   [`Sage-Protokol/docs/NETZWEIT.md`](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/NETZWEIT.md).

## Prüfen

```bash
node tests/basic_gleichstand.mjs      # Pin + Regeln (ohne Browser)
node tests/run.mjs                    # die kopierte Suite (CI, .github/workflows/ci.yml)
CHROMIUM=… node tests/smoke_vorgang.mjs   # Browser-Proben wie in Pro (playwright-core daneben)
```

## Stand 2026-10-26 (erste Kopie)

Pro-Stand `c52523f` (nach R3). 545 Dateien, 49 umgeschrieben. Gemessen: `basic_gleichstand` **21 grün** · `run.mjs`
**2567 bestanden · 0 fehlgeschlagen** · `smoke_vorgang` 32 · `smoke_teilen` 26 · `smoke_design` 90 grün.
Beim ersten Lauf fielen 28 Zeilen der kopierten Suite: `\b` vor `bookledgerpro` griff nicht hinter „_" (`blpr_bookledgerpro`),
Knoten-Zeilen der Proben verglichen umgeschriebene Erwartungen mit unverändertem `src/sbkim/`, und `von=BookLedgerPro` wurde
umbenannt — die Regeln kennen jetzt Lookarounds, Knoten-Zeilen und den Vertragswert.

**Offen (Klaus):**
- GitHub Pages für dieses Repo einschalten (Settings → Pages → Branch `main`, Ordner `/`); erst dann gibt es die Adresse.
- Eigene Knoten-Identität für Basic (Siegel → neu signieren, dann `sbkim/spore.json`, `SIGNAL.json`, `nodeProfile.js`
  nachziehen) — oder bewusst die des Pro-PWA weiterführen, weil die PWA ja hierher wandert.
- Die WorkFlohs schicken „Rechnung in BLP" weiter an `…/BookLedgerPro/` (Pro-PWA-Adresse); für Basic-Nutzer bräuchten sie ein
  einstellbares Ziel. Die eingebetteten Calculate/Needs sind nicht betroffen (die Brücke fängt den Sprung ab).
- ⚠ Am Tablet nicht gemessen; Installieren der PWA (eigene Kennung = Pages-Adresse, kein `id` im Manifest) nicht gemessen.
