#!/usr/bin/env node
// tools/pro-nachziehen.mjs — holt den Stand von BookLedgerPro (Klon daneben) nach BookLedger Basic.
//   node tools/pro-nachziehen.mjs --pro /pfad/zum/BookLedgerPro
// Nimmt alle in Pro versionierten Dateien (git ls-files), lässt NICHT_KOPIEREN und BASIC_EIGEN aus, schreibt die
// Whitelist-Dateien mit tools/basic-regeln.mjs um, löscht hier, was in Pro nicht mehr existiert, und schreibt
// HERKUNFT-PRO.json (Pro-Commit, Regel-Fassung, Datei-Liste mit SHA-256 nach dem Umschreiben, Baum-Hash).
// tests/basic_gleichstand.mjs rechnet den Baum-Hash nach: so fällt jede Handänderung an einer kopierten Datei auf.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, rmSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { basicUmschreiben, wirdUmgeschrieben, NICHT_KOPIEREN, BASIC_EIGEN, REGELN_FASSUNG, PRO_REPO } from './basic-regeln.mjs';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argPro = process.argv.indexOf('--pro');
const PRO = argPro > 0 ? resolve(process.argv[argPro + 1]) : (process.env.BLP_PRO ? resolve(process.env.BLP_PRO) : '');
if (!PRO || !existsSync(join(PRO, 'index.html'))) { console.error('Aufruf: node tools/pro-nachziehen.mjs --pro /pfad/zum/BookLedgerPro'); process.exit(2); }

const sha = (b) => createHash('sha256').update(b).digest('hex');
const proCommit = execFileSync('git', ['-C', PRO, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const schmutzig = execFileSync('git', ['-C', PRO, 'status', '--porcelain'], { encoding: 'utf8' }).trim();
if (schmutzig) console.warn('⚠ Der Pro-Klon hat ungesicherte Änderungen — der Pin zeigt auf HEAD, nicht auf den Arbeitsstand:\n' + schmutzig);
const dateien = execFileSync('git', ['-C', PRO, 'ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
  .filter((p) => !NICHT_KOPIEREN.has(p) && !BASIC_EIGEN.has(p));

const alt = existsSync(join(WURZEL, 'HERKUNFT-PRO.json')) ? JSON.parse(readFileSync(join(WURZEL, 'HERKUNFT-PRO.json'), 'utf8')) : null;
const liste = [];
let umgeschrieben = 0;
for (const p of dateien) {
  const quelle = readFileSync(join(PRO, p));
  let inhalt = quelle;
  if (wirdUmgeschrieben(p)) { const t = basicUmschreiben(p, quelle.toString('utf8')); if (t !== quelle.toString('utf8')) umgeschrieben++; inhalt = Buffer.from(t, 'utf8'); }
  const ziel = join(WURZEL, p);
  mkdirSync(dirname(ziel), { recursive: true });
  writeFileSync(ziel, inhalt);
  liste.push({ pfad: p, sha256: sha(inhalt) });
}
// Was Pro nicht mehr hat, fliegt hier raus (nur Dateien, die laut letztem Pin aus Pro kamen).
let entfernt = 0;
if (alt && Array.isArray(alt.dateien)) {
  const jetzt = new Set(dateien);
  for (const d of alt.dateien) if (!jetzt.has(d.pfad) && existsSync(join(WURZEL, d.pfad))) { unlinkSync(join(WURZEL, d.pfad)); entfernt++; }
}
// leere Ordner wegräumen
(function leereOrdner(dir) {
  for (const n of readdirSync(dir)) { if (n === '.git' || n === 'node_modules') continue; const p = join(dir, n); if (statSync(p).isDirectory()) { leereOrdner(p); if (readdirSync(p).length === 0) rmSync(p, { recursive: true }); } }
})(WURZEL);

liste.sort((a, b) => (a.pfad < b.pfad ? -1 : 1));
const baumHash = sha(liste.map((d) => d.pfad + '\0' + d.sha256 + '\n').join(''));
const herkunft = { pro: PRO_REPO, proCommit, nachgezogenAm: new Date().toISOString().slice(0, 10), regeln: REGELN_FASSUNG, anzahl: liste.length, umgeschrieben, baumHash, dateien: liste };
writeFileSync(join(WURZEL, 'HERKUNFT-PRO.json'), JSON.stringify(herkunft, null, 1) + '\n');
console.log(`✓ ${liste.length} Dateien aus ${PRO_REPO} @ ${proCommit.slice(0, 7)} übernommen, ${umgeschrieben} umgeschrieben, ${entfernt} entfernt · Baum ${baumHash.slice(0, 12)}…`);
