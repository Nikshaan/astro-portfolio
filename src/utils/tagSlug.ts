/**
 * URL segment for a blog tag. Every tag link and the tag route must use this,
 * so "AI", " ai" and "ai" land on one page and characters like "#", "+" or
 * "/" can't turn into fragments or extra path segments. Simple small-letter tags
 * ("astro", "webdev") map to themselves.
 */
export function tagSlug(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/\+/g, "-plus")
    .replace(/#/g, "-sharp")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
