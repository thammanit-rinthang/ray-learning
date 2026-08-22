import crypto from "node:crypto";

export function slugify(value: string) {
  return value.normalize("NFKC").trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "lesson";
}

export function lessonSlug(course: string, chapter: string | null | undefined, title: string) {
  return [course, chapter, title].filter((value): value is string => Boolean(value)).map(slugify).join("-");
}

export function storagePath(course: string, chapter: string | null | undefined, title: string) {
  const readable = lessonSlug(course, chapter, title);
  const hash = crypto.createHash("sha1").update(`${course}/${chapter ?? ""}/${title}`).digest("hex").slice(0, 10);
  return `${slugify(course)}/${slugify(chapter ?? "general")}/${readable}-${hash}.md`;
}
