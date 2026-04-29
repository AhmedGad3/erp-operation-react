export function createAutoCode(value, fallbackPrefix = "ITEM") {
  const text = String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .replace(/_/g, " ")
    .trim();

  const slug = text
    .split(/\s+/)
    .filter(Boolean)
    .join("-")
    .replace(/-+/g, "-")
    .toUpperCase()
    .slice(0, 32);

  if (slug) return slug;
  return fallbackPrefix.toUpperCase();
}
