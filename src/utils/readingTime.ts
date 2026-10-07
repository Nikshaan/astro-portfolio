export interface ReadingTimeResult {
  minutes: number;
  text: string;
  words: number;
}

export function getReadingTime(content: string, wpm = 200): ReadingTimeResult {
  if (!content || typeof content !== "string") {
    return { minutes: 1, text: "1 min read", words: 0 };
  }

  const clean = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^(?:import|export)\s.*$/gm, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*`_~\[\]()]/g, " ")
    .trim();

  const words = clean.split(/\s+/).filter((w) => w.length > 0).length;
  const minutes = Math.max(1, Math.ceil(words / wpm));

  return {
    minutes,
    text: `${minutes} min read`,
    words,
  };
}
