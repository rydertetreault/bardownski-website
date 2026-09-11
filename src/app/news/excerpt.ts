/** Listing-only preview. Article pages retain their original full text. */
export function newsExcerpt(body: string, maxLength = 180): string {
  const text = body.trim().split(/\n\s*\n/)[0].replace(/\s+/g, " ");
  if (text.length <= maxLength) return text;

  const preview = text.slice(0, maxLength - 1);
  // Prefer a complete sentence when it provides a useful description.
  const sentenceEnd = Math.max(preview.lastIndexOf(". "), preview.lastIndexOf("! "), preview.lastIndexOf("? "));
  if (sentenceEnd >= 70) return preview.slice(0, sentenceEnd + 1);
  const wordEnd = preview.lastIndexOf(" ");
  return `${preview.slice(0, wordEnd > 0 ? wordEnd : preview.length).trimEnd()}…`;
}
