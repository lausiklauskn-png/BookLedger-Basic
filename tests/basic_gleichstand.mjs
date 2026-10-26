// tests/basic_gleichstand.mjs — BookLedger Basic ist eine Kopie von BookLedgerPro: jede kopierte Datei muss zum Pin in
// HERKUNFT-PRO.json passen (keine Handänderungen), und die Umschreibe-Regeln müssen gegriffen haben.
//   node tests/basic_gleichstand.mjs        (ohne Browser)   Rückgabe 0 grün · 1 ROT
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { basicUmschreiben, wirdUmgeschrieben, REGELN_FASSUNG, DB_ENDUNG_BASIC, VORRAT_BASIC, BASIC_NAME } from '../tools/basic-regeln.mjs';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let gruen = 0, rot = 0;
const ok = (n, b, i) => { if (b) { gruen++; console.log('  ✓ ' + n); } else { rot++; console.log('  ✗ ROT: ' + n + (i !== undefined ? ' → ' + String(i).slice(0, 300) : '')); } };
const sha = (b) => createHash('sha256').update(b).digest('hex');
const lies = (p) => readFileSync(join(WURZEL, p), 'utf8');

console.log('— Pin: HERKUNFT-PRO.json gegen den Baum');
const H = JSON.parse(lies('HERKUNFT-PRO.json'));
ok('Pin trägt Pro-Commit (40 hex), Datum, Regel-Fassung ' + REGELN_FASSUNG, /^[0-9a-f]{40}$/.test(H.proCommit) && /^\d{4}-\d{2}-\d{2}$/.test(H.nachgezogenAm) && H.regeln === REGELN_FASSUNG, JSON.stringify([H.proCommit, H.nachgezogenAm, H.regeln]));
const fehlt = [], anders = [];
for (const d of H.dateien) {
  const p = join(WURZEL, d.pfad);
  if (!existsSync(p)) { fehlt.push(d.pfad); continue; }
  if (sha(readFileSync(p)) !== d.sha256) anders.push(d.pfad);
}
ok(`alle ${H.dateien.length} kopierten Dateien sind da`, fehlt.length === 0, fehlt.slice(0, 10).join(', '));
ok('keine kopierte Datei ist von Hand verändert (SHA-256 wie gepinnt)', anders.length === 0, anders.slice(0, 10).join(', '));
const baum = sha(H.dateien.slice().sort((a, b) => (a.pfad < b.pfad ? -1 : 1)).map((d) => d.pfad + '\0' + d.sha256 + '\n').join(''));
ok('Baum-Hash stimmt mit der Liste überein', baum === H.baumHash);

