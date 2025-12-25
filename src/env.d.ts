/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly GH_TOKEN: string;
  readonly GH_USERNAME: string;
  readonly PUBLIC_LASTFM_USERNAME: string;
  readonly PUBLIC_LASTFM_API_KEY: string;
  readonly PUBLIC__LASTFM_USERNAME?: string;
  readonly PUBLIC__LASTFM_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly glob: <T = any>(
    pattern: string,
    options?: { eager?: boolean; as?: string }
  ) => Record<string, T>;
}
