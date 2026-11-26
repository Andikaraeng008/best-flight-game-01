// best-flight-game-01 — hand-in program: copy game/ and screenshots/ from this
// repository into the output directory and write dossier.json with the kit's
// buildDossier, so the gate can compare the dossier byte for byte.
import { buildDossier } from "./vendor/makefun-game.ts";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// Copy one directory tree, visiting entries in sorted order so the copy is
// deterministic: the same repository always writes the same bytes, which is
// what the grader's two runs compare. Files are copied by bytes, so nothing
// about timestamps or the host machine leaks into the output.
function copyTreeSorted(sourceDir: string, targetDir: string): void {
  mkdirSync(targetDir, { recursive: true });
  const entries = readdirSync(sourceDir).sort();
  for (const entry of entries) {
    const from = join(sourceDir, entry);
    const to = join(targetDir, entry);
    const info = statSync(from);
    if (info.isDirectory()) {
      copyTreeSorted(from, to);
    } else if (info.isFile()) {
      writeFileSync(to, readFileSync(from));
    }
  }
}

function handIn(): void {
  mkdirSync(outputDir, { recursive: true });
  for (const sub of ["game", "screenshots"]) {
    const target = join(outputDir, sub);
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  }
  const dossierPath = join(outputDir, "dossier.json");
  if (existsSync(dossierPath)) rmSync(dossierPath, { force: true });
  copyTreeSorted(join(repoRoot, "game"), join(outputDir, "game"));
  copyTreeSorted(join(repoRoot, "screenshots"), join(outputDir, "screenshots"));
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(dossierPath, dossier);
}

handIn();