console.log('— Regeln haben gegriffen');
const db = lies('src/core/db.js');
ok(`DB-Endung der App ist „${DB_ENDUNG_BASIC}"`, new RegExp(`DB_SUFFIX = '${DB_ENDUNG_BASIC}'`).test(db), db.match(/DB_SUFFIX = '[^']*'/)?.[0]);
ok('Datenvertrag mit den WorkFlohs bleibt `bookledgerpro` (VORGANG_QUELLE)', /VORGANG_QUELLE = 'bookledgerpro'/.test(lies('src/domain/vorgang.js')));
ok('Austausch-Format bleibt `bookledgerpro-austausch`', /AUSTAUSCH_FORMAT = 'bookledgerpro-austausch'/.test(lies('src/domain/connect.js')));
const sw = lies('sw.js');
ok(`Service-Worker-Vorrat heißt „${VORRAT_BASIC}…" — nie „blpr-"`, sw.includes(`"${VORRAT_BASIC}"`) && sw.includes(`\`${VORRAT_BASIC}shell-`) && !/['"`]blpr-/.test(sw), sw.match(/VORRAT_PRAEFIX = .*/)?.[0]);
ok('geteilte Dateien und Apps liegen im Basic-Vorrat', lies('src/domain/workflowPdf.js').includes(`'${VORRAT_BASIC}geteilt'`) && lies('src/domain/eingebettet.js').includes(`'${VORRAT_BASIC}apps'`));
const idx = lies('index.html');
ok(`Titel und Beschreibung sagen „${BASIC_NAME}"`, idx.includes(`<title>${BASIC_NAME}</title>`) && idx.includes(`content="${BASIC_NAME} — `));
ok('Adressen zeigen auf …/BookLedger-Basic/', idx.includes('https://lausiklauskn-png.github.io/BookLedger-Basic/') && !idx.includes('github.io/BookLedgerPro/'));
ok('SBKIM-Schublade bleibt die des Knotens (bookledgerpro-sbkim) — derselbe Knoten wie das Pro-PWA', idx.includes('window.SBKIM_DB_SUFFIX="bookledgerpro-sbkim"'));
const man = JSON.parse(lies('manifest.webmanifest'));
ok(`Manifest: name „${BASIC_NAME}", start_url/scope ./ (Kennung = eigene Pages-Adresse)`, man.name === BASIC_NAME && man.start_url === './' && man.scope === './' && !man.id, JSON.stringify([man.name, man.short_name, man.id]));
ok('sbkim/ und src/sbkim/ werden nicht umgeschrieben (eigene Identität, bis Klaus neu signiert)', !wirdUmgeschrieben('src/sbkim/signal.js') && !wirdUmgeschrieben('sbkim/siegel-inhalt.js') && lies('src/sbkim/signal.js').includes("node: 'BookLedgerPro'"));
ok('apps/ und assets/wfpdf/ bleiben byte-1:1 (nicht umgeschrieben)', !wirdUmgeschrieben('apps/blp-bruecke.js') && !wirdUmgeschrieben('assets/wfpdf/scanner.js'));

console.log('— Regeln selbst (rein)');
const probe = basicUmschreiben('src/x.js', "const DB_SUFFIX = 'bookledgerpro';\nexport const VORGANG_QUELLE = 'bookledgerpro';\nconst q = { quelle: 'bookledgerpro' };\nconst c = 'blpr-geteilt';\nconst u = 'https://lausiklauskn-png.github.io/BookLedgerPro/?x';\nconst n = 'BookLedgerPro';\n");
ok('Regeln: Endung, Vertrag bleibt, Vorrat, Adresse, Name', probe === "const DB_SUFFIX = 'bookledgerbasic';\nexport const VORGANG_QUELLE = 'bookledgerpro';\nconst q = { quelle: 'bookledgerpro' };\nconst c = 'blpb-geteilt';\nconst u = 'https://lausiklauskn-png.github.io/BookLedger-Basic/?x';\nconst n = 'BookLedger Basic';\n", probe);
ok('Regeln sind idempotent (zweimal = einmal)', basicUmschreiben('src/x.js', probe) === probe);
ok('Vertrag mit Workflow PDF bleibt: von=BookLedgerPro (Kopie und Probe)', lies('src/domain/workflowPdf.js').includes("von = 'BookLedgerPro'") && basicUmschreiben('src/x.js', "a('?scan=1&von=BookLedgerPro'); b({ von = 'BookLedgerPro' })") === "a('?scan=1&von=BookLedgerPro'); b({ von = 'BookLedgerPro' })");
ok('Datenbank-Namen auch hinter „_" umgeschrieben (blpr_bookledgerpro → blpr_bookledgerbasic), Pfade auch als Regex', basicUmschreiben('tests/x.mjs', "x === 'blpr_a1_bookledgerpro' && /BookLedgerPro\\/main\\/x/.test(y) && z === '/BookLedgerPro/'") === "x === 'blpr_a1_bookledgerbasic' && /BookLedger-Basic\\/main\\/x/.test(y) && z === '/BookLedger-Basic/'");
ok('Knoten-Zeilen in Proben bleiben Pro (sig.node, spore, endpoint)', basicUmschreiben('tests/x.mjs', "ok('node', sig.node === 'BookLedgerPro');\nok('x', spore.endpoint === 'https://lausiklauskn-png.github.io/BookLedgerPro/');") === "ok('node', sig.node === 'BookLedgerPro');\nok('x', spore.endpoint === 'https://lausiklauskn-png.github.io/BookLedgerPro/');");
ok('außerhalb der Whitelist bleibt alles', basicUmschreiben('docs/x.md', 'BookLedgerPro bookledgerpro blpr-') === 'BookLedgerPro bookledgerpro blpr-');

console.log(`\n${gruen} grün · ${rot} ROT`);
process.exit(rot ? 1 : 0);
