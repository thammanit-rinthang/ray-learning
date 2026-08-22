import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

type Item = { id: string; slug: string; course: string; chapter?: string; title: string; file: string; updatedAt: string };

const root = path.resolve(process.cwd(), process.env.REPORTS_SOURCE ?? "../output");
const destination = path.join(process.cwd(), "content", "reports");
const index: Item[] = [];

function slugify(input: string) {
  return input.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.name === "report.md") files.push(full);
  }
  return files;
}

function reportTitle(fileName: string) {
  return fileName.replace(/_report\.md$/i, "").replace(/\.md$/i, "");
}

async function rebuildIndex() {
  index.length = 0;
  const files = await walkMarkdown(destination);
  for (const filePath of files) {
    const relative = path.relative(destination, filePath).split(path.sep);
    const fileName = relative.at(-1) ?? "report.md";
    const course = relative[0] ?? "unknown-course";
    const chapter = relative.length >= 3 ? relative.at(-2) : undefined;
    const title = reportTitle(fileName);
    const relativeKey = relative.join("/");
    const id = crypto.createHash("sha1").update(relativeKey).digest("hex").slice(0, 16);
    const slug = `${slugify(course)}-${slugify(title)}-${id}`;
    const stat = await fs.stat(filePath);
    index.push({ id, slug, course, chapter, title, file: relative.join("/"), updatedAt: stat.mtime.toISOString() });
  }
}

async function walkMarkdown(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walkMarkdown(full));
    else if (entry.name.toLowerCase().endsWith(".md")) files.push(full);
  }
  return files;
}

async function main() {
  await fs.mkdir(destination, { recursive: true });
  const files = await walk(root).catch(() => []);
  for (const source of files) {
    const relative = path.relative(root, source).split(path.sep);
    const course = relative[0] ?? "unknown-course";
    const chapter = relative[1] ?? "unknown-chapter";
    const lesson = relative.at(-2) ?? "lesson";
    const file = path.join(course, chapter, `${lesson}_report.md`);
    const destinationFile = path.join(destination, file);
    await fs.mkdir(path.dirname(destinationFile), { recursive: true });
    await fs.copyFile(source, destinationFile);
  }
  await rebuildIndex();
  const indexFile = path.join(destination, "index.json");
  const temporaryIndexFile = `${indexFile}.${process.pid}.tmp`;
  await fs.writeFile(temporaryIndexFile, `${JSON.stringify(index.sort((a, b) => a.title.localeCompare(b.title)), null, 2)}\n`);
  await fs.rm(indexFile, { force: true });
  await fs.rename(temporaryIndexFile, indexFile);
  console.log(`Synced ${index.length} reports from ${root}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
