import type { Article } from "./news";

/** Editorial features are explicit, never simulated by changing publication dates.
 * Keep caller input/order intact; only pin the first deliberately featured story. */
export function featureArticles<T extends Pick<Article, "id" | "featured">>(articles: readonly T[]): T[] {
  const unique = articles.filter((article, index) => articles.findIndex(item => item.id === article.id) === index);
  const featured = unique.find(article => article.featured === true);
  return featured ? [featured, ...unique.filter(article => article.id !== featured.id)] : [...unique];
}
