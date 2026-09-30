export interface ReadingTimeResult {
  minutes: number;
  text: string;
  words: number;
}

/**
 * Calculates reading time from raw markdown/mdx content.
 * Standard measure: 200 words per minute.
 */
export function getReadingTime(content: string, wpm = 200): ReadingTimeResult {
  if (!content || typeof content !== "string") {
    return { minutes: 1, text: "1 min read", words: 0 };
  }

  // Strip code blocks, HTML tags, and markdown markup to estimate prose reading time
  const clean = content
    .replace(/```[\s\S]*?```/g, "") // remove fenced code blocks
    .replace(/<[^>]*>/g, " ")        // remove HTML/JSX tags
    .replace(/[#*`_~\[\]()]/g, " ")  // remove markdown symbols
    .trim();

  const words = clean.split(/\s+/).filter((w) => w.length > 0).length;
  const minutes = Math.max(1, Math.ceil(words / wpm));

  return {
    minutes,
    text: `${minutes} min read`,
    words,
  };
}
