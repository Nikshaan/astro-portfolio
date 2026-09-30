/// <reference types="astro/client" />

declare module "/pagefind/pagefind.js" {
  export function init(): Promise<void>;
  export function search(query: string): Promise<{
    results: Array<{
      id: string;
      data: () => Promise<{
        url: string;
        meta?: { title?: string };
        excerpt?: string;
      }>;
    }>;
  }>;
}
