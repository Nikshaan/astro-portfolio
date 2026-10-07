import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { comparePostsNewestFirst } from "../lib/blogArchive";

export async function GET(context: APIContext) {
  const posts = await getCollection("blog", ({ data }) => !data.draft);

  const sortedPosts = posts.sort(comparePostsNewestFirst);

  return rss({
    title: "Nikshaan Shetty — Blog",
    description: "Engineering writeups, architecture notes, and production postmortems.",
    site: context.site || "https://nikshaan.dev",
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
