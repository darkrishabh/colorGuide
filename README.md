# colorGuide

Style Guide Extractor API that accepts any URL/domain and returns a structured style guide using headless Chromium rendering.

## Stack

- Fastify
- Playwright (Chromium)
- TypeScript
- Redis cache (24h TTL)
- Docker (`mcr.microsoft.com/playwright`)

## API

### `GET /extract?url=https://example.com`
### `GET /extract?domain=example.com`

Response:

```ts
{
  url: string
  mode: "light" | "dark"
  colors: { accent: string; background: string; text: string }
  typography: {
    h1: { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string; letterSpacing: string }
    h2: { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string; letterSpacing: string }
    h3: { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string; letterSpacing: string }
    h4: { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string; letterSpacing: string }
    p: { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string; letterSpacing: string }
  }
  spacing: { xs: string; sm: string; md: string; lg: string; xl: string }
  shadows: { sm: string; md: string; lg: string; xl: string; inner: string }
  tokens: Record<string, string>
  components: {
    button: {
      primary: Record<string, string>
      secondary: Record<string, string>
      link: Record<string, string>
    }
    card: Record<string, string>
  }
}
```

### `GET /scrape?url=https://example.com&format=text`
Returns page title, description, headings, links, and extracted `content` in `text` or `html`.

### `GET /sitemap?domain=example.com`
Returns parsed URLs from `/sitemap.xml`.

### `GET /context?domain=example.com`
Aggregated endpoint returning:
- page metadata (title/description)
- links and headings
- full style guide extraction

### `GET /screenshot?url=https://example.com`
Returns a PNG full-page screenshot.

## Run locally

1. Install dependencies
```bash
npm install
```
2. Set env
```bash
cp .env.example .env
```
3. Start API
```bash
npm run dev
```

## Run with Docker

```bash
docker compose up --build
```

## Notes on extraction strategy

- Uses semantic selectors (`h1`-`h4`, `p`, `button`, `a[href]`, `article`, card-like containers).
- Clusters clickable elements by visual signature to infer primary/secondary/link button styles.
- Scans `:root` and `[data-theme]` CSS variables into `tokens`.
- Normalizes color outputs to hex.
- Returns structured fallback data when hard extraction fails (timeouts/paywalled/JS-gated pages).
- Adds context-like utilities: scrape, sitemap extraction, screenshot, and a consolidated context endpoint.

## Performance updates

- Reuses a singleton Chromium browser process to reduce per-request launch overhead.
- Blocks heavy resources (`image`, `font`, `media`) and common analytics hosts for faster page readiness.
- Uses a fast-ready strategy (`domcontentloaded` + key selectors), avoiding long `networkidle` waits.
- Caches results per endpoint and URL in Redis.

## Lighter Chromium options

If full Playwright Chromium is too heavy, two practical options:

1. `playwright-core` + system-installed Chromium in your runtime image.
2. External browser service (Browserless or a shared remote Playwright worker) and keep only API logic in this container.

The current setup prioritizes portability and consistent rendering quality.
