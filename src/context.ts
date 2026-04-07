import type { Browser, BrowserContext, Page, Route } from "playwright";
import { chromium } from "playwright";
import type { ContextResult, ScrapeResult, SitemapResult, StyleGuide } from "./types.js";
import { ensureUrl, extractStyleGuide, normalizeStyleGuideColors } from "./extractor.js";

let browserInstance: Browser | null = null;

const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const BLOCKED_RESOURCE_TYPES = new Set(["image", "media", "font"]);
const BLOCKED_HOST_PATTERNS = ["google-analytics", "googletagmanager", "doubleclick", "facebook.net"];

async function getBrowser(): Promise<Browser> {
  if (browserInstance) return browserInstance;
  browserInstance = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox"]
  });
  return browserInstance;
}

async function withPage<T>(task: (page: Page, context: BrowserContext) => Promise<T>): Promise<T> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: DEFAULT_UA,
    viewport: { width: 1440, height: 900 },
    javaScriptEnabled: true
  });

  const page = await context.newPage();
  await page.route("**/*", (route: Route) => {
    const request = route.request();
    const requestUrl = request.url().toLowerCase();
    if (BLOCKED_RESOURCE_TYPES.has(request.resourceType())) {
      route.abort().catch(() => undefined);
      return;
    }
    if (BLOCKED_HOST_PATTERNS.some((pattern) => requestUrl.includes(pattern))) {
      route.abort().catch(() => undefined);
      return;
    }
    route.continue().catch(() => undefined);
  });

  try {
    return await task(page, context);
  } finally {
    await context.close();
  }
}

async function gotoFast(page: Page, targetUrl: string): Promise<void> {
  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 8_000 });
    await page.waitForSelector("body", { timeout: 2_000 }).catch(() => undefined);
    await page.waitForSelector("h1, p, button, a[href]", { timeout: 2_000 }).catch(() => undefined);
  } catch {
    // Intentionally allow partial extraction paths.
  }
}

export async function scrapePage(input: { url?: string; domain?: string; format?: "html" | "text" }): Promise<ScrapeResult> {
  const targetUrl = ensureUrl(input);
  return withPage(async (page) => {
    await gotoFast(page, targetUrl);
    const format = input.format ?? "text";

    const extracted = await page.evaluate<{ title: string; description: string; html: string; text: string; links: string[]; headings: Array<{ tag: "h1" | "h2" | "h3"; text: string }> }>(() => {
      const title = document.title?.trim() ?? "";
      const description =
        document.querySelector("meta[name='description']")?.getAttribute("content")?.trim() ??
        document.querySelector("meta[property='og:description']")?.getAttribute("content")?.trim() ??
        "";
      const root = document.querySelector("main") ?? document.body;
      const html = root?.innerHTML ?? "";
      const text = root?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      const links = Array.from(document.querySelectorAll("a[href]"))
        .map((a) => a.getAttribute("href") ?? "")
        .filter(Boolean)
        .slice(0, 100);
      const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
        .map((h) => ({ tag: h.tagName.toLowerCase() as "h1" | "h2" | "h3", text: h.textContent?.replace(/\s+/g, " ").trim() ?? "" }))
        .filter((h) => h.text.length > 0)
        .slice(0, 50);
      return { title, description, html, text, links, headings };
    });

    return {
      url: targetUrl,
      title: extracted.title,
      description: extracted.description,
      content: format === "html" ? extracted.html : extracted.text,
      links: extracted.links,
      headings: extracted.headings
    };
  });
}

export async function extractSitemap(input: { url?: string; domain?: string }): Promise<SitemapResult> {
  const targetUrl = ensureUrl(input);
  const root = new URL(targetUrl);
  const sitemapUrl = `${root.origin}/sitemap.xml`;

  const response = await fetch(sitemapUrl, {
    headers: { "user-agent": DEFAULT_UA }
  }).catch(() => null);

  if (!response || !response.ok) {
    return { url: targetUrl, urls: [] };
  }

  const xml = await response.text();
  const urls = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g))
    .map((match) => match[1].trim())
    .filter(Boolean)
    .slice(0, 500);

  return { url: targetUrl, urls };
}

export async function captureScreenshot(input: { url?: string; domain?: string }): Promise<Buffer> {
  const targetUrl = ensureUrl(input);
  return withPage(async (page) => {
    await gotoFast(page, targetUrl);
    return page.screenshot({ type: "png", fullPage: true });
  });
}

export async function extractContextBundle(input: { url?: string; domain?: string }): Promise<ContextResult> {
  const targetUrl = ensureUrl(input);
  const [scrape, styleGuide] = await Promise.all([
    scrapePage({ url: targetUrl, format: "text" }),
    extractStyleGuide({ url: targetUrl }).then((result) => normalizeStyleGuideColors(result))
  ]);

  return {
    url: targetUrl,
    title: scrape.title,
    description: scrape.description,
    styleGuide: styleGuide as StyleGuide,
    links: scrape.links,
    headings: scrape.headings
  };
}

export async function closeBrowser(): Promise<void> {
  if (!browserInstance) return;
  await browserInstance.close();
  browserInstance = null;
}
