import Fastify from "fastify";
import { CacheService } from "./cache.js";
import {
  cacheKeyFromUrl,
  createFallbackStyleGuide,
  ensureUrl,
  extractStyleGuide,
  hasValidExtractInput,
  normalizeStyleGuideColors
} from "./extractor.js";
import type { ExtractParams } from "./types.js";

const server = Fastify({ logger: true });
const cache = new CacheService();

server.get("/health", async () => ({ ok: true }));

server.get<{ Querystring: ExtractParams }>("/extract", async (request, reply) => {
  const { url, domain } = request.query;

  if (!hasValidExtractInput({ url, domain })) {
    reply.code(400);
    return { error: "Provide a valid url or domain query parameter" };
  }

  try {
    const resolvedUrl = ensureUrl({ url, domain });
    const key = cacheKeyFromUrl(resolvedUrl);
    const cached = await cache.get(key);
    if (cached) {
      return normalizeStyleGuideColors(cached);
    }

    const styleGuide = await extractStyleGuide({ url: resolvedUrl });
    const normalized = normalizeStyleGuideColors(styleGuide);

    await cache.set(key, normalized);
    return normalized;
  } catch (error) {
    request.log.error({ error }, "Failed to extract style guide");
    const resolvedUrl = ensureUrl({ url, domain });
    return createFallbackStyleGuide(resolvedUrl);
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
