// tools/basic-regeln.mjs — die Umschreibe-Regeln „BookLedgerPro → BookLedger Basic" (rein, kein Dateizugriff, in Node prüfbar).
//
// BookLedger Basic ist die PWA-Fassung von BookLedgerPro (Klaus 2026-10-26: „kopieren wir das einmal komplett rüber in
// BookLedger-Basic und dann wandeln wir das hier um als die Pro-Version Nativ-App"). Die Dateien kommen byte-1:1 aus dem
// Pro-Repo (tools/pro-nachziehen.mjs); NUR diese Regeln ändern etwas, und nur in den Dateien der Whitelist unten.
//
// Was sich ändert und warum:
//  1. Adressen: …github.io/BookLedgerPro/ → …github.io/BookLedger-Basic/ (eigene Pages-Adresse), Repo-Links ebenso.
//  2. Datenbank-Endung der App: `bookledgerpro` → `bookledgerbasic` — beide PWAs liegen unter derselben Adresse
//     (lausiklauskn-png.github.io), IndexedDB ist dort gemeinsam; mit derselben Endung läsen zwei Apps dieselben Bücher.
//     NICHT geändert: der Datenvertrag mit den WorkFlohs (`quelle: 'bookledgerpro'`), das Austausch-Format und der
//     SBKIM-Knoten (eigene Zeilen mit `sbkim`) — der Knoten bleibt derselbe wie beim Pro-PWA, bis Klaus im Siegel neu signiert.
//  3. Vorrat des Service-Workers: `blpr-` → `blpb-`. CacheStorage gehört dem ganzen Ursprung; der Worker löscht beim
//     Aktivieren alte Vorräte mit seinem Präfix — mit demselben Präfix nähme Basic dem Pro-PWA die Offline-Dateien
//     (Lehre aus Workflow PDF #131).
//  4. Name: „BookLedgerPro" → „BookLedger Basic" in Oberfläche, Titel, Manifest (nicht in src/sbkim/, nicht in apps/).
//
// Fassung der Regeln: steht in HERKUNFT-PRO.json (`regeln`). Wer eine Regel ändert, erhöht REGELN_FASSUNG.

export const REGELN_FASSUNG = 1;
export const PRO_REPO = 'lausiklauskn-png/BookLedgerPro';
export const BASIC_NAME = 'BookLedger Basic';
export const BASIC_KURZ = 'BL Basic';
export const DB_ENDUNG_PRO = 'bookledgerpro';
export const DB_ENDUNG_BASIC = 'bookledgerbasic';
export const VORRAT_PRO = 'blpr-';
export const VORRAT_BASIC = 'blpb-';

/** Pfade, die aus dem Pro-Repo NICHT übernommen werden (Basic hat eigene). */
export const NICHT_KOPIEREN = new Set(['CLAUDE.md', 'README.md', 'ROADMAP.md', 'docs/PULS.md', 'docs/SESSIONS.md']);
/** Native Teile der Pro-App (Android/Windows, Signatur, Sitzungsbriefe) gehören nicht in die PWA (Klaus 2026-10-26:
 *  BookLedgerPro wird nativ, Basic bleibt PWA). Sie werden beim Nachziehen ausgelassen. */
export const NICHT_KOPIEREN_PRAEFIX = ['android/', 'windows/', 'native/', 'signing/', 'tools/native/', 'tools/signing/',
  '.github/workflows/android', '.github/workflows/signing', '.github/workflows/windows', '.github/workflows/release', 'BRIEF_'];
export const NICHT_KOPIEREN_DATEI = new Set(['capacitor.config.json', 'package.json', 'package-lock.json']);
/** true, wenn Pro diese Datei hat, Basic sie aber nicht übernimmt. */
export function nichtKopieren(relpath) {
  return NICHT_KOPIEREN.has(relpath) || NICHT_KOPIEREN_DATEI.has(relpath) || NICHT_KOPIEREN_PRAEFIX.some((v) => relpath.startsWith(v));
}
/** Basic-eigene Dateien — der Nachzieh-Lauf fasst sie nie an. */
export const BASIC_EIGEN = new Set(['CLAUDE.md', 'README.md', 'HERKUNFT-PRO.json', 'tools/pro-nachziehen.mjs', 'tools/basic-regeln.mjs', 'tests/basic_gleichstand.mjs']);

