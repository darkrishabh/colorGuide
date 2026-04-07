import Fastify from "fastify";
import { CacheService } from "./cache.js";
import {
  cacheKeyFromUrl,
  closeExtractorBrowser,
  createFallbackStyleGuide,
  ensureUrl,
  extractStyleGuide,
  hasValidExtractInput,
  normalizeStyleGuideColors
} from "./extractor.js";
import { captureScreenshot, closeBrowser, extractContextBundle, extractSitemap, scrapePage } from "./context.js";
import type { ContextResult, ExtractParams, ScrapeParams, ScrapeResult, SitemapResult, StyleGuide } from "./types.js";

const server = Fastify({ logger: true });
const cache = new CacheService();

server.get("/health", async () => ({ ok: true }));

const cacheKey = (prefix: string, url: string): string => `${prefix}:${new URL(url).toString().toLowerCase()}`;

server.get<{ Querystring: ExtractParams }>("/extract", async (request, reply) => {
  const { url, domain } = request.query;

  if (!hasValidExtractInput({ url, domain })) {
    reply.code(400);
    return { error: "Provide a valid url or domain query parameter" };
  }

  try {
    const resolvedUrl = ensureUrl({ url, domain });
    const key = cacheKeyFromUrl(resolvedUrl);
    const cached = await cache.getJSON<StyleGuide>(key);
    if (cached) {
      return normalizeStyleGuideColors(cached);
    }

    const styleGuide = await extractStyleGuide({ url: resolvedUrl });
    const normalized = normalizeStyleGuideColors(styleGuide);

    await cache.setJSON(key, normalized);
    return normalized;
  } catch (error) {
    request.log.error({ error }, "Failed to extract style guide");
    const resolvedUrl = ensureUrl({ url, domain });
    return createFallbackStyleGuide(resolvedUrl);
  }
});

server.get<{ Querystring: ScrapeParams }>("/scrape", async (request, reply) => {
  const { url, domain, format } = request.query;
  if (!hasValidExtractInput({ url, domain })) {
    reply.code(400);
    return { error: "Provide a valid url or domain query parameter" };
  }

  const resolvedUrl = ensureUrl({ url, domain });
  const key = cacheKey(`scrape:${format ?? "text"}`, resolvedUrl);
  const cached = await cache.getJSON<ScrapeResult>(key);
  if (cached) return cached;

  const result = await scrapePage({ url: resolvedUrl, format });
  await cache.setJSON(key, result);
  return result;
});

server.get<{ Querystring: ExtractParams }>("/sitemap", async (request, reply) => {
  const { url, domain } = request.query;
  if (!hasValidExtractInput({ url, domain })) {
    reply.code(400);
    return { error: "Provide a valid url or domain query parameter" };
  }

  const resolvedUrl = ensureUrl({ url, domain });
  const key = cacheKey("sitemap", resolvedUrl);
  const cached = await cache.getJSON<SitemapResult>(key);
  if (cached) return cached;

  const result = await extractSitemap({ url: resolvedUrl });
  await cache.setJSON(key, result);
  return result;
});

server.get<{ Querystring: ExtractParams }>("/context", async (request, reply) => {
  const { url, domain } = request.query;
  if (!hasValidExtractInput({ url, domain })) {
    reply.code(400);
    return { error: "Provide a valid url or domain query parameter" };
  }

  const resolvedUrl = ensureUrl({ url, domain });
  const key = cacheKey("context", resolvedUrl);
  const cached = await cache.getJSON<ContextResult>(key);
  if (cached) return cached;

  const result = await extractContextBundle({ url: resolvedUrl });
  await cache.setJSON(key, result);
  return result;
});

server.get<{ Querystring: ExtractParams }>("/screenshot", async (request, reply) => {
  const { url, domain } = request.query;
  if (!hasValidExtractInput({ url, domain })) {
    reply.code(400);
    return { error: "Provide a valid url or domain query parameter" };
  }

  const resolvedUrl = ensureUrl({ url, domain });
  try {
    const image = await captureScreenshot({ url: resolvedUrl });
    reply.header("content-type", "image/png");
    return reply.send(image);
  } catch (error) {
    request.log.error({ error }, "Failed screenshot");
    reply.code(502);
    return { error: "Screenshot failed" };
  }
});

const start = async (): Promise<void> => {
  try {
    await cache.connect();
    const port = Number.parseInt(process.env.PORT ?? "3000", 10);
    await server.listen({ port, host: "0.0.0.0" });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

const close = async (): Promise<void> => {
  await closeBrowser();
  await closeExtractorBrowser();
  await cache.close();
  await server.close();
};

process.on("SIGINT", async () => {
  await close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await close();
  process.exit(0);
});

await start();
