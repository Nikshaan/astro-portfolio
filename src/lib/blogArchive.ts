export const BLOG_ARCHIVE_ENABLED = true;

export function comparePostsNewestFirst<T extends { id: string; data: { pubDate: Date } }>(
  a: T,
  b: T,
): number {
  const byDate = b.data.pubDate.getTime() - a.data.pubDate.getTime();
  if (byDate !== 0) return byDate;
  return a.id.localeCompare(b.id);
}

export const MIN_POSTS_TO_INDEX_TAG = 3;