/** Nur hier wird umgeschrieben; alles andere bleibt byte-1:1. */
export function wirdUmgeschrieben(relpath) {
  if (relpath === 'index.html' || relpath === 'sw.js' || relpath === 'manifest.webmanifest') return true;
  if (relpath.startsWith('src/sbkim/')) return false;
  if (relpath.startsWith('src/') && relpath.endsWith('.js')) return true;
  if (relpath.startsWith('tests/') && /\.(mjs|js)$/.test(relpath)) return true;
  return false;
}

const URL_REGELN = [
  [/https:\/\/lausiklauskn-png\.github\.io\/bookledgerpro\//g, 'https://lausiklauskn-png.github.io/BookLedger-Basic/'],
  [/github\.com\/lausiklauskn-png\/BookLedgerPro\b/g, 'github.com/lausiklauskn-png/BookLedger-Basic'],
  // jeder Pfad „BookLedgerPro/" (Pages, raw.githubusercontent, Repo-Links, auch als Regex `BookLedgerPro\/` in Proben)
  [/BookLedgerPro(?=\\?\/)/g, 'BookLedger-Basic'],
];

/** Zeilen, in denen die kleingeschriebene Endung ein Vertrag oder der Knoten ist — dort bleibt `bookledgerpro`. */
function endungBleibt(zeile) {
  return /quelle|VORGANG_QUELLE|austausch|AUSTAUSCH|sbkim/i.test(zeile);
}
/** Proben-Zeilen zum SBKIM-Knoten vergleichen mit src/sbkim/ und sbkim/ — die bleiben Pro, also auch die Erwartung. */
function knotenZeile(relpath, zeile) {
  return relpath.startsWith('tests/') && /sbkim|spore|signal|nodeprofile|canonical|endpoint|nodename|\bsig\./i.test(zeile);
}
/** Vertragswerte, die „BookLedgerPro" heißen müssen: der Absender gegenüber Workflow PDF (`?scan=1&von=BookLedgerPro`). */
const SCHUETZEN = [/von(\s*=\s*'?)BookLedgerPro/g];
const MASKE = '\u0000PRO\u0000';

/**
 * Schreibt den Text einer Datei um. Gibt den Text unverändert zurück, wenn die Datei nicht auf der Whitelist steht.
 * @param {string} relpath  Pfad relativ zur Repo-Wurzel, mit „/"
 * @param {string} text
 */
export function basicUmschreiben(relpath, text) {
  if (!wirdUmgeschrieben(relpath)) return text;
  const zeilen = String(text).split('\n').map((z) => {
    // Vertragswerte maskieren, damit 1. und 4. sie nicht anfassen
    for (const re of SCHUETZEN) z = z.replace(re, (m, g) => 'von' + g + MASKE);
    const knoten = knotenZeile(relpath, z);
    // 1. Adressen und Pfade (nicht in Knoten-Zeilen der Proben)
    if (!knoten) for (const [re, zu] of URL_REGELN) z = z.replace(re, zu);
    // 2. Datenbank-Endung (auch hinter „_", z. B. blpr_bookledgerpro), mit Ausnahmen
    if (!endungBleibt(z)) z = z.replace(/(?<![A-Za-z0-9-])bookledgerpro(?![A-Za-z0-9])/g, DB_ENDUNG_BASIC);
    // 3. Vorrat des Service-Workers (nur als Präfix in Anführungszeichen/Backticks)
    z = z.replace(/(['"`])blpr-/g, '$1' + VORRAT_BASIC);
    // 4. Name (nach den Adressen — die tragen kein „BookLedgerPro" mehr; nicht in Knoten-Zeilen der Proben)
    if (relpath === 'manifest.webmanifest') {
      z = z.replace(/"name": "BookLedgerPro"/, `"name": "${BASIC_NAME}"`).replace(/"short_name": "BookLedger"/, `"short_name": "${BASIC_KURZ}"`);
    }
    if (!knoten) z = z.replace(/BookLedgerPro/g, BASIC_NAME);
    return z.split(MASKE).join('BookLedgerPro');
  });
  return zeilen.join('\n');
}
