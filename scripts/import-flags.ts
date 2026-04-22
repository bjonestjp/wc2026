import { mkdir, readdir, rm, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceDir = process.argv[2];

if (!sourceDir) {
  console.error("Usage: npm run import:flags -- /absolute/path/to/flag-files");
  process.exit(1);
}

const projectRoot = process.cwd();
const targetDir = path.join(projectRoot, "public", "flags");
const manifestPath = path.join(projectRoot, "src", "generated", "flag-manifest.json");
const allowedExtensions = new Set([".svg", ".png", ".webp", ".jpg", ".jpeg"]);

async function main() {
  const sourceEntries = await readdir(sourceDir, { withFileTypes: true });
  const files = sourceEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => allowedExtensions.has(path.extname(name).toLowerCase()));

  if (files.length === 0) {
    throw new Error("No supported flag files found. Use .svg, .png, .webp, .jpg, or .jpeg.");
  }

  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });

  const manifest: Record<string, string> = {};

  for (const fileName of files) {
    const extension = path.extname(fileName).toLowerCase();
    const baseName = path.basename(fileName, extension).trim().toUpperCase();
    if (!baseName) continue;

    const normalizedFileName = `${baseName}${extension}`;
    await copyFile(
      path.join(sourceDir, fileName),
      path.join(targetDir, normalizedFileName),
    );

    manifest[baseName] = `/flags/${normalizedFileName}`;
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`Imported ${Object.keys(manifest).length} flag files into public/flags.`);
  console.log("Available codes:");
  for (const code of Object.keys(manifest).sort()) {
    console.log(`  ${code}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
