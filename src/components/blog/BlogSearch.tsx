import { useState, useEffect, useRef, useCallback } from "react";
import { Search as SearchIcon, X, Loader2, ArrowRight } from "lucide-react";

interface SearchResult {
  url: string;
  meta?: {
    title?: string;
  };
  excerpt?: string;
}

export default function BlogSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isIndexReady, setIsIndexReady] = useState(true);
  const pagefindRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const latestSearchRef = useRef(0);

  const loadPagefind = useCallback(async () => {
    if (pagefindRef.current) return pagefindRef.current;
    try {
      const pagefindPath = "/pagefind/pagefind.js";
      const pf = await import(/* @vite-ignore */ pagefindPath);
      await pf.init();
      pagefindRef.current = pf;
      setIsIndexReady(true);
      return pf;
    } catch {
      setIsIndexReady(false);
      return null;
    }
  }, []);

  const handleSearch = useCallback(
    async (text: string) => {
      const searchId = ++latestSearchRef.current;
      const isLatest = () => searchId === latestSearchRef.current;

      setQuery(text);
      if (!text.trim()) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const pf = await loadPagefind();
      if (!pf) {
        if (isLatest()) setIsLoading(false);
        return;
      }

      try {
        const search = await pf.search(text);
        const dataPromises = search.results.slice(0, 8).map((r: any) => r.data());
        const data = await Promise.all(dataPromises);
        if (isLatest()) setResults(data);
      } catch (err) {
        console.error("Search error: ", err);
      } finally {
        if (isLatest()) setIsLoading(false);
      }
    },
    [loadPagefind],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative w-full max-w-md min-w-0">
      <div className="relative flex items-center">
        <label htmlFor="blog-search-input" className="sr-only">
          Search posts
        </label>
        <div className="pointer-events-none absolute left-3.5 flex items-center text-[var(--text-tertiary)]">
          <SearchIcon className="w-4 h-4" aria-hidden="true" />
        </div>
        <input
          id="blog-search-input"
          ref={searchInputRef}
          type="search"
          role="searchbox"
          placeholder="Search posts..."
          value={query}
          onFocus={() => {
            loadPagefind();
            setIsOpen(true);
          }}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full min-w-0 pl-10 pr-9 py-2 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-card)] text-base sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
        {!query && (
          <div className="pointer-events-none absolute right-3 hidden sm:flex items-center">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-tertiary)] bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded">
              /
            </kbd>
          </div>
        )}
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              latestSearchRef.current++;
              setQuery("");
              setResults([]);
              searchInputRef.current?.focus();
            }}
            className="absolute right-3 p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors rounded"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {isOpen && query.trim().length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-2 z-50 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-2xl overflow-hidden max-h-96 overflow-y-auto"
          role="region"
          aria-live="polite"
        >
          {isLoading ? (
            <div className="p-4 flex items-center justify-center gap-2 text-xs text-[var(--text-tertiary)]">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
              Searching index...
            </div>
          ) : results.length > 0 ? (
            <ul className="divide-y divide-[var(--border-subtle)]" role="list">
              {results.map((res, idx) => (
                <li key={idx} className="group">
                  <a
                    href={res.url}
                    className="block p-3.5 hover:bg-[var(--surface-raised)] transition-colors"
                  >
                    <div className="font-heading font-medium text-sm text-[var(--text-primary)] group-hover:text-[var(--accent)] flex items-center justify-between gap-2">
                      <span>{res.meta?.title || "Post"}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    {res.excerpt && (
                      <p
                        className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-1 [&>mark]:bg-transparent [&>mark]:text-[var(--accent-strong)] [&>mark]:font-medium"
                        dangerouslySetInnerHTML={{ __html: res.excerpt }}
                      />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          ) : !isIndexReady ? (
            <div className="p-4 text-center text-xs text-[var(--text-tertiary)] leading-relaxed">
              Search index generates on build. Run <code className="text-[var(--accent)] font-mono">npm run build</code> to index posts.
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-[var(--text-tertiary)]">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
